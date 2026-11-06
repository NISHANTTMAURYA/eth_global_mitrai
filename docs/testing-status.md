# Test status

The default `npm test` suite runs only tests that do not write application data. Three old files (`brain-events.test.ts`, `proactive-engine.test.ts`, `product-flow.test.ts`) still call the removed synchronous SQLite store. They cannot prove the new async Supabase behavior and are excluded until rewritten against an isolated `TEST_DATABASE_URL`. The runner deliberately does **not** fall back to the live `DATABASE_URL`, so tests cannot mutate the user's project data.

`npm run test:integration` requires a separate `TEST_DATABASE_URL` and exercises the HTTP path. A production build and TypeScript check are additional gates. The community GET, Arkiv root/checkpoint reads, 0G inference, ENS route, and duplicate suppression were also smoke-checked live on 6 November 2026; see the root README for limits.
