# E11 — Inspections page

**Status:** Approved 2026-04-29
**Brief written:** 2026-04-29
**Repo:** `constance-conservation/cc-dashboard`
**Branch:** `feature/reporting-port-e11` (off `main`)
**Predecessor:** E10 (merged `82e8d0d`).
**Audit context:** `docs/audit/standalone_feature_inventory.md` §1.1.

---

## Goal

Replace the `ComingSoon` stub at `/reporting/inspections` with a native
read-only Server Component matching the standalone's `loadInspections`
view (4 KPIs + 50-row table aggregating tasks, weeds, photos, supervisor
per inspection).

---

## Scope

**Pure read-only.** No filters, no sort controls, no search, no modal,
no drill-down. Exact parity with the standalone's `page-inspections`.

---

## Architecture

- Server Component at `app/(dashboard)/reporting/inspections/page.tsx`. `force-dynamic`.
- Query: `getInspectionsListData()` in `lib/reporting/queries.ts`.
  - Fetches up to 2000 inspections sorted by `date DESC` (mirrors the
    standalone's loadData call).
  - Fetches `inspection_tasks`, `inspection_weeds`, `inspection_media`
    for aggregation.
  - JS-aggregates: count of tasks / weeds / media per inspection_id.
  - Returns the first 50 rows for the table (mirrors standalone slice)
    plus full counts for the KPIs.
- Reuse `KpiTile` for the 4 KPI tiles.
- New small component `components/reporting/InspectionsTable.tsx`.
- Status pill: same visual as ReportRow's status — reuse `.pill` classes.

---

## Reference: source material in `~/Desktop/constance-reporting/`

- `dashboard-preview.html` lines **545–556** — page-inspections markup.
- `dashboard-preview.html` lines **913–939** — `loadInspections(d)` data
  flow.
- `dashboard-preview.html` lines **808–828** — `loadData()` query
  projections (the SELECTs to mirror).
- `~/Desktop/cc-dashboard/lib/reporting/queries.ts:32-99` — existing
  `getLandingDashboardData` query pattern to follow (parallel queries +
  JS aggregation).

---

## Schema dependencies

- `inspections`: `id, date, site_id, supervisor_id, sc_template_type,
  processing_status` — for the rows.
- Embedded join: `sites(name)` for site display name. The standalone
  uses `i.sites?.name`.
- Embedded join: `staff(name)` via `supervisor_id` for supervisor display.
- `inspection_tasks`: `inspection_id` only (counted).
- `inspection_weeds`: `inspection_id` only (counted).
- `inspection_media`: `inspection_id` only (counted).

All tables already exist on the live Supabase project. No schema changes.

---

## KPI definitions

```
Total                — count of all inspections
Daily Work Reports   — count where sc_template_type = 'daily_work_report'
Chemical Records     — count where sc_template_type = 'chemical_application_record'
Failed               — count where processing_status = 'failed'
```

---

## Table columns (50 rows max, mirror standalone)

```
Date | Site | Template | Supervisor | Tasks | Weeds | Photos | Status
```

- **Date** — `i.date` formatted as `YYYY-MM-DD` or '—' if null
- **Site** — `i.sites?.name` or muted '—'
- **Template** — `tmpl(i.sc_template_type)` mapping (see below)
- **Supervisor** — `i.staff?.name` or '—'
- **Tasks / Weeds / Photos** — count from aggregation, tabular-nums
- **Status** — pill matching the same visual as ReportRow

Template name mapping (from standalone's `tmpl()` helper):
- `daily_work_report` → "Daily Work Report"
- `chemical_application_record` → "Chemical Application"
- otherwise → as-is

---

## Files to CREATE

- `components/reporting/InspectionsTable.tsx` (~70 lines)

## Files to MODIFY

- `lib/reporting/queries.ts` — add `getInspectionsListData`. ~80 lines.
- `lib/reporting/types.ts` — add `InspectionRow`, `InspectionsListData`,
  `InspectionTemplateType`. ~25 lines.
- `app/(dashboard)/reporting/inspections/page.tsx` — replace ComingSoon. ~70 lines.

## Files NOT touched

- Anything outside `app/(dashboard)/reporting/inspections/`,
  `lib/reporting/`, and `components/reporting/`.

**Specifically: do NOT touch `components/reporting/ReportingNav.tsx`.**
The Inspections nav entry already links correctly — un-greying changes
are coordinated separately by the orchestrator after E13/E14.

---

## Done definition

A reviewer can:

1. Visit `/reporting/inspections` → sees 4 KPI tiles with correct totals
   matching the standalone.
2. Sees a table of up to 50 inspections, newest-first.
3. Tasks / Weeds / Photos columns show non-zero counts where data exists.
4. Status pill colours match: completed=green, failed=red, needs_review=warn,
   processing/pending=neutral.
5. Sub-nav highlights "Inspections".
6. `npm run build` passes.

---

## Out of scope

- Pagination (50 hard limit, same as standalone).
- Filtering / search / sort UI.
- Click-through to inspection detail (no detail route exists).
- Edit / delete operations.

---

## Workstream procedure

1. Cut `feature/reporting-port-e11` off `main`.
2. Implement files in order: `types.ts` → `queries.ts` → `InspectionsTable` → `page.tsx`.
3. `npm run build` — must pass.
4. Push branch, open PR.
5. Visual verify on the Vercel preview URL against
   `https://constance-reporting.vercel.app#inspections`.
6. Merge (squash, same as E8/E9/E10).
