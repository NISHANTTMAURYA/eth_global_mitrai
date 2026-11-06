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

import { DEFAULT_OG_API_URL, configuredProvider } from '../src/lib/chat';
test('0G defaults to testnet, not the paid mainnet router', () => {
  assert.equal(DEFAULT_OG_API_URL, 'https://router-api-testnet.integratenetwork.work/v1');
});

test('Bedrock is selected before optional 0G when configured', () => {
  const old = { enabled: process.env.ENABLE_BEDROCK, model: process.env.AWS_BEDROCK_MODEL, key: process.env.OG_API_KEY, og: process.env.OG_MODEL };
  try {
    process.env.ENABLE_BEDROCK = 'true';
    process.env.AWS_BEDROCK_MODEL = 'test-model';
    process.env.OG_API_KEY = 'optional';
    process.env.OG_MODEL = 'optional';
    assert.equal(configuredProvider(), 'Amazon Bedrock');
  } finally {
    if (old.enabled === undefined) delete process.env.ENABLE_BEDROCK; else process.env.ENABLE_BEDROCK = old.enabled;
    if (old.model === undefined) delete process.env.AWS_BEDROCK_MODEL; else process.env.AWS_BEDROCK_MODEL = old.model;
    if (old.key === undefined) delete process.env.OG_API_KEY; else process.env.OG_API_KEY = old.key;
    if (old.og === undefined) delete process.env.OG_MODEL; else process.env.OG_MODEL = old.og;
  }
});
