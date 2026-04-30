# E13 — Operations: Staff & Hours, Chemicals, Species

**Status:** Approved 2026-04-29
**Brief written:** 2026-04-29
**Repo:** `constance-conservation/cc-dashboard`
**Branch:** `feature/reporting-port-e13` (off `main`)
**Predecessor:** E10 (merged `82e8d0d`).
**Audit context:** `docs/audit/operations_data_wiring.md` is the
**source of truth** for this brief — full per-page UI inventory, data
sources, schema deps, code refs, and port notes are documented there.
This brief is procedural; **read the audit doc first**.

---

## Goal

Replace 3 greyed-out placeholder rows in the reporting sub-nav with
native Server Component pages, mirroring the standalone's three
Operations pages (Staff & Hours, Chemicals, Species). Single PR
for all three because they share infrastructure and the sub-nav
un-greying should be atomic.

---

## Scope

Per `operations_data_wiring.md` §Proposed brief structure:

- **Staff & Hours** — 3 KPIs + bar chart + roster table. Read-only.
- **Chemicals** — 4 KPIs + bar chart + recent application records
  list + chemical reference card grid. Read-only.
- **Species** — 3 KPIs + bar chart + species reference card grid. Read-only.

All three are zero-schema-additions — every required table already
exists on the live Supabase project (`ymcyunspmljaruodjpkd`).

---

## Architecture (single source of truth: the audit doc)

`operations_data_wiring.md` contains:

- Per-page UI breakdown (KPIs, charts, tables, card grids)
- Per-page data sources (tables + column projections + JS aggregations)
- Schema dependencies (tables, columns, enums)
- Code references (file paths + line ranges in standalone)
- Port notes (complexity, non-obvious behaviour, dependencies)

Read it for the spec. **Mirror the standalone's existing canonical-vs-raw
count behaviour** for parity in the first port (the audit flags this as a
candidate fix; defer to a follow-up brief).

---

## Files to CREATE

Three new routes:
- `app/(dashboard)/reporting/staff/page.tsx`
- `app/(dashboard)/reporting/chemicals/page.tsx`
- `app/(dashboard)/reporting/species/page.tsx`

Plus components if needed (e.g., a card-grid primitive shared between
Chemicals and Species). Audit doc recommends inlining `pill` helper
for now (used only by Staff's Status column) — extract to a primitive
when E11 needs it broadly.

CSS for `.chem-card`, `.species-card` etc. — audit recommends adding
to `app/globals.css` for consistency with existing reporting styles.

## Files to MODIFY

- `lib/reporting/queries.ts` — add `getStaffData`, `getChemicalsData`,
  `getSpeciesData`. ~60 lines per function.
- `lib/reporting/types.ts` — add corresponding return types.
- `app/globals.css` — add `.chem-card`, `.chem-name`, `.chem-type`,
  `.chem-stat-row`, `.species-card`, `.species-name`, `.species-sci`,
  `.species-count` styles. Audit doc §Cross-cutting observations says
  shared structural pattern — keep CSS DRY.

## Files NOT touched (until end)

- `components/reporting/ReportingNav.tsx` — un-greying the 3 Operations
  rows is the **last commit** of this brief, after the 3 pages are
  implemented and verified locally. This makes the sub-nav change
  atomic with the routes going live.

---

## Done definition

A reviewer can:

1. Visit `/reporting/staff` → sees 3 KPIs + hours bar chart + roster
   table matching the standalone's `loadStaff` output.
2. Visit `/reporting/chemicals` → sees 4 KPIs + usage bars + recent
   application records list + chemical reference grid matching `loadChemicals`.
3. Visit `/reporting/species` → sees 3 KPIs + species frequency bars +
   species reference grid matching `loadSpecies`.
4. Sub-nav: the 3 Operations rows are no longer greyed; clicking each
   navigates to the correct route; active highlight follows.
5. `npm run build` passes.

---

## Out of scope

- Drill-downs (none in standalone)
- Filters / sort / search (none)
- Edit / delete (none)
- Canonical-vs-raw count fix (mirror standalone, defer to follow-up)

---

## Workstream procedure

1. Cut `feature/reporting-port-e13` off `main`.
2. **Read `docs/audit/operations_data_wiring.md` cover to cover before coding.**
3. Implement in order recommended by audit §Proposed brief structure:
   - 30 min: scaffold three new routes with subpage shell.
   - 90 min: add three query functions to `lib/reporting/queries.ts` +
     types.
   - 60 min: Staff page (smallest, no card grid).
   - 90 min: Chemicals page (introduces card-grid CSS).
   - 60 min: Species page (reuses card-grid CSS).
   - **30 min — last step before push:** un-grey the 3 Operations rows
     in `ReportingNav.tsx` by replacing `href: null` with the real paths
     and removing the disabled-style branch for those items.
   - 60–120 min: visual verify against live standalone for each page.
4. `npm run build` — must pass.
5. Push branch, open PR.
6. Visual verify all 3 pages on Vercel preview vs standalone.
7. Merge (squash).

---

## Coordination notes

This brief is being executed in parallel with E11 and E10b. Three
constraints to avoid conflicts:

1. **`lib/reporting/queries.ts` is append-only across all three streams.**
   E11 adds `getInspectionsListData`. E10b adds `uploadReportImage` +
   `saveReportEdits` Server Actions (in a separate file actually — `actions.ts`).
   E13 adds `getStaffData`, `getChemicalsData`, `getSpeciesData`. Last
   merger handles small textual conflicts.
2. **`components/reporting/ReportingNav.tsx`** — only E13 touches this
   file. E11 doesn't (Inspections is already linked). E10b doesn't.
3. **`app/globals.css`** — only E13 touches this file (for card grids).
   Other streams stay out of it.

If you find yourself wanting to modify a file outside these allowed
ones, **stop and surface it to the orchestrator** before pushing.
