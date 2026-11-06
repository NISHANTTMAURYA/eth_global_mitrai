import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arkivPublic } from '../src/lib/arkiv';
test('Arkiv uses the keyed SDK URL unless an explicit custom RPC is configured', () => {
  const previousServerKey = process.env.ARKIV_ACCESS_KEY;
  const previousKey = process.env.NEXT_PUBLIC_ARKIV_ACCESS_KEY;
  const previousRpc = process.env.NEXT_PUBLIC_ARKIV_RPC;
  try {
    process.env.ARKIV_ACCESS_KEY = 'configuration-test-key';
    process.env.NEXT_PUBLIC_ARKIV_ACCESS_KEY = 'configuration-test-key';
    delete process.env.NEXT_PUBLIC_ARKIV_RPC;
    assert.equal(
      arkivPublic().transport.url,
      'https://rpc.rabdi.db-chain.testnet.arkiv.network/configuration-test-key',
    );
    process.env.NEXT_PUBLIC_ARKIV_RPC = 'https://example.test/custom';
    assert.equal(arkivPublic().transport.url, 'https://example.test/custom');
  } finally {
    if (previousServerKey === undefined) delete process.env.ARKIV_ACCESS_KEY;
    else process.env.ARKIV_ACCESS_KEY = previousServerKey;
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

test('0G is selected first when configured, with Vertex AI as fallback', () => {
  const old = {
    enabled: process.env.GEMINI_USE_VERTEX,
    project: process.env.GOOGLE_CLOUD_PROJECT,
    key: process.env.OG_API_KEY,
    og: process.env.OG_MODEL,
  };
  try {
    process.env.GEMINI_USE_VERTEX = 'true';
    process.env.GOOGLE_CLOUD_PROJECT = 'project-aa91aa00-7576-4735-b60';
    process.env.OG_API_KEY = 'optional';
    process.env.OG_MODEL = 'optional';
    assert.equal(configuredProvider(), '0G');
  } finally {
    if (old.enabled === undefined) delete process.env.GEMINI_USE_VERTEX;
    else process.env.GEMINI_USE_VERTEX = old.enabled;
    if (old.project === undefined) delete process.env.GOOGLE_CLOUD_PROJECT;
    else process.env.GOOGLE_CLOUD_PROJECT = old.project;
    if (old.key === undefined) delete process.env.OG_API_KEY;
    else process.env.OG_API_KEY = old.key;
    if (old.og === undefined) delete process.env.OG_MODEL;
    else process.env.OG_MODEL = old.og;
  }
});

import fs from 'node:fs';
import path from 'node:path';
import { VOICES, defaultVoiceForModel } from '../src/lib/voices';

test('Sarvam default voices have pre-generated static preview audio files', () => {
  assert.ok(VOICES.length >= 6);
  for (const v of VOICES) {
    const filePath = path.join(process.cwd(), 'public', v.previewUrl);
    assert.ok(fs.existsSync(filePath), `Static preview file missing for ${v.id}: ${filePath}`);
    const stat = fs.statSync(filePath);
    assert.ok(stat.size > 1000, `Static preview file is too small for ${v.id}`);
  }
});

test('Different character models are assigned distinct default voices', () => {
  assert.equal(defaultVoiceForModel('robot'), 'shubh');
  assert.equal(defaultVoiceForModel('fox'), 'simran');
  assert.equal(defaultVoiceForModel('human'), 'priya');
  assert.equal(defaultVoiceForModel('character-female-a'), 'ishita');
  assert.equal(defaultVoiceForModel('download:Alien'), 'aditya');
});
