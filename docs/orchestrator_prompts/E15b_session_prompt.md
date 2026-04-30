# Orchestrator prompt — Execute E15b (Add/delete sites + zones + new client)

Copy the body below into a fresh Claude Code instance opened in
`/Users/feelgood/Desktop/cc-dashboard/`.

**Round-4 standard:** uses `git worktree` to isolate from the parallel E16 session.

---

```markdown
# Parallel orchestrator brief — Execute E15b (Add/delete sites + zones + new client)

## Big picture

`constance-conservation/cc-dashboard` is the master Next.js dashboard. We're in round 4 of M03b — porting `FrostyFruit1/constance-reporting` into cc-dashboard at `/reporting/*`. Already shipped: E8, F1, E9, E10, E10b, E11, E13, E15, E12, E14. M03b is at "fully viewable + fully editable" state. Remaining: E15b (this brief), E16, E17, E18.

**Your job:** execute brief E15b — finish the CRUD surface that E15 deferred. Add new client / new site / new zone, and delete site / delete zone (gated on no children / no inspections). Wire into existing `/reporting/clients` pages with the same RLS-fallback pattern E15 already uses.

## Worktree setup (round 4 standard)

```
cd /Users/feelgood/Desktop/cc-dashboard
git checkout main && git pull
git worktree add /Users/feelgood/Desktop/cc-dashboard-e15b -b feature/reporting-port-e15b main
cd /Users/feelgood/Desktop/cc-dashboard-e15b
cp /Users/feelgood/Desktop/cc-dashboard/.env.local .
npm install
```

Stay in `/Users/feelgood/Desktop/cc-dashboard-e15b` for the rest of the session.

## Repo state

- SSH + identity + `gh` CLI all configured.
- `.env.local` includes `SUPABASE_SERVICE_ROLE_KEY` from earlier rounds.
- Working tree on `main` at commit `aa9d5a8` (or later).

## The brief

`docs/executor_briefs/E15b_add_delete_sites_zones.md` — read fully. ½-day estimate.

## Hard constraints

- **DO NOT modify** `lib/reporting/generation/` (E16 territory; doesn't exist yet at branch cut — don't create it).
- **DO NOT modify** `app/api/cron/` (E16).
- **DO NOT modify** `vercel.json` or `vercel.ts` (E16).
- **DO NOT modify** `package.json` (E16 owns dep additions this round; you should not need any new deps).
- **DO NOT modify** `components/reporting/GenerateReportButton.tsx` (E16 refactors it; keep using it as-is from page.tsx).
- **DO NOT modify** `lib/reporting/queries.ts` or `lib/reporting/types.ts` (existing queries already return everything you need).
- **DO NOT modify** `app/(dashboard)/reporting/sites/page.tsx` — global Sites view stays read-only this round.
- **DO NOT modify** `app/(dashboard)/clients/page.tsx` (master CRUD; out of scope).
- DO NOT modify global git config.
- DO NOT push to `main`. Open a PR.
- DO NOT run `gh pr merge`.

You ARE expected to:
- Append `createClient` to `app/(dashboard)/reporting/clients/actions.ts` (existing file).
- Append `createSite`, `createZone`, `deleteSite`, `deleteZone` to `app/(dashboard)/reporting/clients/[id]/sites/actions.ts` (existing file).
- Create `components/reporting/{AddClientButton,AddSiteButton,AddZoneButton,DeleteRowMenu}.tsx`. Optional shared `Modal.tsx` primitive — fine to create if it cleans things up; do NOT pull in a new npm dep for it.
- Modify `app/(dashboard)/reporting/clients/page.tsx` (Add client button).
- Modify `app/(dashboard)/reporting/clients/[id]/page.tsx` (Add site button + per-site delete menu).
- Modify `app/(dashboard)/reporting/clients/[id]/sites/[siteId]/page.tsx` (Add zone button + per-zone delete menu).

## Out of scope

- Editing across the global `/reporting/sites` view (E14).
- Soft-delete / archiving — hard delete only, gated on no-children/no-inspections.
- Bulk operations.
- Reordering or re-parenting.
- Anything that touches reports, generation, sync, cron.

If you find yourself wanting to add these, **stop and surface it** before pushing.

## Coordination — parallel streams

E16 (generation pipeline + Vercel Cron) is running in parallel.

- E16 places its Server Actions in `lib/reporting/generation/actions.ts` (NEW, different path) — zero conflict with your appends to the page-level actions.ts files.
- E16 refactors `<GenerateReportButton>` internally but keeps its exported props identical — your page.tsx callsites should not need to change for E16's sake.
- `package.json`, `vercel.json`, `lib/reporting/generation/`, `app/api/cron/` are all E16 territory. Stay out.

## Special note on testing

E15b is interactive. You CAN'T fully verify without a browser. Do:
1. `npm run build` (TypeScript + compile).
2. `npm run dev` and exercise create/delete round-trips if possible. Verify:
   - Add client → modal → save → land on new client detail page.
   - Add site → modal → save → site appears.
   - Add zone → modal → save → zone appears.
   - Delete zone with no inspections → succeeds.
   - Delete zone with inspections → blocked with clear error.
   - Delete site with no zones → succeeds.
   - Delete site with zones → blocked with clear error.
3. If headless, say "skipped" in the report-back. Orchestrator + Peter do final manual verify on Vercel preview.

## Report-back format

```
✅/❌ E15b Add/delete sites + zones + new client
Worktree: /Users/feelgood/Desktop/cc-dashboard-e15b
PR: <url>
Build: ✅/❌ TypeScript + N routes generating
Verifications:
  - createClient → land on detail: ✅/❌/skipped
  - createSite + createZone: ✅/❌/skipped
  - deleteSite/Zone gating (children/inspections): ✅/❌/skipped
  - RLS allows authed INSERT/DELETE on clients + sites (vs needs service-role fallback): <observation>
Org-id resolution chosen for createClient: <which option (a/b/c) and why>
Files modified: <list>
Files NOT touched (per coordination):
  - lib/reporting/generation/* (E16)
  - app/api/cron/* (E16)
  - vercel.json (E16)
  - package.json (E16)
  - components/reporting/GenerateReportButton.tsx (E16)
  - lib/reporting/queries.ts, lib/reporting/types.ts
Open questions / blockers: <bullets, or "none">
```

Then stop. Do not run `gh pr merge`.

## Procedure summary

1. Worktree setup commands above.
2. Read brief + audit §2.3 + the existing `clients/actions.ts` and `clients/[id]/sites/actions.ts` (RLS-fallback pattern to mirror).
3. Implement files in order:
   - Append `createClient` to `clients/actions.ts`.
   - Append `createSite`, `createZone`, `deleteSite`, `deleteZone` to `clients/[id]/sites/actions.ts`.
   - `AddClientButton.tsx` (+ optional `Modal.tsx`).
   - `AddSiteButton.tsx`, `AddZoneButton.tsx`.
   - `DeleteRowMenu.tsx`.
   - Wire into the three `page.tsx` files.
4. `npm run build` — must pass.
5. Commit + Co-Authored-By.
6. `git push -u origin feature/reporting-port-e15b`
7. `gh pr create` with test-plan + the org-id resolution decision documented + RLS observations.
8. Report back per format above.
```
