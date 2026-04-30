# Operations data-wiring audit

**Scope:** Scoping audit for the three greyed-out Operations placeholders in the
cc-dashboard reporting sub-nav (`Staff & Hours`, `Chemicals`, `Species`).
Goal is to document the standalone's data wiring for each page in enough
detail to write a port brief.

**Sources read:**

- `~/Desktop/constance-reporting/dashboard-preview.html` (the standalone's
  entire UI — page markup at lines 648–693, data loaders at lines 1371–1447,
  helpers at 778–799, the central `loadData()` cache at 808–829).
- `~/Desktop/constance-reporting/supabase/migrations/001_initial_schema.sql`
  (schema for staff, inspection_personnel, inspection_weeds,
  inspection_chemicals, species_lookup, chemical_lookup,
  chemical_application_records, chemical_application_items).
- `~/Desktop/cc-dashboard/lib/reporting/queries.ts` (proven E8 query
  pattern — confirms `inspection_personnel`, `inspection_weeds`, `staff`
  are already reachable from cc-dashboard's Supabase client).
- `~/Desktop/cc-dashboard/components/reporting/{KpiTile,BarList,Donut}.tsx`
  (existing chart primitives — direct equivalents of the standalone's
  `kpiHTML` / `bars` / `donut`, ready for reuse).
- `~/Desktop/cc-dashboard/components/reporting/ReportingNav.tsx` (the three
  placeholder rows live at lines 27–29; flipping `href: null` → real path
  enables them).
- `~/Desktop/cc-dashboard/docs/milestones/M03b_native_integration_status.md`
  (out-of-band track confirms this audit is the gating artifact).

**One important standalone-wide pattern to know up front.** The standalone
does **one** REST round-trip on page load (`loadData()` at line 808) that
fetches 16 tables in parallel into a single `cache` object, then every page
loader reads slices out of `cache`. Per-page loaders are pure
synchronous DOM render functions (`loadStaff(d)`, `loadChemicals(d)`,
`loadSpecies(d)` all take the cache as their only argument). This means the
data dependencies per page are clear from the loader bodies alone — no
hidden lazy fetches.

In the cc-dashboard port, each page is its own Server Component with its
own typed query function in `lib/reporting/queries.ts` (the E8/E9 pattern).
No shared client cache. Each loader becomes a `getXxxData()` function
returning a typed object, consumed by `app/(dashboard)/reporting/<route>/page.tsx`.

---

## Staff & Hours

### What the standalone shows

- **3 KPI tiles** at top:
  - `Total Staff` — count of all rows in `staff` table; sub-text: `${activeStaff} active`.
  - `Total Hours` — sum of `inspection_personnel.hours_worked` across all rows; sub: `all staff combined`.
  - `Top Performer` — name of staff member with most hours; sub: rounded hours.
- **Horizontal bar chart** "Hours by Staff Member" — every staff with `hours > 0`,
  sorted desc, all shown (no top-N cap — the standalone shows full list).
  Colour cycle: `clay → amber → caramel → sage → steel → stone`.
- **"Staff Roster" table** — every row from `staff`, columns:
  `Name | Role | Inspections | Total Hours | Status`.
  - `Inspections` = count of `inspection_personnel` rows joined to that staff name.
  - `Total Hours` = same hours sum, rounded, suffixed `h`.
  - `Status` = `pill('completed')` if `active !== false`, else `pill('failed')`
    (semantic mapping: active=green, inactive=red).
- **No charts beyond the bar list.** No filters, sort controls, search,
  modals, or drill-downs. Pure read-only.

### Data sources

- `staff` — full table (`select=id,name,role,active`).
- `inspection_personnel` — full table (`select=staff_id,staff(name),hours_worked,raw_hours_text,inspection_id`).
- **Aggregations done in JS, not SQL:** the standalone aggregates by staff
  name in two reduce loops (one for hours-by-name, one for inspection-count-by-name).
  E8's existing landing page does the same in `getLandingDashboardData` at
  `lib/reporting/queries.ts:84–97`, so the pattern is already established.
- **Join semantics:** PostgREST embedded join `staff(name)` resolves the
  `staff_id` FK. `inspection_personnel` rows where `staff_id` is NULL
  collapse to a "Unknown" bucket (`p.staff?.name||'Unknown'`).
- **No caching beyond the page-level `cache.staff` / `cache.personnel`** — the
  port's Server Component will re-query on each request (cc-dashboard already
  uses `export const dynamic = 'force-dynamic'` on `/reporting/page.tsx`).

### CRUD operations

**None.** This page is purely read-only in the standalone. No inline edit,
no create, no delete, no schedule widgets. The `staff` table is mutated by
ingestion (when an SC submission introduces a new crew member) and by the
*master* dashboard's existing employees admin (`app/(dashboard)/employees`,
`lib/store/CCStateContext.tsx:307–346` and 922+) — neither of which is in
scope for this port.

### Schema dependencies

- **`staff`** — `id, organization_id, name, role, supervisor_id, vehicle_id,
  capability_tags, active, created_at, updated_at`.
  - Used columns: `id`, `name`, `role`, `active`.
- **`inspection_personnel`** — `id, inspection_id, staff_id, hours_worked,
  raw_hours_text, created_at`.
  - Used columns: `staff_id`, `hours_worked`, plus the embedded `staff(name)`.
- **No enums needed.** `role` is free text in the schema.
- **RLS:** standalone migrations do not appear to enable RLS on these tables
  (no `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` in `001`). cc-dashboard's
  `003_rls_secondary_tables.sql` should be checked if RLS becomes a concern,
  but E8/E9 read these tables successfully today — no RLS work expected.

### Code references

- **Markup:** `~/Desktop/constance-reporting/dashboard-preview.html:647–662`
  (`<div class="page" id="page-staff">` block — KPI grid container, hours
  bars container, roster table).
- **Loader:** `~/Desktop/constance-reporting/dashboard-preview.html:1371–1393`
  (`function loadStaff(d)`).
- **Cache hydration:** lines 814 (`inspection_personnel` fetch), 817 (`staff` fetch),
  827 (assembly into `cache`).
- **Helpers used:**
  - `kpiHTML(label, value, sub, color?)` — line 783; equivalent: `KpiTile`
    at `components/reporting/KpiTile.tsx`.
  - `bars(id, data, maxV, colors)` — line 784–788; equivalent: `BarList`
    at `components/reporting/BarList.tsx`.
  - `pill(status)` — line 778–781; **no exact equivalent in cc-dashboard**
    (small inline `<span>` with a coloured dot — easy to inline or extract
    a one-file primitive during the port).
- **Reference port to mirror:** `lib/reporting/queries.ts:32–109`
  (`getLandingDashboardData`) — does the same `staff(name)` embedded join +
  JS aggregation; copy the shape.

### Notes for the port

- **Read-only.** No CRUD work.
- **Complexity: small.** All data already reachable; chart primitives exist;
  zero new schema. The only non-trivial bit is mirroring the standalone's
  full bar-list (no cap) vs E8's `TOP_N=8` — the port should respect this
  page's behaviour and show every staff with hours.
- **Non-obvious behaviour to preserve:**
  - The `Top Performer` KPI rounds hours and falls back to `'—'` if no rows.
  - Inactive staff (`active=false`) are still listed in the roster table
    (with the failed pill), but **only `active` staff count toward the
    "active" sub-line** on the Total Staff KPI.
  - Hours-by-name uses `parseFloat(hours_worked)` because some legacy rows
    may have stringified numerics; mirror that defensiveness.
- **No dependency on other Operations pages.** Only depends on `staff` +
  `inspection_personnel` — both already in active use by E8.

---

## Chemicals

### What the standalone shows

- **4 KPI tiles** at top:
  - `Chemical Records` — count of `inspection_chemicals` rows; sub: `from inspections`.
  - `Unique Chemicals` — distinct count of `chemical_name_raw` values; sub: `identified`.
  - `Application Records` — count of `chemical_application_records` rows;
    sub: `compliance docs`.
  - `Most Used` — top chemical by mention count; sub: `${count} mentions`;
    `accent: var(--color-clay)` to highlight.
- **Two-column section** (`.two-col`):
  - Left: "Usage Frequency" horizontal bar chart — top-10 chemicals by mention
    count (uses `topN(cc, 10)` default). Colour cycle:
    `clay,clay,amber,amber,caramel,caramel,sage,sage,stone,stone` (paired).
  - Right: "Application Records" — list of the **most-recent 6** CAR rows
    (`d.carRecords.slice(0,6)`, already date-desc ordered). Each card shows:
    `${sites?.name || 'Unknown site'}` (heavy), then a meta line
    `${date} · ${application_method} · ${weather_general}`. Empty state:
    `No application records yet` with a chemistry-flask glyph.
- **"Chemical Reference" section** — three-column grid of cards, one per row
  in `chemical_lookup` (no slice, all of them). Each card:
  `canonical_name` (heavy), `type · active_ingredient` (taupe meta line),
  and one stat block: `Mentions: ${cc[canonical_name] || 0}`.
- No filters / sort / search / modals on this page.

### Data sources

- `inspection_chemicals` — `select=chemical_name_raw,chemical_name_canonical,rate_raw,inspection_id&limit=5000`.
- `chemical_application_records` — `select=id,sc_audit_id,date,site_id,sites(name),application_method,total_amount_sprayed_litres,weather_general&order=date.desc&limit=500`.
- `chemical_application_items` — fetched into the cache (line 823) but
  **not consumed by the chemicals page** — it's there for future use. Safe to
  not query in the port.
- `chemical_lookup` — `select=canonical_name,type,active_ingredient&order=canonical_name`.
- **Aggregations in JS:** `countBy(d.chemicals,'chemical_name_raw')` and
  `topN(cc, 10)` — both helpers are already mirrored in cc-dashboard
  (`countBy` and `topN` at `lib/reporting/queries.ts:16–30`).
- **Join semantics:** `chemical_application_records` uses embedded
  `sites(name)` join.
- **Reconciliation:** "Mentions" on each `chemical_lookup` card is matched by
  `cc[c.canonical_name] || 0`. The lookup uses `canonical_name`; the
  inspection rows use `chemical_name_raw` (not canonical). **This is a
  known imperfection** — only chemicals where the raw entry happens to equal
  the canonical name show non-zero mentions. The standalone explicitly
  accepts this. The port should mirror the same behaviour for parity, but
  it's worth flagging to Frosty as a candidate fix (use
  `chemical_name_canonical` instead of `chemical_name_raw` for the count).

### CRUD operations

**None.** Pure read-only. Mutations come from the SC ingestion pipeline.

### Schema dependencies

- **`inspection_chemicals`** — `id, inspection_id, chemical_name_raw,
  chemical_name_canonical, rate_raw, rate_value, rate_unit, source_template,
  created_at`. Used: `chemical_name_raw` (and optionally `chemical_name_canonical`).
- **`chemical_application_records`** — `id, inspection_id, sc_audit_id,
  site_id, date, application_method, time_start, time_finish,
  total_amount_sprayed_litres, weather_general, wind_*, rainfall, temperature,
  humidity, public_notification, created_at, updated_at`. Used:
  `id, sc_audit_id, date, site_id, sites(name), application_method,
  total_amount_sprayed_litres, weather_general`.
- **`chemical_lookup`** — `id, canonical_name, common_aliases, type,
  active_ingredient, created_at`. Used: `canonical_name, type, active_ingredient`.
- **Enum:** `chemical_type` (`'herbicide' | 'additive' | 'wetter' | 'dye'`)
  is the type column; not strictly needed in the port (rendered as plain
  string), but the typescript type declaration may want it for safety.
- **Seeded values:** `chemical_lookup` is pre-seeded in migration 001:201–207
  with Starane / Glyphosate / Dicamba / Fusilade / Grazon Extra / Metsulfuron / Brushwet.
- **RLS:** none enforced for E8 reads — same as Staff.

### Code references

- **Markup:** `~/Desktop/constance-reporting/dashboard-preview.html:664–679`
  (page-chemicals). Two-column section + reference grid.
- **Loader:** `~/Desktop/constance-reporting/dashboard-preview.html:1395–1422`
  (`function loadChemicals(d)`).
- **Cache hydration:** lines 813 (inspection_chemicals), 822
  (chemical_application_records), 823 (chemical_application_items, unused),
  820 (chemical_lookup).
- **Helpers:** `kpiHTML`, `bars`, `countBy`, `topN`, plus inline empty-state
  HTML.
- **CSS classes referenced:** `.chem-card`, `.chem-name`, `.chem-type`,
  `.chem-stat-row`, `.chem-stat-val`, `.chem-stat-lbl`. cc-dashboard does
  not currently have these — they're standalone-only and need porting.
  Searched for them: not present in any cc-dashboard CSS file.
  Action: either inline equivalent styles in the port page, or add a
  `chemicals.module.css` / extend `app/globals.css`.

### Notes for the port

- **Read-only.**
- **Complexity: medium.** The page itself isn't complex but has the most
  components (4 KPIs + bar list + records list + reference card grid) and
  introduces three CSS class families not yet in cc-dashboard. Plan ~half
  to full day depending on whether `chem-card` styling is inlined or done
  properly.
- **Non-obvious behaviour to preserve:**
  - The Mentions count uses `chemical_name_raw` (not canonical) — see
    "Reconciliation" note above.
  - The "Application Records" panel slices to **6 most-recent**, not paginated.
    Empty state has a specific glyph (`&#9883;`, ⚗) and message.
  - `Most Used` KPI gets the `var(--color-clay)` accent — the cc-dashboard
    `KpiTile` already supports an `accent` prop.
  - `chemical_application_items` is loaded into the standalone's cache but
    not used on this page — **do not waste a query on it in the port.**
- **Dependency on other pages:** none. The CAR records list also appears
  conceptually on `/reporting/inspections` (E11) but the data is independent.

---

## Species

### What the standalone shows

- **3 KPI tiles** at top:
  - `Total Sightings` — `inspection_weeds` row count; sub: `across all inspections`.
  - `Unique Species` — distinct `species_name_raw`; sub:
    `${speciesLookup.length} in reference DB`.
  - `Most Common` — top species by mention; sub: `${count} sightings`;
    `accent: var(--color-sage)`.
- **"Species Frequency" horizontal bar chart** — top-15 species by mention
  count (`topN(wc, 15)`). Colour cycle:
  `sage×5 → steel×5 → stone×5` (graduated, not paired).
- **Three-column "species cards" grid** — first **12 rows** of `species_lookup`
  (`speciesLookup.slice(0,12)`). Each card:
  - Left: `species-name` (heavy) and `species-sci`
    (`scientific_name || category || species_type`).
  - Right: `species-count` value (the `wc[canonical_name] || 0` count) and
    `sightings` label.
- No filters / sort / search / modals.

### Data sources

- `inspection_weeds` — `select=species_name_raw,species_name_canonical,source,inspection_id&limit=5000`.
- `species_lookup` — `select=canonical_name,scientific_name,species_type,category&order=canonical_name`.
- **Aggregations in JS:** `countBy(d.weeds, 'species_name_raw')` and
  `topN(wc, 15)`.
- **Same canonical-vs-raw reconciliation issue as Chemicals:** the per-card
  count is `wc[c.canonical_name] || 0` against the *raw* species name. Same
  caveat. Same suggestion (use `species_name_canonical`) — but mirror current
  behaviour for parity in the first port.

### CRUD operations

**None.** Pure read-only. `inspection_weeds` is mutated by SC ingestion;
`species_lookup` was seeded in migration 001:148–172 with 24 known weeds
and is otherwise admin-managed.

### Schema dependencies

- **`inspection_weeds`** — `id, inspection_id, species_name_raw,
  species_name_canonical, scientific_name, species_type, source, created_at`.
  Used: `species_name_raw`.
- **`species_lookup`** — `id, canonical_name, scientific_name, common_aliases,
  species_type, category, created_at`. Used: `canonical_name, scientific_name,
  species_type, category`.
- **Enum:** `species_category`
  (`'grass' | 'vine' | 'woody' | 'herb' | 'fern' | 'tree'`) — rendered as a
  string fallback; type-safety welcome but not required.
- **Seeded values:** 24 species seeded in 001:148–172 (Purple Top, Fleabane,
  Thistle, Lantana, Blackberry, etc.).
- **RLS:** as above.

### Code references

- **Markup:** `~/Desktop/constance-reporting/dashboard-preview.html:681–693`
  (page-species).
- **Loader:** `~/Desktop/constance-reporting/dashboard-preview.html:1424–1447`
  (`function loadSpecies(d)`).
- **Cache hydration:** lines 812 (inspection_weeds), 821 (species_lookup).
- **Helpers:** `kpiHTML`, `bars`, `countBy`, `topN`.
- **CSS classes referenced:** `.species-card`, `.species-name`, `.species-sci`,
  `.species-count`, `.species-count-label`. Same situation as chem cards —
  not in cc-dashboard, need porting.

### Notes for the port

- **Read-only.**
- **Complexity: small.** Smallest of the three pages — 3 KPIs, one bar list,
  one card grid. Half-day if chem cards are already done in the same brief
  (CSS pattern is the same shape), full half-day standalone.
- **Non-obvious behaviour to preserve:**
  - `species-sci` falls through `scientific_name → category → species_type`;
    show whichever is first non-null.
  - Reference grid is hard-capped at 12 cards; bar chart at 15. Different
    caps, intentional. Mirror exactly.
  - `Most Common` KPI uses sage accent (matching the bars).
  - Page header reads `Weed Species` (not just `Species`) and subtitle is
    `Species targeted across all site inspections`. Sub-nav label stays
    "Species" but the page title is fuller.
- **Dependency on other pages:** none.

---

## Cross-cutting observations

### Shared components / utilities

All three pages use the same four primitives, all of which already exist in
cc-dashboard:

| Standalone helper | cc-dashboard equivalent | Status |
|---|---|---|
| `kpiHTML(label,value,sub,color?)` | `KpiTile` (`components/reporting/KpiTile.tsx`) | ✅ Exact match (incl. accent prop). |
| `bars(id,data,maxV,colors)` | `BarList` (`components/reporting/BarList.tsx`) | ✅ Exact match. |
| `countBy(arr,key)` / `topN(obj,n)` | `countBy` / `topN` (`lib/reporting/queries.ts:16–30`) | ✅ Already implemented; ready to import or duplicate. |
| `pill(status)` | None | ⚠ Used only by Staff (the "Status" column). One-file inline `<span>` is sufficient — don't extract a primitive for one site. |

CSS card styles (`chem-card*`, `species-card*`) are **not** in cc-dashboard
and need to be added. They share enough structural similarity (rounded card,
dual-line label + side stat) that a single small CSS module covering both
would be cleaner than duplicating per page. Recommend adding to
`app/globals.css` or a new `app/(dashboard)/reporting/_styles/cards.css`.

### Shared schema dependencies

Every reporting page (existing E8/E9 + these three) reads from a stable
"reporting schema" subset that is owned and migrated by the standalone:
`inspections`, `sites`, `clients`, `staff`, `inspection_personnel`,
`inspection_tasks`, `inspection_weeds`, `inspection_chemicals`,
`inspection_media`, `chemical_application_records`,
`chemical_application_items`, `chemical_application_operators`,
`chemical_application_additives`, `species_lookup`, `chemical_lookup`,
`client_reports`, `report_*`, `sync_state`.

The cc-dashboard repo's `supabase/migrations/` does **not** contain CREATE
TABLE statements for any of these — they are all applied to the live
production Supabase project (`ymcyunspmljaruodjpkd`) by the standalone's
migrations. Both apps point at the same project (confirmed in M03b status
doc, "Decisions logged" section), so the tables are reachable today.

**Implication for the port:** zero new schema. The Operations pages can read
all required columns from existing live tables. (If/when the standalone is
archived in E12, ownership of these tables transfers to cc-dashboard's
migration set — but that's a separate concern.)

### Whether the 3 pages logically belong together

**Yes** — they share four properties that argue strongly for a single brief:

1. **All three are pure read-only** — no CRUD, no modals, no schedule
   widgets, no shared state. Lowest-risk surface possible.
2. **All three use the same four primitives** (KPI tile, bar list, count-by,
   top-N) plus a card-grid pattern.
3. **All three are zero-schema-additions.** Same Supabase, same tables,
   same client.
4. **All three round out the same nav section** — flipping the three
   `href: null` values in `ReportingNav.tsx` should happen atomically;
   a piecemeal rollout would mean the Operations section has 1-of-3 or 2-of-3
   live, which is a worse UX state than fully greyed.

The card-grid CSS is shared between Chemicals and Species; doing them in one
brief avoids duplicating the same CSS work across two PRs.

### Proposed brief structure

**Single E13 — Operations data-wiring** covering all three pages.

**Estimated effort: full day (≈ 6–8h).** Breakdown:

- 30 min — scaffold three new routes
  (`app/(dashboard)/reporting/staff/page.tsx`,
  `.../chemicals/page.tsx`, `.../species/page.tsx`) with the
  E8 `subpage` shell.
- 90 min — add three query functions to `lib/reporting/queries.ts`
  (`getStaffData`, `getChemicalsData`, `getSpeciesData`) following the
  `getLandingDashboardData` pattern; add their typed returns to `types.ts`.
- 60 min — port the Staff page (KPIs + BarList + roster table). Inline
  `pill` helper. Smallest page.
- 90 min — port Chemicals page. Bring across `.chem-card` CSS, render
  KPIs + 2-col (bars + records) + reference grid.
- 60 min — port Species page. Reuse card CSS pattern from Chemicals.
- 30 min — flip `ReportingNav.tsx:27–29` to live hrefs, remove
  "Coming soon" tooltip + disabled styling for these three.
- 60–120 min — visual verification against the live standalone for each
  page (number parity, sort order, top-N caps, accent colours,
  empty-states), screenshots in PR.

The full-day estimate **assumes** the canonical-vs-raw count fix (suggested
in Chemicals + Species notes) is **not** done in this brief — mirror existing
behaviour. If Frosty wants the fix applied, add ~30 min and a one-line
schema-doc note.

### Schema additions needed

**None.** All required tables and columns already exist on the live
Supabase project. No migrations to write, no enums to add, no RLS work
expected (same access pattern as the working E8 queries).

If migration parity within the cc-dashboard repo eventually becomes a
goal (post-E12 standalone archival), the eight tables this audit touches
(`staff`, `inspection_personnel`, `inspection_weeds`, `inspection_chemicals`,
`chemical_application_records`, `chemical_application_items`,
`chemical_lookup`, `species_lookup`) plus their three enums (`species_category`,
`chemical_type`, `processing_status`) would need to be back-filled into
`cc-dashboard/supabase/migrations/`. **That is out of scope for E13** —
flag it as a separate post-E12 hygiene task.

---

## Open questions / gaps

1. **Canonical-vs-raw count reconciliation (Chemicals + Species).** The
   standalone counts mentions against raw names but matches reference cards
   by canonical names — only chemicals/species whose raw-entry equals the
   canonical show non-zero counts. Confirm: mirror existing behaviour, or
   fix to use `*_name_canonical` in the count? Recommend mirror in E13,
   then a follow-up issue if Frosty agrees the fix is wanted.

2. **`pill` helper extraction.** Used only by Staff's "Status" column. Inline
   in the Staff page or extract a `components/reporting/StatusPill.tsx`?
   The standalone's `pill` is shared across many pages
   (`pill(processing_status)`, `pill(report_status)`, etc.) so future
   reporting pages will likely want it — but a one-page port doesn't need
   the abstraction yet. Recommend inline + extract when E11 (Inspections)
   needs it.

3. **CSS placement for card grids.** `app/globals.css` (existing pattern in
   cc-dashboard) vs. a new `_styles/` dir vs. CSS modules per page. Existing
   reporting components use globals; recommend `app/globals.css` for
   consistency. Confirm with Frosty before the port if there's an emerging
   convention I missed.

4. **`sync_state` not used by Operations.** The standalone fetches
   `sync_state` into the cache (line 819) and the existing E8 landing page
   shows a backfill alert (`BackfillAlert` component). None of the three
   Operations pages reference it. **No action — just noting** so the port
   doesn't accidentally add a banner not in the original.

5. **No drill-down behaviour to verify.** Confirmed by inspection of
   `loadStaff`, `loadChemicals`, `loadSpecies` — none of them register
   click handlers, navigate, or open modals. If Frosty intends drill-downs
   in a future iteration (e.g., click a staff row → inspections by that
   staff), surface that intent before E13 to avoid post-port refactoring.
