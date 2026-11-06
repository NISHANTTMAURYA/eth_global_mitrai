import { processProactive, drainDeliveries } from '../src/lib/proactive-engine';
let running = false;
async function tick() {
  if (running) return;
  running = true;
  try {
    const result = await processProactive();
    await drainDeliveries();
    console.log(`Check-in worker: ${result.delivered} new private messages.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Worker unavailable.');
  } finally {
    running = false;
  }
}
await tick();
if (!process.argv.includes('--once')) {
  const timer = setInterval(() => void tick(), 60000);
  for (const signal of ['SIGINT', 'SIGTERM'] as const)
    process.once(signal, () => {
      clearInterval(timer);
      process.exit(0);
    });
}
