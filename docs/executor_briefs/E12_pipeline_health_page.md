# E12 — Pipeline Health page

**Status:** Approved 2026-04-29
**Brief written:** 2026-04-29
**Repo:** `constance-conservation/cc-dashboard`
**Branch:** `feature/reporting-port-e12` (off `main`)
**Predecessor:** E11 (merged `94ddcf1`).
**Audit context:** `docs/audit/standalone_feature_inventory.md` §1.5.

---

## Goal

Replace the `ComingSoon` stub at `/reporting/pipeline` with a native
read-only Server Component matching the standalone's `loadPipeline`
view. After E12, every linked entry in the sub-nav resolves to a real
page — the standalone is fully *viewable* through cc-dashboard.

---

## Scope

**Pure read-only.** Pipeline diagnostics. No filters, no actions.

---

## Architecture

- Server Component at `app/(dashboard)/reporting/pipeline/page.tsx`. `force-dynamic`.
- Query: `getPipelineHealthData()` in `lib/reporting/queries.ts`.
- New components in `components/reporting/`:
  - `PipelineIssuesTable.tsx` — 20-row table of failures + needs_review items.
  - `SyncStateInfo.tsx` — three-column block showing last_sync_at, sync cursor, etc.
- Reuse `KpiTile`, `Donut`, `BarList` (all exist from E8).

---

## Reference: source material in `~/Desktop/constance-reporting/`

- `dashboard-preview.html` lines **735–752** — page-pipeline markup.
- `dashboard-preview.html` lines **1865–1900+** — `loadPipeline(d)` rendering.
- Existing `lib/reporting/queries.ts` `getLandingDashboardData` — for the
  status-counts pattern; reuse same approach.

---

## Schema dependencies

- `inspections`: `processing_status, sc_template_type, sc_audit_id, date`
  (already used by E8 + E11).
- `sync_state`: read all columns; standalone shows `last_sync_at` + cursor info.
  Verify the table exists and what columns it has during implementation —
  see `~/Desktop/constance-reporting/supabase/migrations/003_sync_state.sql`.

---

## KPI definitions

```
Processed     — total inspection rows
Success Rate  — completed / total (1-decimal %)
Review Queue  — count where processing_status = 'needs_review'
Failures      — count where processing_status = 'failed'
```

Status donut:
- Completed (green)
- Needs Review (warn)
- Failed (red)
- Processing (combined `processing` + `pending`, neutral)

Template bar list: count per `sc_template_type`, label-cased via existing
`tmpl()` mapping (Daily Work Report / Chemical Application / etc.).

Issues table: limit 20 rows. Columns: Audit ID (truncated), Date, Template, Status pill.

Sync state info: `last_sync_at` (formatted), and any other columns from `sync_state`.

---

## Files to CREATE

- `components/reporting/PipelineIssuesTable.tsx` (~50 lines)
- `components/reporting/SyncStateInfo.tsx` (~40 lines)

## Files to MODIFY

- `lib/reporting/queries.ts` — add `getPipelineHealthData`. ~70 lines.
- `lib/reporting/types.ts` — add `PipelineIssueRow`, `SyncState`,
  `PipelineHealthData`. ~25 lines.
- `app/(dashboard)/reporting/pipeline/page.tsx` — replace ComingSoon. ~80 lines.

## Files NOT touched

- `components/reporting/ReportingNav.tsx` — pipeline link already wired.
- Anything outside `app/(dashboard)/reporting/pipeline/`,
  `lib/reporting/`, and `components/reporting/`.

---

## Done definition

A reviewer can:

1. Visit `/reporting/pipeline` → 4 KPIs + status donut + template bars +
   issues table + sync-state info. All numbers match the standalone.
2. Issues table shows up to 20 rows of failures and needs_review items.
3. Sync state shows `last_sync_at` formatted as local time + any other
   sync columns surfaced.
4. Sub-nav highlights "Pipeline Health".
5. `npm run build` passes.

---

## Out of scope

- Triggering re-processing on failed items (CRUD).
- Detailed per-failure inspection (no detail page).
- Filtering / sort / search.

---

## Coordination notes — round 3

Parallel with E14 + E15. Shared file: `lib/reporting/queries.ts` (append-only).
**`components/reporting/ReportingNav.tsx`**: only E14 touches it. Stay out of it.

---

## Workstream procedure

1. `git worktree add /Users/feelgood/Desktop/cc-dashboard-e12 -b feature/reporting-port-e12 main`
2. `cd /Users/feelgood/Desktop/cc-dashboard-e12`
3. `cp /Users/feelgood/Desktop/cc-dashboard/.env.local .` (env not in git)
4. `npm install`
5. Read brief.
6. Implement: `types.ts` → `queries.ts` → components → `page.tsx`.
7. `npm run build` — must pass.
8. Commit + Co-Authored-By.
9. `git push -u origin feature/reporting-port-e12`
10. `gh pr create` with test-plan.
11. Report back.
