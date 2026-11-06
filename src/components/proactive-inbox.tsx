'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Bell, Loader2 } from 'lucide-react';
import { Modal } from './ui';
import type { ReachPreferences } from '@/lib/continuity-store';
type Notice = {
  id: string;
  title: string;
  text: string;
  url: string;
  created_at: number;
  read_at: number | null;
};
async function post(body: unknown) {
  const r = await fetch('/api/proactive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const value = await r.json();
  if (!r.ok) throw Error(value.error);
  return value;
}
export default function ProactiveInbox({
  owner,
  notify,
}: {
  owner: string | null;
  notify: (text: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [items, setItems] = useState<Notice[]>([]),
    [prefs, setPrefs] = useState<ReachPreferences | null>(null),
    [emailConfigured, setEmailConfigured] = useState(false),
    [publicKey, setPublicKey] = useState(''),
    [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    if (!owner) return;
    const r = await fetch('/api/proactive');
    if (!r.ok) return;
    const data = await r.json();
    setItems(data.notifications);
    setPrefs((current) => current || data.preferences);
    setEmailConfigured(data.emailConfigured);
    setPublicKey(data.pushPublicKey);
  }, [owner]);
  useEffect(() => {
    setItems([]);
    setPrefs(null);
    void refresh().catch(() => {});
    const timer = setInterval(() => void refresh().catch(() => {}), 15000);
    return () => clearInterval(timer);
  }, [refresh]);
  const task = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not save check-ins.');
    } finally {
      setBusy(false);
    }
  };
  const enablePush = () =>
    task(async () => {
      if (
        !('serviceWorker' in navigator) ||
        !('PushManager' in window) ||
        !('Notification' in window)
      )
        throw Error('This browser does not support web push. Your in-app inbox still works.');
      if ((await Notification.requestPermission()) !== 'granted')
        throw Error('Browser notification permission was not granted.');
      const registration = await navigator.serviceWorker.register('/checkin-sw.js');
      await navigator.serviceWorker.ready;
      const binary = atob(publicKey.replaceAll('-', '+').replaceAll('_', '/'));
      const key = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
      const subscription =
        (await registration.pushManager.getSubscription()) ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key,
        }));
      await post({ action: 'subscribe', subscription: subscription.toJSON() });
      localStorage.setItem('mitrai-push-owner', owner!);
      setPrefs((p) => (p ? { ...p, pushEnabled: true } : p));
      notify('Browser check-ins enabled.');
    });
  if (!owner) return null;
  const unread = items.filter((item) => !item.read_at).length;
  return (
    <>
      <button
        className="button secondary small-button checkin-launcher"
        onClick={() => {
          setPrefs(null);
          setOpen(true);
          void refresh();
        }}
        aria-label={`Check-ins and inbox${unread ? `, ${unread} unread` : ''}`}
      >
        <Bell size={17} />
        {unread ? `${unread} new` : 'Check-ins'}
      </button>
      {open && (
        <Modal title="A little hello, at the right time" close={() => setOpen(false)}>
          <p className="muted">
            Your character can pick up an unfinished conversation or check back on something you
            shared. You choose when and where.
          </p>
          <div className="checkin-notices">
            {!items.length ? (
              <p className="soft-empty">
                No check-ins yet. Private conversations help your character find meaningful reasons
                to reconnect.
              </p>
            ) : (
              items.map((item) => (
                <article className="memory-card" key={item.id}>
                  <strong>{item.title}</strong>
                  <p>{item.text}</p>
                  <small>{new Date(item.created_at).toLocaleString()}</small>
                  <br />
                  <Link
                    href={item.url}
                    onClick={() => {
                      void post({ action: 'read', id: item.id }).then(refresh);
                      setOpen(false);
                    }}
                  >
                    Open conversation →
                  </Link>
                </article>
              ))
            )}
          </div>
          {prefs && (
            <form
              className="checkin-settings"
              onSubmit={(event) => {
                event.preventDefault();
                void task(async () => {
                  const result = await post({ action: 'preferences', preferences: prefs });
                  setPrefs(result.preferences);
                  notify('Check-in preferences saved.');
                });
              }}
            >
              <h3>Make room for a check-in</h3>
              <label>
                <input
                  type="checkbox"
                  checked={prefs.enabled}
                  onChange={(e) => setPrefs({ ...prefs, enabled: e.target.checked })}
                />{' '}
                Allow proactive check-ins
              </label>
              <label>
                After a quiet conversation
                <select
                  value={prefs.inactivityMinutes}
                  onChange={(e) =>
                    setPrefs({ ...prefs, inactivityMinutes: Number(e.target.value) })
                  }
                >
                  <option value={60}>1 hour</option>
                  <option value={90}>90 minutes</option>
                  <option value={120}>2 hours</option>
                </select>
              </label>
              <label>
                Maximum each day
                <select
                  value={prefs.dailyLimit}
                  onChange={(e) => setPrefs({ ...prefs, dailyLimit: Number(e.target.value) })}
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Timezone
                <input
                  value={prefs.timezone}
                  onChange={(e) => setPrefs({ ...prefs, timezone: e.target.value })}
                  placeholder="Asia/Kolkata"
                />
              </label>
              <div className="button-row">
                <label>
                  Quiet from
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={prefs.quietStart}
                    onChange={(e) => setPrefs({ ...prefs, quietStart: Number(e.target.value) })}
                  />
                </label>
                <label>
                  Until
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={prefs.quietEnd}
                    onChange={(e) => setPrefs({ ...prefs, quietEnd: Number(e.target.value) })}
                  />
                </label>
              </div>
              <label>
                <input
                  type="checkbox"
                  disabled={!emailConfigured}
                  checked={prefs.emailEnabled}
                  onChange={(e) => setPrefs({ ...prefs, emailEnabled: e.target.checked })}
                />{' '}
                Send me an email when a private check-in is waiting
              </label>
              <label>
                Your email
                <input
                  type="email"
                  value={prefs.email}
                  onChange={(e) => setPrefs({ ...prefs, email: e.target.value })}
                  placeholder="you@example.com"
                />
              </label>
              {!emailConfigured && (
                <small>
                  Email delivery needs Resend configured by the server owner. Your in-app inbox
                  works now.
                </small>
              )}
              <div className="button-row">
                <button
                  type="button"
                  className="button secondary small-button"
                  disabled={busy}
                  onClick={
                    prefs.pushEnabled
                      ? () =>
                          void task(async () => {
                            await post({ action: 'unsubscribe' });
                            const registration = await navigator.serviceWorker.getRegistration('/');
                            await (
                              await registration?.pushManager.getSubscription()
                            )?.unsubscribe();
                            setPrefs({ ...prefs, pushEnabled: false });
                          })
                      : enablePush
                  }
                >
                  {prefs.pushEnabled
                    ? 'Disable browser notifications'
                    : 'Enable browser notifications'}
                </button>
                <button className="button small-button" disabled={busy}>
                  {busy ? <Loader2 className="spin" size={16} /> : null}Save preferences
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
