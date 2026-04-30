# Orchestrator prompt — Execute E18 (Cutover, final M03b brief)

Copy the body below into a fresh Claude Code instance opened in
`/Users/feelgood/Desktop/cc-dashboard/`.

**Round-6 standard:** uses `git worktree`. No parallel session this round —
E18 is the sole brief. Estimate is ~5 min for the executor's code portion;
the bulk of E18 is admin runbook steps Peter executes himself outside this
session.

> **Alternative:** Because the code change is a single-line href flip, the
> orchestrator can execute it directly from its own session (no worktree)
> rather than spinning up a parallel executor. If that's the chosen path,
> skip this prompt entirely.

---

```markdown
# Parallel orchestrator brief — Execute E18 (Cutover)

## Big picture

`constance-conservation/cc-dashboard` is the master Next.js dashboard. We're at the FINAL round of M03b — the standalone reporting app at `FrostyFruit1/constance-reporting` (deployed at `constance-reporting.vercel.app`) is being retired. All of its functionality has been ported into cc-dashboard at `/reporting/*` over rounds 1–5. E18 is the cutover.

**Your job:** execute brief E18 — flip ONE line of code (the home-page APPS card href from the standalone URL to `/reporting`). The brief also documents admin steps Peter must execute himself (Vercel env vars, SC webhook re-registration, standalone retirement, GitHub repo archival); those are NOT your responsibility — Peter does them after the code lands.

**Estimate: ~5 minutes for the code portion.** Single-line change. Single PR.

## Worktree setup (round 6 standard)

```
cd /Users/feelgood/Desktop/cc-dashboard
git checkout main && git pull
git worktree add /Users/feelgood/Desktop/cc-dashboard-e18 -b feature/reporting-port-e18 main
cd /Users/feelgood/Desktop/cc-dashboard-e18
npm install
```

(`.env.local` copy not strictly required for this brief — there's no env-dependent behaviour to test — but harmless to include.)

Stay in `/Users/feelgood/Desktop/cc-dashboard-e18` for the rest of the session.

## Repo state

- SSH + identity + `gh` CLI all configured.
- Working tree on `main` at the latest commit (post-E17 merge).

## The brief

`docs/executor_briefs/E18_cutover.md` — read fully. The brief is a runbook with code AND admin operations clearly separated. Your responsibility is ONLY the `[code]` portion.

## Hard constraints

- **DO NOT modify** anything other than `app/(dashboard)/page.tsx` line 13.
- **DO NOT** rename "Staff Reporting" or change its description — UX choice outside cutover scope.
- **DO NOT** attempt to execute the `[Peter]` runbook steps (Vercel env, SC webhook re-registration, standalone retirement, GitHub archival). You don't have credentials and shouldn't try.
- **DO NOT** modify any documentation that references `https://constance-reporting.vercel.app/` (those references describe historical context).
- DO NOT modify global git config.
- DO NOT push to `main`. Open a PR.
- DO NOT run `gh pr merge`.

You ARE expected to:
- Edit exactly one line in `app/(dashboard)/page.tsx` (line 13).

## Out of scope

- All of the `[Peter]` runbook steps in the brief.
- Schema migrations, refactors, cleanups, code-style fixes, anything else. Cutover is intentionally minimal.

## Coordination — no parallel streams this round

E18 is the sole brief in round 6. Last brief in M03b.

## Special note on testing

`npm run build` must pass. That's the only test surface — there's nothing functional to test in a 1-line href change beyond confirming the build doesn't break.

## Report-back format

```
✅/❌ E18 Cutover (code portion)
Worktree: /Users/feelgood/Desktop/cc-dashboard-e18
PR: <url>
Build: ✅/❌ TypeScript clean, N routes generating
Verifications:
  - app/(dashboard)/page.tsx line 13 href changed from 'https://constance-reporting.vercel.app/' to '/reporting': ✅/❌
  - No other files modified: ✅/❌
Files modified:
  - app/(dashboard)/page.tsx (1 line)
Files NOT touched (per coordination):
  - everything else
Open questions / blockers: <bullets, or "none">
Reminder for Peter: the [Peter] runbook steps in docs/executor_briefs/E18_cutover.md still need to be executed after this PR merges.
```

Then stop. Do not run `gh pr merge`.

## Procedure summary

1. Worktree setup commands above.
2. Read brief. Note which `[Peter]` steps are non-yours.
3. Edit `app/(dashboard)/page.tsx` line 13 — change href value to `/reporting`.
4. `npm run build` — must pass.
5. Commit with subject `feat(reporting): cutover APPS card to /reporting (E18)` + Co-Authored-By Claude line.
6. `git push -u origin feature/reporting-port-e18`
7. `gh pr create` with body listing the `[Peter]` admin steps from the brief that still need executing post-merge.
8. Report back per format above.
```
