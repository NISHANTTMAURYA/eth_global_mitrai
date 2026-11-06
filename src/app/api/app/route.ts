import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAddress } from 'viem';
import {
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
import { readArkivCharacter, discoverArkiv } from '@/lib/arkiv';
import { signSnapshot, verifySnapshot } from '@/lib/proof';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
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
    const id = new URL(request.url).searchParams.get('id');
    if (id) {
      const c = await verifiedCharacter(id);
      if (!c.published && c.owner !== owner) throw new Error('This character is not published.');
      return NextResponse.json({
        character: c.owner === owner ? c : publicCharacter(c),
        messages: c.owner === owner ? messages(id, owner, c.ownershipEpoch || 0) : [],
        offers: c.owner === owner ? offersFor(id) : [],
        owner,
        provider: configuredProvider(),
      });
    }
    const rows: Character[] = [];
    for (const entry of allCharacters()) {
      if (!entry.published && entry.owner !== owner) continue;
      // Never serve private state using stale chain ownership. Public discovery stays public.
      if (entry.owner === owner && entry.entityKey) {
        const verified = await verifiedCharacter(entry.id);
        if (verified.published || verified.owner === owner)
          rows.push(verified.owner === owner ? verified : publicCharacter(verified));
      } else rows.push(entry.owner === owner ? entry : publicCharacter(entry));
    }
    return NextResponse.json({
      characters: rows,
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
          model: z.string().refine((id) => models.some((m) => m.id === id), 'Unknown character model'),
          tags: z.array(z.string().trim().min(1).max(25)).max(5),
          shortLife: z.boolean(),
          traits: z.object({
            curiosity: z.number().min(0).max(100),
            warmth: z.number().min(0).max(100),
            playfulness: z.number().min(0).max(100),
          }),
        })
        .parse(data);
      const now = Date.now();
      const c: Character = {
        id: crypto.randomUUID(),
        name: v.name,
        tagline: v.tagline,
        description: v.description,
        behavior: v.behavior,
        model: v.model,
        tags: [...new Set(v.tags)],
        owner,
        creator: owner,
        createdAt: now,
        lifespan: v.shortLife ? 600000 : 30 * 86400000,
        published: false,
        availability: 'showcase',
        brain: initialBrain(v.traits),
        highlights: [],
        history: [{ at: now, text: 'A new story began' }],
        demo: owner.startsWith('demo:'),
        ownershipEpoch: 0,
      };
      saveCharacter(c);
      return NextResponse.json({ character: c });
    }
    const id = z.string().min(1).max(100).parse(data.id);
    if (locks.has(id)) throw new Error('Another update is in progress. Please retry.');
    locks.add(id);
    lock = id;
    let c = action === 'transfer' ? getCharacter(id) : await verifiedCharacter(id);
    if (action === 'chat') {
      assertAlive(c);
      const audition = z.boolean().parse(data.audition);
      if (audition && !c.published) throw new Error('This character is not public.');
      if (!audition) assertOwner(c, owner);
      const text = z.string().trim().min(1).max(1500).parse(data.text);
      const history = audition ? [] : messages(id, owner, c.ownershipEpoch || 0);
      if (history.at(-1) && Date.now() - history.at(-1)!.at < 800)
        throw new Error('Give your character a moment before the next message.');
      const result = await reply(audition ? publicCharacter(c) : c, text, history, audition);
      const latest = await verifiedCharacter(id);
      assertAlive(latest);
      if (!audition) assertOwner(latest, owner);
      const now = Date.now();
      const answer = {
        id: crypto.randomUUID(),
        role: 'assistant' as const,
        text: result.text,
        at: now,
        provider: result.provider,
        requestId: result.requestId,
      };
      if (!audition)
        saveMessages(
          id,
          owner,
          [...history, { id: crypto.randomUUID(), role: 'user' as const, text, at: now }, answer],
          c.ownershipEpoch || 0,
        );
      return NextResponse.json({ message: answer });
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
      saveOffer({ characterId: id, from: owner, note, at: Date.now() });
      return NextResponse.json({ ok: true });
    }
    assertOwner(c, owner);
    assertAlive(c);
    if (action === 'prepareSnapshot') {
      if (owner.startsWith('demo:') || c.demo)
        throw new Error(
          'Demo characters cannot become live Arkiv records. Create one with your wallet session.',
        );
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
      c.history.push({ at: Date.now(), text: 'Introduced to the world' });
    }
    if (action === 'transfer') {
      const recipient = z
        .string()
        .refine(isAddress, 'Enter a valid EVM wallet address.')
        .parse(data.recipient)
        .toLowerCase();
      if (c.entityKey) {
        const remote = await readArkivCharacter(c.entityKey as `0x${string}`);
        if (String(remote.owner).toLowerCase() !== recipient)
          throw new Error('Complete the Arkiv ownership transfer first.');
      } else if (!c.demo) throw new Error('Sync this character to Arkiv before transferring.');
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
      c.entityKey = key;
      c.chainVersion = c.brain.version;
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
