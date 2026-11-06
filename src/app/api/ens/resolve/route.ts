import { NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { resolveEnsName } from '@/lib/ens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get('address') || '';
  if (!isAddress(address)) return NextResponse.json({ error: 'Invalid wallet address.' }, { status: 400 });
  return NextResponse.json({ address, name: await resolveEnsName(address) });
}
