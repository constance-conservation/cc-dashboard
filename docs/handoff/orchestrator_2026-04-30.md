# Orchestrator handoff — 2026-04-30 (mac mini bootstrap)

This is the bootstrap doc for picking up the Constance Conservation
orchestrator session on a different machine. The previous session ran on
Peter's laptop; this doc captures everything a fresh Claude Code instance
on the mac mini needs to continue without re-onboarding.

---

## TL;DR

- **`main` is at `f2a2f5f`. Production is deployed.** Local working tree clean. No outstanding worktrees, no in-flight PRs.
- **M03b — Native Integration is in round 6, code merged, admin runbook in flight.** Step 1 of 7 done (`CRON_SECRET` set in Vercel). Step 2 in progress (`SAFETY_CULTURE_API_TOKEN` — Peter needs to generate one in the SC dashboard, then add via Vercel API).
- **Post-M03b plan exists.** A parallel "planning chat" wrote out M04–M09 milestone status docs and the vision doc. All committed at `f2a2f5f`.

If you read nothing else, read this file in full plus
`docs/milestones/M03b_native_integration_status.md`.

---

## You are…

The orchestrator for cc-dashboard. You don't write feature code yourself;
you plan, write briefs, spin up parallel Claude Code sessions to execute
each brief, review their PRs, and merge them.

The current job is **shepherding M03b round 6 to completion** — that means
walking Peter through the 7-step admin runbook (5 steps remaining), then
declaring M03b done and pointing the next phase of work at `docs/vision.md`
and the M04–M09 milestone docs.

---

## Read these in order

1. **This doc.** Self-contained orientation.
2. **`docs/milestones/M03b_native_integration_status.md`** — live state. Brief table, decisions log, recommended order, out-of-band tracks, **the round-6 admin runbook checklist**. Update this doc as runbook steps land.
3. **`docs/vision.md`** — mission, principles, six data streams, where M03b sits, post-M03b roadmap (M04–M09).
4. **`docs/executor_briefs/E18_cutover.md`** — the runbook you're shepherding. Has `curl` snippets for verification at each step.
5. **`docs/milestones/M04_*` through `M09_*`** — post-M03b milestones (drafted by the planning chat; ready to be sequenced post-cutover).

You don't need to read source code unless a future brief requires it.

---

## Exact state of `main` (as of 2026-04-30 morning)

```
f2a2f5f docs: post-M03b roadmap (M04-M09 milestones, vision §5-6, architecture session prompt)
a9dfe9b docs: E18 runbook step 1 complete (CRON_SECRET set in Vercel envs)
9ddbc16 docs: round-6 code merged (E18 368a047); admin runbook checklist tracked
368a047 feat(reporting): cutover APPS card to /reporting (E18)
247c313 docs: round-5 merged + round-6 cutover brief (E17 ✅, E18 ready)
cbe6225 feat(reporting): incremental sync + webhook ingestion (E17)
720f939 docs: vision skeleton — mission, principles, six streams, M03b lineage
5fdca41 docs: round-5 brief + session prompt (E17 sync + webhook, no backfill)
62b9a54 docs: note CRON_SECRET deferral so regression doesn't chase a 500
2b42a07 docs: fill in round-4 squash hashes (E15b 5f332a1, E16 84bdbec)
```

**Vercel:** production deployed `f2a2f5f` at 2026-04-29T07:30:35Z. The `cc-digital/cc-dashboard` Vercel project is the canonical deploy. The standalone (`cc-digital/constance-reporting` / `constance-reporting.vercel.app`) is **still live** but will be retired in step 5 of the round-6 runbook.

**Working tree:** clean. No worktrees other than the main one. Nothing ahead/behind origin.

---

## What's currently merged in M03b

| Brief | Hash | Notes |
|---|---|---|
| E8 + F1 | `abe77e2` | landing + scaffold + sub-nav |
| E9 | `3f28162` | clients/sites/zones drilldown |
| E10 | `82e8d0d` | reports list + read-only viewer |
| E13 | `5510202` | operations 3 pages (staff/chemicals/species) |
| E10b | `b2fd8f3` | report preview + edit + uploads |
| E11 | `94ddcf1` | inspections page |
| E15 | `f7e03aa` | inline CRUD on reporting views |
| E12 | `14cee96` | pipeline health page |
| E14 | `e98d42c` | global sites view |
| E15b | `5f332a1` | add/delete clients/sites/zones (PR #42) |
| E16 | `84bdbec` | generation pipeline + Vercel Cron (PR #43) |
| E17 | `cbe6225` | incremental sync + webhook ingestion (PR #44) |
| E18 (code) | `368a047` | APPS card href flip to `/reporting` (PR #45) |

After E18 code, the home-page "Staff Reporting" card now points users at `/reporting` instead of the standalone domain. **The cutover *behaviour* — SC events flowing to cc-dashboard, standalone retired — is gated on the admin runbook.**

---

## The round-6 admin runbook (where you pick up)

This is the live state. Update it as Peter completes each step.

| # | Step | Status |
|---|---|---|
| **1** | `CRON_SECRET` to Vercel (preview + production) | ✅ **Done 2026-04-29.** Set via Vercel API atomic upsert. Verified with `vercel env ls` → `CRON_SECRET Encrypted Preview, Production`. SHA256 fingerprint of secret value: `b1a10e1b8d56cec56716fbe1c8bf786cba14eba1d7edd7da74fdabd945b9c31b` (recorded for audit; the value itself is in Vercel only). |
| **2** | `SAFETY_CULTURE_API_TOKEN` to Vercel | 🔄 **In flight 2026-04-30.** Source token is missing — the standalone Vercel project (`cc-digital/constance-reporting`) does NOT have the env var set in production, preview, or development. Working theory: previous orchestrator was running `npm run sync` manually from a local `.env` for the last weeks; the standalone's deployed cron has been silent since `sync_state.last_sync_at = 2026-04-22`. **Peter must generate a fresh token from the SC dashboard** (Account/Settings → Developer/API → API tokens) and add via `vercel env add SAFETY_CULTURE_API_TOKEN production` + `preview`, or via Vercel API atomic upsert. |
| **3** | Re-register SC webhook URL | ⏸ Pending step 2. Target URL: `https://<cc-dashboard-canonical-domain>/api/webhooks/sc`. Events: `inspection.completed` + `inspection.updated`. Three method options in the brief: SC dashboard, standalone CLI (`~/Desktop/constance-reporting/src/webhook/register.ts`), or curl to SC's `/webhooks` endpoint. |
| **4** | Trigger first cc-dashboard sync to close the 7-day gap | ⏸ Pending step 2. Wait 15 min for cron OR Vercel "Run now" OR `curl -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/cron/sync-sc-inspections`. Verify `summary.failed[]` is empty. |
| **5** | Retire standalone Vercel deploy | ⏸ Pending step 4. `cc-digital/constance-reporting` → pause first (reversible), then delete after retention period. Confirm `constance-reporting.vercel.app` returns 404/paused. |
| **6** | Archive `FrostyFruit1/constance-reporting` on GitHub | ⏸ Pending step 5. Settings → Archive. Read-only forever; local clone unaffected. |
| **7** | (Optional) Delete legacy `~/Desktop/CONSTANCE\ CONSERVATION/` orphan dir | ⏸ Optional, deferable. |

**Verification probes that need no secrets:**

```bash
# After step 1 (or now, since step 1 is done):
curl -i https://<host>/api/cron/sync-sc-inspections
# Expected: 401 unauthorized (CRON_SECRET reaching the function)
# If 500 CRON_SECRET not configured: env var hasn't propagated to the running
# function instance; redeploy or push a no-op commit to spawn fresh instances.

# After step 2:
curl -X POST -H "Content-Type: application/json" \
  -d '{"event":"inspection.completed","audit_id":"audit_doesnotexist_test"}' \
  https://<host>/api/webhooks/sc
# Expected: 200 {"ok":true,"action":"processing","auditId":"audit_doesnotexist_test"}
# Vercel function logs should show SC API 404 (because audit doesn't exist),
# NOT "SAFETY_CULTURE_API_TOKEN is not set". The latter means env var not
# propagated.
```

---

## Things only the live conversation knows that aren't in committed docs

### About the SC token (step 2)

Peter on 2026-04-30 morning: *"the constance-reporting Vercel project does not have SAFETY_CULTURE_API_TOKEN in production, preview, or development. So there's nothing to copy forward into cc-dashboard. Paste the SafetyCulture API token here (or a temporary one)..."*

You must redirect: **don't paste real tokens into chat.** Add directly via Vercel CLI or API. Same pattern Peter used for `CRON_SECRET` (atomic upsert, audit fingerprint shared without secret value).

Cc-dashboard's E17 ingestion **does not need `SAFETY_CULTURE_ORG_ID`** (the standalone required it; cc-dashboard resolves the org id at runtime from the `organizations` table via `getDefaultOrganizationId`). Just the one env var: `SAFETY_CULTURE_API_TOKEN`.

### About the standalone's silent week

`sync_state.last_sync_at = 2026-04-22`, `total_synced = 724`. Standalone hasn't synced for ~8 days. Working theory above. Practical impact: the first cc-dashboard cron fire (step 4) will pull all SC inspections modified since 2026-04-22 in one batch. Function has `maxDuration = 300`s; standalone has handled larger batches before; idempotent (`sc_audit_id` dedup, `sc_modified_at` change check) — safe.

### Peter's stated preferences (carried from prior handoff)

- **Logic over styling.** Polish is deferred.
- **Full ports with tests over thin wrappers** (drove E16 + E17 full-port decisions).
- **Worktree per parallel session** (mandatory from round 3).
- **Don't paste secrets into chat.** Use Vercel API atomic upsert; share SHA256 fingerprint for audit.

### Two parallel chats have been working in this repo

- **This (orchestrator) chat** — owns: `docs/milestones/M03b_*`, `docs/executor_briefs/E15b/E16/E17/E18*`, `docs/orchestrator_prompts/E15b/E16/E17/E18*`, `docs/handoff/`, the round 4–6 PRs and merges.
- **Planning chat** — owns: `docs/vision.md` sections 5–6, `docs/milestones/M04_*` through `M09_*`, the post-M03b architecture session prompt under `docs/orchestrator_prompts/`. **All committed as of `f2a2f5f`** — no uncommitted state to worry about.

The planning chat may resume on the laptop later if Peter continues that thread. If you (the orchestrator on mac mini) need to touch any of the planning chat's owned files, surface it to Peter first to avoid double-edits. Most likely you won't — round 6 only touches `docs/milestones/M03b_*`.

### Vercel + Supabase setup

- **GitHub org:** `constance-conservation`. **Vercel team:** `cc-digital`. Different systems, same humans.
- **Supabase project:** `ymcyunspmljaruodjpkd`. Both apps point at it; standalone retirement (step 5) doesn't touch any data.
- **Canonical cc-dashboard domain:** there was a domain migration recently (commit `34b9342`); the canonical domain isn't named in committed docs. Look it up from the Vercel project page, or test via the production deploy URL.
- **`.env.local`** at `/Users/feelgood/Desktop/cc-dashboard/.env.local` — includes `SUPABASE_SERVICE_ROLE_KEY`. Pre-existing.

### Orphan working directory

`/Users/feelgood/Desktop/CONSTANCE\ CONSERVATION/` — obsolete legacy folder from before M03b. Optional cleanup at step 7 of the runbook.

### Standalone repo

- **Local clone:** `/Users/feelgood/Desktop/constance-reporting/` — read-only reference. DO NOT modify.
- **GitHub:** `FrostyFruit1/constance-reporting` (Peter's personal account; archived in step 6).
- **Live deploy:** `constance-reporting.vercel.app` (retired in step 5).

The local clone survives even after step 6 (clones don't disappear when GitHub repos are archived). Keep it for emergency `npm run sync:backfill` use cases. Brief writers used it for source material during the port; future briefs may also reference it.

---

## Auto-memory — laptop has it, mac mini won't

The laptop's auto-memory namespace at `/Users/feelgood/.claude/projects/-Users-feelgood-Desktop-cc-dashboard/memory/` has 13 entries:

```
MEMORY.md                                  (index)
user_peter.md                              (Peter's profile)
project_m03b.md                            (M03b state)
project_naming.md                          (cc-digital ↔ constance-conservation ↔ FrostyFruit1)
project_exit_thesis.md                     (planning chat — exit thesis)
project_post_m03b_hypothesis.md            (planning chat — M04→M09 priority)
feedback_logic_over_styling.md             (Peter prefers correctness over polish)
feedback_full_ports.md                     (full ports + tests over wrappers)
feedback_worktree_pattern.md               (round-3 standing rule)
feedback_repo_vs_personal_doc.md           (planning chat — what goes in repo vs not)
reference_standalone_repo.md               (~/Desktop/constance-reporting clone)
reference_supabase.md                      (project ymcyunspmljaruodjpkd)
reference_legacy_orphan.md                 (~/Desktop/CONSTANCE\ CONSERVATION/)
```

**Auto-memory is local-only and per-machine.** A fresh Claude Code session on the mac mini starts with an empty namespace at the same path. The substantive content of those entries is captured in this handover doc, in the milestone tracker, in the vision doc, and in the prior handoff doc — so the new session can re-derive everything by reading the committed docs. If the new session wants persistent memory of its own, it can re-save the entries it cares about into its fresh namespace.

If you want to physically copy the memory across (optional convenience, not required for correctness):

```bash
# From laptop:
rsync -av ~/.claude/projects/-Users-feelgood-Desktop-cc-dashboard/memory/ \
  mac-mini:~/.claude/projects/-Users-feelgood-Desktop-cc-dashboard/memory/
```

---

## Conventions you should keep

### Brief writing

- Filed at `docs/executor_briefs/EXX_<short_name>.md`.
- Every brief includes: status, brief written date, repo, branch, predecessor, audit context, goal, scope (in + out), architecture, reference (line ranges in standalone), schema deps, files to CREATE/MODIFY/NOT touch, done definition, coordination notes, open questions, workstream procedure (numbered).

### Orchestrator prompts

- Filed at `docs/orchestrator_prompts/EXX_session_prompt.md`.
- Self-contained — fresh Claude Code instance pastes the body, executes, reports back.
- **Worktree pattern is mandatory from round 3 onwards.** See `docs/orchestrator_prompts/README.md`.

### Merging

- Squash, never merge-commit, for feature branches.
- Subject line: `feat(reporting): <short title> (E<N>)`.
- Body includes Co-Authored-By Claude line.
- Update `docs/milestones/M03b_native_integration_status.md` after every merge.

### Docs commits straight to main

- Bundled docs commits (briefs + prompts + tracker updates + handoff docs) go directly to `main` with the Co-Authored-By line. No PR for these.
- Convention from previous orchestrator: `docs: round-X merged + ...` or similar.

---

## Bootstrap — paste this into the fresh Claude Code on mac mini

```
You're picking up the orchestrator role for Constance Conservation
cc-dashboard, mid-flight on M03b round 6 (the cutover). Read these in
order:

1. docs/handoff/orchestrator_2026-04-30.md (this is YOUR bootstrap doc)
2. docs/milestones/M03b_native_integration_status.md
3. docs/vision.md
4. docs/executor_briefs/E18_cutover.md

Confirm you have the picture and tell me where step 2 of the round-6
admin runbook stands. Then we'll continue from there.
```

That's all. Pull `main` first (`cd ~/Desktop/cc-dashboard && git pull`),
then open Claude Code in that directory, then paste.

---

## Sign-off

Laptop session retiring at this commit. M03b round 6 is in good shape — code merged, step 1 done, step 2 (SC token) is the only thing blocking the rest of the runbook. After steps 2–6, M03b is done; round-7 work picks up from `docs/vision.md` §5–6 and the M04–M09 milestone docs.

No in-flight work, no open PRs, working tree clean.

Good luck.
