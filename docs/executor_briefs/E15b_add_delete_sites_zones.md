# E15b — Add/delete sites + zones + new client

**Status:** Approved 2026-04-29 (deferred from E15 to keep that brief shippable; round 4)
**Brief written:** 2026-04-29
**Repo:** `constance-conservation/cc-dashboard`
**Branch:** `feature/reporting-port-e15b` (off `main`)
**Predecessor:** E15 (merged `f7e03aa`).
**Audit context:** `docs/audit/standalone_feature_inventory.md` §2.3 (CRUD primitives).

---

## Goal

Complete the CRUD surface that E15 deferred. Add the remaining write operations on the
client/site/zone hierarchy from the reporting views — create new client, create new site
under a client, create new zone under a site, delete site, delete zone. All hooked into
the existing `/reporting/clients` and `/reporting/clients/[id]/...` pages with the same
RLS-fallback pattern E15 already established in
`app/(dashboard)/reporting/clients/actions.ts` and
`app/(dashboard)/reporting/clients/[id]/sites/actions.ts`.

After this lands, the editing surface for the reporting hierarchy is complete.
Generation (E16), sync (E17), and cutover (E18) remain.

---

## Scope (in this brief)

- **`createClient(name, longName?)`** Server Action — inserts a row in `clients`. Returns the new id so the UI can navigate to the detail page.
- **`createSite(clientId, name, longName?)`** Server Action — inserts a top-level site (`parent_site_id = null`).
- **`createZone(parentSiteId, name)`** Server Action — inserts a child site row (zone) with `parent_site_id` set.
- **`deleteSite(siteId)`** Server Action — hard delete, **blocked if the site has any zones** (return ok:false with a clear error). No cascade.
- **`deleteZone(zoneId)`** Server Action — hard delete, **blocked if the zone has any inspections** (return ok:false with a clear error). No cascade.
- **UI: "Add client" button on `/reporting/clients`** — opens a small client-side modal, calls `createClient`, on success navigates to the new client's detail page.
- **UI: "Add site" button on `/reporting/clients/[id]`** — modal, calls `createSite`, on success refreshes the page (revalidation).
- **UI: per-site "..." menu** in the Sites panel — exposes "Delete site" with a confirm dialog. Disabled (or blocked-on-attempt) if `siteCount` of children > 0.
- **UI: "Add zone" button on `/reporting/clients/[id]/sites/[siteId]`** — modal, calls `createZone`.
- **UI: per-zone "..." menu** in the Zones panel — "Delete zone" with confirm. Blocked if zone has any inspections.

## Out of scope

- Editing in the global `/reporting/sites` view (E14). Add/delete buttons there are NOT in this brief — keep `/reporting/sites` as a read-only roll-up view for now.
- Org switching / multi-org create flows — assume the new client inherits the current user's org (or, if there is exactly one org row in the database, use that org's id; see open questions).
- Soft-delete / archiving. Hard delete only, gated on no-children/no-inspections.
- Bulk operations.
- Reordering or moving (re-parenting) sites/zones.
- Anything that touches `/reporting/reports/*` or generation.

---

## Architecture

### Server Actions

**Append to `app/(dashboard)/reporting/clients/actions.ts`** (file already has the
RLS-fallback pattern from E15; reuse `isAuthRlsError`, `normalize`, and the
`ActionResult` type):

```ts
export async function createClient(
  name: string,
  longName?: string | null,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> { ... }
```

Insert into `clients`. Required columns: `name`, `organization_id` (resolve at runtime —
see open questions). Optional: `long_name`. Returns the inserted `id` so the UI can
`router.push(\`/reporting/clients/${id}\`)`.

**Append to `app/(dashboard)/reporting/clients/[id]/sites/actions.ts`** (already
has the RLS-fallback pattern from E15; reuse `updateSiteWithFallback`'s helpers
or refactor to share a generic `withFallback(table, op)`):

```ts
export async function createSite(
  clientId: string,
  name: string,
  longName?: string | null,
): Promise<{ ok: true; id: string } | { ok: false; error: string }>

export async function createZone(
  parentSiteId: string,
  name: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }>

export async function deleteSite(siteId: string): Promise<ActionResult>
export async function deleteZone(zoneId: string): Promise<ActionResult>
```

`createSite`: insert into `sites` with `client_id`, `name`, `parent_site_id = null`,
plus `organization_id` resolved from the parent client.

`createZone`: insert into `sites` with `parent_site_id = parentSiteId`, plus
`client_id` and `organization_id` copied from the parent row (single SELECT before
the INSERT).

`deleteSite`: SELECT count from `sites` WHERE `parent_site_id = siteId`. If > 0,
return `{ ok: false, error: 'Cannot delete site with N zones — delete zones first.' }`.
Otherwise DELETE.

`deleteZone`: SELECT count from `inspections` WHERE `site_id = zoneId` (zones are
stored in `sites` table; inspections reference them via `site_id`). If > 0, return
`{ ok: false, error: 'Cannot delete zone with N inspections.' }`. Otherwise DELETE.

All actions: same RLS fallback pattern as `updateSiteWithFallback` (try with user
session; if it fails with an RLS-shaped error, retry with `createAdminClient()`).

`revalidatePath` calls after success:
- `createClient`: `/reporting/clients`, `/clients`
- `createSite`: `/reporting/clients/[clientId]`, `/reporting/clients`, `/reporting/sites`
- `createZone`: `/reporting/clients/[clientId]/sites/[parentSiteId]`, `/reporting/sites`
- `deleteSite`: same as createSite
- `deleteZone`: same as createZone

### UI components

**New `components/reporting/AddClientButton.tsx`** (`'use client'`):
- Renders a button "+ Add client".
- Click opens an inline modal/dialog (use a simple controlled `<dialog>` or a
  fixed-position overlay — match the visual language of existing panels).
- Form fields: short name (required), long name (optional).
- Submit calls `createClient`. On success: `router.push(\`/reporting/clients/${id}\`)`.
- On failure: surface error inline.

**New `components/reporting/AddSiteButton.tsx`** (`'use client'`):
- Same pattern. Props: `clientId`. Form fields: name (required), long name (optional).
- On success: revalidation handles refresh; close modal.

**New `components/reporting/AddZoneButton.tsx`** (`'use client'`):
- Same pattern. Props: `parentSiteId`. Form fields: name (required).

**New `components/reporting/DeleteRowMenu.tsx`** (`'use client'`):
- A compact "..." trigger that opens a menu with a single "Delete" item.
- Confirm step before invoking the delete action.
- Props: `kind: 'site' | 'zone'`, `id: string`, `onDeleted?: () => void`.
- Internally branches to `deleteSite` / `deleteZone`.
- On error: surface inline (the blocked-children error message must reach the user).

### Wiring into existing pages

`/reporting/clients/page.tsx`:
- Add `<AddClientButton />` in the `subpage-top` (right side, near the title) or as a
  panel-style action above the cards grid. Keep visual styling consistent with E14's
  Global Sites view header.

`/reporting/clients/[id]/page.tsx`:
- In the Sites panel `panel-head`, add `<AddSiteButton clientId={client.id} />` next to
  the count.
- In each `RowCard` for a site, add a `<DeleteRowMenu kind="site" id={s.id} />` in the
  trailing slot. The card's existing `href` for navigation should still work — the menu
  trigger needs to stop event propagation.

`/reporting/clients/[id]/sites/[siteId]/page.tsx`:
- In the Zones panel `panel-head`, add `<AddZoneButton parentSiteId={site.id} />`.
- In each zone `RowCard`, add `<DeleteRowMenu kind="zone" id={z.id} />` in the trailing
  slot alongside the existing `ScheduleSelector` + `GenerateReportButton`.

### Modal styling

Keep styling minimal — Peter's stated preference is logic over styling. A simple
fixed-position overlay with a centered card, an input, and Save/Cancel buttons is
sufficient. Reuse existing CSS variables (`var(--bg-elev)`, `var(--line)`, etc.).
Do not pull in a new dependency.

---

## Reference: source material in `~/Desktop/constance-reporting/`

The standalone has no equivalent UI — this is new surface for cc-dashboard. Schema
shape comes from the existing `sites` and `clients` tables (already documented in
the audit and used throughout `lib/reporting/queries.ts`).

Existing patterns to mirror:
- `app/(dashboard)/reporting/clients/actions.ts` — `updateClientField` shows the
  RLS-fallback + revalidation pattern.
- `app/(dashboard)/reporting/clients/[id]/sites/actions.ts` — `updateSiteField` shows
  the same pattern with an extra `loadSiteContext` helper for cascading revalidations.
- `components/reporting/EditableField.tsx` — the form/error/loading UX vocabulary to
  match in the modal forms.
- `components/reporting/ScheduleSelector.tsx` — example of a self-contained client
  component that calls a Server Action.

---

## Schema dependencies

- `clients.{id, organization_id, name, long_name}` — text/uuid columns, all already exist.
- `sites.{id, organization_id, client_id, parent_site_id, name, long_name}` — exist.
- `inspections.site_id` — exists; used to gate `deleteZone`.
- **No schema additions or migrations.**

RLS: same story as E15 — first attempt uses the user-session client; if blocked with
an RLS-shaped error, fall back to `createAdminClient()`. The fallback already exists
and is proven in `clients/actions.ts` and `clients/[id]/sites/actions.ts`.

---

## Files to CREATE

- `components/reporting/AddClientButton.tsx` (~80 lines)
- `components/reporting/AddSiteButton.tsx` (~70 lines)
- `components/reporting/AddZoneButton.tsx` (~70 lines)
- `components/reporting/DeleteRowMenu.tsx` (~90 lines)

If a small shared modal primitive emerges (`components/reporting/Modal.tsx`),
extract it — but do NOT introduce a new npm dependency.

## Files to MODIFY

- `app/(dashboard)/reporting/clients/actions.ts` — append `createClient`.
- `app/(dashboard)/reporting/clients/[id]/sites/actions.ts` — append `createSite`,
  `createZone`, `deleteSite`, `deleteZone`. Optionally refactor the duplicated
  `updateSiteWithFallback` body into a generic helper if it makes the new ops cleaner —
  acceptable scope creep.
- `app/(dashboard)/reporting/clients/page.tsx` — render `<AddClientButton />`.
- `app/(dashboard)/reporting/clients/[id]/page.tsx` — render `<AddSiteButton />` and
  `<DeleteRowMenu kind="site">`.
- `app/(dashboard)/reporting/clients/[id]/sites/[siteId]/page.tsx` — render
  `<AddZoneButton />` and `<DeleteRowMenu kind="zone">`.

## Files NOT touched

- `lib/reporting/queries.ts` — existing queries already return everything the new UI
  needs (zoneCount on SiteSummary, etc.). No new queries.
- `lib/reporting/types.ts` — no new types beyond what's defined inside the action files.
- `app/(dashboard)/reporting/sites/page.tsx` — global Sites view stays read-only this round.
- `app/(dashboard)/reporting/{pipeline,reports,operations,inspections}/` — out of scope.
- `app/(dashboard)/clients/page.tsx` — master CRUD; out of scope.
- `components/reporting/{CadenceSelector,ScheduleSelector,EditableField,ReportingNav}.tsx`
  — leave existing components alone.
- `package.json` — no new deps.

---

## Done definition

A reviewer can:

1. Visit `/reporting/clients`. Click "Add client". Modal opens. Type a name. Save.
   Lands on the new client's detail page with the typed name shown.
2. On a client detail page, click "Add site". Modal opens. Type a name. Save. Page
   refreshes; the new site appears in the Sites panel.
3. On a site detail page, click "Add zone". Modal opens. Type a name. Save. Zone
   appears in the Zones panel.
4. Click the "..." menu on a zone with no inspections. "Delete" → confirm. Zone
   disappears from the list.
5. Click the "..." menu on a zone with inspections. "Delete" → confirm. Action returns
   an error like "Cannot delete zone with 14 inspections." Zone stays.
6. Click the "..." menu on a site with no zones. "Delete" → confirm. Site disappears
   from the parent client's Sites panel.
7. Click the "..." menu on a site with zones. "Delete" → confirm. Action errors with
   the zone count. Site stays.
8. Existing E15 inline editing on the same pages still works; existing CadenceSelector
   and ScheduleSelector still work.
9. RLS errors surface inline with a clear message; the modal stays open on error.
10. `npm run build` passes.

---

## Coordination notes — round 4

E16 (generation pipeline) is running in parallel.

**Shared file risk:**
- E15b touches `app/(dashboard)/reporting/clients/actions.ts` and
  `app/(dashboard)/reporting/clients/[id]/sites/actions.ts`.
- E16 places its Server Actions in a NEW file `lib/reporting/generation/actions.ts`
  (separate path) — so by design these two briefs do NOT share any actions file.
- E15b touches `app/(dashboard)/reporting/clients/[id]/page.tsx` and
  `app/(dashboard)/reporting/clients/[id]/sites/[siteId]/page.tsx` to add buttons.
- E16 modifies `components/reporting/GenerateReportButton.tsx` (component-level), but
  the page-level imports `<GenerateReportButton scope id />` stay identical — so
  page.tsx files are NOT changed by E16.
- Net: zero shared-file conflicts expected. If a conflict appears at merge, the
  resolution template is the same append-only stack pattern from rounds 2–3.

**Stay out of:**
- `lib/reporting/generation/` — E16 territory (does not exist yet at branch cut).
- `app/api/cron/` — E16 territory.
- `vercel.json` / `vercel.ts` — E16 territory.
- `package.json` — E16 territory.
- `components/reporting/GenerateReportButton.tsx` — E16 refactors this; do not touch
  its internals. Keep using it from the modified page.tsx files exactly as today.

If you find yourself wanting to touch any other file, **stop and surface it**.

---

## Open questions (resolve at implementation)

1. **`organization_id` resolution for `createClient`**. The user is authenticated; the
   org id needs to be inferred. Options, in order of preference:
   (a) read from the current user's profile (if `auth.users` has an org_id claim or
   there's a `users` table with `organization_id`),
   (b) if exactly one row exists in `organizations`, use that id,
   (c) read the org id from any existing client row as a last-resort default.
   Pick whichever works against the live schema; document the choice in the PR.
2. **`organization_id` for `createSite` / `createZone`**. Easy: SELECT the parent
   client's (or parent site's) `organization_id` and copy it.
3. **Validation rules for names**. Trim; reject empty after trim; no other rules.
   Match `updateClientField`'s permissive approach.
4. **Concurrency**. Last-write-wins, no locking. Same as E15.
5. **Confirm dialog UX**. A native `window.confirm()` is acceptable v1 — Peter
   prioritises logic over styling. A custom inline confirm panel is also fine if it
   doesn't add complexity.
6. **Cascade behaviour confirmation**. Brief specifies "block if has children" — confirm
   no FK ON DELETE CASCADE exists on `sites.parent_site_id` or `inspections.site_id`
   that would silently delete dependents anyway. If a CASCADE exists, the gating
   SELECT is still a useful guard.

---

## Workstream procedure

1. `cd /Users/feelgood/Desktop/cc-dashboard && git checkout main && git pull`
2. `git worktree add /Users/feelgood/Desktop/cc-dashboard-e15b -b feature/reporting-port-e15b main`
3. `cd /Users/feelgood/Desktop/cc-dashboard-e15b`
4. `cp /Users/feelgood/Desktop/cc-dashboard/.env.local .`
5. `npm install`
6. Read brief + audit §2.3 + the existing `clients/actions.ts` and
   `clients/[id]/sites/actions.ts` (RLS-fallback pattern to mirror).
7. Implement files in order:
   - Append `createClient` to `clients/actions.ts`.
   - Append `createSite`, `createZone`, `deleteSite`, `deleteZone` to
     `clients/[id]/sites/actions.ts`.
   - `AddClientButton.tsx` + (optional) `Modal.tsx` shared primitive.
   - `AddSiteButton.tsx`, `AddZoneButton.tsx`.
   - `DeleteRowMenu.tsx`.
   - Wire into the three `page.tsx` files.
8. `npm run build` — must pass.
9. `npm run dev` and exercise each create/delete flow if possible. (Headless? Say
   "skipped" — Peter does manual verify on the Vercel preview.)
10. Commit + Co-Authored-By Claude line.
11. `git push -u origin feature/reporting-port-e15b`
12. `gh pr create` with test-plan + the org-id resolution decision documented.
13. Report back per session prompt format.
