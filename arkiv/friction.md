# Arkiv integration feedback

Implemented against `@arkiv-network/sdk` 1.0.1 on 6 November 2026. A real Carrot Kid root and two checkpoints have been read from Rabdi. No performance benchmark has been completed yet.

Observed development friction: `rabdi` requires an options object with an `accessKey` property. An omitted argument or `{}` fails TypeScript; fixed by explicit `rabdi({ accessKey: configuredKey || '' })`. Current SDK types caught this before runtime. A concise browser-injected-wallet example alongside the private-key quickstart would help owner-signed applications.

Public docs warn the no-key RPC is heavily rate limited. This is a documented constraint, not a measured failure in this build. The frontend and README expose access-key configuration; no outage frequency is invented.

Before submission: record actual first-write/read timings, wallet flow friction, expected/observed network failures and reproduction details using the configured endpoint.
