Create a new application module for the cc-dashboard. The app name is: $ARGUMENTS

Follow these steps exactly in order:

## 1. Derive naming conventions

From the app name:
- **slug**: lowercase, hyphenated (e.g. "Job Scheduling" → `job-scheduling`)
- **routeSegment**: same as slug (used in `app/(dashboard)/[routeSegment]/page.tsx`)
- **iconName**: lowercase, no hyphens (e.g. "job-scheduling" → `jobscheduling`, or shorten to a single word like `jobs`)
- **appId**: same as iconName (used as the key in the APPS array)
- **typePrefix**: PascalCase (e.g. "JobScheduling")

## 2. Add icon to `components/icons/Icon.tsx`

- Add the new iconName to the `IconName` union type
- Add a matching SVG path entry in the `paths` record — design an appropriate 24×24 icon for the app concept

## 3. Add type to `lib/types.ts`

- Add an exported type `${typePrefix}Item` (or appropriate name) with the fields that make sense for this app
- Base fields: `id: string`, `active: boolean`, plus domain-specific fields

## 4. Create Supabase migration

- File: `supabase/migrations/00N_${slug}_table.sql` (N = next sequential number after existing migrations)
- Include:
  - `CREATE TABLE IF NOT EXISTS ${slug}_items` (or appropriate table name)
  - Required columns: `id uuid DEFAULT gen_random_uuid() PRIMARY KEY`, `organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL`, domain-specific columns, `active boolean NOT NULL DEFAULT true`, `created_at timestamptz DEFAULT now()`, `updated_at timestamptz DEFAULT now()`
  - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
  - RLS policy: org members can manage their own data (check `organization_members` table)
  - Index on `organization_id`

## 5. Create app page `app/(dashboard)/[routeSegment]/page.tsx`

Build a full working page with Supabase integration following these patterns from the codebase:

- `'use client'` at top
- Import: `createClient` from `@/lib/supabase/client`, `Drawer`/`Field` from `@/components/dashboard/Drawer`, `Select` from `@/components/dashboard/Select`, `ConfirmDialog` from `@/components/dashboard/ConfirmDialog`, `Icon` from `@/components/icons/Icon`
- Local `rowToItem()` helper that maps snake_case DB columns to camelCase TS type
- `useCallback` + `useEffect` pattern to load data (fetch org id first, then query table scoped to `organization_id`)
- **Optimistic UI**: update local state immediately after Supabase insert/update/delete, no full reload
- **ItemDrawer**: handles both add (no item prop) and edit (item prop), inserts or updates via Supabase, includes delete with `ConfirmDialog` (danger variant)
- **ItemCard**: clickable card showing key fields, stock/status indicator if relevant
- **Page** (`export default function`):
  - `subpage` / `subpage-top` / `subpage-body` layout (matches other pages)
  - Back link → Dashboard, breadcrumb with live count in `sp-crumb`
  - Toolbar: "Add item" button, search input
  - Filter chips if categorical data exists
  - Grid: `repeat(auto-fill, minmax(280px, 1fr))`
  - Loading state, empty state
- Use `var(--ok)`, `var(--warn)`, `var(--danger)` for status colours
- Use `var(--font-mono)` for labels/meta, `var(--font-display)` for headings
- Use `var(--bg-sunken)`, `var(--bg-elev)`, `var(--line)`, `var(--ink-3)` for structure
- RLS means no org filter needed in the query if the user is authenticated, but always filter by `organization_id` anyway for explicitness

## 6. Add to dashboard APPS array in `app/(dashboard)/page.tsx`

Add a new entry to the `APPS` constant with `comingSoon: true`:
```ts
{ id: '${appId}', href: '/${routeSegment}', name: '${AppName}', icon: '${iconName}' as const, desc: '…one-line description…', comingSoon: true },
```

## 7. Commit to current branch

Stage and commit all changed files:
```
git add app/(dashboard)/${routeSegment}/page.tsx \
        app/(dashboard)/page.tsx \
        components/icons/Icon.tsx \
        lib/types.ts \
        supabase/migrations/00N_${slug}_table.sql
git commit -m "feat: add ${AppName} app module (Coming Soon)"
```

## 8. Create feature branch and remove Coming Soon

```bash
git checkout -b feat/${slug}
```

In `app/(dashboard)/page.tsx`, remove `comingSoon: true` from the new app's entry only. Leave all other apps unchanged.

```bash
git add app/(dashboard)/page.tsx
git commit -m "feat: enable ${AppName} app — remove Coming Soon"
git push -u origin feat/${slug}
git checkout feat/ui-tweaks   # or whichever branch you branched from
```

## 9. Push base branch

```bash
git push
```

## Done

Report back:
- Which files were created/modified
- The migration SQL (ask before running it)
- The feature branch name
- Any assumptions made about the data model
