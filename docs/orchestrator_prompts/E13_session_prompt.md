# Orchestrator prompt — Execute E13 (Operations: Staff, Chemicals, Species)

Copy the body below into a fresh Claude Code instance opened in
`/Users/feelgood/Desktop/cc-dashboard/`.

---

```markdown
# Parallel orchestrator brief — Execute E13 (Operations 3 pages)

## Big picture

`constance-conservation/cc-dashboard` is the master internal Next.js dashboard
for the Constance Conservation team. We are mid-way through a multi-brief
milestone (M03b) that ports a standalone reporting app
(`FrostyFruit1/constance-reporting`) into cc-dashboard as native
`/reporting/*` routes, then archives the standalone.

**Already shipped:**
- E8 — `/reporting` landing page + scaffold
- F1 — left sub-nav for `/reporting/*` (3 Operations placeholders are
  greyed out — your job is to un-grey them)
- E9 — Clients/Sites/Zones drill-down + cadence selector
- E10 — Reports list + read-only viewer

**Your job:** execute brief E13 — port the three Operations pages
(Staff & Hours, Chemicals, Species) and un-grey them in the sub-nav.

## Repo state

- cwd: `/Users/feelgood/Desktop/cc-dashboard`
- Start from `main` (already up-to-date locally)
- SSH push access already configured via host alias `github-frostyfruit1`
  (FrostyFruit1 GitHub user has access to the constance-conservation org)
- Repo-local git identity already set: `Peter Frost` /
  `peter.f@constanceconservation.com.au`
- `npm install` already run; `.env.local` already populated; build passes
- `gh` CLI already authed as FrostyFruit1

## The brief to execute

```
docs/executor_briefs/E13_operations_pages.md
```

**CRITICAL:** the brief is procedural; it points you at the **source of
truth** for the spec, which is:

```
docs/audit/operations_data_wiring.md
```

This audit doc has full per-page UI inventory, data sources, schema
deps, code refs, and port notes for all three pages. **Read it cover
to cover before coding.**

Estimated effort: full day (~6-8 hours).

## Hard constraints

- **DO NOT modify** `app/(dashboard)/reporting/reports/` — that's E10b's
  territory.
- **DO NOT modify** `app/(dashboard)/reporting/inspections/` — that's
  E11's territory.
- **DO NOT modify** `components/reporting/ReportRow.tsx` — that's E10b.
- **DO NOT modify global git config.**
- **DO NOT push to `main` directly.** Open a PR.
- **DO NOT run `gh pr merge`.** The orchestrator performs merges.

You ARE expected to modify:
- `app/(dashboard)/reporting/{staff,chemicals,species}/page.tsx` (create new)
- `lib/reporting/queries.ts` (append 3 new query functions)
- `lib/reporting/types.ts` (append types)
- `app/globals.css` (add card styles per audit doc recommendation)
- `components/reporting/ReportingNav.tsx` (un-grey the 3 Operations rows
  AS THE LAST CHANGE before push)

## Coordination notes — parallel streams

Two other parallel sessions are running:

- **E10b** — edit mode + image uploads on the Reports page. Touches
  `app/(dashboard)/reporting/reports/`, `lib/supabase/admin.ts`,
  `components/reporting/ReportRow.tsx`, `lib/reporting/queries.ts` (append).
- **E11** — Inspections page. Touches
  `app/(dashboard)/reporting/inspections/`,
  `components/reporting/InspectionsTable.tsx`,
  `lib/reporting/queries.ts` (append).

**Shared files:**
- `lib/reporting/queries.ts` — append-only across all three streams.
- **`components/reporting/ReportingNav.tsx`** — only YOU touch this.
  Other streams stay out of it.
- `app/globals.css` — only YOU touch this.

Last merger (likely you, since this brief is largest) handles textual
conflicts in `queries.ts`. The orchestrator will help if needed.

## Report-back format

When you've pushed the PR, report to the user (the orchestrator):

```
✅/❌ E13 Operations 3 pages

PR:    <url>
Build: ✅/❌ TypeScript + N routes generating

Per-page status:
  Staff:     ✅/❌  KPI numbers parity with standalone
  Chemicals: ✅/❌  KPI numbers parity with standalone
  Species:   ✅/❌  KPI numbers parity with standalone

Sub-nav: ✅/❌ all 3 Operations rows un-greyed and active-state working

Files modified:
  - <list>

Open questions / blockers: <bullets, or "none">
```

Then stop. Do not start anything else. Do not run `gh pr merge`.

## Procedure summary

1. `git checkout main && git pull`
2. `git checkout -b feature/reporting-port-e13`
3. Read `docs/audit/operations_data_wiring.md` cover to cover.
4. Read `docs/executor_briefs/E13_operations_pages.md`.
5. Follow the implementation order in the audit doc §Proposed brief structure:
   - Scaffold 3 routes
   - Add 3 query functions + types
   - Implement Staff page
   - Implement Chemicals page (introduce card-grid CSS)
   - Implement Species page
   - **LAST** — un-grey the 3 Operations rows in ReportingNav.tsx
   - Visual verify each page against live standalone
6. `npm run build` — must pass.
7. Commit with a clear message + Co-Authored-By Claude.
8. `git push -u origin feature/reporting-port-e13`
9. `gh pr create` with a body that includes a test-plan checklist for
   each of the 3 pages + the un-grey verification.
10. Report back per the format above.
```
