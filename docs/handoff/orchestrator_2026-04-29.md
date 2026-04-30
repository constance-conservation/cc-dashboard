# Orchestrator handoff — 2026-04-29 evening

This is the bootstrap doc for the next M03b orchestrator session.

If you're spawning a fresh Claude Code instance to continue M03b work,
read this first, then the live tracker.

---

## You are…

The orchestrator for M03b — porting the standalone `FrostyFruit1/constance-reporting`
app into `constance-conservation/cc-dashboard` as native Next.js routes,
then archiving the standalone. **You don't write feature code yourself**;
you plan, write briefs, spin up parallel Claude Code sessions to execute
each brief, review their PRs, merge them, and coordinate.

The previous orchestrator session ran on **2026-04-29** and merged 7
briefs: E8, F1, E9, E10, E10b, E11, E13, E12, E14, E15. As of this
handoff, M03b is at **fully viewable + fully editable** state through
cc-dashboard. Remaining: E15b, E16, E17, E18.

---

## Read these in order

1. **`docs/milestones/M03b_native_integration_status.md`** — live state.
   Read top to bottom. Brief table, decisions log, recommended order,
   out-of-band tracks, next-session entry point. Update this doc as
   briefs land — it's the source of truth.

2. **`docs/audit/standalone_feature_inventory.md`** — master spec for
   the entire standalone. 11 pages, cross-cutting infrastructure,
   schema deps. Reference as you write new briefs.

3. **`docs/audit/operations_data_wiring.md`** — Operations 3-page
   deep-dive (already shipped as E13; doc remains as schema reference).

4. **`docs/orchestrator_prompts/README.md`** — convention for spawning
   parallel sessions, including the **worktree pattern** (mandatory
   from round 3 onwards).

5. **`docs/executor_briefs/`** — every brief written so far. Patterns
   to follow when writing new ones (E15b, E16, E17, E18).

6. **`docs/orchestrator_prompts/`** — every parallel-session prompt
   written so far. Patterns to follow.

You don't need to read the source code unless a brief requires it.
The audit + briefs cover the surface area.

---

## What's currently merged (cc-dashboard `main` at `e98d42c`)

```
✅ E8     landing + scaffold              abe77e2
✅ F1     sub-nav (Overview/Operations/Reports)
✅ E9     clients/sites/zones drilldown   3f28162
✅ E10    reports list + read-only        82e8d0d
✅ E13    operations (staff/chem/species) 5510202
✅ E10b   report preview + edit + uploads b2fd8f3
✅ E11    inspections page                94ddcf1
✅ E15    inline CRUD                     f7e03aa
✅ E12    pipeline health                 14cee96
✅ E14    global sites view + nav entry   e98d42c
```

All sub-nav rows resolve. All view pages are built. Inline editing
works on `/reporting/clients/[id]` and `/reporting/clients/[id]/sites/[siteId]`.
Report preview + edit + image uploads work at `/reporting/reports/[id]`.

---

## What's NOT merged (forward queue)

| Brief | Scope | Estimate | Blocked by |
|---|---|---|---|
| **E15b** | Add new site / delete site / add new zone / delete zone | ½ day | none |
| **E16** | Generation pipeline — port `~/Desktop/constance-reporting/src/report/` and `src/bin/generate_report.ts` into cc-dashboard's `lib/reporting/generation/`. Wire to "Generate Now" button. Vercel Cron driven by client cadence. **Includes tests for incoming reports + analysis/processing per Peter.** | 2 days | none |
| **E17** | Sync + webhook — port `src/sync/` and `src/webhook/`. Default plan: Vercel Cron incremental + manual CLI for full backfill (60s Cron timeout likely insufficient for full backfill). Peter said "not sure" on this — confirm before implementing. | full day | none |
| **E18** | Cutover — flip APPS card href on cc-dashboard home from `https://constance-reporting.vercel.app/` → `/reporting`. Retire standalone Vercel deploy + archive `FrostyFruit1/constance-reporting` repo. Optionally delete `/Users/feelgood/Desktop/CONSTANCE\ CONSERVATION/` legacy dir. | ~1 hour | E16 + E17 ideally; can ship without if needed |

After E16 + E17, all data flow is in cc-dashboard. After E18, standalone retired.

---

## Recommended next round

If Peter says "keep going", the natural round 4 is:

- **E15b** in parallel with **E16 (start)**.
- E17 after E16 lands so you know what generation looks like before wiring sync to feed it.
- E18 last.

E16 is 2 days and may need to split into E16a (port + Server Action) and E16b (Vercel Cron + tests). Decide when writing the brief.

---

## Conventions you should keep

### Brief writing
- Filed at `docs/executor_briefs/EXX_<short_name>.md`.
- Every brief includes: status, brief written date, repo, branch, predecessor,
  audit context, goal, scope (in + out), architecture, reference (line ranges
  in standalone), schema deps, files to CREATE/MODIFY/NOT touch, done definition,
  open questions, workstream procedure (numbered).
- Coordination notes at the bottom for parallel rounds — call out which
  files are shared, which are exclusively yours.

### Orchestrator prompts
- Filed at `docs/orchestrator_prompts/EXX_session_prompt.md`.
- Self-contained — fresh Claude Code instance pastes the body, executes,
  reports back. Big-picture context, repo state (paths), brief reference,
  hard constraints (DO NOTs), coordination notes, report-back format,
  numbered procedure.
- **Worktree pattern is mandatory from round 3 onwards.** Each parallel
  session uses `git worktree add` to its own physical dir. See
  `docs/orchestrator_prompts/README.md`.

### Merging
- Squash, never merge-commit, for feature branches.
- Subject line is `feat(reporting): <short title> (E<N>)`.
- Body includes Co-Authored-By Claude line.
- Update `docs/milestones/M03b_native_integration_status.md` after every merge.

### Conflict resolution
- The append-only `lib/reporting/queries.ts` and `lib/reporting/types.ts`
  conflict pattern is now well-known: each side appends a new section,
  resolution is to stack both. Look at how previous merges handled it
  if you need a template (e.g. round-2 e10b merge into main after e13
  landed first).

---

## Things only this orchestrator session knows that aren't in committed docs

### Peter's stated preferences
- **Logic over styling.** Said multiple times. Polish is deferred.
- **Wants editing on reporting views**, not just the master `/clients` page (drove E15 inclusion).
- **Wants generation pipeline fully ported with tests + analysis** (drove E16 full-port decision over CLI wrapper).
- **Service-role JWT pasted into transcript on 2026-04-29** to unblock `vercel env pull`. Not yet rotated — see status doc out-of-band tracks.

### Round 2 lessons (already captured in status doc, but worth knowing)
- Three sessions in one shared working tree caused branch chaos. Round 3
  fixed it with `git worktree`. Standing rule from round 3: each session
  uses its own worktree. Document is `docs/orchestrator_prompts/README.md`.
- Round-2 E11 work was salvaged from stashes; round-3 ran clean.

### Vercel + Supabase setup
- GitHub org: `constance-conservation`. Vercel team: `cc-digital`. Different
  systems, same humans. (Already in `MEMORY.md` of the previous
  orchestrator's auto-memory; new session won't have this until you
  re-write it. Worth saving as a project memory.)
- Supabase project: `ymcyunspmljaruodjpkd`.
- `.env.local` is at `/Users/feelgood/Desktop/cc-dashboard/.env.local`,
  includes `SUPABASE_SERVICE_ROLE_KEY` (used by E10b's admin client).
- The standalone (`constance-reporting.vercel.app`) and cc-dashboard
  preview deploys both point at the same Supabase project. F2 finding
  "more photos on port" was data-window difference, not divergence.

### Where the standalone repo is
- Cloned locally at `/Users/feelgood/Desktop/constance-reporting/`.
- Brief writers use it for source material (line ranges, schema migrations,
  etc.). DO NOT modify it — it's the reference.
- Will be archived in E18.

### Orphan working directory
- `/Users/feelgood/Desktop/CONSTANCE\ CONSERVATION/` is an obsolete
  legacy folder (the previous orchestrator session was rooted there with
  a sticky cwd). All work moved to `~/Desktop/cc-dashboard/`. The legacy
  folder can be deleted at any time but probably wait until E18 to keep
  things uncluttered.

### Auto-memory
- The previous orchestrator's auto-memory lives at
  `/Users/feelgood/.claude/projects/-Users-feelgood-Desktop-CONSTANCE-CONSERVATION/memory/`.
- A new orchestrator opened in `/Users/feelgood/Desktop/cc-dashboard/`
  will use a fresh namespace. Items worth re-saving in the new memory:
  - **Frosty / dev lead** profile
  - **Team naming** (cc-digital ↔ constance-conservation ↔ FrostyFruit1)
  - **Supabase infra notes** (IPv6-only, REST API for ops)
- Most other items in the old memory are pre-M03b history and not
  particularly relevant to ongoing port work.

---

## Bootstrap — the new orchestrator's first message

After spawning a fresh Claude Code in `/Users/feelgood/Desktop/cc-dashboard/`,
paste this:

```
You're the orchestrator for the M03b reporting port. Read
docs/handoff/orchestrator_2026-04-29.md, then
docs/milestones/M03b_native_integration_status.md. That's your context.
M03b is at "fully viewable + editable" state. Remaining briefs: E15b,
E16, E17, E18. Confirm you have the picture and propose the next round.
```

That's it. The new orchestrator should be able to continue without
further onboarding.

---

## Sign-off

Previous orchestrator session retiring at this commit. M03b is in good
shape. No in-flight work. No open PRs. Working tree clean.

Good luck.
