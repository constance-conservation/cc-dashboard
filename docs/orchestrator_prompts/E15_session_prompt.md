# Orchestrator prompt — Execute E15 (Inline CRUD across reporting views)

Copy the body below into a fresh Claude Code instance opened in
`/Users/feelgood/Desktop/cc-dashboard/`.

**Round-3 change:** uses `git worktree` to isolate from parallel sessions.

---

```markdown
# Parallel orchestrator brief — Execute E15 (Inline CRUD)

## Big picture

`constance-conservation/cc-dashboard` is the master Next.js dashboard. We're mid-way through M03b — porting `FrostyFruit1/constance-reporting` into cc-dashboard at `/reporting/*`. Already shipped: E8, F1, E9, E10, E10b, E11, E13. The reporting views are mostly read-only; Peter explicitly requested editing on the reporting-side views in addition to the master `/clients` page.

**Your job:** execute brief E15 — add inline editing to `/reporting/clients/[id]` and `/reporting/clients/[id]/sites/[siteId]`. Generic `<EditableField>` component, `<ScheduleSelector>` for sites + zones, and the Server Actions to persist.

## Worktree setup (round 3 standard)

```
cd /Users/feelgood/Desktop/cc-dashboard
git checkout main && git pull
git worktree add /Users/feelgood/Desktop/cc-dashboard-e15 -b feature/reporting-port-e15 main
cd /Users/feelgood/Desktop/cc-dashboard-e15
cp /Users/feelgood/Desktop/cc-dashboard/.env.local .
npm install
```

Stay in `/Users/feelgood/Desktop/cc-dashboard-e15` for the rest of the session.

## Repo state

- SSH + identity + `gh` CLI all configured.
- `.env.local` should include `SUPABASE_SERVICE_ROLE_KEY` from E10b's run.

## The brief

`docs/executor_briefs/E15_inline_crud.md` — read fully. Full-day estimate.

## Hard constraints

- **DO NOT modify** `app/(dashboard)/reporting/pipeline/` (E12).
- **DO NOT modify** `app/(dashboard)/reporting/sites/` (E14 will create this).
- **DO NOT modify** `components/reporting/ReportingNav.tsx` (E14).
- **DO NOT modify** `lib/reporting/queries.ts` (E15 doesn't add queries — existing ones already return what EditableField needs).
- DO NOT modify global git config.
- DO NOT push to `main`. Open a PR.
- DO NOT run `gh pr merge`.

You ARE expected to modify:
- New `components/reporting/EditableField.tsx`
- New `components/reporting/ScheduleSelector.tsx` (generic; do NOT touch existing `CadenceSelector.tsx`)
- New `app/(dashboard)/reporting/clients/[id]/sites/actions.ts` (Server Actions for site fields + schedule)
- Existing `app/(dashboard)/reporting/clients/actions.ts` (extend with `updateClientField`)
- `app/(dashboard)/reporting/clients/[id]/page.tsx` (replace `<Field>` with `<EditableField>`)
- `app/(dashboard)/reporting/clients/[id]/sites/[siteId]/page.tsx` (replace `<Field>` + add `<ScheduleSelector>` for site + per-zone)

## Out of scope (deferred to E15b)

- Add new site under a client.
- Delete site or zone.
- Add new zone under a site.
- Editing in the global `/reporting/sites` view (E14).

If you find yourself wanting to add these, **stop and surface it** before pushing.

## Coordination — parallel streams

E12 + E14 are running in parallel.
- E15 does NOT share `lib/reporting/queries.ts` with the other two — your code reads existing query outputs, no new query functions needed.
- E14 owns `ReportingNav.tsx`. Stay out of it.
- E12 owns `pipeline/`. Stay out.

## Report-back format

```
✅/❌ E15 Inline CRUD
Worktree: /Users/feelgood/Desktop/cc-dashboard-e15
PR: <url>
Build: ✅/❌ TypeScript + N routes generating
Verifications:
  - EditableField click→edit→save flow works locally (npm run dev): ✅/❌/skipped
  - ScheduleSelector for site + zone persists: ✅/❌/skipped
  - RLS allows authed UPDATE on clients + sites (vs needs service-role fallback): <observation>
Files modified: <list>
Files NOT touched (per coordination):
  - components/reporting/ReportingNav.tsx
  - lib/reporting/queries.ts
  - app/(dashboard)/reporting/{pipeline,sites}/
Open questions / blockers: <bullets, or "none">
```

Then stop. Do not run `gh pr merge`.

## Special note on testing

E15 is interactive. You CAN'T fully verify without a browser. Do:
1. `npm run build` (TypeScript + compile).
2. `npm run dev` and exercise edit/save round-trip if possible.
3. If headless, say "skipped" in the report-back. Orchestrator + Peter do final manual verify on Vercel preview.

## Procedure summary

1. Worktree setup commands above.
2. Read brief + audit §2.1 + standalone `renderEditableField` / `renderScheduleWidget` source.
3. Implement files in order:
   - `EditableField.tsx`
   - `ScheduleSelector.tsx`
   - `clients/actions.ts` (extend)
   - `clients/[id]/sites/actions.ts` (new)
   - Wire into `clients/[id]/page.tsx`
   - Wire into `clients/[id]/sites/[siteId]/page.tsx`
4. `npm run build` — must pass.
5. Commit + Co-Authored-By.
6. `git push -u origin feature/reporting-port-e15`
7. `gh pr create` with test-plan + RLS verification.
8. Report back per format above.
```
