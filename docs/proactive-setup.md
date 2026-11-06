# Running character check-ins

The engine runs once per minute in a persistent Next.js Node server, started through `src/instrumentation.ts` or the authenticated inbox route. Jobs, leases, messages and channel outboxes live in SQLite, so they survive restarts. Keep `.data`/`MITRAI_DATA_DIR` on durable storage. A browser tab does not need to stay open for the server to generate a check-in.

Run a separate worker if preferred:

```sh
npm run proactive:worker
# One pass against the configured database:
npm run proactive:once
```

Multiple worker instances lease jobs through SQLite; a notification ID deduplicates the resulting message. For serverless hosting, use a host scheduler to POST to `/api/proactive/run` every minute with `Authorization: Bearer <PROACTIVE_CRON_SECRET>`. Request-only runtimes do not keep JavaScript intervals alive. Set `PROACTIVE_DISABLED=1` for tests or to disable embedded intervals. Preference controls independently prevent delivery.

## Controls in the app

Open **Check-ins** at the bottom right while signed in. Choose 60, 90 or 120 minutes for a quiet conversation, a daily limit, timezone and quiet hours. Default: 90 minutes, at most two messages per rolling 24 hours, quiet from 22:00 to 08:00 Asia/Kolkata. Set equal quiet-hour values to disable that window. After one unanswered inactivity check-in, the engine waits for a new user turn. A separately grounded event plan can still merit a later check-in, within the same limits. The **Mind** tab shows private observations, evidence, slow style changes and plans, with cancellation controls.

Only private owner conversations cultivate continuity. Public auditions do not create memories, growth or proactive jobs. Transfer or Sunset prevents pending delivery. A natural-language request to stop check-ins can be emitted by the planner as a grounded cancellation; the explicit UI toggle is the reliable control if the model misses that intent.

## Resend

Set server-only `RESEND_API_KEY`, and `RESEND_FROM` on a verified Resend sender domain. Restart the server. The user then explicitly enables email and supplies their address in Check-ins. Outgoing email is a generic notice linking to the private inbox; conversation text, mood and event details are not included. Keys are never sent to the browser. Failed sends retry from a durable outbox with a stable `Idempotency-Key` and expire before Resend's 24-hour deduplication window closes. No real recipient email was sent during implementation. Real key/sender configuration and delivery testing are still required.

## Browser push

Click **Enable browser notifications**. Permission is requested only on that click. The service worker `/checkin-sw.js` handles background notifications and opens the same-origin private conversation on click. HTTPS is required except for localhost; browser/platform support and installation requirements vary. Push payloads are generic private-inbox notices. Expired subscriptions are removed. Set `VAPID_SUBJECT` to a real contact URI before hosting. Keys can be supplied through `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`; otherwise a persistent private key pair is generated in `MITRAI_DATA_DIR` with mode 0600. Back it up with the database. No actual browser permission was requested and no real web-push delivery was claimed during tests.

## Memory and privacy

`conversation_events` archives future accepted private messages, while `messages` retains the latest 100 for quick display. Existing latest-window messages are migrated into the archive when that owner conversation next runs; messages already discarded before this change cannot be recovered. `conversation_search` provides scoped full-text retrieval. `private_minds` stores grounded observations and adaptation evidence. Private records never enter `publicCharacter()` or signed Arkiv snapshots. Saving a local checkpoint can adopt the bounded general trait values; publication still needs the owner's Arkiv signature.

This is a single-host SQLite design, without application-level database encryption at rest. Server administrators can read the file. Sender addresses, push subscriptions and private plans also stay off chain. Multi-host deployment needs a shared durable database/queue and operational monitoring rather than separate ephemeral SQLite copies.
