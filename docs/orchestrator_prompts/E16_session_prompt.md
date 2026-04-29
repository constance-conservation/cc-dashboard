# Orchestrator prompt — Execute E16 (Generation pipeline full port + tests + Vercel Cron)

Copy the body below into a fresh Claude Code instance opened in
`/Users/feelgood/Desktop/cc-dashboard/`.

**Round-4 standard:** uses `git worktree` to isolate from the parallel E15b session.

---

```markdown
# Parallel orchestrator brief — Execute E16 (Generation pipeline)

## Big picture

`constance-conservation/cc-dashboard` is the master Next.js dashboard. We're in round 4 of M03b — porting `FrostyFruit1/constance-reporting` into cc-dashboard at `/reporting/*`. Already shipped: E8, F1, E9, E10, E10b, E11, E13, E15, E12, E14. M03b is at "fully viewable + fully editable" state. Remaining: E15b, E16 (this brief), E17, E18.

**Your job:** execute brief E16 — port the standalone's generation pipeline (`~/Desktop/constance-reporting/src/report/` + `src/bin/generate_report.ts`) into cc-dashboard as native code under `lib/reporting/generation/`. Wire it as Server Actions to the existing `<GenerateReportButton>`. Port the existing vitest test suite. Add a Vercel Cron route that walks `clients.report_frequency` and triggers due reports.

This is a deliberate FULL port (not a CLI wrapper around the standalone) per Peter's stated preference — see brief for rationale.

**Estimate: ~2 days.** Single PR. Optional intermediate draft PR after the port-and-action milestone — see brief workstream step 11.

## Worktree setup (round 4 standard)

```
cd /Users/feelgood/Desktop/cc-dashboard
git checkout main && git pull
git worktree add /Users/feelgood/Desktop/cc-dashboard-e16 -b feature/reporting-port-e16 main
cd /Users/feelgood/Desktop/cc-dashboard-e16
cp /Users/feelgood/Desktop/cc-dashboard/.env.local .
npm install
```

Stay in `/Users/feelgood/Desktop/cc-dashboard-e16` for the rest of the session.

## Repo state

- SSH + identity + `gh` CLI all configured.
- `.env.local` includes `SUPABASE_SERVICE_ROLE_KEY` from earlier rounds.
- `ANTHROPIC_API_KEY` may or may not be set in `.env.local` — code MUST handle the missing case with `skipLLM` placeholder behaviour (matches standalone).
- `CRON_SECRET` is NOT set — you'll need to generate a value, document it in the PR test-plan, and Peter will add it to the Vercel project env before testing the cron route on preview.
- Working tree on `main` at commit `aa9d5a8` (or later).
- Standalone source clone at `/Users/feelgood/Desktop/constance-reporting/` — read-only reference. DO NOT modify.

## The brief

`docs/executor_briefs/E16_generation_pipeline.md` — read fully. ~2-day estimate. The brief has detailed module layout, adjustments-vs-standalone notes, Server Action shape, cron route design, and 6 open questions to resolve at implementation.

## Hard constraints

- **DO NOT modify** `app/(dashboard)/reporting/clients/actions.ts` (E15b appends CRUD).
- **DO NOT modify** `app/(dashboard)/reporting/clients/[id]/sites/actions.ts` (E15b appends CRUD).
- **DO NOT modify** the three reporting page.tsx files E15b is editing:
  - `app/(dashboard)/reporting/clients/page.tsx`
  - `app/(dashboard)/reporting/clients/[id]/page.tsx`
  - `app/(dashboard)/reporting/clients/[id]/sites/[siteId]/page.tsx`
  Your `<GenerateReportButton>` refactor MUST keep the same exported props (`{ scope, id, label? }`) so these files don't need any edit on E16's account.
- **DO NOT modify** `lib/reporting/queries.ts` or `lib/reporting/types.ts` — generation has its own query and type surface under `lib/reporting/generation/`. If the cron route needs a "find due clients" query, put it in `lib/reporting/generation/scheduling.ts` or inline in the route.
- **DO NOT modify** `app/(dashboard)/reporting/{pipeline,sites,reports,operations,inspections}/`.
- **DO NOT modify** `~/Desktop/constance-reporting/` — it is the read-only reference.
- DO NOT modify global git config.
- DO NOT push to `main`. Open a PR.
- DO NOT run `gh pr merge`.

You ARE expected to:
- Create the entire `lib/reporting/generation/` tree (~12 files including tests).
- Create `app/api/cron/generate-reports/route.ts` and `vercel.json`.
- Create `vitest.config.ts`.
- Modify `package.json` to add `@anthropic-ai/sdk`, `docx` deps and `vitest` devDep + `"test"` script.
- Modify `components/reporting/GenerateReportButton.tsx` — convert from `<Link>` to a client component that calls the Server Action. Keep exported props identical.

## Out of scope

- Sync + webhook (E17 — different brief).
- Cutover of the APPS card href (E18 — different brief).
- Email delivery of reports.
- HTML sanitisation of `client_reports.html_content` (deferred per E10b PR; out-of-band track).
- Any visual restyling of the rendered report — port faithfully.
- The `migrate_to_new_supabase.ts` and `retag_templates.ts` standalone bin scripts.

If you find yourself wanting to add these, **stop and surface it** before pushing.

## Coordination — parallel streams

E15b (add/delete sites + zones + new client) is running in parallel.

- E15b owns `app/(dashboard)/reporting/clients/actions.ts` and `app/(dashboard)/reporting/clients/[id]/sites/actions.ts` (CRUD appends).
- E15b owns the three reporting page.tsx files for adding buttons/menus. Your `<GenerateReportButton>` refactor must not require any page.tsx changes — keep the exported props identical so callsites stay untouched.
- E15b adds NO npm deps. You own `package.json` this round.
- E15b does NOT touch `lib/reporting/queries.ts` or `lib/reporting/types.ts`. You should not need them either.

If a merge conflict surprises you (it shouldn't — file paths are disjoint by design), the established resolution template is the append-only stack pattern from rounds 2–3.

## Open questions to resolve at implementation (document in PR)

The brief lists 6. Top three to surface in the PR:
1. Storage URL shape (object path vs signed URL) in `client_reports.docx_url`.
2. Cron schedule: weekly Mondays vs daily-with-skip. Default daily-with-skip.
3. Zone-scope auto-generation in cron. Default NO for v1.

## Special note on testing

You CAN run tests headless:
1. `npm run build` (TypeScript + compile).
2. `npm run test` — vitest, all ported + new tests pass without hitting live DB.

For the runtime end-to-end (button click → generated report), you need:
- `ANTHROPIC_API_KEY` (optional — code falls back to placeholders if missing)
- `SUPABASE_SERVICE_ROLE_KEY` (already in `.env.local`)
- `reports` storage bucket existing in Supabase

If you can run `npm run dev` and exercise the button end-to-end locally, do it. If you can't (e.g., bucket missing), say "skipped — needs preview deploy + bucket setup" in the report-back. Peter will do the manual verify on preview.

## Report-back format

```
✅/❌ E16 Generation pipeline (full port + tests + cron)
Worktree: /Users/feelgood/Desktop/cc-dashboard-e16
PR: <url>
Build: ✅/❌ TypeScript + N routes generating + N functions
Tests: ✅/❌ vitest run (X ported + Y new = Z total)
Verifications:
  - End-to-end generate via button (browser): ✅/❌/skipped (reason)
  - Cron route returns 200 with summary on local invocation: ✅/❌/skipped
  - Generated HTML/DOCX matches standalone output for same scope+period: ✅/❌/skipped
Open questions resolved:
  - Storage URL shape: <object-path | signed-url> because <reason>
  - Cron schedule: <0 6 * * 1 | 0 6 * * *> because <reason>
  - Zone auto-generation in cron: <on | off> because <reason>
  - <other resolutions>
Env vars required for the action to succeed on preview:
  - ANTHROPIC_API_KEY (optional — placeholders if missing)
  - SUPABASE_SERVICE_ROLE_KEY (already set)
  - CRON_SECRET (NEW — Peter must add: <suggested value or instruction to generate one>)
Storage bucket setup:
  - reports bucket: <auto-created on first run | manual setup required>
Files created: <list under lib/reporting/generation/, app/api/cron/, vitest.config.ts, vercel.json>
Files modified:
  - package.json (deps: @anthropic-ai/sdk, docx, vitest)
  - components/reporting/GenerateReportButton.tsx (Link → client component)
Files NOT touched (per coordination):
  - app/(dashboard)/reporting/clients/actions.ts (E15b)
  - app/(dashboard)/reporting/clients/[id]/sites/actions.ts (E15b)
  - app/(dashboard)/reporting/clients/page.tsx (E15b)
  - app/(dashboard)/reporting/clients/[id]/page.tsx (E15b)
  - app/(dashboard)/reporting/clients/[id]/sites/[siteId]/page.tsx (E15b)
  - lib/reporting/queries.ts, lib/reporting/types.ts
Open questions / blockers: <bullets, or "none">
```

Then stop. Do not run `gh pr merge`.

## Procedure summary

1. Worktree setup commands above.
2. Read brief + standalone source under `~/Desktop/constance-reporting/src/report/` and `src/bin/generate_report.ts` in full.
3. `npm install --save @anthropic-ai/sdk docx` and `npm install --save-dev vitest`.
4. Add `vitest.config.ts` + `"test": "vitest run"` script. Verify `npm run test` runs (zero tests OK at this point).
5. Port files in this order:
   - `lib/reporting/generation/types.ts`
   - `period.ts`, `zones.ts`, `hierarchy.ts`
   - `aggregate.ts` (the big one)
   - `render_html.ts`, `render_docx.ts`
   - `narratives.ts`
   - `index.ts` (with storage-write replacing disk-write)
   - `scheduling.ts` (NEW — cadence due-date logic)
   - `actions.ts` (NEW — Server Actions)
6. Port the four standalone tests. Add `scheduling.test.ts` and `upsert.test.ts`.
7. `npm run build` and `npm run test` — both must pass.
8. (Optional) Open a draft PR at this point if you want intermediate review.
9. Implement the cron route + `vercel.json`.
10. Refactor `GenerateReportButton.tsx`.
11. `npm run build` again.
12. `npm run dev` and exercise via browser if possible.
13. Commit + Co-Authored-By.
14. `git push -u origin feature/reporting-port-e16`
15. `gh pr create` with test-plan covering: env vars, storage bucket setup, resolved open questions, what was verified vs skipped.
16. Report back per format above.
```
