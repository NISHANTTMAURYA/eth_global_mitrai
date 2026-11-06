import { continuityContext, acceptConversation } from '@/lib/continuity';
import { reachPreferences, archiveConversation, loadMind, saveMind } from '@/lib/continuity-store';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAddress } from 'viem';
import {
  database,
  allCharacters,
  getCharacter,
  saveCharacter,
  messages,
  saveMessages,
  saveOffer,
  offersFor,
} from '@/lib/store';
import { identity, requireIdentity, checkOrigin } from '@/lib/session';
import {
  initialBrain,
  creationBlockReason,
  lifecycle,
  assertAlive,
  assertOwner,
  publicCharacter,
  evolve,
  handover,
  type Character,
  type Memory,
} from '@/lib/domain';
import { configuredProvider, reply } from '@/lib/chat';
import { models } from '@/lib/models';
import { defaultVoiceForModel, VOICES } from '@/lib/voices';
import { readArkivCharacter, discoverArkiv, findArkivCharacter } from '@/lib/arkiv';
import { signSnapshot, verifySnapshot } from '@/lib/proof';
import { recordArkivReceipt } from '@/lib/chain-ledger';
import { samePublicState } from '@/lib/brain-events';
import {
  reserveModel,
  modelClaims,
  beginModelActivation,
  confirmModel,
  cancelModelDraft,
  rejectedModelActivation,
} from '@/lib/model-claims';
import {
  createRequest,
  updateRequest,
  adoptionRequests,
  recipientEligible,
  closeRequests,
} from '@/lib/adoption';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
let discoveryCache: { at: number; rows: Awaited<ReturnType<typeof discoverArkiv>> } | undefined;
async function publicDiscovery() {
  if (discoveryCache && Date.now() - discoveryCache.at < 20000) return discoveryCache.rows;
  const rows = await discoverArkiv();
  discoveryCache = { at: Date.now(), rows };
  return rows;
}
const locks = new Set<string>();
const limitedRequests = new Map<string, { count: number; since: number }>();
function limit(key: string, max = 25) {
  const previous = limitedRequests.get(key);
  const now = Date.now();
  if (previous && now - previous.since < 60000) {
    if (previous.count >= max) throw new Error('Please pause a moment before trying again.');
    previous.count++;
  } else limitedRequests.set(key, { count: 1, since: now });
  if (limitedRequests.size > 5000)
    for (const [k, v] of limitedRequests) if (now - v.since > 60000) limitedRequests.delete(k);
}
function error(e: unknown) {
  return NextResponse.json(
    { error: e instanceof Error ? e.message : 'Something went wrong.' },
    { status: 400 },
  );
}
async function verifiedCharacter(id: string) {
  let c = getCharacter(id);
  if (c.entityKey) {
    const remote = await readArkivCharacter(c.entityKey as `0x${string}`);
    if (!verifySnapshot(remote.character, remote.proof, remote.verifier))
      throw new Error('This Arkiv checkpoint is not signed by this app’s verifier.');
    if (remote.character.createdAt !== c.createdAt || remote.character.lifespan !== c.lifespan)
      throw new Error('The Arkiv birth commitment differs from the registered lifetime.');
    const currentOwner = String(remote.owner).toLowerCase();
    if (remote.birth && (c.activation !== 'active' || c.birth?.at !== remote.birth.at)) {
      c = { ...c, birth: remote.birth, activation: 'active' };
      saveCharacter(c);
    }
    if (currentOwner !== c.owner) {
      c = {
        ...c,
        owner: currentOwner,
        ownershipEpoch: (c.ownershipEpoch || 0) + 1,
        published: false,
        availability: 'showcase',
        brain: {
          ...c.brain,
          memories: c.brain.memories.filter((m) => m.scope === 'public'),
          evidence: [],
        },
        history: [
          ...c.history,
          {
            at: Date.now(),
            text: `Arkiv ownership change confirmed: ${currentOwner}`,
            by: c.owner,
          },
        ],
      };
      saveCharacter(c);
    }
  }
  return c;
}
export async function GET(request: Request) {
  try {
    const owner = await identity();
    modelClaims();
    const id = new URL(request.url).searchParams.get('id');
    if (id) {
      const c = await verifiedCharacter(id);
      if (!c.published && c.owner !== owner) throw new Error('This character is not published.');
      let shown = c;
      if (c.owner !== owner && !c.demo) {
        if (!c.entityKey) throw new Error('This character is not published on Arkiv.');
        const remote = await readArkivCharacter(c.entityKey as `0x${string}`);
        if (
          !remote.character.published ||
          remote.character.owner.toLowerCase() !== String(remote.owner).toLowerCase()
        )
          throw new Error('This character is not published on Arkiv.');
        shown = {
          ...publicCharacter(remote.character),
          ...(remote.birth ? { birth: remote.birth, activation: 'active' as const } : {}),
          owner: String(remote.owner).toLowerCase(),
          entityKey: c.entityKey,
          chainVersion: remote.character.brain.version,
        };
      }
      return NextResponse.json({
        character: c.owner === owner ? c : publicCharacter(shown),
        messages: c.owner === owner ? messages(id, owner, c.ownershipEpoch || 0) : [],
        offers:
          c.owner === owner
            ? adoptionRequests(id).filter(
                (r) => r.owner === c.owner && r.epoch === (c.ownershipEpoch || 0),
              )
            : [],
        owner,
        provider: configuredProvider(),
      });
    }
    const rows: Character[] = [];
    let discoveryError: string | null = null;
    try {
      const publicRows = await publicDiscovery();
      for (const row of publicRows) {
        if (
          !verifySnapshot(row.character, row.proof, row.verifier) ||
          !row.character.published ||
          row.character.owner.toLowerCase() !== String(row.owner).toLowerCase()
        )
          continue;
        const existing = allCharacters().find((c) => c.id === row.character.id);
        if (
          row.character.activation &&
          modelClaims().find((m) => m.model === row.character.model)?.entity_key !== row.key
        )
          continue;
        if (
          existing &&
          (existing.createdAt !== row.character.createdAt ||
            existing.lifespan !== row.character.lifespan)
        )
          continue;
        const c = {
          ...publicCharacter(row.character),
          ...(row.birth ? { birth: row.birth, activation: 'active' as const } : {}),
          owner: String(row.owner).toLowerCase(),
          entityKey: row.key,
          chainVersion: row.character.brain.version,
          demo: false,
        };
        if (!existing) saveCharacter(c);
        rows.push(c);
      }
    } catch {
      discoveryError = 'Published characters could not be loaded from Arkiv. Please try again.';
    }
    for (const entry of allCharacters()) {
      if (entry.owner === owner && entry.activation !== 'cancelled') {
        const c = entry.entityKey ? await verifiedCharacter(entry.id) : entry;
        if (c.owner !== owner) continue;
        const previous = rows.findIndex((r) => r.id === c.id);
        if (previous >= 0) rows.splice(previous, 1);
        rows.push(c.demo ? c : { ...c, published: c.published && previous >= 0 });
      } else if (process.env.MITRAI_DEMO_MODE === '1' && entry.demo && entry.published)
        rows.push(publicCharacter(entry));
    }
    return NextResponse.json({
      characters: rows,
      discoveryError,
      demoEnabled: process.env.MITRAI_DEMO_MODE === '1',
      owner,
      provider: configuredProvider(),
    });
  } catch (e) {
    return error(e);
  }
}
export async function POST(request: Request) {
  let lock: string | undefined;
  try {
    checkOrigin(request);
    const raw = await request.text();
    if (raw.length > 16000) throw new Error('Request is too large.');
    const data = JSON.parse(raw);
    const owner = await requireIdentity();
    const action = z
      .enum([
        'create',
        'chat',
        'publish',
        'memory',
        'checkpoint',
        'adopt',
        'transfer',
        'offer',
        'sync',
        'discover',
        'prepareSnapshot',
        'activationStarted',
        'activationRejected',
        'cancelDraft',
        'prepareTransfer',
        'declineRequest',
      ])
      .parse(data.action);
    limit(`${owner}:${action}`, action === 'chat' ? 15 : 25);
    if (action === 'discover') {
      const rows = await discoverArkiv();
      let imported = 0;
      for (const row of rows) {
        if (!verifySnapshot(row.character, row.proof, row.verifier)) continue;
        const c = row.character;
        if (!c.published) continue;
        const existing = allCharacters().find((e) => e.id === c.id);
        if (existing) continue; // Local birth registry and private state can never be replaced by imports.
        saveCharacter({
          ...publicCharacter(c),
          owner: String(row.owner).toLowerCase(),
          entityKey: row.key,
          demo: false,
        });
        imported++;
      }
      return NextResponse.json({ imported });
    }
    if (action === 'create') {
      const reason = creationBlockReason(allCharacters(), owner);
      if (reason) throw new Error(reason);
      const v = z
        .object({
          name: z.string().trim().min(2).max(32),
          tagline: z.string().trim().min(4).max(100),
          description: z.string().trim().min(12).max(1000),
          behavior: z.string().trim().min(5).max(1000),
          model: z
            .string()
            .refine((id) => models.some((m) => m.id === id), 'Unknown character model'),
          voice: z
            .string()
            .refine((v) => VOICES.some((voice) => voice.id === v), 'Choose an available voice.')
            .optional(),
          tags: z.array(z.string().trim().min(1).max(25)).max(5),
          shortLife: z.boolean(),
          traits: z.object({
            curiosity: z.number().min(0).max(100),
            warmth: z.number().min(0).max(100),
            playfulness: z.number().min(0).max(100),
          }),
        })
        .parse(data);
      if (
        allCharacters().some(
          (character) => !character.demo && character.entityKey && character.model === v.model,
        )
      )
        throw new Error('That character form is already in use. Choose an unused model.');
      const now = Date.now();
      const c: Character = {
        id: crypto.randomUUID(),
        name: v.name,
        tagline: v.tagline,
        description: v.description,
        behavior: v.behavior,
        model: v.model,
        voice: v.voice || defaultVoiceForModel(v.model),
        tags: [...new Set(v.tags)],
        owner,
        creator: owner,
        createdAt: owner.startsWith('demo:') ? now : 0,
        draftAt: now,
        ...(owner.startsWith('demo:') ? {} : { activation: 'draft' as const }),
        lifespan:
          v.shortLife && (owner.startsWith('demo:') || process.env.MITRAI_DEMO_MODE === '1')
            ? 600000
            : 30 * 86400000,
        published: false,
        availability: 'showcase',
        brain: initialBrain(v.traits),
        highlights: [],
        history: [],
        demo: owner.startsWith('demo:'),
        ownershipEpoch: 0,
      };
      if (c.demo) saveCharacter(c);
      else reserveModel(c);
      return NextResponse.json({ character: c });
    }
    const id = z.string().min(1).max(100).parse(data.id);
    if (locks.has(id)) throw new Error('Another update is in progress. Please retry.');
    locks.add(id);
    lock = id;
    let c = action === 'transfer' ? getCharacter(id) : await verifiedCharacter(id);
    if (action === 'chat') {
      if (!c.demo && !c.entityKey)
        throw new Error(
          'Approve your character’s first Arkiv transaction before starting the conversation.',
        );
      assertAlive(c);
      const audition = z.boolean().parse(data.audition);
      if (audition && !c.published) throw new Error('This character is not public.');
      let auditionState = publicCharacter(c);
      if (audition && !c.demo) {
        const remote = await readArkivCharacter(c.entityKey as `0x${string}`);
        if (
          !remote.character.published ||
          !verifySnapshot(remote.character, remote.proof, remote.verifier) ||
          remote.character.owner.toLowerCase() !== String(remote.owner).toLowerCase()
        )
          throw new Error('This public checkpoint is not available.');
        auditionState = {
          ...publicCharacter(remote.character),
          entityKey: c.entityKey,
          birth: remote.birth,
        };
      }
      if (!audition) assertOwner(c, owner);
      const text = z.string().trim().min(1).max(1500).parse(data.text);
      const history = audition ? [] : messages(id, owner, c.ownershipEpoch || 0);
      if (history.at(-1) && Date.now() - history.at(-1)!.at < 800)
        throw new Error('Give your character a moment before the next message.');
      if (!audition) archiveConversation(id, owner, c.ownershipEpoch || 0, history);
      if (!audition) {
        const activity = loadMind(c, owner);
        activity.lastUserAt = Date.now();
        saveMind(c, owner, activity);
      }
      const result = await reply(
        audition ? auditionState : c,
        text,
        history,
        audition,
        audition
          ? {}
          : {
              context: continuityContext(c, owner, text),
              timezone: reachPreferences(owner).timezone,
            },
      );
      const latest = await verifiedCharacter(id);
      assertAlive(latest);
      if (!audition) assertOwner(latest, owner);
      const now = Date.now();
      const answers = result.messages.map((bubble) => ({
        ...bubble,
        id: crypto.randomUUID(),
        role: 'assistant' as const,
        text: bubble.text,
        at: now,
        provider: result.provider,
        requestId: result.requestId,
      }));
      const userMessage = { id: crypto.randomUUID(), role: 'user' as const, text, at: now };
      if (!audition) {
        database.exec('BEGIN IMMEDIATE');
        try {
          saveMessages(
            id,
            owner,
            [...messages(id, owner, c.ownershipEpoch || 0), userMessage, ...answers],
            c.ownershipEpoch || 0,
          );
          acceptConversation(latest, owner, userMessage, answers, result.mind, now);
          database.exec('COMMIT');
        } catch (error) {
          database.exec('ROLLBACK');
          throw error;
        }
      }
      return NextResponse.json({ message: answers[0], messages: answers });
    }
    if (action === 'adopt') {
      assertAlive(c);
      if (
        !owner.startsWith('demo:') ||
        !c.demo ||
        c.owner !== 'studio' ||
        c.availability !== 'transfer'
      )
        throw new Error('This character is not available for demo adoption.');
      if (allCharacters().some((x) => x.owner === owner && lifecycle(x).alive))
        throw new Error('You already have an active character.');
      c = handover(c, owner);
      saveCharacter(c);
      return NextResponse.json({ character: c });
    }
    if (action === 'offer') {
      assertAlive(c);
      if (!c.published || !['offers', 'transfer'].includes(c.availability))
        throw new Error('This character is not open to enquiries.');
      if (c.owner === owner) throw new Error('You already own this character.');
      const note = z.string().trim().min(5).max(500).parse(data.note);
      const request = createRequest(c, owner, note);
      return NextResponse.json({ ok: true, request });
    }
    assertOwner(c, owner);
    if (action === 'declineRequest') {
      assertAlive(c);
      return NextResponse.json({
        request: updateRequest(c, z.string().parse(data.requestId), 'declined'),
      });
    }
    if (action === 'prepareTransfer') {
      assertAlive(c);
      const request = data.requestId
        ? adoptionRequests(c.id).find((r) => r.id === data.requestId)
        : null;
      if (data.requestId && !request) throw new Error('Adoption request not found.');
      const recipient = z
        .string()
        .refine(isAddress, 'Enter a valid wallet address.')
        .parse(request?.from || data.recipient)
        .toLowerCase();
      recipientEligible(c, recipient);
      if (request) updateRequest(c, request.id, 'accepted');
      return NextResponse.json({
        recipient,
        requestId: request?.id,
        remaining: lifecycle(c).remaining,
      });
    }
    if (action === 'cancelDraft') {
      if (c.entityKey) throw new Error('An existing persona cannot release its model.');
      cancelModelDraft(c);
      return NextResponse.json({ ok: true });
    }
    if (action === 'activationStarted') {
      beginModelActivation(c);
      return NextResponse.json({ ok: true });
    }
    if (action === 'activationRejected') {
      rejectedModelActivation(c);
      return NextResponse.json({ ok: true });
    }
    if (!(['prepareSnapshot', 'sync'].includes(action) && !c.entityKey && c.activation))
      assertAlive(c);
    if (action === 'prepareSnapshot') {
      if (owner.startsWith('demo:') || c.demo)
        throw new Error(
          'Demo characters cannot become live Arkiv records. Create one with your wallet session.',
        );
      if (!c.entityKey) {
        const candidates = await findArkivCharacter(c.id, owner as `0x${string}`);
        const existing = candidates.find(
          (row) =>
            verifySnapshot(row.character, row.proof, row.verifier) &&
            row.character.createdAt === c.createdAt &&
            row.character.lifespan === c.lifespan &&
            row.character.brain.version === c.brain.version,
        );
        if (existing) {
          c.entityKey = existing.key;
          const confirmed = await readArkivCharacter(existing.key);
          c.birth = confirmed.birth;
          c.activation = 'active';
          confirmModel(c, existing.key);
          c.chainVersion = existing.character.brain.version;
          saveCharacter(c);
          return NextResponse.json({ ...signSnapshot(c), alreadyOnChain: true });
        }
      }
      return NextResponse.json(signSnapshot(c));
    }
    if (action === 'memory') {
      const v = z
        .object({ text: z.string().trim().min(3).max(500), scope: z.enum(['public', 'private']) })
        .parse(data);
      if (c.brain.memories.length >= 40) throw new Error('Memory capacity reached (40).');
      const memory: Memory = { id: crypto.randomUUID(), ...v, createdAt: Date.now() };
      c.brain.memories.push(memory);
      c.brain.version++;
    }
    if (action === 'checkpoint') {
      const history = messages(id, owner, c.ownershipEpoch || 0);
      const lastCheckpoint =
        c.history.filter((h) => h.text.startsWith('Checkpoint')).at(-1)?.at || 0;
      const recent = history.filter((m) => m.role === 'user' && m.at > lastCheckpoint);
      if (!recent.length) throw new Error('No new conversation to consolidate.');
      c.brain = evolve(c.brain, recent.map((m) => m.text).join('\n'), recent.at(-1)!.id);
      const growth = loadMind(c, owner);
      if (growth.changes.length)
        for (const axis of ['curiosity', 'warmth', 'playfulness'] as const)
          c.brain.traits[axis] = growth.style[axis];
      c.history.push({
        at: Date.now(),
        text: `Checkpoint ${c.brain.version} · ${recent.length} conversation events, one consolidation session`,
      });
    }
    if (action === 'publish') {
      const v = z
        .object({
          availability: z.enum(['showcase', 'offers', 'transfer']),
          highlights: z.array(z.string().trim().min(3).max(180)).max(4),
        })
        .parse(data);
      c.published = true;
      c.availability = v.availability;
      c.highlights = v.highlights;
      if (c.demo) c.history.push({ at: Date.now(), text: 'Published to the local demo gallery' });
    }
    if (action === 'transfer') {
      const recipient = z
        .string()
        .refine(isAddress, 'Enter a valid EVM wallet address.')
        .parse(data.recipient)
        .toLowerCase();
      if (data.requestId) {
        const r = adoptionRequests(c.id).find((r) => r.id === data.requestId);
        if (
          !r ||
          r.owner !== c.owner ||
          r.epoch !== (c.ownershipEpoch || 0) ||
          r.from !== recipient ||
          r.status !== 'accepted'
        )
          throw new Error('This handover does not match the accepted adoption request.');
      }
      if (c.entityKey) {
        const remote = await readArkivCharacter(c.entityKey as `0x${string}`);
        if (String(remote.owner).toLowerCase() !== recipient)
          throw new Error('Complete the Arkiv ownership transfer first.');
      } else if (!c.demo) throw new Error('Sync this character to Arkiv before transferring.');
      if (c.entityKey && data.txHash)
        await recordArkivReceipt(
          c.id,
          c.entityKey as `0x${string}`,
          z
            .string()
            .regex(/^0x[0-9a-f]{64}$/i)
            .parse(data.txHash) as `0x${string}`,
        );
      closeRequests(c, data.requestId);
      c = handover(c, recipient);
    }
    if (action === 'sync') {
      if (owner.startsWith('demo:'))
        throw new Error('Demo characters cannot be presented as live Arkiv records.');
      const key = z
        .string()
        .regex(/^0x[0-9a-f]{64}$/i)
        .parse(data.entityKey);
      const remote = await readArkivCharacter(key as `0x${string}`);
      if (String(remote.owner).toLowerCase() !== owner || remote.character.id !== c.id)
        throw new Error('Arkiv ownership or character identity does not match.');
      if (!verifySnapshot(remote.character, remote.proof, remote.verifier))
        throw new Error('Arkiv state lacks a valid engine signature.');
      if (remote.character.createdAt !== c.createdAt || remote.character.lifespan !== c.lifespan)
        throw new Error('Arkiv lifecycle differs from the canonical birth.');
      if (remote.character.brain.version !== c.brain.version)
        throw new Error(
          'The local state changed while the transaction was signing. Sync the newest checkpoint.',
        );
      if (!samePublicState(c, remote.character))
        throw new Error('The character changed while signing. Please sync the current state.');
      c.entityKey = key;
      confirmModel(c, key);
      if (c.activation) {
        c.birth = remote.birth;
        c.activation = 'active';
      }
      c.chainVersion = c.brain.version;
      discoveryCache = undefined;
      if (data.txHash)
        await recordArkivReceipt(
          c.id,
          key as `0x${string}`,
          z
            .string()
            .regex(/^0x[0-9a-f]{64}$/i)
            .parse(data.txHash) as `0x${string}`,
        );
      c.history.push({ at: Date.now(), text: 'Public checkpoint confirmed on Arkiv' });
    }
    saveCharacter(c);
    return NextResponse.json({ character: c });
  } catch (e) {
    return error(e);
  } finally {
    if (lock) locks.delete(lock);
  }
}
