# E15 — Inline CRUD across reporting views

**Status:** Approved 2026-04-29 (Peter explicitly requested editing on
reporting-side views in addition to the master `/clients` page)
**Brief written:** 2026-04-29
**Repo:** `constance-conservation/cc-dashboard`
**Branch:** `feature/reporting-port-e15` (off `main`)
**Predecessor:** E11 (merged `94ddcf1`).
**Audit context:** `docs/audit/standalone_feature_inventory.md` §2.1
(inline editable fields), §2.3 (CRUD primitives), §1.5 of the
operations audit (schedule widget).

---

## Goal

Replace the static read-only fields on `/reporting/clients/[id]` and
`/reporting/clients/[id]/sites/[siteId]` with click-to-edit fields,
matching the standalone's `renderEditableField` pattern. Add a generic
schedule widget for sites + zones (parallel to the existing client
cadence selector). Keep CRUD scope deliberately narrow for E15 — focus
on the per-field edit flow + schedule widget. **Add/delete of sites and
zones is deferred to a follow-up brief** (E15b) to keep this one shippable.

---

## Scope (in this brief)

- **Generic `<EditableField>` component.** Click-to-edit text input. On blur or Enter, calls a Server Action that updates a single column on a single row.
- **Server Actions** dispatched by table:
  - `updateClientField(clientId, field, value)` — for client meta (name, long_name, contact_name, council_or_body, contact_email, contact_phone)
  - `updateSiteField(siteId, field, value)` — for site meta (name, long_name, site_type, project_code)
- **Schedule widget for sites and zones.** Reuse the cadence selector pattern from `CadenceSelector.tsx` but write to `sites.schedule_config jsonb` instead of `clients.report_frequency text`. Site-level + zone-level schedules.
- **Wire EditableField into existing pages** — replace `<Field>` with `<EditableField>` on client detail + site detail.

## Out of scope (defer to E15b)

- Add new site under a client.
- Delete site or zone.
- Add new zone under a site.
- Editing across the global Sites view (E14) — that's just a list.
- Image-upload widgets (E10b owns reports; client location maps stay deferred).

---

## Architecture

### EditableField component

A small client component (`'use client'`):

```tsx
type Props = {
  value: string | null
  placeholder?: string         // shown when empty
  hint?: string                // small subtext
  onSave: (next: string | null) => Promise<{ ok: true } | { ok: false; error: string }>
  inputType?: 'text' | 'email' | 'tel'
}
```

Behaviour:
- Renders the value as plain text (or placeholder if null).
- Click → swaps to an `<input>`.
- Save on blur or Enter; cancel on Escape (revert to original value).
- Disable input while save in flight; brief "Saved" indicator on success;
  inline error on failure.
- Empty string is normalised to `null` before sending.

### Server Actions

`app/(dashboard)/reporting/clients/actions.ts` (file already exists from E9 — extend it):

```ts
'use server'

const CLIENT_EDITABLE_FIELDS = [
  'name','long_name','contact_name','council_or_body',
  'contact_email','contact_phone',
] as const
type ClientField = typeof CLIENT_EDITABLE_FIELDS[number]

export async function updateClientField(
  clientId: string,
  field: ClientField,
  value: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> { ... }
```

Same shape for `updateSiteField` in a new
`app/(dashboard)/reporting/clients/[id]/sites/actions.ts`.

Validation: whitelist field names against the const tuple (no
arbitrary column writes). Strings trimmed; empty → null.

`revalidatePath` called for the client detail + sites list (and the
master `/clients` page if value changes are visible there too).

### Site/zone schedule widget

Reuse the `CadenceSelector` pattern. Generic version:
`<ScheduleSelector table='sites' id={siteId} current={schedule_config} />`.

Server Action: `updateSiteSchedule(siteId, schedule)` writes to
`sites.schedule_config jsonb`. Schedule shape: `{cadence: 'off' | 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'annually'}`.

Render on:
- `/reporting/clients/[id]/sites/[siteId]` page (top of Site panel)
- Each zone row in the zones list (compact pill row)

### Wiring into existing pages

`/reporting/clients/[id]/page.tsx`:
- Replace each static `<Field>` in the Client panel with `<EditableField>`.
- Each EditableField bound to a Server Action wrapper that pre-fills the field name.

`/reporting/clients/[id]/sites/[siteId]/page.tsx`:
- Same for Site panel meta fields.
- Add `<ScheduleSelector>` for site-level cadence.
- Each zone row gets a compact ScheduleSelector inline.

---

## Reference: source material in `~/Desktop/constance-reporting/`

- `dashboard-preview.html` lines **993–1018** — `renderScheduleWidget()`.
- `dashboard-preview.html` lines **1019–1054** — `renderEditableField()`.
- `~/Desktop/cc-dashboard/components/reporting/CadenceSelector.tsx` —
  the pattern to follow for ScheduleSelector.
- `~/Desktop/cc-dashboard/app/(dashboard)/reporting/clients/actions.ts` —
  existing Server Actions file (extend).

---

## Schema dependencies

- `clients.{name,long_name,contact_name,council_or_body,contact_email,contact_phone}` — text columns, all already exist.
- `sites.{name,long_name,site_type,project_code}` — text columns, exist.
- `sites.schedule_config jsonb` — exists per migration 007.
- **No schema additions.**

RLS: same as cadence selector — uses authenticated user session, expects RLS to allow UPDATE for authed users on these tables. If RLS rejects, fall back to service-role (or surface to user).

---

## Files to CREATE

- `components/reporting/EditableField.tsx` (~80 lines)
- `components/reporting/ScheduleSelector.tsx` (~120 lines, generic
  parallel to CadenceSelector)
- `app/(dashboard)/reporting/clients/[id]/sites/actions.ts` (~50 lines —
  for `updateSiteField` + `updateSiteSchedule`)

## Files to MODIFY

- `app/(dashboard)/reporting/clients/actions.ts` — add `updateClientField`.
- `app/(dashboard)/reporting/clients/[id]/page.tsx` — swap `<Field>` for `<EditableField>`.
- `app/(dashboard)/reporting/clients/[id]/sites/[siteId]/page.tsx` —
  swap `<Field>` for `<EditableField>` + add `<ScheduleSelector>` for site
  + per-zone compact ScheduleSelector.

## Files NOT touched

- `app/(dashboard)/reporting/{pipeline,sites}/` — E12 and E14 territory.
- `app/(dashboard)/clients/page.tsx` (master CRUD) — out of scope.
- `components/reporting/CadenceSelector.tsx` — leave existing client cadence selector alone; the new ScheduleSelector is generic and can be used for clients later but not in this brief.

---

## Done definition

A reviewer can:

1. Visit `/reporting/clients/[some-id]`. Click any field in the Client
   panel → input appears, type → blur → "Saved" indicator → page refreshes
   with new value persisted.
2. Visit `/reporting/clients/[id]/sites/[siteId]`. Click any field in
   Site panel → same edit flow.
3. Site detail page: Schedule selector below Site fields. Change cadence
   → Save → persists to `sites.schedule_config`.
4. Each zone row: compact schedule selector inline. Change → Save →
   persists.
5. RLS errors surface inline with a clear message; the input reverts.
6. `npm run build` passes.

---

## Coordination notes — round 3

Parallel with E12 + E14. Shared file: `lib/reporting/queries.ts` —
**E15 does NOT touch this file** (no new queries needed; existing
`getClientDetailData` + `getSiteDetailData` already return the values
EditableField needs).

**`components/reporting/ReportingNav.tsx`** — E14's territory. Stay out.

If you find yourself wanting to touch any other file, **stop and surface it**.

---

## Open questions (resolve at implementation)

1. **Auth/RLS for UPDATE on `clients` and `sites`**. The user is
   authenticated via Supabase session. If RLS doesn't allow authed
   UPDATE, the action will fail. Run a quick test on the Vercel preview
   to confirm. If blocked, fall back to service-role (`lib/supabase/admin.ts`
   from E10b).
2. **Concurrency**. No locking — last-write-wins. Standalone has the
   same behaviour. Document in PR.
3. **Validation**. Trim, normalise empty → null. Don't enforce specific
   formats (email regex etc.) for v1 — match standalone's permissive
   approach.

---

## Workstream procedure

1. `git worktree add /Users/feelgood/Desktop/cc-dashboard-e15 -b feature/reporting-port-e15 main`
2. `cd /Users/feelgood/Desktop/cc-dashboard-e15`
3. `cp /Users/feelgood/Desktop/cc-dashboard/.env.local .`
4. `npm install`
5. Read brief + audit §2.1 + standalone `renderEditableField` /
   `renderScheduleWidget` source.
6. Implement files in order:
   - `EditableField.tsx`
   - `ScheduleSelector.tsx`
   - `clients/actions.ts` (extend)
   - `clients/[id]/sites/actions.ts` (new)
   - Wire into `clients/[id]/page.tsx`
   - Wire into `clients/[id]/sites/[siteId]/page.tsx`
7. `npm run build` — must pass.
8. Test edit flow locally with `npm run dev` if possible.
9. Commit + Co-Authored-By.
10. `git push -u origin feature/reporting-port-e15`
11. `gh pr create` with test-plan + the auth/RLS verification.
12. Report back.
