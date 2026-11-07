'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  ArrowUpRight,
  Plus,
  Sparkles,
  X,
  LockKeyhole,
  Leaf,
  Loader2,
  Wallet,
  ChevronRight,
  Settings2,
  Menu,
  Info,
} from 'lucide-react';
import { lifecycle, shortAddress, type Character } from '@/lib/domain';
import { api, auth } from '@/lib/client';
import { Flower, Modal } from './ui';
import type { Address, Hex } from 'viem';
import ExploreView from './explore-view';
import CreateView from './create-view';
import HomeView from './home-view';
import CharacterView from './character-view';
import WalletPanel from './wallet-panel';
import ProactiveInbox from './proactive-inbox';
import { getWalletProvider, selectWallet, type BrowserWallet } from '@/lib/browser-wallet';
export default function MitraiApp() {
  const pathname = usePathname();
  const router = useRouter();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [owner, setOwner] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState('Scripted demo');
  const [connect, setConnect] = useState(false);
  const [demoEnabled, setDemoEnabled] = useState(false);
  const [settings, setSettings] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [menu, setMenu] = useState(false);
  const refresh = useCallback(async () => {
    const response = await fetch('/api/app');
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    setCharacters(result.characters);
    setOwner(result.owner);
    setProvider(result.provider);
    setDemoEnabled(!!result.demoEnabled);
    setLoading(false);
  }, []);
  useEffect(() => {
    refresh().catch((e) => {
      setToast(e.message);
      setLoading(false);
    });
  }, [refresh]);
  useEffect(() => {
    setMenu(false);
  }, [pathname]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 6000);
    return () => clearTimeout(timer);
  }, [toast]);
  const notify = (text: string) => setToast(text);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };
  const startDemo = () =>
    run(async () => {
      await auth('demo');
      await refresh();
      setConnect(false);
      notify('Demo session ready. Your characters are saved locally on this server.');
    });
  const wallet = (chosen: BrowserWallet) =>
    run(async () => {
      selectWallet(chosen);
      const ethereum = chosen.provider;
      if (!ethereum)
        throw new Error('No browser wallet found. Install an EVM wallet or try the demo.');
      const accounts = (await ethereum.request({ method: 'eth_requestAccounts' })) as string[];
      const address = accounts[0];
      const challenge = await auth('challenge', { address });
      const messageHex =
        '0x' +
        Array.from(new TextEncoder().encode(challenge.message), (n: number) =>
          n.toString(16).padStart(2, '0'),
        ).join('');
      const signature = await ethereum.request({
        method: 'personal_sign',
        params: [messageHex as Hex, address as Address],
      });
      await auth('verify', { address, signature, nonce: challenge.nonce });
      await refresh();
      setConnect(false);
      notify('Wallet connected. You authorize each Arkiv write.');
    });
  const mine = characters.find(
    (c) =>
      c.owner === owner &&
      (lifecycle(c).alive || c.activation === 'draft' || c.activation === 'submitted'),
  );
  useEffect(() => {
    // Only redirect to draft completion if on /my-character and creation is incomplete
    if (!loading && pathname === '/my-character' && mine && !mine.entityKey && !mine.demo)
      router.replace('/create');
  }, [loading, pathname, mine?.id, mine?.entityKey, router]);
  const mode = owner?.startsWith('demo:') ? 'Demo collector' : owner ? shortAddress(owner) : null;
  useEffect(() => {
    if (!owner?.startsWith('0x')) return;
    const p = getWalletProvider() as ReturnType<typeof getWalletProvider> & {
      on?: (event: string, listener: (accounts: string[]) => void) => void;
      removeListener?: (event: string, listener: (accounts: string[]) => void) => void;
    };
    const changed = (accounts: string[]) => {
      if (!accounts.some((a) => a.toLowerCase() === owner)) {
        void auth('logout').then(refresh);
        setConnect(true);
      }
    };
    p?.on?.('accountsChanged', changed);
    return () => p?.removeListener?.('accountsChanged', changed);
  }, [owner, refresh]);
  const ensure = () => {
    if (!owner) {
      setConnect(true);
      return false;
    }
    return true;
  };
  const parts = pathname.split('/').filter(Boolean);
  const detailId = ['characters', 'companion', 'legacy', 'publish', 'transfer'].includes(parts[0])
    ? parts[1]
    : undefined;
  const selected = characters.find((c) => c.id === detailId);
  let content;
  if (!parts.length)
    content =
      loading ? (
        <div className="empty">
          <Loader2 className="spin" />
          Finding your story…
        </div>
      ) : (
        <HomeView
          legacy={
            characters
              .filter((c) => c.owner === owner && (c.entityKey || c.demo) && !lifecycle(c).alive)
              .sort((a, b) => (b.birth?.at ?? b.createdAt) - (a.birth?.at ?? a.createdAt))[0]
          }
        />
      );
  else if (
    parts[0] === 'create' ||
    (parts[0] === 'my-character' && mine && !mine.demo && !mine.entityKey)
  )
    content = (
      <CreateView
        owner={owner}
        mine={mine}
        characters={characters}
        connect={() => setConnect(true)}
        refresh={refresh}
        notify={notify}
      />
    );
  else if (parts[0] === 'my-character')
    content = loading ? (
      <div className="empty">
        <Loader2 className="spin" />
        Loading your story…
      </div>
    ) : mine ? (
      <CharacterView
        key={mine.id}
        c={mine}
        owner={owner}
        refresh={refresh}
        notify={notify}
        ensure={ensure}
        initialTab="conversation"
      />
    ) : (
      <div className="empty-page">
        <Flower size={64} />
        <p className="eyebrow">A LITTLE ROOM FOR POSSIBILITY</p>
        <h1>
          Your story starts
          <br />
          with someone new.
        </h1>
        <p>Create a character, or discover one whose story you’d like to continue.</p>
        <div className="button-row">
          <Link className="button primary" href="/create">
            Create a character <Plus size={16} />
          </Link>
          <Link className="button secondary" href="/explore">
            Explore characters
          </Link>
        </div>
      </div>
    );
  else if (detailId)
    content =
      selected && selected.owner === owner && !selected.demo && !selected.entityKey ? (
        <CreateView
          owner={owner}
          mine={selected}
          characters={characters}
          connect={() => setConnect(true)}
          refresh={refresh}
          notify={notify}
        />
      ) : selected ? (
        <CharacterView
          key={selected.id}
          c={selected}
          owner={owner}
          refresh={refresh}
          notify={notify}
          ensure={ensure}
          initialTab={
            parts[2] === 'mind' ? 'mind' : parts[2] === 'history' ? 'history' : 'conversation'
          }
          autoPublish={parts[0] === 'publish'}
          autoTransfer={parts[0] === 'transfer'}
        />
      ) : (
        <div className="empty-page">
          <h1>{loading ? 'Finding this character…' : 'This story is private.'}</h1>
          <p>Connect as its owner, or explore the public collection.</p>
          <Link className="button primary" href="/explore">
            Back to explore
          </Link>
        </div>
      );
  else
    content = (
      <ExploreView
        characters={characters}
        loading={loading}
        legacyOnly={parts[0] === 'legacies'}
        home={parts.length === 0}
        owner={owner}
        refresh={refresh}
        notify={notify}
      />
    );
  return (
    <>
      <header className="site-header">
        <div className="nav-wrap">
          <Link href="/" className="brand" aria-label="mitrai.">
            <img
              src="/brand/mitrai-logo-dark.png?v=2"
              alt="mitrai."
              height={36}
              className="brand-logo"
            />
          </Link>
          <nav className={menu ? 'nav open' : 'nav'} aria-label="Main navigation">
            <Link
              className={!parts.length || parts[0] === 'explore' ? 'active' : ''}
              href="/explore"
            >
              Explore MitrAI
            </Link>
            <Link className={parts[0] === 'my-character' ? 'active' : ''} href="/my-character">
              My MitrAI
            </Link>
            <Link className={parts[0] === 'legacies' ? 'active' : ''} href="/legacies">
              Legacies <Leaf size={13} />
            </Link>
          </nav>
          <div className="nav-actions">
            <button
              className="icon-button settings-button"
              onClick={() => setSettings(true)}
              aria-label="Integration settings"
            >
              <Settings2 size={18} />
            </button>
            <button
              className={`button ${mode ? 'connected' : 'secondary'} wallet-button`}
              onClick={() => setConnect(true)}
            >
              {mode ? (
                <>
                  <span className="online-dot" />
                  {mode}
                </>
              ) : (
                <>
                  <Wallet size={15} />
                  Connect wallet
                </>
              )}
            </button>
            <button
              className="icon-button mobile-menu"
              onClick={() => setMenu(!menu)}
              aria-label="Toggle navigation"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </header>
      <main>{content}</main>
      {owner && <ProactiveInbox owner={owner} notify={notify} />}
      <footer className="site-footer">
        <Link className="brand small" href="/" aria-label="mitrai.">
          <img
            src="/brand/mitrai-logo-dark.png?v=2"
            alt="mitrai."
            height={24}
            className="brand-logo small"
          />
        </Link>
        <span>A little life. A world of possibility.</span>
        <div>
          <span className="status-dot" />{' '}
          {owner?.startsWith('0x')
            ? 'Wallet connected'
            : owner
              ? 'Local demo'
              : 'Arkiv Rabdi testnet'}
          <span className="footer-divider">/</span>
          <button onClick={() => setSettings(true)}>
            Built with Arkiv <ArrowUpRight size={13} />
          </button>
        </div>
      </footer>
      {toast && (
        <div className="toast" role="status">
          <Info size={18} />
          <span>{toast}</span>
          <button className="icon-button" onClick={() => setToast('')} aria-label="Dismiss message">
            <X size={15} />
          </button>
        </div>
      )}
      {connect && (
        <Modal
          title={owner ? 'Your wallet' : 'Connect your wallet'}
          close={() => setConnect(false)}
        >
          <WalletPanel
            owner={owner}
            busy={busy}
            connect={wallet}
            notify={notify}
            disconnect={() =>
              void run(async () => {
                await auth('logout');
                await refresh();
                setConnect(false);
              })
            }
          />
          {demoEnabled && (
            <button className="text-link" onClick={startDemo} disabled={busy}>
              Try the local development demo
            </button>
          )}
        </Modal>
      )}
      {settings && (
        <Modal title="Behind the little life" close={() => setSettings(false)}>
          <div className="integration-row">
            <div>
              <strong>Arkiv · Rabdi testnet</strong>
              <p>Real SDK reads and owner-signed writes. Wallet and test gas required.</p>
            </div>
            <span className="pill">Configurable</span>
          </div>
          <div className="integration-row">
            <div>
              <strong>Conversation engine</strong>
              <p>
                {provider === 'Amazon Bedrock'
                  ? 'Bedrock is the primary model. Requests run server-side in your AWS region.'
                  : provider === '0G'
                    ? '0G testnet inference is configured as the optional fallback.'
                    : 'Scripted rehearsal responses. Configure Bedrock to enable model inference.'}
              </p>
            </div>
            <span className="pill">{provider}</span>
          </div>
          <div className="integration-row">
            <div>
              <strong>3D & voice</strong>
              <p>
                Locally hosted licensed rigs, body gestures and mouth animation. Browser voice is
                approximate; greeting audio uses timed cues.
              </p>
            </div>
          </div>
          <p className="muted small-text">
            This build does not include payments, World verification or Swarm. No token purchases or
            paid sales are simulated.
          </p>
          <p className="muted small-text">
            Models: RobotExpressive by Quaternius / Tomás Laulhé and Don McCurdy (CC0). Human sample
            © 2022 pixiv Inc. (VRM Public License 1.0). Fox by PixelMannen, rigging by tomkranis,
            conversion by AsoboStudio / scurest (
            <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
              CC BY 4.0
            </a>
            ). Shared model art is not exclusive.
          </p>
          <a
            className="text-link"
            href="https://ethglobal.com/events/mumbai/prizes/arkiv"
            target="_blank"
            rel="noreferrer"
          >
            Arkiv prize requirements <ArrowUpRight size={15} />
          </a>
        </Modal>
      )}
    </>
  );
}
