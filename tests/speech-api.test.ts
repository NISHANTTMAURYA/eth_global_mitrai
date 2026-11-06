import { test } from 'node:test';
import assert from 'node:assert/strict';
const base = process.env.MITRAI_SPEECH_TEST_URL;
test('speech endpoint authenticates, rejects Sunset/origin abuse and returns private timed audio', {skip:!base}, async () => {
  const request = async (body: unknown,cookie='',origin=base!) => fetch(`${base}/api/speech`,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,Cookie:cookie},body:JSON.stringify(body)});
  const body = {id:'milo',text:'Hello, my friend. Make a happy memory.'};
  assert.equal((await request(body)).status,400);
  const login = await fetch(`${base}/api/auth`,{method:'POST',headers:{'Content-Type':'application/json',Origin:base!},body:JSON.stringify({action:'demo'})});
  const cookie=login.headers.get('set-cookie')!.split(';')[0];
  assert.equal((await request(body,cookie,'https://untrusted.example')).status,400);
  assert.equal((await request({...body,id:'juniper'},cookie)).status,400);
  const result = await request(body,cookie);
  assert.equal(result.status,200);
  assert.equal(result.headers.get('cache-control'),'private, no-store');
  const speech = await result.json();
  assert.equal(speech.provider,'Local eSpeak NG');
  assert.match(speech.audio,/^data:audio\/mpeg;base64,/);
  assert.ok(speech.mouthCues.length>3); assert.ok(speech.duration>1);
});
