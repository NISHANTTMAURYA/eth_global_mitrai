export async function register() {
  if (
    process.env.NEXT_RUNTIME === 'nodejs' &&
    process.env.NEXT_PHASE !== 'phase-production-build' &&
    process.env.PROACTIVE_DISABLED !== '1'
  ) {
    const { startProactiveWorker } = await import('./lib/proactive-engine');
    startProactiveWorker();
    const { startChainLedger } = await import('./lib/chain-ledger');
    startChainLedger();
  }
}
