'use client';
import { useEffect, useState } from 'react';
import { Wallet, ChevronRight, Check, ExternalLink, Copy, LogOut, Loader2 } from 'lucide-react';
import { formatEther } from 'viem';
import { arkivPublic, ensureRabdi } from '@/lib/arkiv';
import { getWalletProvider, useBrowserWallets, type BrowserWallet } from '@/lib/browser-wallet';
import { shortAddress } from '@/lib/domain';
export default function WalletPanel({
  owner,
  busy,
  connect,
  disconnect,
  notify,
}: {
  owner: string | null;
  busy: boolean;
  connect: (wallet: BrowserWallet) => void;
  disconnect: () => void;
  notify: (text: string) => void;
}) {
  const wallets = useBrowserWallets(),
    [balance, setBalance] = useState<string | null>(null),
    [switching, setSwitching] = useState(false);
  useEffect(() => {
    if (!owner?.startsWith('0x')) return;
    let mounted = true;
    arkivPublic()
      .getBalance({ address: owner as `0x${string}` })
      .then((v) => {
        if (mounted)
          setBalance(
            Number(formatEther(v)).toLocaleString(undefined, { maximumFractionDigits: 4 }),
          );
      })
      .catch(() => {
        if (mounted) setBalance('Unavailable');
      });
    return () => {
      mounted = false;
    };
  }, [owner]);
  return (
    <div className="wallet-panel">
      {owner?.startsWith('0x') ? (
        <>
          <div className="wallet-identity">
            <div className="wallet-avatar">
              <Wallet size={24} />
            </div>
            <strong>{shortAddress(owner)}</strong>
            <span>
              <Check size={12} /> Connected
            </span>
          </div>
          <button
            className="wallet-address"
            onClick={() =>
              void navigator.clipboard.writeText(owner).then(() => notify('Wallet address copied.'))
            }
          >
            {owner}
            <Copy size={13} />
          </button>
          <div className="wallet-network">
            <span className="network-mark">A</span>
            <div>
              <strong>Arkiv Rabdi</strong>
              <small>
                Testnet · {balance ?? 'Checking balance…'}
                {balance ? ' tGLM' : ''}
              </small>
            </div>
            <button
              disabled={switching}
              onClick={async () => {
                const p = getWalletProvider();
                if (!p) {
                  notify('Reconnect your browser wallet.');
                  return;
                }
                setSwitching(true);
                try {
                  await ensureRabdi(p);
                  notify('Rabdi is ready.');
                } catch (e) {
                  notify(e instanceof Error ? e.message : 'Could not switch network.');
                } finally {
                  setSwitching(false);
                }
              }}
            >
              {switching ? <Loader2 size={14} className="spin" /> : 'Use network'}
            </button>
          </div>
          <div className="wallet-links">
            <a href="https://hub.arkiv.network/faucet" target="_blank" rel="noreferrer">
              Get test tokens <ExternalLink size={12} />
            </a>
            <a
              href={`https://rabdi.explorer.arkiv.network/address/${owner}`}
              target="_blank"
              rel="noreferrer"
            >
              View wallet <ExternalLink size={12} />
            </a>
          </div>
          <button className="connect-choice" onClick={disconnect} disabled={busy}>
            <LogOut size={18} />
            <div>
              <strong>Disconnect</strong>
              <small>End this app session</small>
            </div>
          </button>
        </>
      ) : (
        <>
          <p className="muted">
            Choose your wallet to begin. A signature connects your account; each blockchain action
            gets its own approval.
          </p>
          <div className="wallet-options">
            {wallets.map((wallet) => (
              <button
                key={wallet.id}
                className="connect-choice"
                disabled={busy}
                onClick={() => connect(wallet)}
              >
                {wallet.icon ? (
                  <img src={wallet.icon} alt="" width={32} height={32} />
                ) : (
                  <Wallet size={26} />
                )}
                <div>
                  <strong>{wallet.name}</strong>
                  <small>Available in this browser</small>
                </div>
                {busy ? <Loader2 className="spin" size={17} /> : <ChevronRight size={17} />}
              </button>
            ))}
          </div>
          {!wallets.length && (
            <div className="wallet-empty">
              <Wallet size={30} />
              <h3>Open MitrAI in your wallet’s browser.</h3>
              <p>
                Use the Brave browser where your wallet is connected, or a browser with MetaMask or
                another Ethereum wallet extension.
              </p>
              <a
                className="text-link"
                href="https://metamask.io/download/"
                target="_blank"
                rel="noreferrer"
              >
                Get MetaMask <ExternalLink size={13} />
              </a>
            </div>
          )}
        </>
      )}
      <p className="wallet-footnote">
        Your wallet holds your character’s Arkiv ownership. Private conversations stay in your
        account.
      </p>
    </div>
  );
}
