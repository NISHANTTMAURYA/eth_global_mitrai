import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
function gltf(file: string) {
  const data = fs.readFileSync(path.join(process.cwd(), 'public/models', file));
  assert.equal(data.readUInt32LE(0), 0x46546c67);
  return JSON.parse(data.subarray(20, 20 + data.readUInt32LE(12)).toString());
}
test('two primary characters have skeletal rigs and actual facial targets', () => {
  const robot = gltf('robot-expressive.glb');
  const human = gltf('pixiv-sample.vrm');
  assert.ok(robot.skins.length);
  assert.ok(human.skins.length);
  assert.ok(robot.animations.some((a: { name: string }) => a.name === 'Wave'));
  assert.ok(
    human.meshes.some((m: { extras?: { targetNames?: string[] } }) =>
      m.extras?.targetNames?.some((n) => n.includes('Fcl_MTH_A')),
    ),
  );
});
test('voice cue files cover actual speech intervals with ordered nonnegative timing', () => {
  for (const name of ['mira', 'milo']) {
    const file = JSON.parse(fs.readFileSync(`public/audio/${name}-greeting.json`, 'utf8'));
    assert.ok(file.mouthCues.length > 10);
    let end = 0;
    for (const cue of file.mouthCues) {
      assert.ok(cue.start >= end - 0.001);
      assert.ok(cue.end >= cue.start);
      assert.ok(cue.end <= file.metadata.duration + 0.05);
      end = cue.end;
    }
    assert.ok(fs.statSync(`public/audio/${name}-greeting.mp3`).size > 10000);
  }
});
