import { cookies } from 'next/headers';
import { createSession, readSession } from './store';
export async function identity() {
  const token = (await cookies()).get('mitrai-session')?.value;
  return token ? readSession(token) : null;
}
export async function requireIdentity() {
  const owner = await identity();
  if (!owner) throw new Error('Connect a wallet or start a demo session first.');
  return owner;
}
export async function setIdentity(owner: string) {
  const token = crypto.randomUUID() + crypto.randomUUID();
  createSession(token, owner);
  (await cookies()).set('mitrai-session', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 86400,
    path: '/',
  });
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return;
  const configured = process.env.APP_ORIGIN;
  const expected = configured
    ? new URL(configured).origin
    : `${new URL(request.url).protocol}//${request.headers.get('host') || new URL(request.url).host}`;
  if (origin !== expected) throw new Error('Request origin is not allowed.');
}
