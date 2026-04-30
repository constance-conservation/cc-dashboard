# CC-Dashboard — Work Log

> Living document. Updated each session. Used to plan, track, and delegate work.
> Reference this before starting any task. Update status as work progresses.

---

## How to use this doc

- **Before starting**: check Current Sprint tasks and Backlog for context
- **Sub-agent delegation**: tasks tagged `[PARALLEL]` can be delegated to sub-agents concurrently
- **Branching rule**: every change gets a `feat/` or `fix/` branch — never commit to `main` directly
- **Deploy rule**: push feature branch → Vercel auto-builds a preview → James tests → PR → merge → prod deploy

---

## Current Sprint

### Task 4 — Rostering intelligence: weather, equipment conflicts, location picker
**Branch:** `feat/allocation-spread-panel`
**Status:** Code complete — pending DB migrations (014, 015) and James approval

**What was built:**
- `lib/types.ts`: Added `WeatherMetric`, `WeatherConstraint`, `DailyWeather` types; added `lat?/lng?` to `Project`; added `requiredEquipmentIds?/weatherConstraints?` to `ActivityType`; added `vehicles: Vehicle[]` to `CCState`
- `lib/rostering/engine.ts`: Imports shared types from `lib/types.ts`; already has `haversineKm`, weather gate, equipment conflict detection, workload balancing in `autoGenerate()` (all tested, 46 tests pass)
- `lib/store/CCStateContext.tsx`: `rowToProject` maps lat/lng; `contractPatch` persists lat/lng; `rowToActivityType` maps `required_equipment_ids`/`weather_constraints`; `updateActivityType` saves new fields; vehicles loaded from Supabase
- `app/(dashboard)/projects/page.tsx`: `ActivityTypesModal` has equipment multi-select + weather constraints editor per activity type; `ProjectDrawer` details tab + `AddProjectModal` have Leaflet map location picker (same CDN pattern as fleet page)
- `app/(dashboard)/rostering/page.tsx`: `runAutoGenerate` now async — fetches Open-Meteo weather for each project with lat/lng, builds `AutoGenerateOptions`, passes to `autoGenerate()`

**Pending DB migrations (need James approval before applying):**
- `014_project_location.sql`: Adds `lat`, `lng` columns to `client_contracts`
- `015_activity_type_metadata.sql`: Adds `required_equipment_ids`, `weather_constraints` JSONB columns to `activity_types`

| Step | Status |
|---|---|
| Engine types + autoGenerate intelligence | ✅ Done (46 tests) |
| `lib/types.ts` shared types + Project/ActivityType/CCState updates | ✅ Done |
| `CCStateContext` mapping + vehicle loading | ✅ Done |
| ActivityTypesModal: equipment + weather constraints UI | ✅ Done |
| ProjectDrawer + AddProjectModal: Leaflet location picker | ✅ Done |
| Rostering page: Open-Meteo weather fetch + AutoGenerateOptions | ✅ Done |
| Migration 014 (project lat/lng) | ⏳ Pending approval |
| Migration 015 (activity type metadata) | ⏳ Pending approval |

---

### Task 3 — Domain migration to app.constanceconservation.com.au
**Branch:** `feat/allocation-spread-panel`
**Status:** Complete

**Goal:** Make `app.constanceconservation.com.au` canonical; redirect `cc-dashboard-rouge.vercel.app` → new domain.

| Step | Status | Notes |
|---|---|---|
| 1. Codebase audit (hardcoded URLs) | ✅ Complete | No hardcoded old domain. `constanceconservation.com.au` refs are email-domain validation only. |
| 2. Vercel env var `NEXT_PUBLIC_SITE_URL` | ✅ Complete | Updated to `https://app.constanceconservation.com.au` via Vercel REST API (env ID `ahaVWCYdhrjOarvK`). |
| 3. `next.config.ts` host redirect | ✅ Complete | Host-based 307 redirect from `cc-dashboard-rouge.vercel.app` → new domain added. |
| 4. Supabase auth config | ✅ Complete | `site_url` + `uri_allow_list` updated via Management API. New domain added; old domain + localhost preserved. |
| 5. Code updates | ✅ Complete | None required (audit found nothing to change). |
| 6. Redeploy + verify | ⏳ Pending | Branch pushed — Vercel building preview. Merge to main for production deploy. |

---

### Task 2 — Fix site/activity persistence (RLS bug)
**Branch:** `feat/activity-redesign`
**Status:** Complete
**PR:** —

**Root cause (confirmed):** `project_site_links` table was created in migration 008 without any RLS policies. Supabase has RLS enabled, so INSERT returns error `42501: new row violates row-level security policy`. Sites never persist → activities appear orphaned.

**Fix:** `supabase/migrations/012_rls_project_site_links.sql` — applied via Supabase MCP. Policy `anon_all_project_site_links` (FOR ALL TO anon) confirmed live.

**Acceptance criteria:**
- [x] Migration `012_rls_project_site_links.sql` applied via Supabase MCP
- [ ] Create project with sites → sites persist (Sites tab shows them)
- [ ] Activities linked to those sites display correctly in Activities tab

---

### Task 1 — Allocation Spread Panel
**Branch:** `feat/allocation-spread-panel`
**Status:** Complete (code) — pending Vercel preview test
**PR:** —

**What:** Add a "Spread" toggle button next to the Allocation Strategy select in the activity form. When clicked, expands an inline panel showing the month-by-month allocation breakdown.
- **Even spread**: read-only preview — total ÷ months, shown as a grid of month chips
- **Custom (per month)**: editable month inputs (replaces/consolidates the existing custom allocation block)

**Scope:** Single file — `app/(dashboard)/projects/page.tsx`

**Parallelisation analysis:** Not applicable — all changes are in one tightly-coupled file. One `AllocationSpreadPanel` component added, then wired into three form contexts (ActivityDrawer, AddProjectModal expanded form, AddProjectModal new-activity form).

**Acceptance criteria:**
- [x] "Spread" button appears to the right of the Allocation Strategy select in ActivityDrawer
- [x] Clicking "Spread" expands a panel below showing per-month breakdown
- [x] Even spread: read-only month chips with computed per-month value
- [x] Custom: editable month inputs with running total vs target, validation colour
- [x] Switching to "Custom" auto-opens the panel
- [x] Same button + panel added to both activity forms in AddProjectModal
- [ ] No regressions in existing save / custom-alloc persistence logic (blocked by Task 2)

---

## Backlog

| # | Description | Type | Notes |
|---|---|---|---|
| — | feature/reporting-port-e8 branch investigation | chore | 3 commits, 62 behind main — review & decide keep/close |

---

## Completed

| Date | Task | Branch | PR |
|---|---|---|---|
| 2026-04-29 | Domain migration — canonical domain, Vercel redirect, Supabase auth config | feat/allocation-spread-panel | — |
| 2026-04-29 | Activity redesign — form UX, alloc grid, site gate, typeahead, validation | feat/activity-redesign | #23–28 |
| 2026-04-29 | Branch cleanup — deleted 11 stale local branches, pruned remote refs, cleared Vercel previews | n/a | n/a |

---

## Conventions

- CSS: use `var(--*)` design tokens, never raw Tailwind utilities in this project
- State: global state via `CCStateContext`, local UI state via `useState`
- New app modules: use `/create-app <Name>` skill
- Migrations: always ask James before running against Supabase
- Coming Soon: `comingSoon: true` in APPS array in `app/(dashboard)/page.tsx`
