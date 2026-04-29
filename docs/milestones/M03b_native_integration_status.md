# M03b — Native Integration: live status

**Repo (canonical):** `constance-conservation/cc-dashboard`
**Source-of-truth plan:** originally
`~/Desktop/constance-reporting/milestones/M03b_native_integration.md`,
mirrored here as the **live tracker** since `constance-reporting` will
be archived in E12. Keep this file updated as briefs ship.

**Last updated:** 2026-04-29

---

## Goal

Replace the standalone reporting app at `constance-reporting.vercel.app`
with native Next.js routes inside cc-dashboard at
`app/(dashboard)/reporting/*`, then archive the standalone repo and
retire its Vercel deploy.

---

## Brief status

| Brief | Scope | Status | Detail |
|---|---|---|---|
| **E8**  | Scaffold `/reporting/*` + landing page (Server Component, query layer, chart primitives, 6 sibling stubs) | ✅ **Merged 2026-04-29** as `abe77e2` (squash). | PR #9. |
| **F1**  | Left sub-nav for `/reporting/*` (Overview / Operations / Reports). 5 active items + 3 greyed Operations placeholders. | ✅ **Merged 2026-04-29** in same PR as E8 final state. | brief: chat 2026-04-29; commit `9ba953f`. |
| **E9**  | Port Clients / Sites / Zones drill-down + cadence selector on client detail. | 🟡 **In flight** — branch `feature/reporting-port-e9`, PR #29. Awaiting visual verify + cadence add-on. | brief: `docs/executor_briefs/E9_clients_sites_zones_hierarchy.md` |
| **E10** | Port Reports page — list + preview modal + inline edit + Save. Most complex UI. Consumes `?scope=...&id=...` query params from E9's Generate Report buttons. | ⏸ Not started. Depends on E9 merged. Full-day. | TBD |
| **E11** | Port Inspections + Pipeline Health pages. | ⏸ Not started. Depends on E9 merged. ~half day. | TBD |
| **E12** | Server Actions + Vercel Cron (`generateReport`, `scheduled_sync`, webhook). Flip APPS card href on cc-dashboard home from `https://constance-reporting.vercel.app/` → `/reporting`. Retire standalone deploy + archive `FrostyFruit1/constance-reporting` repo. | ⏸ Not started. Depends on E10 + E11. Full-day. | TBD |

---

## Out-of-band tracks (parallel to the E-series)

| Track | Status | Detail |
|---|---|---|
| Operations data-wiring (Staff/Hours, Chemicals, Species) | ⏸ **Scoping pending.** Sub-nav has greyed-out placeholders. | Investigate how the standalone wires these to Supabase, then propose a brief (likely E13 or fold into E10/E11). |
| Service-role key rotation | ⏸ Optional, low urgency. | Service-role JWT was pasted into a parallel session transcript on 2026-04-29 to unblock `vercel env pull`. Anon key + URL are designed-public, lower concern. Rotate at convenience via Supabase dashboard → API → roll → update Vercel → redeploy. |
| `next lint` broken on cc-dashboard | ⏸ Pre-existing, low urgency. | Next 16 removed the `next lint` subcommand. `package.json` script needs replacing with `eslint .` per Next 16 docs. |

---

## Decisions logged

- **Stack mismatch resolved by porting, not merging.** Standalone is Node + TS pipeline; cc-dashboard is Next.js 16. Bringing reporting into cc-dashboard means rewriting backend pipeline as Server Components + Server Actions + Cron. (Decision date: pre-E8.)
- **Both apps point at the same Supabase project** (`ymcyunspmljaruodjpkd`), confirmed 2026-04-29. F2 finding "more photos on port" was data drift / query-window difference, not divergence.
- **Sub-nav design (F1):** 5 items mapped to existing routes are linked; 3 Operations items (Staff & Hours, Chemicals, Species) are greyed out with `Coming soon` tooltip. Ordering and headings mirror the standalone's left sidebar exactly.
- **Reporting Clients page is read-only** (E9 invariant), with one approved exception: a small editable **client cadence selector** added 2026-04-29 (writes `clients.report_frequency`). All other CRUD remains deferred. The cron pipeline that consumes the cadence ships in E12.
- **Sort order on `/reporting/clients`:** alphabetical by `long_name || name`. **Archived clients:** not hidden — Peter scans and curates manually.

---

## Next session entry point

1. Open `docs/executor_briefs/E9_clients_sites_zones_hierarchy.md`.
2. Confirm PR #29 status (visual verify, decide merge or iterate).
3. Once E9 merges, start E10: write the brief, port the Reports page (consume `?scope=...&id=...` params, render preview, maybe inline edit).
4. Update this status doc as briefs land.
