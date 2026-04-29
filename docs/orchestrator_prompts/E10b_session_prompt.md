# Orchestrator prompt — Execute E10b (edit mode + image uploads)

Copy the body below into a fresh Claude Code instance opened in
`/Users/feelgood/Desktop/cc-dashboard/`.

---

```markdown
# Parallel orchestrator brief — Execute E10b (Report preview + edit mode + image uploads)

## Big picture

`constance-conservation/cc-dashboard` is the master internal Next.js dashboard
for the Constance Conservation team. We are mid-way through a multi-brief
milestone (M03b) that ports a standalone reporting app
(`FrostyFruit1/constance-reporting`) into cc-dashboard as native
`/reporting/*` routes, then archives the standalone.

**Already shipped:**
- E8 — `/reporting` landing page + scaffold
- F1 — left sub-nav for `/reporting/*`
- E9 — Clients/Sites/Zones drill-down + cadence selector
- E10 — Reports list + read-only viewer (current state — you are extending this)

**Your job:** execute brief E10b — bring the standalone's full report
preview + edit experience into cc-dashboard. **Largest single feature
in M03b.** Plan a full day.

## Repo state

- cwd: `/Users/feelgood/Desktop/cc-dashboard`
- Start from `main` (already up-to-date locally)
- SSH push access already configured via host alias `github-frostyfruit1`
  (FrostyFruit1 GitHub user has access to the constance-conservation org)
- Repo-local git identity already set: `Peter Frost` /
  `peter.f@constanceconservation.com.au`
- `npm install` already run; `.env.local` already populated; build passes
- `gh` CLI already authed as FrostyFruit1
- **Service-role key** is in `.env.local` as `SUPABASE_SERVICE_ROLE_KEY`
  (required for Storage uploads — `report_assets` bucket allows
  service-role write per RLS).

## The brief to execute

```
docs/executor_briefs/E10b_edit_mode_image_uploads.md
```

Read the brief in full before coding. It includes:
- Goal + scope (in-scope features + explicitly out-of-scope)
- Architecture (route shape, edit toggle, drop-zone overlay,
  Server Action signatures for `uploadReportImage` + `saveReportEdits`)
- Reference: line ranges in the standalone's `dashboard-preview.html` —
  read `applyEditModeToIframe` (lines 1496-1565) and `saveReportEdits`
  (lines 1665-1710) carefully.
- Schema dependencies + Storage bucket / RLS verification SQL
- Files to CREATE / MODIFY / NOT touch
- Done definition (10 verifiable items)
- Risk + caveats (cross-origin iframe, server action file uploads,
  service-role key, HTML sanitisation)

Also read:
- `docs/audit/standalone_feature_inventory.md` §1.4 (reports page) + §2.4
  (image upload infrastructure)
- `~/Desktop/constance-reporting/docs/executor_briefs/E5_image_uploads.md`
  (the original brief that built this in the standalone)

Estimated effort: full day.

## Hard constraints

- **DO NOT touch** `components/reporting/ReportingNav.tsx`. E13 owns
  the un-greying changes.
- **DO NOT modify** `app/(dashboard)/reporting/inspections/` — E11.
- **DO NOT modify** `app/(dashboard)/reporting/{staff,chemicals,species}/` — E13.
- **DO NOT modify** `app/globals.css` — E13 owns the card-grid styles.
- **DO NOT modify global git config.**
- **DO NOT** push to `main` directly. Open a PR.
- **DO NOT** run `gh pr merge`. The orchestrator performs merges.

You ARE expected to modify:
- `app/(dashboard)/reporting/reports/[id]/` (new directory: `page.tsx`,
  `ReportEditor.tsx`, `actions.ts`)
- `lib/supabase/admin.ts` (new — service-role server client)
- `lib/reporting/queries.ts` (append `getReportDetail`)
- `lib/reporting/types.ts` (append types)
- `components/reporting/ReportRow.tsx` (small change: wrap title in
  `<Link href={`/reporting/reports/${id}`}>`)

## Coordination notes — parallel streams

Two other parallel sessions are running:

- **E11** — Inspections page. Touches
  `app/(dashboard)/reporting/inspections/`,
  `components/reporting/InspectionsTable.tsx`,
  `lib/reporting/queries.ts` (append).
- **E13** — Operations 3 pages + sub-nav un-grey. Touches
  `app/(dashboard)/reporting/{staff,chemicals,species}/`,
  `components/reporting/ReportingNav.tsx`, `app/globals.css`,
  `lib/reporting/queries.ts` (append).

**Shared files:**
- `lib/reporting/queries.ts` — append-only across all three streams.
- **`components/reporting/ReportRow.tsx`** — only YOU touch this. Tiny
  change (wrap title in Link).

If you find yourself wanting to modify a file outside this brief's
allowed list, **stop and surface it to the user** before pushing.

## Report-back format

When you've pushed the PR, report to the user (the orchestrator):

```
✅/❌ E10b Edit mode + image uploads

PR:    <url>
Build: ✅/❌ TypeScript + N routes generating

Verifications:
  - Service-role key in env: ✅/❌
  - Storage bucket policies confirmed: ✅/❌
  - Iframe srcDoc + contentEditable works: ✅/❌
  - Drop-zone uploads succeed: ✅/❌
  - Save patches client_reports + clients correctly: ✅/❌

Files modified:
  - <list>

Files NOT touched (per coordination):
  - components/reporting/ReportingNav.tsx
  - app/globals.css
  - app/(dashboard)/reporting/{inspections,staff,chemicals,species}/

Open questions / blockers: <bullets, or "none">
```

Then stop. Do not start anything else. Do not run `gh pr merge`.

## Special note on testing this one

This brief is interactive — drag-drop, edit mode toggle, save round-trip.
You CANNOT fully verify without a browser. Do what you can:

1. `npm run build` proves TypeScript + compile.
2. `npm run dev` and manually exercise the page if you can — drop a
   PNG, click Save, refresh, confirm persistence.
3. If you can't manually verify (headless), say so explicitly in your
   report-back. The orchestrator + Peter will do the manual verify on
   the Vercel preview before merge.

## Procedure summary

1. `git checkout main && git pull`
2. `git checkout -b feature/reporting-port-e10b`
3. Read the brief + the audit doc §1.4 + §2.4 + the standalone E5 brief.
4. Verify Storage bucket policies via SQL (the brief gives the queries).
5. Implement files in order:
   - `lib/supabase/admin.ts` (service-role helper)
   - `app/(dashboard)/reporting/reports/[id]/actions.ts` (Server Actions)
   - `lib/reporting/queries.ts` + `types.ts` additions
   - `app/(dashboard)/reporting/reports/[id]/page.tsx` (Server Component shell)
   - `app/(dashboard)/reporting/reports/[id]/ReportEditor.tsx` (Client Component)
   - `components/reporting/ReportRow.tsx` (small Link wrap)
6. `npm run build` — must pass.
7. Commit with a clear message + Co-Authored-By Claude.
8. `git push -u origin feature/reporting-port-e10b`
9. `gh pr create` with a body that:
   - Lists the 10 done-definition items as checkboxes
   - Calls out which were verified locally vs need browser verify
   - Notes the HTML sanitisation caveat from the brief's Risk section
10. Report back per the format above.
```
