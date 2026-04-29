# M03b — Native Integration: live status

**Repo (canonical):** `constance-conservation/cc-dashboard`
**Last updated:** 2026-04-29 evening (round 5 merged: E17. All Stream 1 ingestion code now resident in cc-dashboard; only cutover (E18) remains.)

**Audit artefacts:**
- `docs/audit/standalone_feature_inventory.md` — master feature inventory + revised plan
- `docs/audit/operations_data_wiring.md` — Operations 3-page deep-dive

---

## Goal

Replace the standalone reporting app (`constance-reporting.vercel.app`) with native Next.js routes inside cc-dashboard at `app/(dashboard)/reporting/*`, then archive the standalone repo and retire its Vercel deploy.

---

## Brief status

| Brief | Scope | Status |
|---|---|---|
| **E8**  | Landing page + scaffold | ✅ Merged 2026-04-29 (`abe77e2`) |
| **F1**  | Sub-nav (Overview / Operations / Reports) | ✅ Merged with E8 |
| **E9**  | Clients/Sites/Zones drill-down + cadence selector | ✅ Merged 2026-04-29 (`3f28162`) |
| **E10** | Reports list + read-only viewer | ✅ Merged 2026-04-29 (`82e8d0d`) |
| **E13** | Operations 3 pages (Staff/Chemicals/Species) + sub-nav un-grey | ✅ Merged 2026-04-29 (`5510202`) |
| **E10b** | Report preview + edit mode + image uploads | ✅ Merged 2026-04-29 (`b2fd8f3`) |
| **E11** | Inspections page | ✅ Merged 2026-04-29 (`94ddcf1`) |
| **E15** | Inline CRUD across reporting views | ✅ Merged 2026-04-29 (`f7e03aa`) |
| **E12** | Pipeline Health page | ✅ Merged 2026-04-29 (`14cee96`) |
| **E14** | Global Sites view + sub-nav entry | ✅ Merged 2026-04-29 (`e98d42c`) |
| **E15b** | Add/delete sites + zones + new client | ✅ Merged 2026-04-29 (`5f332a1`, PR #42) |
| **E16** | Generation pipeline (full port + tests + Vercel Cron) | ✅ Merged 2026-04-29 (`84bdbec`, PR #43) |
| **E17** | Sync + webhook (incremental only — backfill dropped) | ✅ Merged 2026-04-29 (`cbe6225`, PR #44) |
| **E18** | Cutover — flip APPS card href, update SC webhook URL, retire standalone | ⏸ Final brief — round 6 |

After **E12 + E14**, the entire standalone is fully *viewable* through cc-dashboard.
After **E10b + E15 + E15b**, all CRUD is in cc-dashboard.
After **E16**, generation runs in cc-dashboard (manual button + daily Vercel Cron).
After **E17**, sync + webhook run in cc-dashboard (cron route gated on `CRON_SECRET`; webhook route exists but SC still points at the standalone until E18).
After **E18**, standalone retired and SC webhook re-registered to cc-dashboard.

---

## Round 4 — merged 2026-04-29

```
E15b add/delete clients/sites/zones        ✅ 5f332a1 (PR #42 — no shared-file overlap with E16)
E16  generation pipeline + Vercel Cron     ✅ 84bdbec (PR #43 — Server Actions in lib/reporting/generation/actions.ts to avoid actions.ts conflict)
```

Both executed in parallel `git worktree` directories. By design (executor briefs and orchestrator prompts) the two PRs share no files: E15b appends CRUD to existing page-level `actions.ts` files, E16 places its Server Actions in a new `lib/reporting/generation/actions.ts`. Zero merge conflicts.

After round 4, M03b is at **fully editable + generation-capable** state. The reporting hierarchy can be created/edited/deleted, and reports can be generated on demand or on schedule from inside cc-dashboard. Forward queue: **E17** (sync + webhook), **E18** (cutover).

---

## Round 5 — merged 2026-04-29

```
E17  incremental sync + webhook ingestion  ✅ cbe6225 (PR #44 — sole brief; no parallel session)
```

After round 5, **the entire Stream 1 ingestion stack is resident in cc-dashboard.** Only the cutover (E18) remains before the standalone deploy can be retired.

### What round 5 added

**E17 — Ingestion port (incremental sync + webhook)**
- New module `lib/reporting/ingestion/` (~3000 LOC source + ~1500 LOC tests + 5 sample SC audit JSON fixtures): SC API client, parser (Daily Work Report + Chemical Application Record templates), writer, lookups, process pipeline, scheduled sync (incremental only — backfill stripped), webhook handler.
- New cron route `app/api/cron/sync-sc-inspections/route.ts` — bearer-auth via `CRON_SECRET`, schedule `*/15 * * * *`. Mirrors E16's auth-gate pattern.
- New webhook route `app/api/webhooks/sc/route.ts` — uses Next.js 16's native `after()` (no `unstable_` prefix on 16.2.4) for fire-and-forget processing post-response.
- `webhook_handler.ts` refactored from the standalone shape to a pure router (returns `{action: 'processing' | 'ignored', ...}`); the route handler invokes `processInspection` via `after()`. The standalone's `onProcessingComplete` callback mechanism dropped per brief.
- `getDefaultOrganizationId()` resolves the org id at runtime via `SELECT id FROM organizations LIMIT 1` (cached in module scope) — replaces the standalone's `DEFAULT_ORGANIZATION_ID` env var dependency.
- `vercel.json` gains the sync entry alongside the preserved `generate-reports` entry.
- 153 new vitest tests on top of E16's 51 → **204 total**. CI mode skips 17 DB-dependent tests via `describe.skipIf` when env vars are absent (187 pass + 17 skipped headless).
- No new npm deps. Uses native `fetch`, existing `@supabase/supabase-js`, `next/server`'s `after`.

### Standalone-vs-cc-dashboard transition window

Both apps point at the same Supabase project. As of merge:
- Standalone's last sync: **2026-04-22**, `total_synced=724`. There is a ~7-day gap of inspections in SC that haven't been pulled.
- The first successful cc-dashboard cron fire (after `CRON_SECRET` is added) will pull all inspections modified since 2026-04-22 in one shot. Function has `maxDuration = 300` and the standalone has handled larger batches before. Idempotent (`sc_audit_id` dedup, `sc_modified_at` change check) — no duplicate writes if the standalone is still running.
- SC webhooks continue to flow to the standalone until E18's re-registration step.

### What round 4 added

**E15b — CRUD primitives**
- New Server Actions in existing files: `createClient` (in `app/(dashboard)/reporting/clients/actions.ts`), `createSite`, `createZone`, `deleteSite`, `deleteZone` (in `app/(dashboard)/reporting/clients/[id]/sites/actions.ts`). All use the RLS-fallback pattern from E15: try user-session, fall back to admin client on RLS-shaped errors.
- Delete gating: site cannot be deleted while it has zones; zone cannot be deleted while it has inspections. Errors surface inline with the dependent count.
- New components: `AddClientButton`, `AddSiteButton`, `AddZoneButton`, `DeleteRowMenu`, plus a shared `Modal` primitive. No new npm deps.
- Wired into `/reporting/clients`, `/reporting/clients/[id]`, `/reporting/clients/[id]/sites/[siteId]`. Global `/reporting/sites` view remains read-only.
- `organization_id` resolution: `SELECT id FROM organizations LIMIT 1` (single-tenant pattern matching `lib/store/CCStateContext.tsx`'s boot-time logic). `createSite`/`createZone` copy `organization_id` from the parent row.

**E16 — Generation pipeline**
- Full port of standalone `src/report/` and `src/bin/generate_report.ts` to `lib/reporting/generation/` (~2700 LOC + 51 vitest tests, 38 ported + 13 new). `vitest run` is now `npm run test`.
- Server Actions in `lib/reporting/generation/actions.ts`: `generateClientReport`, `generateSiteReport`, `generateZoneReport`. Each returns `{ ok: true, clientReportId, htmlSize, docxBytes } | { ok: false, error }`.
- `<GenerateReportButton>` refactored from `<Link>` to client component that calls the Server Action; exported props (`{scope, id, label?}`) unchanged so all existing callsites continue to work.
- Vercel Cron route at `app/api/cron/generate-reports` — bearer-token auth via `CRON_SECRET`; iterates clients with non-null `report_frequency`, generates if due (idempotent, daily-with-skip).
- DOCX output uploaded to Supabase Storage bucket `reports` (auto-created on first run, private). `client_reports.docx_url` stores a 1-year signed URL.
- Anthropic SDK (`claude-sonnet-4-6`) for narratives; falls back to placeholders if `ANTHROPIC_API_KEY` is unset (matches standalone `--skip-llm`).
- New deps: `@anthropic-ai/sdk`, `docx`. New devDep: `vitest`. New config files: `vercel.json`, `vitest.config.mts`.

---

## Verification surface — round 4 (for engineers running regression)

**Required env vars on Vercel project (preview + production):**

| Var | Owner | Effect if missing |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | pre-existing | App fails to boot |
| `SUPABASE_SERVICE_ROLE_KEY` | pre-existing (E10b) | Generation fails; admin-fallback for CRUD fails; ingestion fails |
| `ANTHROPIC_API_KEY` | E16 — optional | Narratives fall back to placeholders; reports still generate |
| `CRON_SECRET` | **E16/E17 — NEW, must be set** | Both cron routes (generate-reports + sync-sc-inspections) return 500; manual generation Server Actions + webhook still work |
| `SAFETY_CULTURE_API_TOKEN` | **E17 — NEW, must be set before E18** | Sync + webhook async processing fail with 401 from SC. Source from SC dashboard or wherever standalone stored it (standalone's local `.env` was missing on disk during E17 execution — only `.env.example` present). |
| `SC_API_BASE_URL` | optional (E17) | Defaults to `https://api.safetyculture.io` |

Generate `CRON_SECRET` with `openssl rand -hex 32` and add via Vercel dashboard or `vercel env add CRON_SECRET`. The Vercel platform sends it as `Authorization: Bearer <CRON_SECRET>` on every cron invocation.

> **Status (2026-04-29):** Peter is deferring the `CRON_SECRET` add — manual generation via the button works without it; only the daily cron is paused until it lands. Engineers running regression on the cron route will see 500 until then; safe to skip that one row of the checklist.

**Storage:**
- Bucket `reports` in Supabase project `ymcyunspmljaruodjpkd` is auto-created on the first generation call (private). No manual setup required.
- DOCX object key shape: `<client_uuid>/<filename>.docx`. `client_reports.docx_url` is a 1-year signed URL into this bucket.

**Cron registration:**
- `vercel.json` registers two crons:
  - `/api/cron/generate-reports` — `0 6 * * *` (daily 06:00 UTC)
  - `/api/cron/sync-sc-inspections` — `*/15 * * * *` (every 15 min)
- After deploy, verify both in Vercel project → Settings → Crons.

**Webhook route:**
- `POST /api/webhooks/sc` accepts SC webhook payloads. Returns 200 immediately for processable events, 200-with-ignored-reason for non-processable, 400 for non-JSON.
- Async processing happens via Next.js 16's `after()` after the response. Failures log to `console.error`; SC re-sends on next `inspection.updated` (no in-app retry queue for v1).
- **Webhook URL is the secret** — SC has no HMAC payload signing. Treat the URL as bearer-token-equivalent and don't share/log it.
- SC is still pointed at the standalone's webhook URL — re-registration is part of E18.

**Regression checklist:**

CRUD (E15b):
- [ ] `/reporting/clients` "+ Add client" → modal → save → lands on new client detail page.
- [ ] Client detail "+ Add site" → modal → save → site appears in Sites panel.
- [ ] Site detail "+ Add zone" → modal → save → zone appears in Zones panel.
- [ ] "⋯ → Delete zone" on a zone with no inspections → confirm → row gone.
- [ ] "⋯ → Delete zone" on a zone with inspections → inline error includes count, row stays.
- [ ] "⋯ → Delete site" on a site with no zones → confirm → row gone.
- [ ] "⋯ → Delete site" on a site with zones → inline error includes count, row stays.
- [ ] Inline editing (E15) and CadenceSelector / ScheduleSelector still work — no regressions.
- [ ] Clicking the "⋯" menu inside a site card does NOT navigate to the site detail page.

Generation (E16):
- [ ] Click "Generate report" on a small zone → "Generating…" → land on `/reporting/reports/[id]` with rendered HTML.
- [ ] Download linked DOCX → opens in Word/LibreOffice without error.
- [ ] `client_reports` row in DB has `html_content`, `narrative_sections`, `docx_url` (signed URL).
- [ ] Re-generate same scope+period → upserts (no duplicate row in `client_reports`).
- [ ] `curl -H "Authorization: Bearer $CRON_SECRET" https://<preview>/api/cron/generate-reports` → 200 JSON `{ok: true, summary: {considered, generated[], skipped[], failed[]}}`.
- [ ] Same curl with no/wrong header → 401.
- [ ] Same curl when `CRON_SECRET` is unset on the deploy → 500.
- [ ] If `ANTHROPIC_API_KEY` unset, generation still completes; narrative sections contain placeholder bullets.

Ingestion (E17):
- [ ] `curl -X POST -d '{"event":"inspection.completed","audit_id":"audit_test"}' https://<preview>/api/webhooks/sc` → 200 `{ok: true, action: 'processing', auditId: 'audit_test'}`. (Async processing fails because audit doesn't exist; logged but not surfaced — that's correct.)
- [ ] `curl -X POST -d '{}' ...` → 200 `{ok: true, action: 'ignored', reason: 'missing_event_type'}`.
- [ ] `curl -X POST -d '{"event":"inspection.created","audit_id":"x"}' ...` → 200 `{ok: true, action: 'ignored', reason: 'event_type_not_handled', event: 'inspection.created'}`.
- [ ] `curl -X POST -d 'not json' ...` → 400 `{ok: false, error: 'invalid_json'}`.
- [ ] `curl -H "Authorization: Bearer $CRON_SECRET" https://<preview>/api/cron/sync-sc-inspections` → 200 JSON `{ok: true, summary: {processed, skipped, failed, errors[]}}`.
- [ ] After first cron fire, `sync_state.high_water_mark` advances and a fresh batch of `inspections` rows have `processing_status='success'`.
- [ ] `/reporting/pipeline` (Pipeline Health) page reflects the latest sync state without errors.

Tests:
- [ ] `npm run test` (vitest) passes 204/204 (with env vars set) or 187/204 with 17 skipped (CI mode without DB env). Test counts will grow as future milestones add coverage.

**Known limitations / round-4 caveats:**

1. **Signed URL TTL: 1 year.** `client_reports.docx_url` stores a 1-year signed URL — anyone holding the URL can download for that period. Acceptable for internal use; consider tightening before externally sharing reports (see out-of-band track).
2. **Cadence interval check uses approximate intervals** (30 days for monthly, 91 for quarterly, 365 for annually) inside `isClientDueForGeneration`. Period-bound calculation is calendar-aware and correct; only the "is this client due?" check is approximate. Drifts ~1 day per fire for monthly clients.
3. **`annually` report cadence falls back to `quarterly`** in the renderer (the standalone's `Cadence` type has only weekly/monthly/quarterly). Annually-cadence clients get a quarterly-shaped report covering the previous quarter, not the previous year. Flag if any client uses `annually`.

---

## Orchestrator handoff

A fresh orchestrator session can be spawned in `/Users/feelgood/Desktop/cc-dashboard/`.
Bootstrap from `docs/handoff/orchestrator_2026-04-29.md` — that file
covers what the new session needs that isn't in the live tracker
(Peter's preferences, round-2 lessons, Supabase setup, etc.).

---

## Decisions logged

### Pre-audit
- Stack mismatch resolved by porting (not merging). cc-dashboard = Next 16, standalone = Node service.
- Both apps point at the same Supabase project (`ymcyunspmljaruodjpkd`).
- F1 sub-nav design: 5 items linked + 3 Operations greyed (E13 un-greyed all).
- Reporting views read-only initially, with cadence selector exception in E9.
- Sort `/reporting/clients` alphabetically, archived clients NOT hidden.

### Post-audit (2026-04-29)
- E14 (Global Sites view) — IN.
- E15 (Inline CRUD on reporting views) — IN.
- E16 (Generation pipeline) — full port (NOT lightweight wrap), with tests + analysis on incoming reports.
- E17 (Sync) — default to Vercel Cron incremental + manual CLI for backfill.
- E10b (Edit mode + uploads) — bumped up in priority by Peter; merged in round 2.

### Round 2 (2026-04-29 evening)
- Three parallel sessions in one working tree caused branch chaos (E11/E13 stashed each other's work). E10b session figured out git worktrees mid-flight.
- **Standing rule from round 3: each parallel session uses its own `git worktree`** — see `docs/orchestrator_prompts/README.md` for the pattern.
- E15 split: edit-field + schedule widget = E15. Add/delete = E15b (deferred).
- HTML sanitisation on `client_reports.html_content` deferred per E10b PR caveat — must be revisited before reports are emailed or rendered to non-editing users.

### Round 4 (2026-04-29 evening)
- E15b `createClient` org-id resolution: option (b) — `SELECT id FROM organizations LIMIT 1`. Single-tenant deployment; mirrors `lib/store/CCStateContext.tsx` boot-time pattern. `createSite` / `createZone` copy `organization_id` from parent row.
- E15b deletes are hard-delete with no cascade. Block if site has zones / zone has inspections; surface count in error.
- E16 generation pipeline: full port (not CLI wrapper), placed under `lib/reporting/generation/`. New deps: `@anthropic-ai/sdk`, `docx`. New devDep: `vitest`.
- E16 storage: DOCX uploaded to Supabase Storage `reports` bucket (private, auto-created). `client_reports.docx_url` stores a 1-year signed URL — chosen over the object-path option to avoid query-layer changes that were out of scope for round 4.
- E16 cron schedule: daily `0 6 * * *`. Route is idempotent (skips when not due) so daily-with-skip is safe and lets monthly clients fire on the right day-of-month rather than waiting for the next Monday.
- E16 zone-scope auto-generation in cron: OFF for v1 — manual trigger only. Cron generates whole-client reports.
- E16 `ANTHROPIC_API_KEY` missing → placeholder narratives, no error. Matches standalone `--skip-llm`.
- E16 conflict-avoidance design: Server Actions placed in NEW `lib/reporting/generation/actions.ts` (not appended to page-level `actions.ts` files E15b modified). Resulted in zero file overlap with E15b at merge.

### Round 5 (2026-04-29 evening)
- E17 backfill explicitly DROPPED from scope. Standalone has been syncing since project inception; historical data already in Supabase. If a one-shot full re-backfill is ever needed, run `npm run sync:backfill` from the standalone clone at `~/Desktop/constance-reporting/`.
- E17 webhook signature verification: SC has no HMAC payload signing. URL-as-bearer-token chosen — treat the registered webhook URL as the secret; don't log or share.
- E17 webhook retry policy: no in-app retry queue for v1. Failed `processInspection` is logged to `console.error`; SC re-sends `inspection.updated` on the next inspection edit, providing eventual consistency.
- E17 sync cadence: `*/15 * * * *` (every 15 min). Tunable via `vercel.json`.
- E17 zone-scope auto-generation in cron: still OFF (E16 default carried).
- E17 `getDefaultOrganizationId` resolves at runtime from `organizations` table (single row) and caches in module scope. Replaces standalone's `DEFAULT_ORGANIZATION_ID` env var dependency.
- E17 webhook handler refactored from standalone shape: pure router returning `{action: 'processing' | 'ignored'}`. Route handler is responsible for `processInspection` via `after()`. Drops the `onProcessingComplete` callback mechanism.
- E17 Next.js 16's `after()` works as the native `next/server` export on 16.2.4 (no `unstable_` prefix needed; no fallback chosen).
- E17 sync_state observed shape: single row keyed by `sync_type='scheduled_feed'`, last_sync_at=2026-04-22, total_synced=724. cc-dashboard reads/writes the same row idempotently.
- E17 organizations cardinality observed: 1 row (Constance Conservation, UUID `2c43e83e-...`).
- E17 standalone `.env` was missing on disk during executor run (only `.env.example` present). `SAFETY_CULTURE_API_TOKEN` must be sourced from the SC dashboard before E17's preview testing or post-cutover use.

---

## Out-of-band tracks

| Track | Status |
|---|---|
| Service-role key rotation | ⏸ Optional, low urgency. Pasted into transcript 2026-04-29. |
| `next lint` broken on cc-dashboard | ⏸ Pre-existing, low urgency. |
| Schema migration parity in cc-dashboard | ⏸ Post-E18 hygiene. Standalone owns ~20 tables not in cc-dashboard's `supabase/migrations/`. |
| Canonical-vs-raw count fix in Chemicals + Species | ⏸ Optional follow-up. Mirrored standalone behaviour in E13. |
| HTML sanitisation on saved report HTML | ⏸ Low–medium urgency depending on E18 audience. |
| Signed-URL TTL on `client_reports.docx_url` | ⏸ Low urgency. Currently 1-year. Tighten by storing object path + adding a small append-only helper in `lib/reporting/queries.ts` that signs on each fetch (E15-style append). ~½-day brief, post-E18. |
| Cadence interval approximation in `isClientDueForGeneration` | ⏸ Low urgency. Uses 30/91/365-day intervals; drifts ~1 day per fire. Move to calendar-aware due-check if it ever causes a complaint. |
| `annually` cadence renderer | ⏸ Low urgency. Annually-cadence clients get a quarterly-shaped report covering the previous quarter. Add an `annually` branch to the renderer if any client uses it. |
| Style duplication across modal/Add buttons (E15b) | ⏸ Trivial nit. Extract `triggerStyle` / `inputStyle` / `btnPrimary` / `btnSecondary` into a shared `components/reporting/modalStyles.ts` if maintenance becomes painful. |

---

## Next session entry point

1. Read this file + `docs/vision.md` (post-M03b direction).
2. Forward queue: **E18** (round 6, cutover) is the only thing left in M03b. Brief and session prompt at `docs/executor_briefs/E18_cutover.md` and `docs/orchestrator_prompts/E18_session_prompt.md`.
3. **Pre-E18 actions Peter must complete on the Vercel project:**
   - Add `CRON_SECRET` (e.g. `openssl rand -hex 32`) — both crons require it.
   - Add `SAFETY_CULTURE_API_TOKEN` — sync + webhook async processing requires it. Source from SC dashboard → API settings, or whichever password vault the standalone's token lives in (the standalone's local `.env` file was missing during E17 execution).
   - Optional: do regression spot-checks per the verification surface above.
4. **E18 itself** (~1 hour, mostly admin clicks): flip APPS card href, **re-register the SC webhook** at Safety Culture from the standalone URL → cc-dashboard's `/api/webhooks/sc/`, retire the standalone Vercel deploy, archive `FrostyFruit1/constance-reporting`. Optionally delete the legacy `~/Desktop/CONSTANCE CONSERVATION/` directory after retention period.
5. **After E18:** M03b is done. The next phase is laid out in `docs/vision.md` sections 5–6 (post-M03b roadmap M04–M09 driven by the operator-efficiency thesis). Update this status doc as the final E18 entry; future rounds open new milestone status docs at `docs/milestones/MXX_*.md`.
