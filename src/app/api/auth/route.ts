import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyMessage, isAddress } from 'viem';
import { z } from 'zod';
import { identity, setIdentity, checkOrigin } from '@/lib/session';
import { putNonce, consumeNonce, deleteSession } from '@/lib/store';
export const runtime = 'nodejs';
export async function GET() {
  return NextResponse.json({ owner: await identity() });
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const data = await request.json();
    const action = z.enum(['demo', 'challenge', 'verify', 'logout']).parse(data.action);
    if (action === 'demo') {
      if (process.env.MITRAI_DEMO_MODE !== '1')
        throw new Error('Local demos are disabled. Connect an EVM wallet to continue.');
      await setIdentity(`demo:${crypto.randomUUID()}`);
      return NextResponse.json({ ok: true });
    }
    if (action === 'logout') {
      const jar = await cookies();
      const token = jar.get('mitrai-session')?.value;
      if (token) await deleteSession(token);
      jar.delete('mitrai-session');
      return NextResponse.json({ ok: true });
    }
    if (action === 'challenge') {
      const address = z.string().refine(isAddress).parse(data.address);
      const nonce = crypto.randomUUID();
      const message = `MitrAI login\nOrigin: ${request.headers.get('origin') || new URL(request.url).origin}\nWallet: ${address}\nNonce: ${nonce}\nExpires in 5 minutes. This does not authorize transactions.`;
      await putNonce(nonce, message);
      return NextResponse.json({ nonce, message });
    }
    const { nonce, signature, address } = z
      .object({
        nonce: z.string().uuid(),
        signature: z.string().regex(/^0x[0-9a-f]+$/i),
        address: z.string().refine(isAddress),
      })
      .parse(data);
    const message = await consumeNonce(nonce);
    if (
      !message ||
      !message.includes(`Wallet: ${address}\n`) ||
      !(await verifyMessage({
        address: address as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      }))
    )
      throw new Error('Signature invalid or login expired.');
    await setIdentity(address.toLowerCase());
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Login failed' },
      { status: 400 },
    );
  }
}
