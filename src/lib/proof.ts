import { createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { publicCharacter, type Character } from './domain';
const directory = process.env.MITRAI_DATA_DIR || path.join(process.cwd(), '.data');
mkdirSync(directory, { recursive: true });
const file = path.join(directory, 'verifier.pem');
if (!existsSync(file)) {
  const keys = generateKeyPairSync('ed25519');
  try {
    writeFileSync(file, keys.privateKey.export({ type: 'pkcs8', format: 'pem' }), {
      flag: 'wx',
      mode: 0o600,
    });
  } catch (error) {
    if (!existsSync(file)) throw error;
  }
}
const key = createPrivateKey(readFileSync(file));
const publicKey = createPublicKey(key);
export const verifier = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
export function signSnapshot(c: Character) {
  const character = publicCharacter(c);
  const proof = sign(null, Buffer.from(JSON.stringify(character)), key).toString('base64');
  return { character, proof, verifier };
}
export function verifySnapshot(character: unknown, proof: string, issuer: string) {
  return (
    issuer === verifier &&
    verify(null, Buffer.from(JSON.stringify(character)), publicKey, Buffer.from(proof, 'base64'))
  );
}
