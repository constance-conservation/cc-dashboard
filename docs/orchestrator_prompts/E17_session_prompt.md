# Orchestrator prompt — Execute E17 (Sync + webhook, incremental only)

Copy the body below into a fresh Claude Code instance opened in
`/Users/feelgood/Desktop/cc-dashboard/`.

**Round-5 standard:** uses `git worktree`. No parallel session this round — E17 is the sole brief.

---

```markdown
# Parallel orchestrator brief — Execute E17 (Sync + webhook, incremental only)

## Big picture

`constance-conservation/cc-dashboard` is the master Next.js dashboard. We're in round 5 of M03b — porting `FrostyFruit1/constance-reporting` into cc-dashboard at `/reporting/*` and `/api/*`. Already shipped: E8, F1, E9, E10, E10b, E11, E13, E15, E12, E14, E15b, E16. M03b is at "fully editable + generation-capable" state. Remaining: E17 (this brief), E18 (cutover, ~1 hour).

**Your job:** execute brief E17 — port the standalone's incremental sync (`src/sync/`) and webhook (`src/webhook/handler.ts`), plus the shared processing core (`src/parser/`, `src/db/writer.ts`, `src/db/lookups.ts`, `src/pipeline/process_inspection.ts`). Wire the sync into a Vercel Cron route at `/api/cron/sync-sc-inspections` and the webhook into a route at `/api/webhooks/sc/`.

**Backfill is explicitly out of scope.** The standalone has been syncing since project inception — historical data is already in Supabase. E17 only handles incremental from now forward. If a one-shot full re-backfill is ever needed, run the standalone's `npm run sync:backfill` from the local clone at `~/Desktop/constance-reporting/`.

**Estimate: ~2–3 days.** Single PR. Optional intermediate draft PR after the processing-core port milestone — see brief workstream step 10.

## Worktree setup (round 5 standard)

```
cd /Users/feelgood/Desktop/cc-dashboard
git checkout main && git pull
git worktree add /Users/feelgood/Desktop/cc-dashboard-e17 -b feature/reporting-port-e17 main
cd /Users/feelgood/Desktop/cc-dashboard-e17
cp /Users/feelgood/Desktop/cc-dashboard/.env.local .
npm install
```

Stay in `/Users/feelgood/Desktop/cc-dashboard-e17` for the rest of the session.

## Repo state

- SSH + identity + `gh` CLI all configured.
- `.env.local` includes `SUPABASE_SERVICE_ROLE_KEY` from earlier rounds.
- `CRON_SECRET` may not be in `.env.local` yet (Peter has deferred adding it on Vercel) — for local sync route testing you can set any value and use it in your curl.
- `SAFETY_CULTURE_API_TOKEN` is NOT in cc-dashboard's `.env.local` yet — pull from the standalone's `.env` at `~/Desktop/constance-reporting/.env` and add to `.env.local` for local testing. On the Vercel project, Peter must add this env var (preview + production) before sync/webhook will succeed; document this in the PR test-plan.
- Working tree on `main` at commit `62b9a54` (or later).
- Standalone source clone at `/Users/feelgood/Desktop/constance-reporting/` — read-only reference. DO NOT modify.

## The brief

`docs/executor_briefs/E17_sync_webhook.md` — read fully. ~2–3 day estimate. The brief has detailed module layout, adjustments-vs-standalone notes, route shapes, and 6 open questions to resolve at implementation.

## Hard constraints

- **DO NOT modify** `lib/reporting/generation/` (E16 territory; recently merged).
- **DO NOT modify** `app/api/cron/generate-reports/route.ts` (E16).
- **DO NOT modify** `lib/reporting/queries.ts` or `lib/reporting/types.ts` — ingestion has its own types under `lib/reporting/ingestion/parser/types.ts`.
- **DO NOT modify** any `app/(dashboard)/reporting/*` page or `components/reporting/*` component (no UI changes in E17).
- **DO NOT modify** the existing `vercel.json` cron entry for generate-reports — APPEND the sync entry alongside it.
- **DO NOT modify** `~/Desktop/constance-reporting/` — read-only reference.
- **DO NOT add backfill paths** — explicitly stripped from the port.
- **DO NOT port** `src/webhook/server.ts` (Vercel route replaces it), `src/webhook/register.ts` (manual operation post-cutover), `src/shared/config.ts`, `src/shared/logger.ts` (drop entirely; use direct env access + `console.*`).
- **DO NOT install new npm deps** without surfacing first. The port should work with existing deps + native `fetch` + `next/server`'s `after`.
- DO NOT modify global git config.
- DO NOT push to `main`. Open a PR.
- DO NOT run `gh pr merge`.

You ARE expected to:
- Create the entire `lib/reporting/ingestion/` tree (~14 source files + ~8 test files).
- Create `app/api/cron/sync-sc-inspections/route.ts`.
- Create `app/api/webhooks/sc/route.ts`.
- Modify `vercel.json` to APPEND the sync cron entry.

## Out of scope (do not do these)

- Backfill / re-sync logic — explicitly excluded.
- Webhook URL change at SC (registering cc-dashboard's URL with Safety Culture) — that's E18.
- UI changes — none in this brief.
- Schema migrations — none needed.
- Standalone HTTP server, webhook registration CLI — replaced by routes / manual ops.

If you find yourself wanting to add these, **stop and surface it** before pushing.

## Coordination — no parallel streams this round

E17 is the sole brief in round 5.

- E16's recent merges (`84bdbec`, `5f332a1`) are on main. Mirror E16's cron route auth-gate pattern (`app/api/cron/generate-reports/route.ts`) for the new sync cron route.
- Mirror E15b's `resolveOrgId` pattern (in `app/(dashboard)/reporting/clients/actions.ts`) for runtime organization-id lookup.

## Open questions to resolve at implementation (document in PR)

The brief lists 6. Top three to surface in the PR:
1. Webhook signature verification — does SC sign payloads? Implement if so; document URL-as-bearer-token if not.
2. `processInspection` failure handling in webhook — default no retry for v1 (SC re-sends on next inspection update); document trade-off.
3. Sync cadence — default `*/15 * * * *` (every 15 min); document why if changing.

## Special note on testing

You CAN run tests headless:
1. `npm run build` (TypeScript + compile).
2. `npm run test` — vitest, all ported + new tests pass without hitting live DB or live SC API.

For runtime validation, you'll need:
- `SUPABASE_SERVICE_ROLE_KEY` (already in `.env.local`)
- `SAFETY_CULTURE_API_TOKEN` (pull from standalone `.env`)
- `CRON_SECRET` (any value for local; must match the curl)

Smoke-test locally with `npm run dev` and the curl commands from the brief's Done definition step 5. End-to-end "an inspection edit in SC appears in Supabase via the cc-dashboard route" requires a preview deploy with the env vars set — Peter will do that manual verification.

## Report-back format

```
✅/❌ E17 Sync + webhook (incremental only)
Worktree: /Users/feelgood/Desktop/cc-dashboard-e17
PR: <url>
Build: ✅/❌ TypeScript + N routes generating + N functions
Tests: ✅/❌ vitest run (X ported + Y new = Z total — should be ~80+ counting E16's 51)
Verifications:
  - Cron route returns 200 with summary on local invocation: ✅/❌/skipped
  - Webhook route returns expected shapes for the 4 test payloads (Done def §5): ✅/❌/skipped
  - End-to-end SC → cc-dashboard sync (one fresh inspection edit): ✅/❌/skipped (reason)
Open questions resolved:
  - Webhook signature verification: <implemented | URL-as-bearer-token | other> because <reason>
  - Webhook retry policy: <no retry / SC re-sends | other> because <reason>
  - Sync cadence: <*/15 * * * * | other> because <reason>
  - organizations table cardinality observed: <single row | N rows>
  - Concurrency with standalone during transition: <single sync_state row, dedup handles it | other>
  - after() availability: <next/server export | unstable_after fallback | waitUntil>
Env vars required for the routes to succeed on preview:
  - SAFETY_CULTURE_API_TOKEN (NEW — Peter must add; pull value from standalone .env)
  - SUPABASE_SERVICE_ROLE_KEY (already set)
  - CRON_SECRET (already deferred per Peter's note)
Files created: <list under lib/reporting/ingestion/, app/api/cron/sync-sc-inspections/, app/api/webhooks/sc/>
Files modified:
  - vercel.json (append sync cron entry; preserve generate-reports entry)
Files NOT touched (per coordination):
  - lib/reporting/generation/* (E16)
  - app/api/cron/generate-reports/route.ts (E16)
  - lib/reporting/queries.ts, lib/reporting/types.ts
  - app/(dashboard)/reporting/*, components/reporting/*
  - package.json (no new deps)
Open questions / blockers: <bullets, or "none">
```

Then stop. Do not run `gh pr merge`.

## Procedure summary

1. Worktree setup commands above.
2. Read brief + standalone source under `~/Desktop/constance-reporting/src/{sync,webhook,parser,db,pipeline}/` in full.
3. Pull `SAFETY_CULTURE_API_TOKEN` from standalone `.env` and add to your `.env.local`.
4. Port files in this order — processing core first:
   - `parser/types.ts`
   - `parser/normalizers.ts`, `parser/free_text_parsers.ts`, `parser/field_extractors.ts`
   - `parser/chemical_application_record.ts`, `parser/daily_work_report.ts`
   - `parser/index.ts`
   - `lookups.ts`, `writer.ts`
   - `process_inspection.ts`
   - `sc_api_client.ts`
   - `webhook_handler.ts` (refactor: remove inline processInspection call — route handler invokes via `after()`)
   - `scheduled_sync.ts` (with backfill stripped)
5. Port the matching tests; `npm run test` passes at each stage.
6. (Optional) Open a draft PR at this point.
7. Implement `app/api/cron/sync-sc-inspections/route.ts` (mirror E16's auth gate).
8. Implement `app/api/webhooks/sc/route.ts` using `after()` from `next/server`.
9. APPEND the sync cron entry to `vercel.json` (preserve generate-reports entry).
10. `npm run build` and `npm run test` — both must pass.
11. Smoke-test locally if possible.
12. Commit + Co-Authored-By.
13. `git push -u origin feature/reporting-port-e17`
14. `gh pr create` with test-plan covering env vars, SC token requirement, webhook URL change deferred to E18, resolved open questions.
15. Report back per format above.
```
