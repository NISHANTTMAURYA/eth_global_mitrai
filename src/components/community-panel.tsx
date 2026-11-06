'use client';

import { useCallback, useEffect, useState } from 'react';
import { shortAddress, type Character } from '@/lib/domain';

type Post = { id: string; wallet: string; body: string; at: number };
type Community = { count: number; joined: boolean; posts: Post[]; alive: boolean };

export default function CommunityPanel({ character, owner }: { character: Character; owner: string | null }) {
  const [room, setRoom] = useState<Community | null>(null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    const response = await fetch(`/api/community?id=${encodeURIComponent(character.id)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load the community.');
    setRoom(data);
  }, [character.id]);
  useEffect(() => { void load().catch((e) => setError(e.message)); }, [load]);
  async function submit(action: 'join' | 'leave' | 'post') {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: character.id, action, body }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update the community.');
      setBody('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="tab-content">
      <p className="eyebrow">A SHARED PLACE</p>
      <h2>{character.name}’s community</h2>
      <p className="muted">Meet people who follow this story. Community posts are public; private chats stay private. {room?.count ?? 0} joined.</p>
      {room?.alive && owner && (
        <button className="button secondary" disabled={busy} onClick={() => void submit(room.joined ? 'leave' : 'join')}>
          {room.joined ? 'Leave community' : 'Join community'}
        </button>
      )}
      {!owner && <p className="muted">Connect a wallet to join and post.</p>}
      {room?.joined && room.alive && (
        <div className="community-compose">
          <textarea aria-label="Community message" rows={3} maxLength={500} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share a thought with the community…" />
          <button className="button primary" disabled={busy || !body.trim()} onClick={() => void submit('post')}>Post</button>
        </div>
      )}
      {error && <p role="alert" className="muted">{error}</p>}
      <div className="community-posts">
        {room?.posts.length === 0 && <p className="muted">No posts yet. Start the conversation.</p>}
        {room?.posts.map((post) => (
          <article className="memory-card" key={post.id}>
            <small>{shortAddress(post.wallet)} · {new Date(post.at).toLocaleString()}</small>
            <p>{post.body}</p>
          </article>
        ))}
      </div>
      {room && !room.alive && <p className="muted">This lifetime has ended. Its community remains here to read.</p>}
    </div>
  );
}
