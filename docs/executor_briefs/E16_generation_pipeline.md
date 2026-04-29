# E16 — Generation pipeline (full port + tests + Vercel Cron)

**Status:** Approved 2026-04-29 (Peter explicitly requested full port over CLI wrapper, with tests on incoming reports + analysis/processing)
**Brief written:** 2026-04-29
**Repo:** `constance-conservation/cc-dashboard`
**Branch:** `feature/reporting-port-e16` (off `main`)
**Predecessor:** E15 (merged `f7e03aa`); runs in parallel with E15b in round 4.
**Audit context:** `docs/audit/standalone_feature_inventory.md` §3.1 (generation pipeline), §3.2 (cadence-driven scheduling).
**Estimate:** ~2 days. Single PR. Optional intermediate draft PR after the port-and-action
milestone (see Workstream procedure step 11).

---

## Goal

Port the standalone's generation pipeline (`~/Desktop/constance-reporting/src/report/`
plus `src/bin/generate_report.ts`) into cc-dashboard as native code under
`lib/reporting/generation/`, expose it as Server Actions wired into the existing
`<GenerateReportButton>` component, port the existing vitest test suite, and add a
Vercel Cron route that walks `clients.report_frequency` and triggers generation for
clients due for a new report.

After this lands, "Generate report" actually generates a report from inside cc-dashboard,
and reports are produced on schedule without the standalone running.

This is a deliberate full port (not a wrapper around the standalone CLI) per Peter's
stated preference — wrappers prolong dual-deploy operation, hide bugs behind a process
boundary, and leave the standalone alive longer than necessary.

---

## Scope (in this brief)

- **Port `src/report/` from the standalone to `lib/reporting/generation/`**:
  - `aggregate.ts` (~630 LOC) — the core query + aggregation logic.
  - `hierarchy.ts`, `period.ts`, `zones.ts` — small support modules.
  - `narratives.ts` — Anthropic SDK calls for outline + observation prose.
  - `render_html.ts`, `render_docx.ts` — output renderers.
  - `index.ts` — top-level `generateReport(opts)` entrypoint.
  - `types.ts` — supporting types.
  - **Adjustments for Next.js / Vercel runtime** (see Architecture).
- **Port the vitest test suite** from `src/report/__tests__/` into
  `lib/reporting/generation/__tests__/`:
  - `aggregate.test.ts`, `hierarchy.test.ts`, `scope.test.ts`, `zones.test.ts`.
  - Add vitest as a devDependency and an `npm run test` script.
- **Add tests for the analysis/processing path Peter called out**:
  - End-to-end test: feed a known fixture (small set of inspections + zones), assert
    aggregate output shape (counts, hours, species rows, chemical rows).
  - Test for the upsert-vs-insert idempotency in the `client_reports` writeback.
  - Test for scope resolution (`client` / `site` / `zone`).
- **Server Actions** in `lib/reporting/generation/actions.ts`:
  - `generateClientReport(clientId, period?)`
  - `generateSiteReport(siteId, period?)`
  - `generateZoneReport(zoneId, period?)`
  Each returns `{ ok: true; clientReportId: string; htmlSize: number; docxBytes: number }`
  or `{ ok: false; error: string }`. Default period: previous calendar month for
  monthly cadence; the action infers cadence from the scope's owning client's
  `report_frequency`.
- **Refactor `components/reporting/GenerateReportButton.tsx`** from a `<Link>` to a
  client component that calls the Server Action, shows a "Generating…" state, and on
  success navigates to the new `/reporting/reports/[id]` (existing E10b page).
- **Vercel Cron route** at `app/api/cron/generate-reports/route.ts`:
  - Iterates clients with non-null `report_frequency`.
  - For each: if "due" (last `client_reports.generated_at` for that client + cadence
    interval has passed), enqueue generation. Otherwise skip.
  - Logs counts (considered, skipped, generated, failed).
  - Returns 200 with a JSON summary.
  - Bearer-token guarded via `CRON_SECRET` env var (Vercel Cron sets this header).
- **Vercel Cron config** in a new `vercel.json` (the repo doesn't currently have one):
  - Cron path: `/api/cron/generate-reports`.
  - Schedule: `0 6 * * 1` (Mondays 06:00 UTC) as a sensible default — covers weekly
    cadence and is harmless for less-frequent cadences (the route itself decides what's
    due, so the schedule just needs to be at least as frequent as the shortest cadence).
- **Document env vars** required for generation in a top-of-file comment in
  `lib/reporting/generation/index.ts`: `ANTHROPIC_API_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`.

## Out of scope

- Sync + webhook (E17 — different brief).
- Cutover of the APPS card href (E18 — different brief).
- Email delivery of generated reports.
- HTML sanitisation of `client_reports.html_content` (deferred per E10b PR caveat;
  separate out-of-band track).
- A new "Reports" UI for browsing generation history beyond what E10b/E10 already provide.
- Any changes to the report visual styling (renderers should be a faithful port).
- The `migrate_to_new_supabase.ts` and `retag_templates.ts` bin scripts (one-shot
  migration tools; not part of ongoing generation flow).
- Changes to E10b's preview/edit page (already shipped).
- Anything that re-architects the reporting hierarchy. The port is structural — same
  inputs, same outputs, new home.

---

## Architecture

### Module layout

```
lib/reporting/generation/
  index.ts          (top-level generateReport — entry from Server Actions)
  aggregate.ts      (core query + roll-up; the big one)
  hierarchy.ts      (scope walking — find leaf sites under a client/site/zone)
  period.ts         (month/week/range label resolution)
  zones.ts          (zone-letter extraction)
  narratives.ts     (Anthropic SDK call)
  render_html.ts    (HTML output)
  render_docx.ts    (DOCX output)
  types.ts          (ReportOptions, GeneratedReport, ReportData, NarrativeSections)
  scheduling.ts    NEW (cadence → next-due date logic; used by cron route)
  actions.ts       NEW ('use server' wrappers — generateClientReport etc.)
  __tests__/
    aggregate.test.ts
    hierarchy.test.ts
    scope.test.ts
    zones.test.ts
    scheduling.test.ts NEW
    upsert.test.ts NEW (idempotency on client_reports writeback)
```

### Adjustments required vs the standalone

The standalone is a CommonJS Node app that writes files to disk. cc-dashboard is a
Next.js 16 app on Vercel. Required changes during port:

1. **`'commonjs'` → ESM imports.** The standalone uses
   `import * as fs from 'fs'; import * as path from 'path'`. Next.js source is ESM
   under the hood; adjust import syntax. cc-dashboard's `tsconfig.json` already
   targets ESM-compatible output.

2. **Filesystem writes → Supabase Storage uploads.** `render_docx`'s output and the
   HTML payload are currently `fs.writeFileSync`'d into `dist/reports/` and then a
   relative path is stored in `client_reports.docx_url`. On Vercel, the function
   filesystem is read-only outside `/tmp`, and even `/tmp` is ephemeral. Replace
   the disk writes with **Supabase Storage uploads** — bucket name `reports` (create
   if it does not exist; the bucket creation can be a one-line guard in code or a
   manual setup step documented in the PR). `client_reports.docx_url` then stores
   the storage object path (or signed URL — choose one and stick with it; see open
   questions). HTML can be left as `client_reports.html_content` (already a column,
   already used by E10b's preview page).

3. **Database client.** The standalone uses
   `import { supabase } from '../db/supabase_client'` — a single service-role-key
   client. Replace with `createAdminClient()` from `lib/supabase/admin.ts` (already
   exists, used by E10b for uploads and by E15's RLS-fallback). The function
   signature `generateReport(opts, db?)` should be preserved so tests can pass in a
   mock or fixture client.

4. **`@anthropic-ai/sdk`.** Add to `package.json` dependencies. The narratives
   module uses `claude-sonnet-4-6` — keep that model id (matches the latest Sonnet
   per the platform knowledge update). Confirm `ANTHROPIC_API_KEY` is in
   `.env.local`; if not, document in the PR that Peter must add it before the
   action will succeed (the build itself does not need the key — only runtime
   invocation does).

5. **`docx`.** Add to `package.json` dependencies. Same version as standalone (`^9.6.1`)
   unless install yields a peer-dep conflict.

6. **`pg` is NOT needed.** The standalone has it as a dep but the report module
   itself goes through `@supabase/supabase-js` only. Skip `pg`.

7. **Logging.** Standalone has `src/shared/logger.ts`. Don't port — use plain
   `console.log` / `console.error` for cron route output. Vercel captures both.

8. **Test runner.** Add vitest + a minimal `vitest.config.ts`. Test fixtures should
   live in `lib/reporting/generation/__tests__/fixtures/` if any are needed. Tests
   should NOT hit the live Supabase — use `db` injection with a stub.

### Server Action surface

`lib/reporting/generation/actions.ts`:

```ts
'use server'

import { generateReport } from './index'
import { resolveCadenceForScope, defaultPeriodForCadence } from './scheduling'
// ...

export type GenerateResult =
  | { ok: true; clientReportId: string; htmlSize: number; docxBytes: number }
  | { ok: false; error: string }

export async function generateClientReport(
  clientId: string,
  period?: { start: string; end: string; cadence: 'weekly' | 'monthly' | 'quarterly' },
): Promise<GenerateResult> { ... }

export async function generateSiteReport(siteId: string, period?: ...): Promise<GenerateResult>
export async function generateZoneReport(zoneId: string, period?: ...): Promise<GenerateResult>
```

Each:
- Resolves cadence (from `period.cadence` if provided, else from owning client's
  `report_frequency`, default `monthly`).
- Computes `periodStart`/`periodEnd` if not provided (default: previous full month for
  monthly, previous full ISO week for weekly, previous quarter for quarterly).
- Calls `generateReport({ clientId|siteId|zoneId, periodStart, periodEnd, cadence,
  writeDb: true })`.
- Calls `revalidatePath('/reporting/reports')` and `/reporting/reports/[id]` for the
  new report.
- Returns the result.

### GenerateReportButton refactor

Convert from a `<Link>` to a client component:

```tsx
'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { generateClientReport, generateSiteReport, generateZoneReport } from '@/lib/reporting/generation/actions'

type Props = { scope: 'client' | 'site' | 'zone'; id: string; label?: string }

export function GenerateReportButton({ scope, id, label = 'Generate report' }: Props) {
  const [isPending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const action = scope === 'client' ? generateClientReport
              : scope === 'site' ? generateSiteReport
              : generateZoneReport
  const onClick = () => start(async () => {
    setError(null)
    const res = await action(id)
    if (res.ok) router.push(`/reporting/reports/${res.clientReportId}`)
    else setError(res.error)
  })
  // ...render button + Generating… state + inline error...
}
```

Keep visual styling as close to the existing `<Link>`-styled button as possible. No
new design language.

### Vercel Cron route

`app/api/cron/generate-reports/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateReport } from '@/lib/reporting/generation'
import { isClientDueForGeneration, defaultPeriodForCadence } from '@/lib/reporting/generation/scheduling'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // platform default; explicit for clarity

export async function GET(req: Request) {
  // Auth: Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  const db = createAdminClient()
  const summary = { considered: 0, generated: [] as string[], skipped: [] as string[], failed: [] as { id: string; error: string }[] }
  // ... walk clients with non-null report_frequency, decide what's due, generate ...
  return NextResponse.json({ ok: true, summary })
}
```

The cron route generates **whole-client reports only** — site/zone reports are
manual-trigger via the button. (Confirm with Peter at impl if zones should also be
auto-generated.)

`vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/generate-reports", "schedule": "0 6 * * 1" }
  ]
}
```

(Per platform knowledge update, `vercel.ts` is now the recommended config format —
acceptable to use either; pick `vercel.json` for minimal new deps unless you're
already adding `@vercel/config` for some other reason.)

### Scheduling logic

`lib/reporting/generation/scheduling.ts`:

```ts
export type Cadence = 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'annually'

// Map clients.report_frequency to cadence; some entries may need to fall back to monthly.
export function cadenceFromFrequency(freq: string | null): Cadence | null

// Decide if a client is due for a new report.
// Inputs: cadence, last `client_reports.generated_at` for this client (any scope), now.
export function isClientDueForGeneration(args: {
  cadence: Cadence
  lastGeneratedAt: string | null
  now: Date
}): boolean

// Compute the period (start/end) for a client's next report given cadence and now.
export function defaultPeriodForCadence(cadence: Cadence, now: Date): {
  periodStart: string  // YYYY-MM-DD
  periodEnd: string    // YYYY-MM-DD
}
```

Cover with `scheduling.test.ts` — table-driven tests for due/not-due edges
(cadence interval - 1s, exactly cadence interval, cadence interval + 1s).

---

## Reference: source material in `~/Desktop/constance-reporting/`

Authoritative source for the port. Read these in full before implementing.

- `src/report/index.ts` (146 lines) — top-level entrypoint; the upsert flow at the
  bottom (`upsertClientReport`) needs the most adjustment for the storage-vs-disk
  switch.
- `src/report/aggregate.ts` (630 lines) — the query + roll-up engine. Most of the
  port effort is here. Watch for inline `pg`-flavoured SQL or any direct DB
  calls beyond the supabase client.
- `src/report/narratives.ts` (186 lines) — Anthropic SDK call shape, prompts,
  fallback behaviour when `skipLLM` is set.
- `src/report/render_html.ts` (11 lines — thin) and `src/report/render_docx.ts`
  (235 lines) — output renderers. `docx` lib usage in render_docx is the part to
  port carefully.
- `src/report/period.ts` (130 lines) — period-label inference; reused by
  `lib/reporting/generation/scheduling.ts`.
- `src/report/types.ts` (191 lines) — type surface to port. Note: cc-dashboard
  already has its own `lib/reporting/types.ts` for query results; **do not merge**
  — keep generation types under `lib/reporting/generation/types.ts`.
- `src/bin/generate_report.ts` — the CLI surface. The arg-parsing is NOT ported;
  Server Actions replace it.
- `src/report/__tests__/*.test.ts` — port these directly with import-path adjustments.
- `src/db/supabase_client.ts` — replaced by `lib/supabase/admin.ts` in cc-dashboard.

---

## Schema dependencies

Already-existing tables (no migrations needed):
- `clients` — read `report_frequency`, `organization_id`, `name`, `long_name`,
  `contact_name`, `council_or_body`, `report_template_variant`, `location_maps`,
  `active_roster_staff_ids`.
- `sites` — read `client_id`, `parent_site_id`, `canonical_name`, `sc_label`, etc.
- `inspections` — primary input.
- `chemical_application_records`, `species_observations`, etc. — referenced by
  aggregate.ts. Confirm at port time which tables it touches and ensure they all
  exist in cc-dashboard's Supabase (the same project — should be a non-issue).
- `client_reports` — written by upsert flow. Already exists; E10b reads from it.

Storage bucket:
- `reports` — for DOCX output. Create on first generation if missing, or document
  manual creation in the PR.

Env vars required at runtime:
- `ANTHROPIC_API_KEY` — for narratives. If missing, route should still work with
  `skipLLM: true` placeholders (matches standalone behaviour).
- `SUPABASE_SERVICE_ROLE_KEY` + `NEXT_PUBLIC_SUPABASE_URL` — already used by E10b/E15.
- `CRON_SECRET` — new. Generate a strong random value, add to Vercel project env
  (preview + production). Document in PR.

---

## Files to CREATE

- `lib/reporting/generation/index.ts`
- `lib/reporting/generation/aggregate.ts`
- `lib/reporting/generation/hierarchy.ts`
- `lib/reporting/generation/period.ts`
- `lib/reporting/generation/zones.ts`
- `lib/reporting/generation/narratives.ts`
- `lib/reporting/generation/render_html.ts`
- `lib/reporting/generation/render_docx.ts`
- `lib/reporting/generation/types.ts`
- `lib/reporting/generation/scheduling.ts`
- `lib/reporting/generation/actions.ts`
- `lib/reporting/generation/__tests__/aggregate.test.ts`
- `lib/reporting/generation/__tests__/hierarchy.test.ts`
- `lib/reporting/generation/__tests__/scope.test.ts`
- `lib/reporting/generation/__tests__/zones.test.ts`
- `lib/reporting/generation/__tests__/scheduling.test.ts`
- `lib/reporting/generation/__tests__/upsert.test.ts`
- `app/api/cron/generate-reports/route.ts`
- `vercel.json`
- `vitest.config.ts`

## Files to MODIFY

- `package.json` — add `@anthropic-ai/sdk`, `docx` to dependencies; add `vitest` to
  devDependencies; add `"test": "vitest run"` to scripts.
- `components/reporting/GenerateReportButton.tsx` — convert from `<Link>` to client
  component calling the Server Action. Keep the same exported props shape so the
  page-level call sites do not change.

## Files NOT touched

- Anything under `app/(dashboard)/reporting/clients/` — E15b territory.
- `app/(dashboard)/reporting/clients/[id]/page.tsx`,
  `app/(dashboard)/reporting/clients/[id]/sites/[siteId]/page.tsx`,
  `app/(dashboard)/reporting/clients/page.tsx` — E15b modifies these to add
  Add/Delete buttons. The `<GenerateReportButton scope id />` callsites in these
  files stay as-is (E16's refactor preserves the exported signature).
- `app/(dashboard)/reporting/clients/actions.ts` and
  `app/(dashboard)/reporting/clients/[id]/sites/actions.ts` — E15b appends CRUD
  ops. E16's generation Server Actions live in `lib/reporting/generation/actions.ts`
  exclusively.
- `lib/reporting/queries.ts` — read-only for this brief; the generation module
  uses its own queries (ported from standalone) against the admin client, not
  cc-dashboard's user-session query layer.
- `lib/reporting/types.ts` — generation types live separately under
  `lib/reporting/generation/types.ts`.
- `app/(dashboard)/reporting/reports/` — E10/E10b territory; the generated report
  surfaces in the existing reports list and detail pages by virtue of the
  `client_reports` insert.
- `components/reporting/{CadenceSelector,ScheduleSelector,EditableField,...}.tsx`
  — leave existing components alone.

---

## Done definition

A reviewer can:

1. `npm install` succeeds with the new deps.
2. `npm run build` passes.
3. `npm run test` runs vitest, all ported + new tests pass (no live-DB hits — tests
   use the injected `db` parameter with stubs/fixtures).
4. On a Vercel preview deploy with `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY`
   set: visit `/reporting/clients/[id]/sites/[siteId]`, click "Generate report" on
   any zone, see the "Generating…" state, and on success land on
   `/reporting/reports/[newClientReportId]` (the existing E10b preview page) with
   the freshly-generated HTML rendered. A `client_reports` row exists with
   `docx_url` pointing into the `reports` storage bucket; the DOCX is downloadable.
5. Invoke `/api/cron/generate-reports` manually with `Authorization: Bearer
   <CRON_SECRET>` (curl from Peter's machine, or Vercel cron dashboard "Run now").
   Response is 200 JSON with a summary of considered/generated/skipped/failed counts.
6. The Vercel project's Crons dashboard shows the cron job registered, schedule
   `0 6 * * 1`, route `/api/cron/generate-reports`.
7. A run with `ANTHROPIC_API_KEY` unset still generates a report with placeholder
   narratives (matches standalone `skipLLM` behaviour); no crash.
8. The HTML rendered for a generated report matches the standalone's HTML output
   for the same scope + period (visual diff acceptable; structural parity required
   — same sections, same data values).

---

## Coordination notes — round 4

E15b is running in parallel.

**Shared file risk:**
- E15b owns `app/(dashboard)/reporting/clients/actions.ts` and
  `app/(dashboard)/reporting/clients/[id]/sites/actions.ts` (CRUD appends).
- E16 places its Server Actions in a NEW file `lib/reporting/generation/actions.ts`
  — different path. Zero overlap.
- E15b modifies the same three `page.tsx` files that import `<GenerateReportButton>`.
  E16 refactors `<GenerateReportButton>` internally but keeps the exported props
  identical, so page.tsx files do not need any E16 edit. Zero overlap.
- `package.json`: E15b adds NO deps. E16 owns this file's edit.
- `lib/reporting/queries.ts`: append-only pattern is well-known but **E16 should not
  need to touch it** (generation reads come from ported standalone code under
  `lib/reporting/generation/`). If a query is needed for the cron route's "find due
  clients" step, prefer adding it inline in the route or in
  `lib/reporting/generation/scheduling.ts` rather than appending to the shared queries
  file.

**Stay out of:**
- `app/(dashboard)/reporting/clients/actions.ts` and
  `app/(dashboard)/reporting/clients/[id]/sites/actions.ts` — E15b's territory.
- `app/(dashboard)/reporting/clients/page.tsx`,
  `app/(dashboard)/reporting/clients/[id]/page.tsx`,
  `app/(dashboard)/reporting/clients/[id]/sites/[siteId]/page.tsx` — E15b modifies.
  Confirm at end-of-brief that these still build with E16's `<GenerateReportButton>`
  refactor (props unchanged, so they should).
- All Add/Delete components E15b creates.

If you find yourself wanting to touch any other shared file, **stop and surface it**.

---

## Open questions (resolve at implementation; document in PR)

1. **Storage bucket: signed URL vs object path in `client_reports.docx_url`**.
   Standalone wrote a relative filesystem path. Pick: (a) store the storage object
   path (e.g. `reports/<filename>.docx`) and let consumers generate signed URLs
   on demand, or (b) store a long-lived signed URL. Option (a) is more flexible;
   option (b) is what the standalone effectively had (a stable retrievable
   pointer). Recommend (a). Confirm E10b's preview page does not rely on a specific
   shape — if it does, match that shape.

2. **Cron schedule**. `0 6 * * 1` (Mondays 06:00 UTC) covers weekly cadence. If
   Peter wants daily checks (so monthly clients fire on the right day-of-month
   without waiting until the next Monday), switch to `0 6 * * *`. The route is
   idempotent (skips when not due), so daily-with-skip is safe. **Pick daily by
   default unless cost is a concern** — generation only runs when due, so daily
   adds at most 7 cron invocations per week with all skips.

3. **Zone-scope auto-generation**. The cron currently only generates whole-client
   reports. Should it also walk zones with their own `schedule_config` set (E15
   added per-zone schedules)? Default: NO for v1 — manual trigger only. Confirm.

4. **`ANTHROPIC_API_KEY` not set**: route returns success with placeholder
   narratives (matches standalone). If Peter prefers a hard error in production,
   gate on `process.env.NODE_ENV === 'production'`.

5. **Bucket auto-create**. If the `reports` bucket doesn't exist on first
   generation, fail with a clear error and document the manual creation step in
   the PR. (Alternative: `createBucket` on first-run; adds a couple of lines but
   removes a setup gotcha.)

6. **Test fixtures size**. The standalone tests likely use small inline fixtures.
   Don't add large fixture files — keep tests under a few KB each.

---

## Workstream procedure

1. `cd /Users/feelgood/Desktop/cc-dashboard && git checkout main && git pull`
2. `git worktree add /Users/feelgood/Desktop/cc-dashboard-e16 -b feature/reporting-port-e16 main`
3. `cd /Users/feelgood/Desktop/cc-dashboard-e16`
4. `cp /Users/feelgood/Desktop/cc-dashboard/.env.local .`
5. `npm install`
6. Read brief + standalone source under `~/Desktop/constance-reporting/src/report/`
   and `src/bin/generate_report.ts` in full.
7. `npm install --save @anthropic-ai/sdk docx` and
   `npm install --save-dev vitest`. Commit a passing minimal `vitest.config.ts`
   first so the test infra is in place before porting tests.
8. Port files in this order:
   - `types.ts` (least dependent)
   - `period.ts`, `zones.ts`, `hierarchy.ts` (small, pure)
   - `aggregate.ts` (the big one)
   - `render_html.ts`, `render_docx.ts`
   - `narratives.ts`
   - `index.ts` (with the storage-write replacing the disk-write)
   - `scheduling.ts` (new)
   - `actions.ts` (new — Server Actions)
9. Port tests; add `scheduling.test.ts` and `upsert.test.ts`.
10. `npm run build` and `npm run test` — both must pass.
11. **Optional intermediate draft PR**: at this point the generation pipeline +
    Server Actions exist and are testable. If you want intermediate review (or
    to surface a question early), open a draft PR titled
    `feat(reporting): generation pipeline port (E16, draft)` with the cron route
    still TODO. Otherwise continue.
12. Implement the cron route + `vercel.json`.
13. Refactor `GenerateReportButton.tsx`.
14. `npm run build` again. Manual test via `npm run dev` if possible
    (browser-driven; click "Generate" on a zone). Headless? Skip and report.
15. Commit + Co-Authored-By.
16. `git push -u origin feature/reporting-port-e16`
17. `gh pr create` with test-plan including:
    - which env vars must be set on the Vercel preview before the action will succeed,
    - the storage-bucket setup step (manual or automated),
    - which open questions you resolved and why.
18. Report back per session prompt format.
