# Orchestrator prompt — Execute E12 (Pipeline Health page)

Copy the body below into a fresh Claude Code instance opened in
`/Users/feelgood/Desktop/cc-dashboard/`.

**Round-3 change:** uses `git worktree` to isolate from parallel sessions.

---

```markdown
# Parallel orchestrator brief — Execute E12 (Pipeline Health page)

## Big picture

`constance-conservation/cc-dashboard` is the master Next.js dashboard. We're mid-way through M03b — porting `FrostyFruit1/constance-reporting` into cc-dashboard at `/reporting/*`. Already shipped: E8, F1, E9, E10, E10b, E11, E13. Sub-nav is fully populated; only `/reporting/pipeline` is still a `ComingSoon` stub.

**Your job:** execute brief E12 — port the Pipeline Health page. After this lands, every linked sub-nav entry resolves to a real page.

## Worktree setup (round 3 standard)

To avoid the branch chaos that hit round 2, we now use `git worktree` so each parallel session has its own isolated working directory:

```
cd /Users/feelgood/Desktop/cc-dashboard
git checkout main && git pull
git worktree add /Users/feelgood/Desktop/cc-dashboard-e12 -b feature/reporting-port-e12 main
cd /Users/feelgood/Desktop/cc-dashboard-e12
cp /Users/feelgood/Desktop/cc-dashboard/.env.local .
npm install
```

Stay in `/Users/feelgood/Desktop/cc-dashboard-e12` for the rest of the session.

## Repo state

- SSH push via host alias `github-frostyfruit1` already configured.
- Repo-local git identity: `Peter Frost` / `peter.f@constanceconservation.com.au`.
- `gh` CLI authed as FrostyFruit1.

## The brief

`docs/executor_briefs/E12_pipeline_health_page.md` — read fully. Half-day estimate.

## Hard constraints

- **DO NOT touch** `components/reporting/ReportingNav.tsx` (E14's territory).
- **DO NOT modify** `app/(dashboard)/reporting/sites/` (E14 will create this).
- **DO NOT modify** `app/(dashboard)/reporting/clients/[id]/` files (E15).
- DO NOT modify global git config.
- DO NOT push to `main`. Open a PR.
- DO NOT run `gh pr merge`.

You ARE expected to modify:
- `app/(dashboard)/reporting/pipeline/page.tsx`
- `lib/reporting/queries.ts` (append `getPipelineHealthData`)
- `lib/reporting/types.ts` (append types)
- New `components/reporting/PipelineIssuesTable.tsx` + `SyncStateInfo.tsx`

## Coordination — parallel streams

E14 + E15 are running in parallel.
- Shared file: `lib/reporting/queries.ts` (append-only across all three).
- E14 owns `ReportingNav.tsx` updates this round; you stay out of it.
- E15 owns `clients/[id]/*` page edits; you stay out.

## Report-back format

```
✅/❌ E12 Pipeline Health page
Worktree: /Users/feelgood/Desktop/cc-dashboard-e12
PR: <url>
Build: ✅/❌ TypeScript + N routes generating
Files modified: <list>
Open questions / blockers: <bullets, or "none">
```

Then stop. Do not run `gh pr merge`.

## Procedure summary

1. Worktree setup commands above.
2. Read brief.
3. Implement: `types.ts` → `queries.ts` → components → `page.tsx`.
4. `npm run build` — must pass.
5. Commit + Co-Authored-By.
6. `git push -u origin feature/reporting-port-e12`
7. `gh pr create` with test-plan body.
8. Report back per format above.
```
