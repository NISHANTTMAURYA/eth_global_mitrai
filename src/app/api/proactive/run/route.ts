import { timingSafeEqual } from 'node:crypto';
import { processProactive, drainDeliveries } from '@/lib/proactive-engine';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  const expected = process.env.PROACTIVE_CRON_SECRET;
  const supplied = request.headers.get('authorization')?.replace(/^Bearer /, '') || '';
  if (
    !expected ||
    supplied.length !== expected.length ||
    !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
  )
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const result = await processProactive();
  await drainDeliveries();
  return Response.json(result);
}
