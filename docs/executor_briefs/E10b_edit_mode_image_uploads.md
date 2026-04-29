# E10b — Report preview + edit mode + image uploads

**Status:** Approved 2026-04-29 (priority bumped per Peter)
**Brief written:** 2026-04-29
**Repo:** `constance-conservation/cc-dashboard`
**Branch:** `feature/reporting-port-e10b` (off `main`)
**Predecessor:** E10 (merged `82e8d0d` — read-only viewer).
**Audit context:** `docs/audit/standalone_feature_inventory.md` §1.4
(reports page) + §2.4 (image upload infrastructure).

---

## Goal

Bring the standalone's full report preview + edit experience into
cc-dashboard. From `/reporting/reports`, clicking a row opens a preview
of the rendered report HTML. An "Edit mode" toggle makes the body
`contentEditable`; placeholder figures become drop-targets that upload
images to Supabase Storage; "Save Changes" patches the report row +
related tables back.

This is the largest single feature in M03b. Plan ~full day.

---

## Scope

**In scope:**
- Preview of the rendered report HTML (iframe).
- Edit-mode toggle that flips `contentEditable` on the iframe body.
- Drop-zone overlay for elements matching `[data-placeholder][data-editable="true"]`.
- Two image-upload slot families:
  - `location_map_*` — per-client, persists to `clients.location_maps jsonb`.
  - `period_map_*` — per-report, persists to `client_reports.period_map_images jsonb`.
- Save action: patches `client_reports.html_content` (rendered HTML),
  `client_reports.period_map_images` (per-report maps), and
  `clients.location_maps` (client-level maps). Idempotent.
- "Open PDF" / "Download DOCX" buttons retained (already work in E10).
- Print to PDF button (browser `window.print()` on the iframe).

**Explicitly OUT of scope:**
- Approve & Send button (M04).
- Generate Now button (E16).
- Granular undo / redo within edit mode (browser-native only).
- Rich-text formatting toolbar — `contentEditable` defaults are sufficient.
- Auto-save / draft persistence — the dirty-flag + Save button is enough.

---

## Architecture

### Route shape

A new dynamic route: `app/(dashboard)/reporting/reports/[id]/page.tsx`.
Click a row in the list → `<Link href={`/reporting/reports/${id}`}>`.
Full page (NOT a modal) so the editor has room to breathe and refreshes
work. The standalone uses a modal; we trade modal-style for full-page.

Page composition:
- **Server Component** — fetches the `client_reports` row + the parent
  `clients` row (for `location_maps` access) by ID, passes to a Client
  Component.
- **Client Component** — `ReportEditor`. Renders an iframe with
  `srcDoc={report.html_content}`, the edit toggle, the action buttons,
  the dirty indicator, the save flow.

### Edit toggle

Standard React `useState`. When toggled on:
1. Iframe's body gets `contentEditable = 'true'`.
2. Drop-zone overlay components are rendered absolute-positioned over
   each `[data-placeholder][data-editable="true"]` in the iframe DOM.
   Use `iframe.contentWindow.document.querySelectorAll` after iframe load.
3. An `onInput` listener on the iframe body sets `dirty = true`.

When off: revert all of the above.

### Drop-zone overlay

For each placeholder element, after iframe load + edit-mode-on:
- Compute its `getBoundingClientRect()` relative to the iframe viewport.
- Render an absolutely-positioned `<div>` overlay at that position
  (visible only on hover or when dragging).
- Listen for `dragover` / `drop` events on the overlay.
- On drop: extract the file, call `uploadReportImage` Server Action,
  receive a public URL, then mutate the iframe DOM:
  - Replace the placeholder element's content with `<img src={url}>`,
  - Preserve the placeholder element's `data-placeholder` attribute
    (so re-opening edit mode still recognises the slot).
  - Set `dirty = true`.

Slot type derivation:
- `data-placeholder="location_map_0"` → type=`location_map`, index=0
- `data-placeholder="period_map_1"` → type=`period_map`, index=1

### Server Action — uploadReportImage

```ts
// app/(dashboard)/reporting/reports/[id]/actions.ts
'use server'

export async function uploadReportImage(args: {
  reportId: string
  clientId: string
  type: 'location_map' | 'period_map'
  index: number
  file: File          // FormData via Server Action
}): Promise<{ ok: true; url: string } | { ok: false; error: string }>
```

Implementation:
- Validate MIME (png/jpeg/webp) + size (max 10 MB).
- Use a **service-role Supabase client** for Storage (the `report_assets`
  bucket has RLS allowing only `service_role` to write per migration 008).
  Read `SUPABASE_SERVICE_ROLE_KEY` from env. Create a separate helper
  `lib/supabase/admin.ts` that returns a service-role client; reuse
  across uploadReportImage and saveReportEdits if they need privileged ops.
- Path: `{clientId}/{type}/{type}_{Date.now()}.{ext}` per migration 008
  convention.
- Return public URL: `${SUPABASE_URL}/storage/v1/object/public/report_assets/${path}`.
- Do NOT persist anything else — the URL is returned, the save flow
  decides what to do with it (write to client_reports vs clients).

### Server Action — saveReportEdits

```ts
export async function saveReportEdits(args: {
  reportId: string
  clientId: string
  htmlContent: string
  periodMapImages: string[]   // URLs in slot order
  locationMaps: string[]      // URLs in slot order
}): Promise<{ ok: true } | { ok: false; error: string }>
```

Implementation:
- Use the user's Supabase session (NOT service-role) for these UPDATEs
  unless RLS blocks. If RLS does block, fall back to service-role.
- `UPDATE client_reports SET html_content=?, period_map_images=? WHERE id=?`
- `UPDATE clients SET location_maps=? WHERE id=?` ONLY if `locationMaps`
  changed (compare against current value to avoid no-op writes).
- `revalidatePath('/reporting/reports/' + reportId)` and
  `revalidatePath('/reporting/reports')`.

### Save flow on the client

1. User clicks "Save Changes" (button is `disabled={!dirty || isPending}`).
2. Read iframe's current HTML: `iframe.contentWindow.document.documentElement.outerHTML`.
3. Walk the iframe DOM extracting current image URLs from each placeholder
   slot — produce `periodMapImages` and `locationMaps` arrays in slot order.
4. Call `saveReportEdits` Server Action.
5. On success: clear dirty, show "Saved" indicator (auto-hide after 1.8s).
6. On error: show error inline, keep dirty true.

---

## Reference: source material in `~/Desktop/constance-reporting/`

- `dashboard-preview.html` lines **705–732** — modal UI (header, iframe,
  footer with buttons).
- `dashboard-preview.html` lines **1450–1700** — entire edit-mode + save
  + image-upload subsystem. Read this carefully.
- `dashboard-preview.html` lines **1452–1480** — `uploadImage` helper
  (the storage POST, MIME/size validation, path convention).
- `dashboard-preview.html` lines **1496–1565** — `applyEditModeToIframe`
  (drop zones, contentEditable toggle, dirty listener).
- `dashboard-preview.html` lines **1665–1710** — `saveReportEdits` (the
  patchRow flow we're porting to a Server Action).
- `~/Desktop/constance-reporting/docs/executor_briefs/E5_image_uploads.md` —
  the original brief that built this in the standalone. **Read it.**
- `~/Desktop/constance-reporting/supabase/migrations/008_storage_report_assets.sql` —
  bucket + RLS policies (service-role write, public read).

---

## Schema dependencies

```
client_reports
  id, client_id, html_content, period_map_images jsonb, ...
clients
  id, location_maps jsonb (array of URLs)

storage.buckets
  id='report_assets', public=true

storage.objects (bucket=report_assets)
  RLS: public SELECT; INSERT requires service_role
```

If the bucket / RLS policy isn't in place on the live project, fail
loudly with a clear error and surface to the orchestrator. Verify at
the start of implementation:

```bash
# Verify policies via SQL editor
SELECT * FROM storage.buckets WHERE id='report_assets';
SELECT policyname FROM pg_policies WHERE tablename='objects' AND schemaname='storage';
```

---

## Files to CREATE

- `app/(dashboard)/reporting/reports/[id]/page.tsx` — Server Component, ~80 lines.
- `app/(dashboard)/reporting/reports/[id]/ReportEditor.tsx` — Client Component, ~250 lines.
- `app/(dashboard)/reporting/reports/[id]/actions.ts` — Server Actions
  (`uploadReportImage`, `saveReportEdits`), ~130 lines.
- `lib/supabase/admin.ts` — service-role server client helper, ~25 lines.

## Files to MODIFY

- `lib/reporting/queries.ts` — add `getReportDetail(id)`. ~50 lines.
- `lib/reporting/types.ts` — add `ReportDetail`, `LocationMapsArray`,
  `PeriodMapsArray`. ~30 lines.
- `components/reporting/ReportRow.tsx` — wrap title in `<Link>` to
  `/reporting/reports/[id]`. Tiny change.
- `.env.local` — confirm `SUPABASE_SERVICE_ROLE_KEY` is present (don't commit).

## Files NOT touched

- `components/reporting/ReportingNav.tsx` — not changed in E10b.
- `components/reporting/ScopeChip.tsx` — not changed.
- Anything outside `app/(dashboard)/reporting/reports/`,
  `lib/reporting/`, `lib/supabase/`, `components/reporting/ReportRow.tsx`.

---

## Done definition

A reviewer can:

1. From `/reporting/reports`, click any row's title → lands on
   `/reporting/reports/[id]`.
2. Page shows the rendered report HTML in an iframe + an "Edit mode"
   toggle + Save button (disabled initially) + Open PDF / Download DOCX
   / Print buttons.
3. Toggle Edit mode on → iframe content becomes editable; drop zones
   appear over placeholder figures.
4. Drag-drop a PNG/JPEG/WebP onto a location-map drop zone → upload
   succeeds, image replaces placeholder; Save button activates.
5. Drag-drop onto a period-map drop zone → same.
6. Edit text in the iframe body → Save button stays active.
7. Click Save → "Saving…" → "Saved" indicator appears for ~2s. Refresh
   the page → all changes persisted (HTML and image URLs).
8. Toggle Edit mode off → iframe is read-only again; existing edits
   remain.
9. Bad UUID in URL → clean 404 (`notFound()`).
10. `npm run build` passes.

---

## Coordination notes

This brief runs in parallel with E11 and E13. Three things to avoid
stepping on:

1. **`lib/reporting/queries.ts` is append-only across all three streams.**
   E10b adds `getReportDetail`. Last merger handles small textual conflicts.
2. **`components/reporting/ReportingNav.tsx`** — E10b does NOT touch this.
   E13 owns the un-greying.
3. **`components/reporting/ReportRow.tsx`** — E10b modifies this file
   to wrap the title in a `<Link>`. No other stream touches it.

If you find yourself wanting to modify a file outside this brief's
allowed list, **stop and surface to the orchestrator** before pushing.

---

## Risk + caveats

- **Cross-origin iframe scripting:** `iframe.srcDoc` content is treated
  as same-origin by browsers (per the HTML spec — same-origin if origin
  matches the parent and srcDoc is set). This MUST work for `contentEditable`
  + drop-zone overlay to function. Verify early.
- **Server Action file uploads:** Next.js 16 supports passing `File` /
  `Blob` to Server Actions via FormData. Use that pattern.
- **Service-role key in env:** must be present. If `vercel env pull`
  returned empty (per the M03b status doc), fall back to manually pasted
  `.env.local` value.
- **HTML sanitisation on save:** the iframe content is user-edited.
  When patching `client_reports.html_content`, no extra sanitisation —
  the report owner is the only one editing their own report (RLS) and
  the audience for the rendered HTML is the same user via the iframe.
  But if reports are emailed or rendered in other contexts later, this
  becomes a concern. **Note in the PR description.**

---

## Open questions

1. **Where does the "Print to PDF" button send focus?** Iframe has
   `window.print()` built-in. Standalone calls `iframe.contentWindow.print()`.
   Default that.
2. **Should the iframe be sandboxed?** Default no (we control the
   content). If we ever embed third-party HTML, revisit.
3. **Concurrency:** what if two users open the same report in edit mode
   and save? Last-write-wins. Standalone has the same behaviour. Not
   addressed in M03b.

---

## Workstream procedure

1. Cut `feature/reporting-port-e10b` off `main`.
2. Verify Storage bucket policies with the SQL above. If anything
   missing, fix on the live Supabase project before coding.
3. Implement files in order:
   - `lib/supabase/admin.ts` (service-role client)
   - `actions.ts` (the two Server Actions)
   - `lib/reporting/queries.ts` + `types.ts` additions
   - `page.tsx` (Server Component shell)
   - `ReportEditor.tsx` (Client Component — biggest piece)
   - `ReportRow.tsx` (wrap title in Link)
4. `npm run build` — must pass.
5. Push branch, open PR.
6. Visual verify on the Vercel preview URL: full edit-and-save round trip.
7. Merge (squash, same as E10).
