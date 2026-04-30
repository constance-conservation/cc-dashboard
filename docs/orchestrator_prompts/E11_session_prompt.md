# Orchestrator prompt — Execute E11 (Inspections page)

Copy the body below into a fresh Claude Code instance opened in
`/Users/feelgood/Desktop/cc-dashboard/`.

---

```markdown
# Parallel orchestrator brief — Execute E11 (Inspections page)

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
- E10 — Reports list + read-only viewer

**Your job:** execute brief E11 — port the Inspections page. Smallest
of the active parallel briefs.

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
docs/executor_briefs/E11_inspections_page.md
```

Read the brief in full before coding. It includes:
- Goal + scope
- Architecture (one Server Component + one query function + one table component)
- Reference: line ranges in the standalone's `dashboard-preview.html`
- Schema dependencies (tables already exist on live Supabase — no migrations)
- KPI definitions
- Table column spec
- Files to CREATE / MODIFY / NOT touch
- Done definition
- Workstream procedure (numbered steps)

Estimated effort: half-day (~3-4 hours).

## Hard constraints

- **DO NOT touch** `components/reporting/ReportingNav.tsx`. The
  Inspections nav entry already links correctly. Un-greying changes
  for OTHER nav items are coordinated separately.
- **DO NOT touch** `components/reporting/ReportRow.tsx`. That belongs
  to a parallel stream (E10b).
- **DO NOT modify global git config.**
- **DO NOT** push to `main` directly. Open a PR.
- **DO NOT** run `gh pr merge`. The orchestrator performs merges.
- **DO NOT** modify any file outside the brief's allowed list. If you
  find yourself wanting to, stop and report it to me at the end.

## Coordination notes — parallel streams

Two other parallel sessions are running:

- **E10b** — edit mode + image uploads on the Reports page. Touches
  `app/(dashboard)/reporting/reports/`, `lib/supabase/admin.ts`,
  `components/reporting/ReportRow.tsx`, `lib/reporting/queries.ts` (append).
- **E13** — Operations 3 pages. Touches
  `app/(dashboard)/reporting/{staff,chemicals,species}/`,
  `components/reporting/ReportingNav.tsx`, `app/globals.css`,
  `lib/reporting/queries.ts` (append).

**Your only shared file is `lib/reporting/queries.ts`** — append-only.
If you push and the merge has conflicts there, the orchestrator will
resolve them.

## Report-back format

When you've pushed the PR, report to the user (the orchestrator):

```
✅/❌ E11 Inspections page

PR:    <url>
Build: ✅/❌ TypeScript + N routes generating
Files modified:
  - <list>

Files NOT touched (per coordination):
  - components/reporting/ReportingNav.tsx
  - components/reporting/ReportRow.tsx

Open questions / blockers: <bullets, or "none">
```

Then stop. Do not start anything else. Do not run `gh pr merge`.

## Procedure summary

1. `git checkout main && git pull`
2. `git checkout -b feature/reporting-port-e11`
3. Read `docs/executor_briefs/E11_inspections_page.md` fully.
4. Implement: `types.ts` → `queries.ts` → `InspectionsTable` → `page.tsx`.
5. `npm run build` — must pass.
6. Commit with a clear message + Co-Authored-By Claude.
7. `git push -u origin feature/reporting-port-e11`
8. `gh pr create` with a body that includes a test-plan checklist.
9. Report back per the format above.
```
