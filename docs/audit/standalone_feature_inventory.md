# Standalone Feature Inventory & Revised Port Plan

**Audit date:** 2026-04-29
**Audited repo:** `~/Desktop/constance-reporting/` (commit `4ef7d17`)
**Audit branch:** `docs/standalone-audit-2026-04-29` on cc-dashboard
**Source files crawled:**
- `dashboard-preview.html` (~3,200 lines — entire UI in one file)
- `src/` (33 TypeScript files across 11 modules)
- `docs/executor_briefs/E1–E6, E8.md` (8 narrated milestones)
- `supabase/migrations/001–009 + deploy_all.sql`

This document supersedes the original M03b page-by-page plan (E8–E12).
The plan was sketched before the standalone was fully crawled; the
audit reveals features (edit mode, image uploads, schedule widgets,
inline CRUD, generation pipeline) that warrant their own briefs.
A **revised brief plan** is at the end.

The Operations 3-page deep-dive lives in `operations_data_wiring.md`
(parallel session). This doc references it rather than duplicating.

---

## 1 · UI inventory — all 11 standalone pages

Legend: ✅ ported · ⚠ partially ported · ❌ not ported · 🔄 covered by other epic

| # | Page id | Loader fn | Port status | Where in cc-dashboard |
|---|---|---|---|---|
| 1 | `page-dashboard` | `loadDashboard` | ✅ E8 | `app/(dashboard)/reporting/page.tsx` |
| 2 | `page-inspections` | `loadInspections` | ❌ | (stub `ComingSoon`) |
| 3 | `page-sites` | `loadSites` | ❌ **NEW — not in any plan yet** | (no route exists) |
| 4 | `page-clients` | `loadClients` | ✅ E9 | `app/(dashboard)/reporting/clients/page.tsx` |
| 5 | `page-client-detail` | `loadClientDetail` | ⚠ E9 (read-only + cadence; CRUD missing) | `…/clients/[id]/page.tsx` |
| 6 | `page-site-detail` | `loadSiteDetail` | ⚠ E9 (read-only; CRUD + maps widget missing) | `…/clients/[id]/sites/[siteId]/page.tsx` |
| 7 | `page-staff` | `loadStaff` | ❌ Operations | (greyed in sub-nav) |
| 8 | `page-chemicals` | `loadChemicals` | ❌ Operations | (greyed in sub-nav) |
| 9 | `page-species` | `loadSpecies` | ❌ Operations | (greyed in sub-nav) |
| 10 | `page-reports` | `loadReports` | ❌ E10 (in flight) | (stub `ComingSoon`) |
| 11 | `page-pipeline` | `loadPipeline` | ❌ E11 | (stub `ComingSoon`) |

### 1.1 page-inspections (E11 candidate)

KPIs: Total · Daily Work Reports · Chemical Records · Failed.
Body: Big table — Date, Site, Template, Supervisor, Tasks, Weeds, Photos, Status. Limit 50 rows. Aggregates `inspection_tasks`, `inspection_weeds`, `inspection_media` counts per inspection in JS.
Schema deps: `inspections`, `inspection_tasks`, `inspection_weeds`, `inspection_media`, `staff` (supervisor), `sites`.
CRUD: none — read-only table.
Implementation effort: **half-day** (it's a wide table + 4 KPIs; aggregation already understood).

### 1.2 page-sites (NEW — currently unrouted)

KPIs: Total Sites · Most Active site · Total Site Hours.
Body: Card grid of all sites (across all clients), sorted by inspection count, each card showing inspections + hours.
Schema deps: `sites`, `inspections`, `inspection_personnel`.
CRUD: none.
Why it's missing from M03b: not in the original sub-nav port (F1) — the standalone has a "Sites" entry that didn't survive the F1 nav design. **Decision required:** include it in the cc-dashboard sub-nav (as `Overview → Sites`)? Drop it (data already accessible via Clients drill-down)? My read: the global Sites view is genuinely useful for cross-client hours roll-ups; recommend adding it. ~half-day work + nav change.

### 1.3 page-staff / page-chemicals / page-species (Operations)

Deferred to `operations_data_wiring.md` (parallel session) for full per-page detail. Top-level summary:

- **Staff & Hours.** KPIs (Total / Active / Top performer) · bar chart of hours by staff · table (name, role, inspections, hours, status). Reads `personnel`, `staff`. Read-only. Roughly half-day.
- **Chemicals.** KPIs (records / unique chemicals / application records / most used) · bars · CAR records list · chemical reference card grid. Reads `inspection_chemicals` (or similar), `chemical_application_records`, `chemical_lookup`. Read-only. Half-day.
- **Species.** KPIs (sightings / unique species / most common) · bars · species reference card grid. Reads `inspection_weeds`, `species_lookup` (a curated table). Read-only. Half-day.

Cross-cutting: all three page sections in the dashboard-preview.html call into a `cache.X` global where data is fetched once on page load. cc-dashboard equivalent = SSR Server Components, no shared cache needed.

### 1.4 page-reports (E10 — current focus)

This is **the most feature-rich page**. The original E10 brief (read-only viewer) is too narrow.

**Top-level UI:**
- KPIs: Total · Approved/Sent · In Review · Drafts. (When no reports exist, falls back to "Potential Reports" view showing site-months with data — useful before generation runs.)
- Toolbar with `+ Generate Report` button (currently disabled, says "CLI-only — runs in M04").
- Two sections: "Drafts" and "In Review / Approved", each a card grid.
- Each card has: title, period, client, status pill, action buttons.

**Modal (preview / edit):**
- Iframe loads the rendered report HTML.
- Edit mode toggle (`<input type="checkbox" id="edit-toggle">`).
- When edit mode is on:
  - Iframe body becomes `contentEditable`.
  - Drop-zones overlay any element with `[data-placeholder][data-editable="true"]` — drag image to replace.
  - `markDirty()` triggers Save Changes button to light up.
- Save Changes: `patchRow('client_reports', id, { html_content: edited, period_map_images, … })`. Also patches `clients.location_maps` if location maps were changed.
- Download DOCX (calls `client_reports.docx_url`).
- Print to PDF (browser print on the iframe).
- Approve & Send (disabled — "lands in M04").

**Schema deps:** `client_reports` (rich — see §3), `clients` (for location_maps), Storage bucket `report_assets`.

**Image upload infrastructure (E5 in standalone):**
- `uploadImage(file, clientId, type)` — POSTs to `/storage/v1/object/report_assets/{clientId}/{type}/{filename}`.
- Validation: max 10 MB, MIME in {png, jpeg, webp}.
- Returns public URL.
- Two slot families:
  - `location_map` (per client, persistent across all reports for that client) → `clients.location_maps jsonb`.
  - `period_map` (per report) → `client_reports.period_map_images jsonb`.

**Implementation effort if all-in:** full-day (E10) → 2 days (with edit mode + image uploads). Strongly recommend splitting.

### 1.5 page-pipeline (E11)

KPIs: Processed · Success Rate · Review Queue · Failures.
Donut: status breakdown.
Bar list: template types processed.
Table: Recent failures + review items (audit_id, date, template, status). Limit 20.
Sync state info: last_sync_at, sync_state_info from `sync_state` table.
Schema deps: `inspections` (status, sc_template_type, sc_audit_id), `sync_state`.
CRUD: none.
Implementation effort: half-day.

---

## 2 · Cross-cutting infrastructure (non-page-specific)

These are systems used across multiple pages. **Each is its own porting concern.**

### 2.1 Inline editable fields (`renderEditableField`)

Pattern in standalone: every field on `client-detail` and `site-detail` renders as click-to-edit text. Save patches the row directly.

cc-dashboard port status: **NOT ported.** E9 chose read-only.

Spec: small click-to-edit text input that calls `patchRow(table, id, { [field]: value })` on blur. Used 11+ times across the standalone (clients have 7 editable fields, sites have 4).

Implementation as Server Action + small client component is straightforward. ~half-day to do generically (one component used 15+ places).

### 2.2 Schedule widgets (`renderScheduleWidget`)

Pattern: pill-row per cadence (Off / Weekly / Monthly / Quarterly), click to set. Persists to `<table>.schedule_config jsonb`. Used on **clients, sites, AND zones** in the standalone.

cc-dashboard port status: **partially ported** for clients — we built `CadenceSelector` (dropdown + Save) which writes `clients.report_frequency`. The standalone uses `schedule_config jsonb` with richer state (`{cadence, weekday?, day_of_month?}`).

**Gap:** sites/zones-level cadence requires:
- Schema migration: add `sites.schedule_config jsonb` (already exists per migration 007 `_schedule_and_site_long_name.sql`)
- Reuse the CadenceSelector pattern, parameterized by table

~half-day to extend cadence to sites and zones.

### 2.3 CRUD primitives (`patchRow`, `insertRow`, `deleteRow`)

Standalone has thin wrappers around Supabase REST that pages call directly. cc-dashboard's pattern is Server Actions. We've ported one (`setClientReportFrequency`); we need ~10 more for full feature parity.

Add-site flow (`addSiteForCurrentClient`), add-zone flow (the form below site detail), inline-edit flow per field, delete flow per entity — all need Server Action equivalents.

Implementation: ~full day for the full CRUD surface.

### 2.4 Image upload (`uploadImage` + drop zones)

See §1.4 above. Two consumers:
- **Client location maps** (renderClientLocationMapsWidget) — drop zones on the site-detail page that upload to `clients.location_maps`.
- **Report period maps** (drop zones inside the iframe in edit mode) — upload to `client_reports.period_map_images`.

Storage bucket `report_assets` already exists (migration 008). RLS allows public read + service-role write — but client-side uploads from cc-dashboard will need either a Server Action (to use service-role) OR an RLS policy update (to allow authed users to write).

Implementation: full-day (Storage handling + drop-zone UI + edit-mode integration).

### 2.5 Report generation (the actual `npm run report` pipeline)

Lives in `src/report/` — 11 TypeScript files:
- `aggregate.ts` — gathers inspection data for a client/site/zone + period
- `hierarchy.ts` — resolves leaves under a client
- `narratives.ts` — calls Anthropic API for prose generation
- `period.ts` — date math
- `render_html.ts` — fills the bush_regen template with data + narratives
- `render_docx.ts` — converts to DOCX (uses `docx` npm package)
- `templates/bush_regen.html.ts` — the template

CLI entry: `src/bin/generate_report.ts` — flags: `--client-id`, `--site-id`, `--zone-id`, `--month`, `--quarter`, `--start`, `--end`.

cc-dashboard port status: **NOT ported. Currently CLI-only.**

To bring into cc-dashboard:
- Add `src/` equivalent to cc-dashboard's `lib/reporting/generation/` OR keep as a separate package
- Wrap as Server Action `generateReport({ scope, id, period })`
- Wire to a "Generate Now" button in the Reports page
- Wire to a Vercel Cron route that fires per the cadence settings

Implementation: **2–3 days** (or split into 2 briefs). The Anthropic narrative generation is the most variable piece.

### 2.6 Sync pipeline (`src/sync/`)

`scheduled_sync.ts` runs periodically against the Safety Culture API to ingest new audits. Currently runs as a Node script (`npm run sync` or `npm run sync:backfill`).

To bring into cc-dashboard:
- Port to Vercel Cron (or keep as a separate scheduled service)
- Decision: does sync stay outside cc-dashboard (separate worker) or run inside Vercel Cron?

Implementation: half-day to port to Vercel Cron (assuming it runs within Vercel's 60s timeout — needs check; backfill probably doesn't).

### 2.7 Webhook (`src/webhook/`)

Currently a separate Node service that receives Safety Culture audit-completed webhooks and triggers ingest.

cc-dashboard port: a Next.js API route at `app/api/webhooks/safety-culture/route.ts`.

Implementation: half-day.

### 2.8 Pipeline / parser / media (`src/parser/`, `src/pipeline/`, `src/media/`)

Pure backend logic. Lifts cleanly into cc-dashboard's `lib/reporting/` if we want to keep generation server-side. Roughly:

- `parser/` — converts SC raw JSON → structured rows (7 files, well-tested).
- `pipeline/` — orchestrates parse → write → media (1 file).
- `media/` — downloads SC photos to Supabase Storage (1 file).

Most of this only matters when we port generation. ~half-day to lift if we go that route.

---

## 3 · Schema dependencies (reality check)

Tables that the unported pages + pipelines depend on. Verify each exists on the new Supabase project (`ymcyunspmljaruodjpkd`):

| Table | Used by | Notes |
|---|---|---|
| `clients` | clients, reports, location maps | Has `location_maps jsonb`, `schedule_config jsonb`, `report_frequency text`. |
| `sites` | clients, sites, site-detail | Has `parent_site_id`, `schedule_config jsonb`. |
| `inspections` | dashboard, inspections, sites, pipeline, reports | Core fact table. |
| `inspection_tasks` | dashboard, inspections, reports | |
| `inspection_weeds` | dashboard, inspections, species, reports | |
| `inspection_media` | dashboard, inspections, reports | Photos table. |
| `inspection_personnel` | dashboard, sites, staff, reports | hours_worked, staff_id. |
| `inspection_chemicals` | chemicals, reports | (Confirm exact name in migrations.) |
| `chemical_application_records` | chemicals | a.k.a. `carRecords` |
| `chemical_lookup` | chemicals | a.k.a. `chemLookup` — reference table. |
| `species_lookup` | species | reference table. |
| `staff` | dashboard, staff, inspections | |
| `client_reports` | reports | Rich: status, pdf_url, docx_url, period, html_content, period_map_images. |
| `report_weed_works` | reports | Per-section data for §4.1. |
| `sync_state` | pipeline | Last sync timestamp, cursor. |
| `organizations` | everything (multi-tenant) | NOT NULL FK on most tables. |

Storage bucket: `report_assets` (public read, service-role write per migration 008).

Enums: `report_status`, `processing_status`. Verify enum values during E10 implementation.

---

## 4 · Revised brief plan

The original M03b plan ran E8 → E12 (5 briefs, all of M03b). After this audit, the surface area is bigger than 5 briefs can comfortably hold. Proposing a revised plan:

### Already shipped

| Brief | Status |
|---|---|
| E8 — landing page + scaffold | ✅ merged `abe77e2` |
| F1 — sub-nav | ✅ merged with E8 |
| E9 — Clients/Sites/Zones (read-only) + cadence selector | ✅ merged `3f28162` |

### Revised forward plan

| Brief | Scope | Estimate | Depends on |
|---|---|---|---|
| **E10** — Reports list + read-only preview (open PDF, download DOCX) | Replace ComingSoon with table view + open-in-new-tab. **Defer** edit mode, image uploads, modal preview. | half-day | merged main |
| **E10b** — Edit mode + image uploads | iframe `contentEditable`, drop zones for location_maps + period_maps, save back. Builds on E10. | full-day | E10 |
| **E11** — Inspections page | Wide table + 4 KPIs. | half-day | merged main |
| **E12** — Pipeline Health page | KPIs + donut + bar list + recent failures table + sync state. | half-day | merged main |
| **E13** — Operations: Staff & Hours, Chemicals, Species | All 3 read-only Operations pages. Detail in `operations_data_wiring.md`. | full-day (one PR with all 3) | merged main; sub-nav un-greys items |
| **E14** — Global Sites view | Port `page-sites` if Peter wants it (cross-client view). Currently NOT in plan. | half-day | merged main; sub-nav adds entry |
| **E15** — Inline CRUD: editable fields + add/delete sites and zones + schedule widget for sites/zones | The full editing surface that E9 deferred. Generic `<EditableField>` + Server Actions per table. | full-day | merged main |
| **E16** — Generation pipeline + cron | Port `src/report/` and `src/bin/generate_report.ts` into cc-dashboard. Wire to "Generate Now" button + Vercel Cron driven by cadence settings. | 2 days | E10b (so the new reports show up in the viewer) |
| **E17** — Sync pipeline + webhook | Port `src/sync/` and `src/webhook/`. Vercel Cron + API route. | full-day | E16 (or parallel) |
| **E18** — Cutover + retirement | Flip APPS card href. Retire standalone Vercel deploy + archive `FrostyFruit1/constance-reporting` repo. Delete the obsolete `~/Desktop/CONSTANCE\ CONSERVATION/` legacy dir on this Mac. | 1 hour | all the above |

**Total remaining: ~9 days of work** (vs. the original M03b's implicit ~3 days for E10-E12). Worth knowing now.

### What changed vs. original M03b

| Original | Revised | Why |
|---|---|---|
| E10 = list + preview + edit | **E10 = list-only**, **E10b = edit/uploads** | Edit mode + uploads are big enough to warrant their own brief. |
| E11 = Inspections + Pipeline | **E11 = Inspections, E12 = Pipeline** | Two distinct pages, each shippable independently. |
| E12 = Server Actions + Cron + cutover | **E16 = generation, E17 = sync, E18 = cutover** | Three independent concerns currently bundled. |
| (none) | **E13 = Operations 3-pages** | Was missing from plan entirely. |
| (none) | **E14 = Global Sites view** (optional) | Was missing — Peter to decide. |
| (none) | **E15 = Inline CRUD** | Was implicitly bundled into pages but is its own infrastructure. |

---

## 5 · Recommendations on order

If shipping speed matters most, the natural order is:

1. **E10** (read-only reports viewer, half-day) — unblocks viewing reports if any get generated outside cc-dashboard (CLI today).
2. **E11 + E12** (inspections + pipeline, half-day each) — finishes the read-only port of the dashboard nav.
3. **E13** (Operations) — un-greys the sub-nav, completes feature parity for VIEWING.
4. **E14** (Global Sites) — optional, decide.
5. **E15** (Inline CRUD) — first editing brief.
6. **E10b** (Edit mode + uploads) — second editing brief.
7. **E16** (Generation pipeline) — moves generation from CLI to UI/cron.
8. **E17** (Sync + webhook) — moves ingest into cc-dashboard.
9. **E18** (Cutover) — retire standalone.

After E13 (Operations done), the standalone can be **viewed-only** through cc-dashboard. After E15+E10b, **all editing** is in cc-dashboard. After E16+E17, **all data flow** is in cc-dashboard. E18 retires.

If we want to keep the standalone alive longer (for safety), we can stay on the read-only port through E13 and revisit editing later.

---

## 6 · Open questions for Peter

1. **`page-sites` (E14):** include it in the sub-nav as `Overview → Sites`, or drop it? Cross-client hours roll-up has value but is duplicated by drilling into each client.
2. **CRUD scope:** is the master cc-dashboard `/clients` page (which already has CRUD) sufficient for the editing flow, OR does the **/reporting/clients** view also need to be editable? My read: the master CRUD is enough for now; reporting view stays mostly read-only with the cadence selector exception.
3. **Generation pipeline (E16) — port or keep as separate service?** Keeping the CLI alongside a Server Action wrapper is the lightest lift. Full lift-and-shift into cc-dashboard's `lib/reporting/generation/` is cleaner long-term but bigger.
4. **Sync pipeline (E17) — Vercel Cron or external worker?** Vercel Cron has a 60s timeout (10s for Hobby, 300s for Pro depending on plan); a full backfill may exceed this. Likely answer: incremental sync via Vercel Cron, full backfill stays a CLI command run manually.
5. **Edit mode urgency (E10b):** if customers/team need to edit reports before sending, this jumps in priority. If today they just review and send, E10 (read-only) is enough for a long time.

Answer those and I'll re-draft E10 with the actual scope, queue the others, and we keep moving.
