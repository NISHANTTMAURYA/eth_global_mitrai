import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arkivPublic } from '../src/lib/arkiv';
test('Arkiv uses the keyed SDK URL unless an explicit custom RPC is configured', () => {
  const previousKey = process.env.NEXT_PUBLIC_ARKIV_ACCESS_KEY;
  const previousRpc = process.env.NEXT_PUBLIC_ARKIV_RPC;
  try {
    process.env.NEXT_PUBLIC_ARKIV_ACCESS_KEY = 'configuration-test-key';
    delete process.env.NEXT_PUBLIC_ARKIV_RPC;
    assert.equal(
      arkivPublic().transport.url,
      'https://rpc.rabdi.db-chain.testnet.arkiv.network/configuration-test-key',
    );
    process.env.NEXT_PUBLIC_ARKIV_RPC = 'https://example.test/custom';
    assert.equal(arkivPublic().transport.url, 'https://example.test/custom');
  } finally {
    if (previousKey === undefined) delete process.env.NEXT_PUBLIC_ARKIV_ACCESS_KEY;
    else process.env.NEXT_PUBLIC_ARKIV_ACCESS_KEY = previousKey;
    if (previousRpc === undefined) delete process.env.NEXT_PUBLIC_ARKIV_RPC;
    else process.env.NEXT_PUBLIC_ARKIV_RPC = previousRpc;
  }
});

import { DEFAULT_OG_API_URL } from '../src/lib/chat';
test('0G defaults to testnet, not the paid mainnet router', () => {
  assert.equal(DEFAULT_OG_API_URL, 'https://router-api-testnet.integratenetwork.work/v1');
});
