# Orchestrator prompt — Execute E14 (Global Sites view)

Copy the body below into a fresh Claude Code instance opened in
`/Users/feelgood/Desktop/cc-dashboard/`.

**Round-3 change:** uses `git worktree` to isolate from parallel sessions.

---

```markdown
# Parallel orchestrator brief — Execute E14 (Global Sites view)

## Big picture

`constance-conservation/cc-dashboard` is the master Next.js dashboard. We're mid-way through M03b — porting `FrostyFruit1/constance-reporting` into cc-dashboard at `/reporting/*`. Already shipped: E8, F1, E9, E10, E10b, E11, E13.

**Your job:** execute brief E14 — add a new top-level `/reporting/sites` route mirroring the standalone's `page-sites` (cross-client global sites view). Add a new "Sites" entry to the reporting sub-nav under the Overview heading. This is the ONLY standalone page that wasn't in M03b's original plan.

## Worktree setup (round 3 standard)

```
cd /Users/feelgood/Desktop/cc-dashboard
git checkout main && git pull
git worktree add /Users/feelgood/Desktop/cc-dashboard-e14 -b feature/reporting-port-e14 main
cd /Users/feelgood/Desktop/cc-dashboard-e14
cp /Users/feelgood/Desktop/cc-dashboard/.env.local .
npm install
```

Stay in `/Users/feelgood/Desktop/cc-dashboard-e14` for the rest of the session.

## Repo state

- SSH + identity + `gh` CLI all configured.

## The brief

`docs/executor_briefs/E14_global_sites_view.md` — read fully. Half-day estimate.

## Hard constraints

- **DO NOT modify** `app/(dashboard)/reporting/pipeline/` (E12).
- **DO NOT modify** `app/(dashboard)/reporting/clients/[id]/` files (E15).
- DO NOT modify global git config.
- DO NOT push to `main`. Open a PR.
- DO NOT run `gh pr merge`.

You ARE expected to modify:
- New `app/(dashboard)/reporting/sites/page.tsx` (NOT to be confused with `/reporting/clients/[id]/sites/[siteId]` — that's the per-client one)
- New `components/reporting/SiteCard.tsx`
- `lib/reporting/queries.ts` (append `getSitesGlobalData`)
- `lib/reporting/types.ts` (append types)
- **`components/reporting/ReportingNav.tsx`** — add new "Sites" entry under Overview (you exclusively own this file in round 3)

## Coordination — parallel streams

E12 + E15 are running in parallel.
- Shared file: `lib/reporting/queries.ts` (append-only across all three).
- **`ReportingNav.tsx` is yours alone** in round 3 — E12 + E15 stay out.

## Report-back format

```
✅/❌ E14 Global Sites view
Worktree: /Users/feelgood/Desktop/cc-dashboard-e14
PR: <url>
Build: ✅/❌ TypeScript + N routes generating
Sub-nav verification: ✅/❌ "Sites" appears under Overview, between Inspections and Clients
Files modified: <list>
Open questions / blockers: <bullets, or "none">
```

Then stop. Do not run `gh pr merge`.

## Procedure summary

1. Worktree setup commands above.
2. Read brief + audit §1.2.
3. Implement: `types.ts` → `queries.ts` → `SiteCard` → `page.tsx` → ReportingNav update.
4. `npm run build` — must pass.
5. Commit + Co-Authored-By.
6. `git push -u origin feature/reporting-port-e14`
7. `gh pr create` with test-plan body.
8. Report back per format above.
```
