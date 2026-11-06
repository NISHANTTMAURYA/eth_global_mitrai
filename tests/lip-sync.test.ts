import { test } from 'node:test';
import assert from 'node:assert/strict';
import { speechWeights, validateSpeechTrack, vowelWeights } from '../src/lib/lip-sync';
import { generateSpeech } from '../src/lib/speech-audio';

test('audio cues preserve closures, blend vowels, seek deterministically and reset at silence/end', () => {
  const track = validateSpeechTrack({duration:1,mouthCues:[{start:0,end:.2,value:'A'},{start:.2,end:.5,value:'D'},{start:.5,end:.8,value:'F'},{start:.8,end:1,value:'X'}]});
  assert.deepEqual(speechWeights(track,.19),{pp:1});
  const blend = speechWeights(track,.48); assert.ok(blend.aa>0 && blend.ou>0);
  assert.deepEqual(speechWeights(track,.6),{ou:.85});
  assert.deepEqual(speechWeights(track,.19),{pp:1});
  assert.deepEqual(speechWeights(track,.9),{});
  assert.deepEqual(speechWeights(track,1),{}); assert.deepEqual(speechWeights(track,-1),{});
  assert.equal(vowelWeights({pp:1}).aa,0);
  assert.throws(()=>validateSpeechTrack({duration:1,mouthCues:[{start:.5,end:.2,value:'D'}]}));
});

test('real local speech produces MP3 and Rhubarb timing from the same WAV', {skip:process.env.TEST_LOCAL_SPEECH!=='1'}, async () => {
  const result = await generateSpeech('Hello. My name is Mitrai. Make a happy memory.', 'shubh',true);
  assert.match(result.audio,/^data:audio\/mpeg;base64,/);
  assert.ok(result.duration>1); assert.ok(result.mouthCues.length>5);
  assert.ok(result.mouthCues.some((cue)=>!['A','X'].includes(cue.value)));
  assert.equal(result.provider,'Local eSpeak NG');
  validateSpeechTrack(result);
});
