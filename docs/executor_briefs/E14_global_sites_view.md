# E14 — Global Sites view

**Status:** Approved 2026-04-29
**Brief written:** 2026-04-29
**Repo:** `constance-conservation/cc-dashboard`
**Branch:** `feature/reporting-port-e14` (off `main`)
**Predecessor:** E11 (merged `94ddcf1`).
**Audit context:** `docs/audit/standalone_feature_inventory.md` §1.2.

---

## Goal

Add a new top-level `/reporting/sites` route mirroring the standalone's
`page-sites` cross-client view (every site, regardless of client, with
KPIs and a card grid). Add a "Sites" entry to the reporting sub-nav
under the Overview heading, between Inspections and Clients.

This is the only standalone page that wasn't included in M03b's
original plan. Peter confirmed inclusion 2026-04-29.

---

## Scope

**Pure read-only.** Cross-client roll-up of all sites.

---

## Architecture

- Server Component at `app/(dashboard)/reporting/sites/page.tsx`. `force-dynamic`.
- Query: `getSitesGlobalData()` in `lib/reporting/queries.ts`.
- New component: `components/reporting/SiteCard.tsx`.
- Reuse `KpiTile`.

---

## Reference: source material in `~/Desktop/constance-reporting/`

- `dashboard-preview.html` lines **558–567** — page-sites markup.
- `dashboard-preview.html` lines **941–966** — `loadSites(d)` rendering.

---

## Schema dependencies

- `sites`: full table — `id, name, site_type, project_code, client_id,
  parent_site_id`.
- `inspections`: `site_id` (for inspection counts per site).
- `inspection_personnel`: `inspection_id, hours_worked` (for hours per
  site, joined via inspection's site_id).

All exist on the live Supabase.

---

## KPI definitions

```
Total Sites      — count of all rows in sites
Most Active      — site name with highest inspection count; sub: "${count} inspections"
Total Site Hours — sum of inspection_personnel.hours_worked across all
                   inspections, grouped by site_id, then summed; sub: "across all sites"
```

Card grid:
- Sort by inspection count DESC.
- Each card: site name, `site_type` (or '—'), `project_code` (if any),
  inspections count, hours rounded.
- All sites shown (no top-N cap), including sites with zero inspections.

---

## Sub-nav update

Modify `components/reporting/ReportingNav.tsx`:
- Add a new entry to the **Overview** section, between "Inspections" and "Clients":
  ```tsx
  { name: 'Sites', icon: 'projects', href: '/reporting/sites' },
  ```
- Update `isActive` if needed (existing pathname-startsWith match should
  already cover this).

This is the only file outside `/reporting/sites/` and `lib/reporting/`
that this brief touches.

---

## Files to CREATE

- `app/(dashboard)/reporting/sites/page.tsx` (~80 lines)
- `components/reporting/SiteCard.tsx` (~45 lines)

## Files to MODIFY

- `lib/reporting/queries.ts` — add `getSitesGlobalData`. ~60 lines.
- `lib/reporting/types.ts` — add `SiteWithStats`, `SitesGlobalData`. ~20 lines.
- `components/reporting/ReportingNav.tsx` — add Sites entry. ~3 lines.

## Files NOT touched

- `app/(dashboard)/reporting/clients/[id]/sites/[siteId]/page.tsx` —
  this is the per-client site detail. NOT the global view.
- `app/globals.css` — no new CSS classes needed (use inline styles per
  cc-dashboard pattern).

---

## Done definition

A reviewer can:

1. Visit `/reporting/sites` → see 3 KPIs + card grid of every site.
2. Total Sites matches the count of sites in the database.
3. Most Active KPI shows the site with the highest inspection count.
4. Total Site Hours matches sum across all `inspection_personnel.hours_worked`.
5. Sub-nav: "Sites" appears under Overview, between Inspections and
   Clients. Clicking it navigates here. Active highlight follows.
6. Each card shows inspections + hours.
7. `npm run build` passes.

---

## Out of scope

- Drill-down from a site card (the per-client `/reporting/clients/[id]/sites/[siteId]`
  is the existing detail view and isn't reachable from this page —
  intentional, the standalone's `page-sites` cards aren't clickable either).
- CRUD on sites — covered by master `/clients` and partially by E15.
- Filtering by client / type.

---

## Coordination notes — round 3

Parallel with E12 + E15. Shared file: `lib/reporting/queries.ts`
(append-only). **`components/reporting/ReportingNav.tsx` is yours alone**
in this round (E12 + E15 do not touch it).

---

## Workstream procedure

1. `git worktree add /Users/feelgood/Desktop/cc-dashboard-e14 -b feature/reporting-port-e14 main`
2. `cd /Users/feelgood/Desktop/cc-dashboard-e14`
3. `cp /Users/feelgood/Desktop/cc-dashboard/.env.local .`
4. `npm install`
5. Read brief.
6. Implement: `types.ts` → `queries.ts` → `SiteCard` → `page.tsx` → ReportingNav update.
7. `npm run build` — must pass.
8. Commit + Co-Authored-By.
9. `git push -u origin feature/reporting-port-e14`
10. `gh pr create` with test-plan.
11. Report back.
