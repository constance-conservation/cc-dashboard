# E18 — Cutover (final M03b brief)

**Status:** Approved 2026-04-29 (round 6 — sole brief; final M03b round)
**Brief written:** 2026-04-29
**Repo:** `constance-conservation/cc-dashboard`
**Branch:** `feature/reporting-port-e18` (off `main`)
**Predecessor:** E17 (merged `cbe6225`).
**Audit context:** N/A — runbook brief; no porting.
**Estimate:** ~1 hour total (5 min code change + 30–45 min admin operations).

---

## Goal

Cut over from the standalone reporting deploy to cc-dashboard's native routes.
After E18, the standalone `constance-reporting.vercel.app` deploy is retired,
SC webhooks land at cc-dashboard, the home-page APPS card points users at
`/reporting`, and the standalone GitHub repo is archived. M03b is done.

---

## Scope (in this brief)

This brief is half code change, half admin runbook. Items marked **[code]**
go in the executor's PR; items marked **[Peter]** are operations only Peter
can execute (Vercel project access, Safety Culture admin, GitHub repo admin).

### [code] APPS card href flip

`app/(dashboard)/page.tsx` — line 13. Change:

```diff
- { id: 'staff',     href: 'https://constance-reporting.vercel.app/', name: 'Staff Reporting', icon: 'staff' as const, desc: 'Daily reports, timesheets & incident logs' },
+ { id: 'staff',     href: '/reporting',                              name: 'Staff Reporting', icon: 'staff' as const, desc: 'Daily reports, timesheets & incident logs' },
```

That's it. Don't rename "Staff Reporting" or change the description — those are
UX choices outside this cutover's scope.

### [Peter] Vercel project env vars

Add to the Vercel project (preview + production) before any other admin step:

1. **`CRON_SECRET`** — generate via `openssl rand -hex 32`. Required for both
   crons (generate-reports, sync-sc-inspections). Without it, both routes
   return 500 every fire.
2. **`SAFETY_CULTURE_API_TOKEN`** — pull from your Safety Culture dashboard
   (Settings → API tokens) or whichever password vault the standalone's token
   lives in. The standalone's local `.env` was missing on disk during E17
   execution, so don't expect to find it there. Required for sync + webhook
   async processing.

Method: Vercel dashboard → Project Settings → Environment Variables, **or**
`vercel env add CRON_SECRET production` and `vercel env add SAFETY_CULTURE_API_TOKEN production` (and same for `preview`).

After adding, redeploy production once so the env reaches running functions
(or wait for the next push — the docs commit landing this brief should suffice).

### [Peter] Safety Culture webhook re-registration

This is the load-bearing step. Until this is done, SC continues sending events
to the standalone — cc-dashboard's webhook route exists but receives nothing.

Three options for re-registration, pick one:

**Option A — SC dashboard (probably easiest):**
- Log into Safety Culture admin.
- Navigate to integration / webhook settings.
- Find the existing webhook pointing at the standalone URL (likely
  `https://constance-reporting.vercel.app/webhook` or similar).
- Edit its URL to point at cc-dashboard's canonical domain + `/api/webhooks/sc`.
  The exact domain is whatever `cc-digital/cc-dashboard` resolves to in your
  Vercel team (per the recent canonical-domain migration, commit `34b9342`).
- Confirm `events` covers `inspection.completed` and `inspection.updated`.

**Option B — standalone CLI from local clone:**
- The standalone clone at `~/Desktop/constance-reporting/` still has
  `src/webhook/register.ts`. Run:
  ```
  cd ~/Desktop/constance-reporting
  npx ts-node src/webhook/register.ts list           # find current webhook id
  npx ts-node src/webhook/register.ts delete <id>    # remove standalone url
  npx ts-node src/webhook/register.ts register https://<cc-dashboard-domain>/api/webhooks/sc
  ```

**Option C — manual curl:**
- `GET https://api.safetyculture.io/webhooks` (with `Authorization: Bearer <SC_TOKEN>`)
  to list existing webhooks.
- `DELETE /webhooks/<id>` for the standalone-pointing entry.
- `POST /webhooks` with body `{"url": "https://<cc-dashboard>/api/webhooks/sc", "events": ["inspection.completed", "inspection.updated"]}`.

After re-registration, edit a single inspection in SC and watch for it landing
in cc-dashboard's `inspections` table within ~30 seconds (webhook latency +
async processing). If it doesn't, the URL is wrong, the token is wrong, or
the route is misbehaving — don't proceed to standalone retirement until this
works.

### [Peter] Trigger first cc-dashboard sync (catch up the 7-day gap)

The standalone last synced 2026-04-22; cc-dashboard takes over at first cron
fire (or earlier if you trigger manually). Either:

- Wait up to 15 minutes for the cron to fire automatically (assuming
  `CRON_SECRET` is now set), **or**
- Trigger immediately via Vercel project → Crons → `sync-sc-inspections` →
  "Run now", **or**
- `curl -H "Authorization: Bearer <CRON_SECRET>" https://<cc-dashboard>/api/cron/sync-sc-inspections`

The first run will pull all inspections modified since 2026-04-22. Function
has 300s; standalone has handled larger batches before. Idempotent
(`sc_audit_id` dedup). Watch the response JSON for `summary.failed[]` — any
non-empty `failed` array is a regression to investigate before retiring the
standalone.

### [Peter] Retire the standalone Vercel deploy

Only after the SC webhook is re-registered AND the first cc-dashboard sync
has succeeded.

- Vercel dashboard → `cc-digital/constance-reporting` project (or wherever the
  standalone lives) → Settings → "Delete Project" — or "Pause" if you'd prefer
  a 2-week safety window before deletion. Pause is reversible; delete is not.
- Confirm the standalone's domain (`constance-reporting.vercel.app`) returns
  the Vercel-default 404 / "this project has been paused".
- The home-page APPS card is now the only path to `/reporting`; the old
  domain is no longer linked from cc-dashboard.

### [Peter] Archive the standalone GitHub repo

- `FrostyFruit1/constance-reporting` → Settings → Archive this repository.
- Archived repos are read-only; clones still work, but no further pushes.
- The local clone at `~/Desktop/constance-reporting/` is unaffected — it's
  still the canonical reference for the historical port source and for the
  emergency `npm run sync:backfill` use case.

### [Peter, optional] Delete legacy orphan dir

`/Users/feelgood/Desktop/CONSTANCE\ CONSERVATION/` is the obsolete previous
working directory (per memory `reference_legacy_orphan.md`). After E18 wraps
and you've confirmed nothing valuable lives there, `rm -rf` is safe. Defer
this if you want a retention buffer.

---

## Out of scope (do not do these)

- **Renaming the "Staff Reporting" APPS card.** UX change, separate decision.
- **Removing `https://constance-reporting.vercel.app/` references in docs.**
  Docs reference the URL for historical context (e.g., the milestone tracker
  describes what was retired). Leave them.
- **Schema migrations.** None.
- **Code changes beyond the single href line.** No refactors, no cleanups,
  no bonus features. Cutover is mechanical.
- **Deleting the local clone at `~/Desktop/constance-reporting/`.** Keep as
  reference until at least one full month after cutover.
- **Touching `lib/reporting/generation/`, `lib/reporting/ingestion/`, or any
  E15b/E16/E17 surface.** Cutover does not modify any ported code.

---

## Files to MODIFY

- `app/(dashboard)/page.tsx` — line 13 only. The href value.

## Files to CREATE

None.

## Files NOT touched

- Everything else.

---

## Done definition

A reviewer can:

1. Visit cc-dashboard's home page. See the "Staff Reporting" card under
   Operations. **Click it. Lands on `/reporting`** (cc-dashboard's native
   page) — NOT the old `constance-reporting.vercel.app`.
2. `https://constance-reporting.vercel.app/` either 404s or shows Vercel's
   "project paused" placeholder.
3. The Safety Culture webhook configuration shows the URL pointing at
   cc-dashboard's `/api/webhooks/sc`, with events `inspection.completed` +
   `inspection.updated`.
4. Edit a real inspection in SC. Within ~30 seconds, the corresponding row
   in `inspections` table shows updated `sc_modified_at`, `processing_status='success'`, and `updated_at` matching the edit time.
5. `curl -H "Authorization: Bearer <CRON_SECRET>" https://<cc-dashboard>/api/cron/sync-sc-inspections` returns 200 with a `summary` showing zero or near-zero `failed[]` entries on subsequent fires.
6. `FrostyFruit1/constance-reporting` shows the "Archived" badge on GitHub.
7. `npm run build` passes (the executor verifies this in the PR).

---

## Coordination notes — round 6

No parallel session this round. E18 is the sole brief and the final M03b
round.

**The PR portion is one line.** If Peter prefers, the orchestrator can
execute the href flip directly from its session (open a tiny PR, merge it)
rather than spinning up a parallel executor — overhead ratio of an executor
session is wrong for a 1-line change. Either path lands the same diff.

The admin-side steps cannot be delegated to an executor session — they
require Peter's hands on the Vercel project, the SC dashboard, and the
GitHub repo settings.

---

## Open questions

None. Every decision has an obvious answer or is a Peter call (Vercel
project paused vs deleted; webhook re-registration via dashboard vs CLI;
when to delete the legacy orphan dir).

---

## Workstream procedure

If using the parallel-executor path:

1. `cd /Users/feelgood/Desktop/cc-dashboard && git checkout main && git pull`
2. `git worktree add /Users/feelgood/Desktop/cc-dashboard-e18 -b feature/reporting-port-e18 main`
3. `cd /Users/feelgood/Desktop/cc-dashboard-e18`
4. `npm install`
5. Edit `app/(dashboard)/page.tsx` line 13: change `href` from
   `'https://constance-reporting.vercel.app/'` to `'/reporting'`.
6. `npm run build` — must pass.
7. Commit + Co-Authored-By Claude line.
8. `git push -u origin feature/reporting-port-e18`
9. `gh pr create` with title `feat(reporting): cutover APPS card to /reporting (E18)` and a body listing the runbook steps Peter still needs to execute.
10. Report back per session prompt format.

If using the orchestrator-direct path: orchestrator opens a tiny PR
(no worktree) with the same change, merges it, then logs the runbook
state in the milestone tracker.

After the code lands, Peter executes the `[Peter]` runbook steps in the
order documented above:
1. Vercel env vars (`CRON_SECRET`, `SAFETY_CULTURE_API_TOKEN`)
2. SC webhook re-registration
3. First cc-dashboard sync trigger (verify the gap closes)
4. Standalone Vercel deploy retirement
5. GitHub repo archival
6. (Optional) Legacy orphan dir deletion

After all steps complete, the orchestrator does the final milestone-tracker
update marking M03b done and pointing at `docs/vision.md` for the post-M03b
roadmap.
