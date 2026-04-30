# E17 — Sync + webhook (incremental only)

**Status:** Approved 2026-04-29 (round 5 sole brief; backfill explicitly dropped from scope)
**Brief written:** 2026-04-29
**Repo:** `constance-conservation/cc-dashboard`
**Branch:** `feature/reporting-port-e17` (off `main`)
**Predecessor:** E16 (merged `84bdbec`).
**Audit context:** `docs/audit/standalone_feature_inventory.md` §4.1 (incremental sync), §4.2 (webhook), §1.1 (parser + writer pipeline).
**Estimate:** ~2–3 days. Single PR. Optional intermediate draft PR after the processing-core milestone (see Workstream procedure step 11).

---

## Goal

Port the standalone's **incremental sync** + **webhook handler** into cc-dashboard so that new and updated SC inspections flow into Supabase without the standalone running. After this lands, cc-dashboard owns the data ingestion path and the standalone deploy can be retired in E18.

**Backfill is OUT of scope.** The standalone has been running since project inception; historical data is already in Supabase. Going forward only the *incremental* delta matters. If a one-shot full re-backfill is ever needed (data corruption, schema reset), run the standalone's `npm run sync:backfill` from the local clone at `~/Desktop/constance-reporting/` — the clone survives even after E18 archives the GitHub repo. That's a once-in-a-blue-moon operation.

---

## Scope (in this brief)

- **Port the processing core** — the shared parser + writer + pipeline chain that turns a raw SC audit JSON into Supabase rows. Used by both sync and webhook.
  - `src/parser/` (~1840 LOC) → `lib/reporting/ingestion/parser/`
  - `src/db/lookups.ts` + `src/db/writer.ts` (~849 LOC) → `lib/reporting/ingestion/{lookups,writer}.ts`
  - `src/pipeline/process_inspection.ts` (~86 LOC) → `lib/reporting/ingestion/process_inspection.ts`
- **Port the SC API client** — `src/sync/sc_api_client.ts` (~180 LOC) → `lib/reporting/ingestion/sc_api_client.ts`
- **Port the scheduled sync** — `src/sync/scheduled_sync.ts` (~332 LOC) → `lib/reporting/ingestion/scheduled_sync.ts`. **Strip the `--backfill` / `--backfill-from` paths entirely.** Keep only the high-water-mark incremental loop.
- **Port the webhook handler** — `src/webhook/handler.ts` (~208 LOC) → `lib/reporting/ingestion/webhook_handler.ts`. Keep the platform-agnostic core; drop the Node.js HTTP adapter (`handleHttpRequest`, `readBody`).
- **Port the existing tests** — `parser_integration.test.ts`, `free_text_parsers.test.ts`, `normalizers.test.ts`, `writer.test.ts`, `sc_api_client.test.ts`, `scheduled_sync.test.ts`, `webhook/handler.test.ts` — into `lib/reporting/ingestion/__tests__/`. Add tests for any new code paths.
- **New Vercel Cron route** at `app/api/cron/sync-sc-inspections/route.ts`:
  - Bearer-token auth via the existing `CRON_SECRET` env var (same pattern as E16's generate-reports route).
  - Calls `runSync()` from the ported `scheduled_sync.ts`.
  - Returns 200 with the sync run summary (`{ processed, skipped, failed, errors }`).
- **New webhook route** at `app/api/webhooks/sc/route.ts`:
  - POST handler that parses the body, calls `handleWebhookPayload(payload)` from the ported handler.
  - Uses Next.js 16's `after()` API (from `next/server`) to run `processInspection(auditId)` after the response is sent — preserves the standalone's fire-and-forget intent without exceeding SC's webhook timeout.
  - Optional signature verification — see open questions.
- **Add the Vercel Cron schedule** to `vercel.json`:
  - `/api/cron/sync-sc-inspections` — every 15 minutes (`*/15 * * * *`).
  - Append to the existing `crons` array; do NOT remove the `generate-reports` entry.
- **Document env vars** required for ingestion in a top-of-file comment in `lib/reporting/ingestion/index.ts` (a small barrel export):
  - `SAFETY_CULTURE_API_TOKEN`
  - `SC_API_BASE_URL` (optional, default `https://api.safetyculture.io`)
  - `CRON_SECRET` (existing from E16)
  - `DEFAULT_ORGANIZATION_ID` is NOT required — read the org id from the `organizations` table at runtime (single-tenant pattern from E15b).

## Out of scope

- **Backfill — explicitly excluded.** No `--backfill` flag, no chunked-cursor backfill, no UI for re-syncing historical data. Use the standalone's CLI from the local clone if you ever need it.
- **Webhook URL change at SC.** Updating the registered webhook URL in Safety Culture (so SC sends events to cc-dashboard instead of the standalone) is part of E18's cutover steps. E17 just makes the route exist and work.
- **The `register.ts` CLI tool** for webhook management. After E18 cuts over, webhook registration will be a one-shot operation done via SC's dashboard or curl. Don't port the CLI.
- **The standalone HTTP server (`src/webhook/server.ts`).** Vercel Functions replace it.
- **Re-implementing inspection processing.** Faithful port — same parser logic, same writer behavior, same edge cases.
- **UI changes.** No reporting page changes. Sync status will surface through the existing Pipeline Health page (E12), which already reads `sync_state`.
- **Schema migrations.** `sync_state` is already in the shared Supabase project; no new tables, no new columns, no migrations.
- **Cutover (flipping APPS card href, retiring standalone, updating SC webhook registration)** — E18.

---

## Architecture

### Module layout

```
lib/reporting/ingestion/
  index.ts                     (barrel + env var doc comment)
  sc_api_client.ts             (port of src/sync/sc_api_client.ts)
  scheduled_sync.ts            (port of src/sync/scheduled_sync.ts MINUS backfill)
  webhook_handler.ts           (port of src/webhook/handler.ts platform-agnostic core only)
  process_inspection.ts        (port of src/pipeline/process_inspection.ts)
  writer.ts                    (port of src/db/writer.ts)
  lookups.ts                   (port of src/db/lookups.ts)
  parser/
    index.ts                   (port of src/parser/index.ts)
    types.ts
    field_extractors.ts
    free_text_parsers.ts
    normalizers.ts
    chemical_application_record.ts
    daily_work_report.ts
  __tests__/
    sc_api_client.test.ts
    scheduled_sync.test.ts
    webhook_handler.test.ts
    parser_integration.test.ts
    free_text_parsers.test.ts
    normalizers.test.ts
    writer.test.ts
    fixtures.ts                 (port of src/db/__tests__/fixtures.ts)

app/api/cron/sync-sc-inspections/
  route.ts                     (Vercel Cron entrypoint)

app/api/webhooks/sc/
  route.ts                     (Webhook entrypoint with `after()` fire-and-forget)
```

### Adjustments required vs the standalone

The standalone is a CommonJS Node app; cc-dashboard is Next.js 16 on Vercel. Changes during port:

1. **CommonJS → ESM imports.** Same as E16. cc-dashboard's tsconfig already targets ESM.

2. **Database client.** Replace `import { supabase } from '../db/supabase_client'` with `createAdminClient()` from `lib/supabase/admin.ts`. Preserve the `db` injection pattern used by tests (functions accept an optional `SupabaseClient` for fixture-based testing).

3. **`config` module.** Drop `src/shared/config.ts` entirely. Read env vars directly via `process.env.SAFETY_CULTURE_API_TOKEN`, `process.env.SC_API_BASE_URL`, etc. Inline the small handful of constants (`syncRateLimitMs`, `syncFeedPageSize`) as defaults in the SC API client constructor.

4. **`logger` module.** Drop `src/shared/logger.ts` entirely. Replace `log.info(...)` / `log.error(...)` calls with plain `console.log` / `console.error`. Vercel captures both. No structured-log wrapper needed.

5. **`organizationId` resolution.** Standalone reads from `DEFAULT_ORGANIZATION_ID` env var. Replace with a runtime SELECT from the `organizations` table (`SELECT id FROM organizations LIMIT 1`) — matches E15b's `resolveOrgId` pattern. Cache the result for the duration of a function invocation.

6. **CLI entry points (`if (require.main === module)`).** Delete from `scheduled_sync.ts`. Sync is invoked only via the Vercel Cron route from now on.

7. **Backfill paths.** Strip from `runSync`: drop the `options.backfill` and `options.backfillFrom` arguments, the `parseCliArgs` function, and the `if (isBackfill)` branches. The function should always read the high-water mark from `sync_state` and pass it as `modified_after`. Function signature simplifies to `runSync(): Promise<SyncRunResult>`.

8. **Webhook handler.** Keep the `handleWebhookPayload(payload)` function — it's already platform-agnostic. Drop `handleHttpRequest`, `readBody`, the Node.js `IncomingMessage`/`ServerResponse` adapter. The Next.js route handler reads `req.json()` and calls `handleWebhookPayload` directly.

9. **Fire-and-forget on Vercel.** The standalone fires `processInspection(auditId).then(...)` without awaiting and returns the response. On Vercel, the function instance terminates when the response is sent unless `after()` (Next.js 16) or `waitUntil` is used. **Use `import { after } from 'next/server'`** in the webhook route to defer `processInspection` after the response, within `maxDuration = 300`. This preserves the standalone's intent.

10. **`DEFAULT_ORGANIZATION_ID` env var dependency.** `pipeline/process_inspection.ts` reads `process.env.DEFAULT_ORGANIZATION_ID ?? ''` at module load. Replace with a function `getDefaultOrganizationId(): Promise<string>` that does the runtime lookup (item 5).

### Sync route

```ts
// app/api/cron/sync-sc-inspections/route.ts
import { NextResponse } from 'next/server'
import { runSync } from '@/lib/reporting/ingestion/scheduled_sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  const expected = process.env.CRON_SECRET
  if (!expected) {
    return NextResponse.json({ ok: false, error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  try {
    const result = await runSync()
    return NextResponse.json({ ok: true, summary: result })
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error }, { status: 500 })
  }
}
```

### Webhook route

```ts
// app/api/webhooks/sc/route.ts
import { NextResponse, after } from 'next/server'
import { handleWebhookPayload, type ScWebhookPayload } from '@/lib/reporting/ingestion/webhook_handler'
import { processInspection } from '@/lib/reporting/ingestion/process_inspection'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: Request) {
  // Optional signature verification — see open questions.
  // const sig = req.headers.get('x-safetyculture-signature')
  // if (!verifySignature(await req.clone().text(), sig)) return NextResponse.json({ ok: false }, { status: 401 })

  let payload: ScWebhookPayload
  try {
    payload = await req.json() as ScWebhookPayload
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const result = handleWebhookPayload(payload)

  // If handleWebhookPayload says "processing", actually process via after()
  if (result.body.action === 'processing' && typeof result.body.auditId === 'string') {
    const auditId = result.body.auditId
    after(async () => {
      try {
        await processInspection(auditId)
      } catch (err) {
        console.error(`webhook async processInspection failed for ${auditId}:`, err)
      }
    })
  }

  return NextResponse.json(result.body, { status: result.statusCode })
}
```

Note: the existing `handleWebhookPayload` in the standalone calls `processInspection` itself via `.then(...)`. **Refactor during port** so `handleWebhookPayload` is purely a router (returns `{action: 'processing', auditId}` or `{action: 'ignored', reason}`), and the route handler is responsible for invoking `processInspection` via `after()`. Tests for `handleWebhookPayload` then become pure-function tests with no async-tracking complexity (drop the `onProcessingComplete` mechanism).

### Vercel Cron config

Modify the existing `vercel.json` to append the new cron entry:

```json
{
  "crons": [
    { "path": "/api/cron/generate-reports", "schedule": "0 6 * * *" },
    { "path": "/api/cron/sync-sc-inspections", "schedule": "*/15 * * * *" }
  ]
}
```

15-minute cadence is a sensible default for a reporting workload; can be tightened or loosened post-deploy by editing this single value.

---

## Reference: source material in `~/Desktop/constance-reporting/`

Authoritative source for the port. Read these in full before implementing.

**Sync + webhook:**
- `src/sync/sc_api_client.ts` (180 lines)
- `src/sync/scheduled_sync.ts` (332 lines — strip backfill paths during port)
- `src/sync/__tests__/sc_api_client.test.ts`, `scheduled_sync.test.ts`
- `src/webhook/handler.ts` (208 lines — port the core, drop the HTTP adapter)
- `src/webhook/__tests__/handler.test.ts`
- `src/pipeline/process_inspection.ts` (86 lines)

**Processing core (parser + writer):**
- `src/parser/index.ts` (137 lines) — top-level dispatch
- `src/parser/types.ts` (205 lines) — extraction shape
- `src/parser/field_extractors.ts` (400 lines)
- `src/parser/free_text_parsers.ts` (207 lines)
- `src/parser/normalizers.ts` (119 lines)
- `src/parser/chemical_application_record.ts` (322 lines) — template-specific
- `src/parser/daily_work_report.ts` (450 lines) — template-specific
- `src/parser/__tests__/{free_text_parsers,normalizers,parser_integration}.test.ts`
- `src/db/lookups.ts` (289 lines)
- `src/db/writer.ts` (560 lines)
- `src/db/__tests__/{writer.test.ts,fixtures.ts}`

**Skip these — explicitly out of scope:**
- `src/webhook/server.ts` — replaced by the Next.js route.
- `src/webhook/register.ts` — webhook registration via SC dashboard / curl post-cutover.
- `src/shared/config.ts`, `src/shared/logger.ts` — replaced by direct env access + `console.*`.
- `src/sync/scheduled_sync.ts` backfill paths — explicitly stripped.

---

## Schema dependencies

**Existing tables (no migrations needed)** — both apps share the same Supabase project (`ymcyunspmljaruodjpkd`):

- `sync_state` — read/write by `runSync`. Columns: `id`, `sync_type`, `last_sync_at`, `high_water_mark`, `last_cursor`, `total_synced`, `last_error`. The standalone has been writing to this row since project inception; cc-dashboard reads from the same row.
- `inspections` — primary write target. `sc_audit_id` is the dedup key; `sc_modified_at` is the change-detection key.
- `chemical_application_records`, `species_observations`, etc. — written by `writer.ts` for template-specific extractions.
- `organizations` — read once for org id resolution.

**Env vars required at runtime:**

| Var | Required? | Effect if missing |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes (existing) | App fails to boot |
| `SUPABASE_SERVICE_ROLE_KEY` | yes (existing) | All ingestion fails |
| `SAFETY_CULTURE_API_TOKEN` | yes (NEW for cc-dashboard) | Sync + webhook async processing fail with 401 from SC |
| `SC_API_BASE_URL` | optional (NEW) | Defaults to `https://api.safetyculture.io` |
| `CRON_SECRET` | yes (existing from E16) | Cron route returns 500; webhook still works |

`SAFETY_CULTURE_API_TOKEN` is the same token the standalone already uses. Pull from the standalone's `.env` if cc-dashboard's `.env.local` doesn't have it; document in the PR that it must be added to the Vercel project env (preview + production) before sync/webhook will succeed.

**Concurrency / data race considerations:**

- During the transition window (E17 deployed but E18 not yet flipped), BOTH the standalone and cc-dashboard will run sync against the same Supabase. The dedup check (`isUnchanged(sc_audit_id, sc_modified_at)`) makes this idempotent — both will skip already-processed inspections. `sync_state.high_water_mark` will be updated by whichever runs last. No data corruption; just wasted work.
- Webhook: SC sends each event to a single registered URL. As long as only one app is registered as the webhook target at a time, no duplication. Safe.

---

## Files to CREATE

**Processing core:**
- `lib/reporting/ingestion/index.ts`
- `lib/reporting/ingestion/sc_api_client.ts`
- `lib/reporting/ingestion/scheduled_sync.ts`
- `lib/reporting/ingestion/webhook_handler.ts`
- `lib/reporting/ingestion/process_inspection.ts`
- `lib/reporting/ingestion/writer.ts`
- `lib/reporting/ingestion/lookups.ts`
- `lib/reporting/ingestion/parser/index.ts`
- `lib/reporting/ingestion/parser/types.ts`
- `lib/reporting/ingestion/parser/field_extractors.ts`
- `lib/reporting/ingestion/parser/free_text_parsers.ts`
- `lib/reporting/ingestion/parser/normalizers.ts`
- `lib/reporting/ingestion/parser/chemical_application_record.ts`
- `lib/reporting/ingestion/parser/daily_work_report.ts`

**Tests:**
- `lib/reporting/ingestion/__tests__/sc_api_client.test.ts`
- `lib/reporting/ingestion/__tests__/scheduled_sync.test.ts`
- `lib/reporting/ingestion/__tests__/webhook_handler.test.ts`
- `lib/reporting/ingestion/__tests__/parser_integration.test.ts`
- `lib/reporting/ingestion/__tests__/free_text_parsers.test.ts`
- `lib/reporting/ingestion/__tests__/normalizers.test.ts`
- `lib/reporting/ingestion/__tests__/writer.test.ts`
- `lib/reporting/ingestion/__tests__/fixtures.ts`

**Routes:**
- `app/api/cron/sync-sc-inspections/route.ts`
- `app/api/webhooks/sc/route.ts`

## Files to MODIFY

- `vercel.json` — append the sync cron entry (KEEP the generate-reports entry).

## Files NOT touched

- `lib/reporting/generation/` — E16's territory; do not import from generation into ingestion or vice versa.
- `lib/reporting/queries.ts` and `lib/reporting/types.ts` — reporting query layer; ingestion has its own types under `lib/reporting/ingestion/parser/types.ts`.
- `app/(dashboard)/reporting/*` — UI; no changes.
- `components/reporting/*` — no changes.
- `app/api/cron/generate-reports/route.ts` — E16's cron route; do not modify.
- `package.json` — no new deps expected (port uses only `@supabase/supabase-js`, native `fetch`, `next/server`'s `after`). If a port turns out to need a small dep (e.g., a date-handling utility), surface it in the PR before adding.
- `~/Desktop/constance-reporting/` — read-only reference. DO NOT modify.
- `vitest.config.mts` — should not need changes; test paths already match `lib/**/__tests__/**/*.test.ts`. Verify.

---

## Done definition

A reviewer can:

1. `npm install` succeeds (no new deps expected).
2. `npm run build` passes.
3. `npm run test` runs vitest, all ported + new tests pass (no live-DB hits — uses `db` injection with stubs/fixtures). Total should be ~51 (E16) + ~30 ported parser/writer/sync/webhook = ~80+ tests.
4. On a Vercel preview deploy with `SAFETY_CULTURE_API_TOKEN` and `SUPABASE_SERVICE_ROLE_KEY` set:
   - `curl -H "Authorization: Bearer $CRON_SECRET" https://<preview>/api/cron/sync-sc-inspections` → 200 JSON `{ok: true, summary: {processed, skipped, failed, errors}}`.
   - `curl -H "Authorization: Bearer wrong" ...` → 401.
   - With `CRON_SECRET` unset on the deploy → 500.
5. Webhook smoke test:
   - `curl -X POST -d '{"event":"inspection.completed","audit_id":"audit_test"}' https://<preview>/api/webhooks/sc/` → 200 JSON `{ok: true, action: 'processing', auditId: 'audit_test'}`. The async `processInspection` will fail (audit doesn't exist) but the response shape is correct.
   - `curl -X POST -d '{}' ...` → 200 with `{ok: true, action: 'ignored', reason: 'missing_event_type'}`.
   - `curl -X POST -d '{"event":"inspection.created","audit_id":"x"}' ...` → 200 with `{ok: true, action: 'ignored', reason: 'event_type_not_handled'}`.
   - `curl -X POST -d 'not json' ...` → 400 with `{ok: false, error: 'invalid_json'}`.
6. End-to-end sync verification (after Peter manually triggers cron via Vercel dashboard "Run now" or curl): a freshly-modified inspection in SC appears in cc-dashboard's `inspections` table (and `sync_state.high_water_mark` advances).
7. Vercel project's Crons dashboard shows TWO cron jobs registered: `generate-reports` (existing) and `sync-sc-inspections` (new).
8. `/reporting/pipeline` (E12's Pipeline Health page) renders without regression and reflects the latest sync state.

---

## Coordination notes — round 5

No parallel session this round. E17 is the sole brief.

**Don't touch generation pipeline files.** `lib/reporting/generation/` and `app/api/cron/generate-reports/route.ts` are E16's territory and recently merged. Ingestion lives under `lib/reporting/ingestion/` — separate path, no overlap.

**Existing patterns to mirror:**
- E16's cron route auth gate (`app/api/cron/generate-reports/route.ts`) — same pattern.
- E16's bucket-auto-create + signed-URL upload model is NOT relevant here (no file outputs from ingestion).
- E15b's `resolveOrgId` (`SELECT id FROM organizations LIMIT 1`) — replicate for ingestion's runtime org-id lookup.
- E16's Server Action surface in `lib/reporting/generation/actions.ts` — NOT relevant; ingestion is invoked by routes, not Server Actions.

---

## Open questions (resolve at implementation; document in PR)

1. **Webhook signature verification.** Safety Culture may sign webhook payloads with HMAC. If they do, implement signature verification in the route handler before calling `handleWebhookPayload`. Use the SC docs to determine: (a) is signing supported, (b) which header carries the signature, (c) which secret to use. If signing isn't available or is opt-in, document that the webhook URL itself is the secret (treat the URL as bearer-token-equivalent and don't share it).

2. **`processInspection` failure handling in webhook.** Current standalone fires-and-forgets. After E17, on Vercel via `after()`, a failed `processInspection` will log to console.error and the inspection won't be processed. Should the route enqueue a retry? **Default: no retry for v1** — SC will re-send the webhook on subsequent updates to the same inspection (every edit triggers `inspection.updated`), so eventual consistency is acceptable. Document this trade-off.

3. **Sync cadence.** Brief specifies `*/15 * * * *` (every 15 min). If Peter wants near-real-time sync with the webhook as the primary path, push to every 30 min or hourly to reduce cron load. Webhook should handle most events; sync is a safety net for missed webhooks. **Recommend `*/15 * * * *` for v1**, easy to tune later.

4. **`organizations` table cardinality.** `resolveOrgId` returns the first row. If `organizations` has more than one row (multi-tenant in some other code path?), the wrong org could be used. Verify at impl time: `SELECT count(*) FROM organizations`. If >1, surface and ask before proceeding.

5. **Concurrency with the standalone during the transition.** Brief assumes both will sync simultaneously and dedup will handle it. Verify at impl time that `sync_state` has a single row keyed by `sync_type='scheduled_feed'` (not multi-row). If multi-row, decide whether to namespace cc-dashboard's row separately or share.

6. **`after()` API availability.** Next.js 16 introduced `after()` for after-response work. If for any reason it's unavailable in this version, fall back to `import { unstable_after as after } from 'next/server'` or use Vercel's `waitUntil`. Verify on first import.

---

## Workstream procedure

1. `cd /Users/feelgood/Desktop/cc-dashboard && git checkout main && git pull`
2. `git worktree add /Users/feelgood/Desktop/cc-dashboard-e17 -b feature/reporting-port-e17 main`
3. `cd /Users/feelgood/Desktop/cc-dashboard-e17`
4. `cp /Users/feelgood/Desktop/cc-dashboard/.env.local .`
5. `npm install`
6. Pull the SC API token from the standalone's `.env` (or ask Peter) and add `SAFETY_CULTURE_API_TOKEN=...` to your `.env.local` for local testing.
7. Read brief + standalone source under `~/Desktop/constance-reporting/src/{sync,webhook,parser,db,pipeline}/` in full.
8. Port files in this order — processing core first (it's the dependency for everything else):
   - `parser/types.ts`
   - `parser/normalizers.ts`, `parser/free_text_parsers.ts`, `parser/field_extractors.ts`
   - `parser/chemical_application_record.ts`, `parser/daily_work_report.ts`
   - `parser/index.ts`
   - `lookups.ts`
   - `writer.ts`
   - `process_inspection.ts`
   - `sc_api_client.ts`
   - `webhook_handler.ts` (refactor to remove the inline `processInspection` call)
   - `scheduled_sync.ts` (with backfill stripped)
9. Port the tests in matching order. `npm run test` should pass at each stage.
10. **Optional intermediate draft PR** at this point: the processing core + sync + webhook handler exist as `lib/`. Tests prove behaviour. No routes wired yet. If you want intermediate review or to surface a question early, open a draft PR titled `feat(reporting): ingestion core port (E17, draft)`. Otherwise continue.
11. Implement `app/api/cron/sync-sc-inspections/route.ts`.
12. Implement `app/api/webhooks/sc/route.ts` with `after()`.
13. Append the sync cron entry to `vercel.json` (preserve generate-reports entry).
14. `npm run build` and `npm run test` — both must pass.
15. Smoke-test locally if possible: `npm run dev`, then curl the webhook route with the test payloads from the Done definition step 5.
16. Commit + Co-Authored-By Claude line.
17. `git push -u origin feature/reporting-port-e17`
18. `gh pr create` with test-plan covering: env vars, SC token requirement, webhook URL change deferred to E18, resolved open questions (signature verification, retry policy, cadence, org cardinality, concurrency).
19. Report back per session prompt format.
