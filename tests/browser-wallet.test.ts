import { test } from 'node:test';
import assert from 'node:assert/strict';
test('multiple injected wallets are discovered and transactions use the wallet the user selected', async () => {
  const target = new EventTarget();
  const a = { request: async () => ['a'] },
    b = { request: async () => ['b'] };
  const saved = new Map<string, string>();
  Object.assign(globalThis, {
    window: Object.assign(target, { ethereum: a }),
    sessionStorage: {
      getItem: (key: string) => saved.get(key) || null,
      setItem: (key: string, value: string) => saved.set(key, value),
    },
  });
  const { discoveredWallets, selectWallet, getWalletProvider } =
    await import('../src/lib/browser-wallet');
  discoveredWallets();
  const announce = (provider: unknown, rdns: string, name: string) =>
    target.dispatchEvent(
      new CustomEvent('eip6963:announceProvider', {
        detail: { provider, info: { rdns, name, icon: 'https://untrusted.example/icon' } },
      }),
    );
  announce(a, 'io.wallet.a', 'Wallet A');
  announce(b, 'io.wallet.b', 'Wallet B');
  announce(b, 'io.wallet.b', 'Wallet B');
  const options = discoveredWallets();
  assert.equal(
    options.length,
    2,
    'legacy and announced versions of the same provider are deduplicated',
  );
  selectWallet(options.find((w) => w.id === 'io.wallet.b')!);
  assert.equal(getWalletProvider(), b, 'does not silently send the transaction to window.ethereum');
  assert.equal(saved.get('mitrai-wallet'), 'io.wallet.b');
  assert.equal(options[0].icon, undefined, 'only wallet-provided data image icons are rendered');
});
