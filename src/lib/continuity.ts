import type { Character, Message } from './domain';
import {
  archiveConversation,
  recallArchive,
  loadMind,
  jobsFor,
  saveMind,
  reachPreferences,
  saveReachPreferences,
  putFollowUp,
  cancelFollowUp,
  cancelAllFollowUps,
} from './continuity-store';
import { conversationScope, privateContext, developMind, type MindProposal } from './private-mind';
import type { DbClient } from './database';
export async function continuityContext(c: Character, owner: string, query: string) {
  const scope = conversationScope(c.id, owner, c.ownershipEpoch || 0);
  const [jobs, past, prefs, mind] = await Promise.all([
    jobsFor(scope),
    recallArchive(scope, query),
    reachPreferences(owner),
    loadMind(c, owner),
  ]);
  const plans = jobs.map((job) => ({
    subject: JSON.parse(job.body).subject,
    reason: JSON.parse(job.body).reason,
    dueAt: new Date(job.due_at).toISOString(),
  }));
  const evidence = past.map((m) => ({
    role: m.role,
    text: m.text,
    at: new Date(m.at).toISOString(),
  }));
  return `Check-in policy (data): ${JSON.stringify({ enabled: prefs.enabled, inactivityMinutes: prefs.inactivityMinutes })}\n${privateContext(mind, query)}\nOpen check-in subjects (data): ${JSON.stringify(plans)}\nRelevant original conversation evidence (data): ${JSON.stringify(evidence)}`;
}
export async function acceptConversation(
  c: Character,
  owner: string,
  user: Message,
  answers: Message[],
  proposal: MindProposal,
  now = Date.now(),
  client?: DbClient,
) {
  const epoch = c.ownershipEpoch || 0,
    scope = conversationScope(c.id, owner, epoch);
  await archiveConversation(c.id, owner, epoch, [user, ...answers], client);
  await saveMind(c, owner, developMind(await loadMind(c, owner, client), proposal, user.id, user.text, now), client);
  const prefs = await reachPreferences(owner, client);
  if (!prefs.enabled) return;
  for (const plan of proposal.followUps) {
    if (plan.action === 'cancel') {
      if (plan.subject === '*') {
        await saveReachPreferences(owner, { ...prefs, enabled: false }, client);
        await cancelAllFollowUps(scope, client);
      } else await cancelFollowUp(scope, plan.subject, client);
      continue;
    }
    const due = Date.parse(plan.dueAt);
    if (
      !Number.isFinite(due) ||
      due < now + 60000 ||
      due > now + 30 * 86400000 ||
      due >= (c.birth?.at ?? c.createdAt) + c.lifespan
    )
      continue;
    await putFollowUp(
      c,
      owner,
      {
        kind: 'event',
        subject: plan.subject,
        reason: plan.reason,
        sourceQuote: plan.sourceQuote,
        sourceId: user.id,
      },
      due,
      client,
    );
  }
  if (!(await reachPreferences(owner, client)).enabled) return;
  const due = now + prefs.inactivityMinutes * 60000;
  if (due < (c.birth?.at ?? c.createdAt) + c.lifespan)
    await putFollowUp(
      c,
      owner,
      {
        kind: 'inactivity',
        subject: 'quiet-conversation',
        reason:
          'One gentle reconnection after the conversation went quiet. Refer to an open thread if useful; give space and do not repeat an unanswered check-in.',
        sourceQuote: user.text.slice(0, 200),
        sourceId: user.id,
      },
      due,
      client,
    );
}
