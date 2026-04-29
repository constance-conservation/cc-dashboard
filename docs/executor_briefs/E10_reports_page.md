# E10 — Reports list + read-only viewer

**Status:** Approved 2026-04-29 (post-audit) — read-only viewer scope confirmed by Peter; edit mode deferred to E10b.
**Brief written:** 2026-04-29
**Repo:** `constance-conservation/cc-dashboard`
**Branch:** `feature/reporting-port-e10` (off `main` once audit PR merges)
**Predecessor:** E9 (merged `3f28162`).
**Audit context:** `docs/audit/standalone_feature_inventory.md` §1.4 + §4.

---

## Goal

Replace the `ComingSoon` stub at `/reporting/reports` with a native
Server Component **read-only viewer** of the `client_reports` table.
Honour the `?scope=client|site|zone&id=<uuid>` query params emitted by
E9's Generate Report buttons so deep-linking from any client / site /
zone detail page filters correctly.

**Success =** clicking any "Generate report" button on
`/reporting/clients/*` lands on `/reporting/reports?scope=...&id=...`,
shows the matching list of `client_reports` rows, and lets the user
open the PDF in a new tab + download the DOCX. Total + per-status KPIs
at top.

---

## Scope (deliberately narrow)

E10 is **read-only**. It is a viewer, not an editor or generator.

**Explicitly OUT of scope** — each has its own brief:
- Edit mode (`contentEditable` iframe, image drop zones) → **E10b**
- "Generate Now" button → **E16** (generation pipeline + cron)
- Approve & Send → M04 (out of M03b entirely)
- Modal preview → not in M03b. New-tab open is the substitute.
- Filtering UI beyond URL param → defer until needed (paginate later).

This keeps E10 small and shippable in half a day, and decouples it
from the much larger E10b/E16 work.

---

## Architecture

- **Server Component** at `app/(dashboard)/reporting/reports/page.tsx`.
  `force-dynamic`. Reads `searchParams` for `scope` + `id`.
- **Query function** `getReportsListData({ scope, id })` in
  `lib/reporting/queries.ts`.
  - `scope=client` → `WHERE client_id = id`
  - `scope=site` or `scope=zone` → `WHERE site_id = id` (zones ARE sites)
  - no scope (or invalid) → unfiltered, capped at 100 rows, ordered by `created_at DESC`
- **Joins** to `clients(name,long_name)` + `sites(name)` to surface display
  names for the filter chip.
- **Components added under `components/reporting/`:**
  - `ReportRow.tsx` — list row showing title, period, status badge,
    created date, and action buttons (Open PDF, Download DOCX).
  - `ScopeChip.tsx` — small pill at the top of the page indicating which
    scope this view is filtered by, with a "Clear filter" link to the
    unfiltered view.
- **Reuse `KpiTile`.** No new chart primitives.
- **Status badge** uses the existing `.pill` classes (`.pill.ok`, `.pill.warn`,
  `.pill.danger`, `.pill.accent`). Mapping to be defined in `ReportRow`
  after enum values are confirmed during implementation.

---

## Reference: source material

- `~/Desktop/constance-reporting/dashboard-preview.html`:
  - **lines 696–732** — reports page markup + modal (modal/edit-mode out of scope)
  - **lines 1796–1863** — `loadReports(d)` rendering logic for KPIs and cards
- `~/Desktop/constance-reporting/supabase/migrations/deploy_all.sql`:
  - **lines 430–453** — `client_reports` schema
- `~/Desktop/constance-reporting/supabase/migrations/004_report_generation_additions.sql` —
  cadence-era additions to `client_reports` (read for any column not in base schema).

---

## Schema (relevant columns)

```
client_reports
  id                   uuid PK
  organization_id      uuid FK
  client_id            uuid FK → clients
  site_id              uuid FK → sites          -- can be top-level site OR zone
  report_period_start  date
  report_period_end    date
  title                text
  author_name          text
  addressed_to         text
  status               report_status            -- enum, verify values during implementation
  pdf_url              text                     -- public Supabase Storage URL (nullable)
  docx_url             text                     -- public Supabase Storage URL (nullable)
  created_at           timestamptz
  updated_at           timestamptz
```

Verify the `report_status` enum values during implementation (likely
`'draft' | 'review' | 'approved' | 'sent'` based on standalone's
`loadReports`). Status badge colour mapping defined in `ReportRow`
based on actual values.

---

## Page layout

```
┌─────────────────────────────────────────────────────────────┐
│ ← Reporting    │   Auto-generated client reports           │
│                │   Reports                                  │
├─────────────────────────────────────────────────────────────┤
│ [Scope: Camden Council • Clear filter]                      │  (if scoped)
├─────────────────────────────────────────────────────────────┤
│ KPI: Total | Drafts | In Review | Approved/Sent             │
├─────────────────────────────────────────────────────────────┤
│ Reports                                       N reports     │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Title                                                  │  │
│ │ Period · client · created · [draft] · [PDF] [DOCX]     │  │
│ └────────────────────────────────────────────────────────┘  │
│ … repeated …                                                │
└─────────────────────────────────────────────────────────────┘
```

KPI tiles match the standalone's set: Total / Drafts / In Review / Approved.
Empty state: "No reports for this scope yet. Once generation lands (E16),
reports configured by the cadence selector will appear here."

---

## Files to CREATE

- `components/reporting/ReportRow.tsx` (~70 lines)
- `components/reporting/ScopeChip.tsx` (~35 lines)

## Files to MODIFY

- `lib/reporting/queries.ts` — add `getReportsListData`. ~60 lines.
- `lib/reporting/types.ts` — add `ReportRow`, `ReportsListData`,
  `ReportStatus`, `ScopeContext`. ~30 lines.
- `app/(dashboard)/reporting/reports/page.tsx` — replace `ComingSoon`. ~120 lines.

## Files NOT touched

- Anything outside `app/(dashboard)/reporting/reports/`,
  `lib/reporting/`, and `components/reporting/`.

---

## Done definition

A reviewer can:

1. Visit `/reporting/reports` (no params) → see all reports, capped at 100,
   ordered newest first.
2. Click "Generate report" on a client / site / zone in `/reporting/clients/*`
   → land on `/reporting/reports?scope=...&id=...` with the list filtered.
3. See a scope chip showing which client/site/zone is filtered + a
   "Clear filter" link.
4. KPIs reflect the filter.
5. Click "Open PDF" → opens `pdf_url` in a new tab. If `pdf_url` is null,
   button is disabled with `title="PDF not yet generated"`.
6. Click "Download DOCX" → triggers download of `docx_url`. Same null handling.
7. Sub-nav highlights "Client Reports".
8. Empty list shows the helpful empty state pointing at E16.
9. `npm run build` passes.

---

## Open questions (to resolve at implementation)

- **`report_status` enum values.** Read the migration; verify against
  what `loadReports` checks for (`draft`, `review`, `approved`, `sent`).
- **`location_maps` and `period_map_images` columns.** Confirmed referenced
  by the standalone but not consumed by the read-only viewer; ignore for E10.

---

## Workstream procedure

1. Cut `feature/reporting-port-e10` off `main` (after audit PR merges).
2. Verify `report_status` enum + any extra cadence-era columns.
3. Implement: `types.ts` → `queries.ts` → `ReportRow` / `ScopeChip` → `page.tsx`.
4. `npm run build` — must pass.
5. Push branch, open PR.
6. Visual verify on the Vercel preview URL.
7. Merge (squash, same as E8/E9).
8. Update `docs/milestones/M03b_native_integration_status.md` to mark
   E10 complete, E11 in flight.
