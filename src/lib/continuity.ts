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
export function continuityContext(c: Character, owner: string, query: string) {
  const scope = conversationScope(c.id, owner, c.ownershipEpoch || 0);
  const plans = jobsFor(scope).map((job) => ({
    subject: JSON.parse(job.body).subject,
    reason: JSON.parse(job.body).reason,
    dueAt: new Date(job.due_at).toISOString(),
  }));
  const past = recallArchive(scope, query).map((m) => ({
    role: m.role,
    text: m.text,
    at: new Date(m.at).toISOString(),
  }));
  return `Check-in policy (data): ${JSON.stringify({ enabled: reachPreferences(owner).enabled, inactivityMinutes: reachPreferences(owner).inactivityMinutes })}\n${privateContext(loadMind(c, owner), query)}\nOpen check-in subjects (data): ${JSON.stringify(plans)}\nRelevant original conversation evidence (data): ${JSON.stringify(past)}`;
}
export function acceptConversation(
  c: Character,
  owner: string,
  user: Message,
  answers: Message[],
  proposal: MindProposal,
  now = Date.now(),
) {
  const epoch = c.ownershipEpoch || 0,
    scope = conversationScope(c.id, owner, epoch);
  archiveConversation(c.id, owner, epoch, [user, ...answers]);
  saveMind(c, owner, developMind(loadMind(c, owner), proposal, user.id, user.text, now));
  const prefs = reachPreferences(owner);
  if (!prefs.enabled) return;
  for (const plan of proposal.followUps) {
    if (plan.action === 'cancel') {
      if (plan.subject === '*') {
        saveReachPreferences(owner, { ...prefs, enabled: false });
        cancelAllFollowUps(scope);
      } else cancelFollowUp(scope, plan.subject);
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
    putFollowUp(
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
    );
  }
  if (!reachPreferences(owner).enabled) return;
  const due = now + prefs.inactivityMinutes * 60000;
  if (due < (c.birth?.at ?? c.createdAt) + c.lifespan)
    putFollowUp(
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
    );
}
