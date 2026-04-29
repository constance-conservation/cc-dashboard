# E9 — Clients / Sites / Zones hierarchy

**Status:** Approved 2026-04-29 — Peter sign-off via chat. Open questions resolved: (1) match standalone wording; (2) alphabetical sort; (3) show archived clients (Peter will scan and update).
**Brief written:** 2026-04-29
**Repo:** `constance-conservation/cc-dashboard`
**Branch:** `feature/reporting-port-e9` (off `main` @ `abe77e2`)
**Git identity:** `peter.f@constanceconservation.com.au` (already configured per-repo)
**Predecessor:** E8 (merged to main as `abe77e2` on 2026-04-29 — `/reporting` landing + sub-nav)

---

## Goal

Replace the three `ComingSoon` stubs at:
- `/reporting/clients`
- `/reporting/clients/[id]`
- `/reporting/clients/[id]/sites/[siteId]`

with native React Server Component pages that mirror the standalone's
clients/sites/zones drill-down, sourced live from Supabase. The
hierarchy is **dynamic** because zones are stored as `sites` rows with
`parent_site_id` set — the same recursion works at any depth, so a
deeper filing system can be supported later without schema changes.

**Success =** signing in to `cc-dashboard-git-feature-reporting-port-e9-cc-digital.vercel.app/reporting/clients`
shows the same client cards / KPIs as `constance-reporting.vercel.app#clients`,
clicking through to a client and a site drills cleanly, and a "Generate report"
control on every level routes through to `/reporting/reports?scope=<level>&id=<id>`
(the reports page itself stays a `ComingSoon` stub — E10 fills it in).

E9 is **read-only**. CRUD on clients/sites/zones (add, rename, delete, schedule
edit) is deferred — the existing cc-dashboard `/clients` page already covers
client CRUD via the master schema, and full-fidelity inline editing of sites/zones
is a separate workstream we can spec when needed.

---

## Architecture

- **Server Components** for all three pages. SSR via `lib/supabase/server.ts`
  (the same pattern E8 used). No client-side data waterfalls. `force-dynamic`
  so the data refreshes on every navigation.
- **Query layer** lives in `lib/reporting/queries.ts` (extending the file E8
  created). Three new exported functions:
  - `getClientsListData()` — every client with rolled-up site / zone / report counts
  - `getClientDetailData(clientId)` — single client + its top-level sites + per-site zone counts
  - `getSiteDetailData(siteId)` — single site + its zones (= child sites) + per-zone inspection counts
- **Types** in `lib/reporting/types.ts` extended with `ClientSummary`, `ClientDetail`,
  `SiteDetail`, `ZoneRow` etc.
- **Components** added under `components/reporting/`:
  - `ClientCard.tsx` — single client tile (used on the clients list grid)
  - `RowCard.tsx` — generic two-column row (used for sites within a client and zones within a site)
  - `GenerateReportButton.tsx` — link styled as a button, takes `{scope, id}`, points at
    `/reporting/reports?scope=client|site|zone&id=<uuid>`
- **No new chart primitives.** E9 reuses E8's `KpiTile`. Donuts/bars don't fit
  this view per the standalone.
- **Sub-nav active state** already works for `/reporting/clients` and its
  descendants — the `isActive` helper in `ReportingNav.tsx` already uses
  `pathname.startsWith(href + '/')`. Verified during E8.

---

## Reference: source material in `~/Desktop/constance-reporting/`

The executor should read these to understand exactly what's being mirrored:

- `dashboard-preview.html` lines **1055-1091** — `loadClients(d)` / clients grid
  rendering. Gives the KPI labels, the per-card content (sites/zones/frequency),
  and the "Generate report" tooltip pattern.
- `dashboard-preview.html` lines **1093-1132** — `loadClientDetail(clientId)` /
  client field list + sites list. Shows which client fields surface on the
  detail view and how the sites list rolls up zone counts.
- `dashboard-preview.html` lines **1158-1204** — `loadSiteDetail(siteId)` /
  site field list + zones list. Confirms zones are rendered inline on the
  site detail page (NOT a separate route) and shows the inspection-count /
  last-inspection columns.
- `dashboard-preview.html` line **816** — the `sites` SELECT projection:
  `id,name,long_name,canonical_name,project_code,client_id,parent_site_id,site_type,schedule_config`.
- `dashboard-preview.html` line **970** — `topLevelSitesFor(clientId)` =
  filter sites where `client_id === clientId && !parent_site_id`. Top-level
  sites have no parent.
- `dashboard-preview.html` line **1058** — zones counted as
  `sites.filter(s => s.parent_site_id && <client owns the parent>)`. Zones
  are sites with `parent_site_id` pointing to a top-level site.
- `~/Desktop/constance-reporting/supabase/migrations/006_site_hierarchy.sql` —
  the migration that introduced `sites.parent_site_id`. Confirms recursion is
  on a single table.
- `~/Desktop/cc-dashboard/app/(dashboard)/clients/page.tsx` — cc-dashboard's
  master `/clients` page. Read for component / styling conventions, especially
  the row-card and pill patterns.

---

## Schema (relevant tables, current state)

```
clients
  id                  uuid PK
  name                text
  long_name           text
  contact_name        text
  council_or_body     text
  contact_email       text
  contact_phone       text
  report_frequency    text   -- 'weekly' | 'monthly' | 'quarterly' | null
  schedule_config     jsonb
  location_maps       jsonb  -- array of URLs (E9 doesn't render these — E10 does)
  organization_id     uuid

sites
  id                  uuid PK
  client_id           uuid FK → clients.id
  parent_site_id      uuid FK → sites.id NULL  -- null = top-level site, set = zone
  name                text
  long_name           text
  canonical_name      text
  project_code        text
  site_type           text
  schedule_config     jsonb
  organization_id     uuid

inspections
  id                  uuid PK
  site_id             uuid FK → sites.id  -- can point at top-level site OR zone
  conducted_at        timestamptz
  ... (other columns not relevant to E9)
```

**Hierarchy invariant:** a site with `parent_site_id IS NULL` is a top-level
site (a "Site"). A site with `parent_site_id IS NOT NULL` is a "Zone" (a child
site). The schema allows arbitrary depth — E9 only renders the top three
levels (Client → Site → Zone) but the queries should not assume depth ≤ 3.

---

## Scope

### Files to CREATE

- `lib/reporting/queries.ts` — extend with `getClientsListData`,
  `getClientDetailData(clientId)`, `getSiteDetailData(siteId)`. ~80 lines added.
- `lib/reporting/types.ts` — extend with `ClientSummary`, `ClientDetail`,
  `SiteSummary`, `SiteDetail`, `ZoneRow`. ~40 lines added.
- `components/reporting/ClientCard.tsx` — ~50 lines.
- `components/reporting/RowCard.tsx` — ~40 lines, generic two-column row used for
  sites-within-client and zones-within-site.
- `components/reporting/GenerateReportButton.tsx` — ~25 lines, styled link.

### Files to REPLACE (currently `ComingSoon` stubs)

- `app/(dashboard)/reporting/clients/page.tsx` — clients list view.
- `app/(dashboard)/reporting/clients/[id]/page.tsx` — client detail view.
- `app/(dashboard)/reporting/clients/[id]/sites/[siteId]/page.tsx` — site detail view (with zones inline).

### Files NOT touched

- `app/(dashboard)/reporting/page.tsx` — landing (E8).
- `app/(dashboard)/reporting/layout.tsx` — sub-nav (E8 + F1).
- `app/(dashboard)/reporting/{inspections,reports,pipeline}/page.tsx` —
  remain `ComingSoon` stubs (E10/E11).
- Anything outside `app/(dashboard)/reporting/` and `lib/reporting/` and `components/reporting/`.

---

## Done definition

A reviewer can:

1. Visit `/reporting/clients` → see grid of client cards, each showing:
   - Client name + council/body subtitle
   - Site count, zone count, report frequency
   - "Generate report" button (links to `/reporting/reports?scope=client&id=<uuid>`)
2. Click a client → land on `/reporting/clients/[id]` showing:
   - Client header + meta fields (name, long_name, contact, email, phone, frequency)
   - List of top-level sites for this client, each with a zone count and
     "Generate report" button (`scope=site`)
3. Click a site → land on `/reporting/clients/[id]/sites/[siteId]` showing:
   - Site header + meta fields (name, long_name, site_type, project_code)
   - Inline list of zones (= child sites), each with an inspection count, last
     inspection date, and "Generate report" button (`scope=zone`)
4. The sub-nav highlights "Clients" while on any of the three views.
5. The KPI numbers on `/reporting/clients` match the standalone's clients page.
6. `npm run build` passes with all 18 routes generating (15 from E8 + 3 dynamic
   client/site detail routes).
7. Visiting `/reporting/clients/<garbage-uuid>` produces a clean 404 (Next's
   `notFound()` helper).

---

## Out of scope (deferred, NOT in E9)

- **CRUD.** No add/edit/delete UI. The standalone's inline editing of clients
  and sites is admin functionality and out of scope for the reporting lens.
- **Generate Report functionality itself.** The buttons exist and route, but
  `/reporting/reports` stays a `ComingSoon` stub — E10 fills it in and consumes
  the `scope` and `id` query params.
- **Schedule widgets.** The standalone shows a schedule editor on every level.
  E9 displays the static `schedule_config` value or "—". Editing is deferred.
- **Location maps slot UI.** E9 doesn't render the location-maps drop zones on
  the site page — that's an asset the report consumes (E10 territory).
- **Inspections list per zone/site.** E9 shows inspection *counts* per zone but
  doesn't list them. The Inspections page (E11) handles full lists.
- **Deeper-than-zones drill-down.** Schema supports it; queries are written
  recursion-friendly; UI doesn't expose it yet.

---

## Open questions

1. **Empty states.** Standalone shows "No clients yet — seed via npm run seed"
   in empty cases. For the port, prefer a softer message ("No clients yet —
   ask peter.f@constanceconservation.com.au to add one")? Or just match standalone?
   *Default if unanswered:* match standalone wording but drop the dev hint.
2. **Sort order on the clients list.** Standalone implicitly orders by ?
   The `select` in line 816 doesn't show one — likely insertion order. For
   the port, suggest alphabetical by `long_name || name`. *Default if unanswered:* alphabetical.
3. **Hidden / archived clients.** Schema may have an `archived_at` or
   `is_active` flag (the standalone has `archive_projects` migration on
   cc-dashboard side). Should archived clients hide from `/reporting/clients`?
   *Default if unanswered:* show all, no filter, until we confirm an archival
   flag exists on the `clients` table.

---

## Risk + caveats

- **Possible build-time prerender failure** if any of the 3 detail routes are
  marked `static` and Supabase isn't reachable at build (the same issue E8 hit
  pre-`.env.local`). Mitigated by `export const dynamic = 'force-dynamic'` on
  every detail page (E8's pattern).
- **Dynamic routes with bad UUIDs** — handled with `notFound()` on null query
  result.
- **Performance** — `/reporting/clients` rolls up site + zone counts. With many
  clients, naive N+1 queries slow this. Mitigation: one query for clients, one
  for all sites, aggregate in JS (the standalone does this — see line 1057-1058).

---

## Workstream procedure

1. **Sign-off** on this brief (Peter — review §Open questions, override defaults if needed).
2. Cut branch `feature/reporting-port-e9` off `main` (currently `abe77e2`).
3. Implement files in the order: `types.ts` → `queries.ts` → components → page.tsx files.
4. `npm run build` — must pass (TypeScript + all 18 routes generating).
5. Push branch, open PR.
6. Visual verify on the Vercel preview URL, side-by-side with standalone.
7. Merge (squash, same as E8).
8. Roll into M03b's "What landed" log.
