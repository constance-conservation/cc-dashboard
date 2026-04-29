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

### Task 1 — Allocation Spread Panel
**Branch:** `feat/allocation-spread-panel`
**Status:** In Progress
**PR:** —

**What:** Add a "Spread" toggle button next to the Allocation Strategy select in the activity form. When clicked, expands an inline panel showing the month-by-month allocation breakdown.
- **Even spread**: read-only preview — total ÷ months, shown as a grid of month chips
- **Custom (per month)**: editable month inputs (replaces/consolidates the existing custom allocation block)

**Scope:** Single file — `app/(dashboard)/projects/page.tsx`

**Parallelisation analysis:** Not applicable — all changes are in one tightly-coupled file. One `AllocationSpreadPanel` component added, then wired into three form contexts (ActivityDrawer, AddProjectModal expanded form, AddProjectModal new-activity form).

**Acceptance criteria:**
- [ ] "Spread" button appears to the right of the Allocation Strategy select in ActivityDrawer
- [ ] Clicking "Spread" expands a panel below showing per-month breakdown
- [ ] Even spread: read-only month chips with computed per-month value
- [ ] Custom: editable month inputs with running total vs target, validation colour
- [ ] Switching to "Custom" auto-opens the panel
- [ ] Same button + panel added to both activity forms in AddProjectModal
- [ ] No regressions in existing save / custom-alloc persistence logic

---

## Backlog

| # | Description | Type | Notes |
|---|---|---|---|
| — | feature/reporting-port-e8 branch investigation | chore | 3 commits, 62 behind main — review & decide keep/close |

---

## Completed

| Date | Task | Branch | PR |
|---|---|---|---|
| 2026-04-29 | Activity redesign — form UX, alloc grid, site gate, typeahead, validation | feat/activity-redesign | #23–28 |
| 2026-04-29 | Branch cleanup — deleted 11 stale local branches, pruned remote refs, cleared Vercel previews | n/a | n/a |

---

## Conventions

- CSS: use `var(--*)` design tokens, never raw Tailwind utilities in this project
- State: global state via `CCStateContext`, local UI state via `useState`
- New app modules: use `/create-app <Name>` skill
- Migrations: always ask James before running against Supabase
- Coming Soon: `comingSoon: true` in APPS array in `app/(dashboard)/page.tsx`
