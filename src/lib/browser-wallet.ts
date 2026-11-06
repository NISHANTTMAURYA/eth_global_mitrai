'use client';
import { useSyncExternalStore } from 'react';
import type { EIP1193Provider } from 'viem';
export type BrowserWallet = {
  id: string;
  name: string;
  icon?: string;
  provider: EIP1193Provider;
};
let wallets: BrowserWallet[] = [],
  selected: EIP1193Provider | undefined,
  started = false;
const empty: BrowserWallet[] = [],
  listeners = new Set<() => void>();
function add(wallet: BrowserWallet) {
  if (wallets.some((w) => w.id === wallet.id)) return;
  wallets = [...wallets.filter((w) => w.provider !== wallet.provider), wallet];
  try {
    if (sessionStorage.getItem('mitrai-wallet') === wallet.id) selected = wallet.provider;
  } catch {}
  listeners.forEach((l) => l());
}
function discover() {
  if (started || typeof window === 'undefined') return;
  started = true;
  window.addEventListener('eip6963:announceProvider', (event) => {
    const detail = (event as CustomEvent).detail;
    if (
      !detail?.provider ||
      typeof detail.provider.request !== 'function' ||
      typeof detail.info?.rdns !== 'string' ||
      typeof detail.info?.name !== 'string'
    )
      return;
    add({
      id: detail.info.rdns,
      name: detail.info.name.slice(0, 50),
      icon:
        typeof detail.info.icon === 'string' && detail.info.icon.startsWith('data:image/')
          ? detail.info.icon
          : undefined,
      provider: detail.provider,
    });
  });
  window.dispatchEvent(new Event('eip6963:requestProvider'));
  // Older extensions expose only the original EIP-1193 injection.
  const injected = window.ethereum as
    | (EIP1193Provider & {
        providers?: EIP1193Provider[];
        isBraveWallet?: boolean;
        isMetaMask?: boolean;
      })
    | undefined;
  for (const provider of injected?.providers || (injected ? [injected] : [])) {
    if (wallets.some((w) => w.provider === provider)) continue;
    const flags = provider as typeof injected;
    add({
      id: flags?.isBraveWallet
        ? 'com.brave.wallet'
        : flags?.isMetaMask
          ? 'io.metamask'
          : 'injected',
      name: flags?.isBraveWallet
        ? 'Brave Wallet'
        : flags?.isMetaMask
          ? 'MetaMask'
          : 'Browser wallet',
      provider,
    });
  }
}
export function selectWallet(wallet: BrowserWallet) {
  selected = wallet.provider;
  try {
    sessionStorage.setItem('mitrai-wallet', wallet.id);
  } catch {}
}
export function getWalletProvider() {
  discover();
  return selected || (typeof window !== 'undefined' ? window.ethereum : undefined);
}
export function discoveredWallets() {
  discover();
  return wallets;
}
export function useBrowserWallets() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      discover();
      return () => {
        listeners.delete(listener);
      };
    },
    () => wallets,
    () => empty,
  );
}
