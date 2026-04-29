# M03b — Native Integration: live status

**Repo (canonical):** `constance-conservation/cc-dashboard`
**Last updated:** 2026-04-29 (round 2 merged: E10b + E11 + E13; round 3 briefs ready)

**Audit artefacts:**
- `docs/audit/standalone_feature_inventory.md` — master feature inventory + revised plan
- `docs/audit/operations_data_wiring.md` — Operations 3-page deep-dive

---

## Goal

Replace the standalone reporting app (`constance-reporting.vercel.app`) with native Next.js routes inside cc-dashboard at `app/(dashboard)/reporting/*`, then archive the standalone repo and retire its Vercel deploy.

---

## Brief status

| Brief | Scope | Status |
|---|---|---|
| **E8**  | Landing page + scaffold | ✅ Merged 2026-04-29 (`abe77e2`) |
| **F1**  | Sub-nav (Overview / Operations / Reports) | ✅ Merged with E8 |
| **E9**  | Clients/Sites/Zones drill-down + cadence selector | ✅ Merged 2026-04-29 (`3f28162`) |
| **E10** | Reports list + read-only viewer | ✅ Merged 2026-04-29 (`82e8d0d`) |
| **E13** | Operations 3 pages (Staff/Chemicals/Species) + sub-nav un-grey | ✅ Merged 2026-04-29 (`5510202`) |
| **E10b** | Report preview + edit mode + image uploads | ✅ Merged 2026-04-29 (`b2fd8f3`) |
| **E11** | Inspections page | ✅ Merged 2026-04-29 (`94ddcf1`) |
| **E12** | Pipeline Health page | 🟡 Brief ready (`docs/executor_briefs/E12_pipeline_health_page.md`) |
| **E14** | Global Sites view + sub-nav entry | 🟡 Brief ready (`docs/executor_briefs/E14_global_sites_view.md`) |
| **E15** | Inline CRUD across reporting views | 🟡 Brief ready (`docs/executor_briefs/E15_inline_crud.md`) |
| **E15b** | Add/delete sites + zones + new client | ⏸ Deferred from E15 |
| **E16** | Generation pipeline (full port + tests) | ⏸ Queued (~2 days) |
| **E17** | Sync + webhook (Vercel Cron incremental) | ⏸ Queued |
| **E18** | Cutover — flip APPS card href, retire standalone | ⏸ Final brief |

After **E12 + E14** merge, the entire standalone is fully *viewable* through cc-dashboard.
After **E10b + E15** merge, all editing is in cc-dashboard (E10b done, E15 in flight).
After **E16 + E17**, generation + sync run in cc-dashboard.
After **E18**, standalone retired.

---

## Round 3 in flight

```
E12  /reporting/pipeline                     ½ day  worktree -e12
E14  /reporting/sites + sub-nav entry        ½ day  worktree -e14
E15  inline CRUD on /reporting/clients/*    full day  worktree -e15
```

All three use isolated git worktrees (per the round-2 lessons).

Orchestrator prompts:
- `docs/orchestrator_prompts/E12_session_prompt.md`
- `docs/orchestrator_prompts/E14_session_prompt.md`
- `docs/orchestrator_prompts/E15_session_prompt.md`

---

## Decisions logged

### Pre-audit
- Stack mismatch resolved by porting (not merging). cc-dashboard = Next 16, standalone = Node service.
- Both apps point at the same Supabase project (`ymcyunspmljaruodjpkd`).
- F1 sub-nav design: 5 items linked + 3 Operations greyed (E13 un-greyed all).
- Reporting views read-only initially, with cadence selector exception in E9.
- Sort `/reporting/clients` alphabetically, archived clients NOT hidden.

### Post-audit (2026-04-29)
- E14 (Global Sites view) — IN.
- E15 (Inline CRUD on reporting views) — IN.
- E16 (Generation pipeline) — full port (NOT lightweight wrap), with tests + analysis on incoming reports.
- E17 (Sync) — default to Vercel Cron incremental + manual CLI for backfill.
- E10b (Edit mode + uploads) — bumped up in priority by Peter; merged in round 2.

### Round 2 (2026-04-29 evening)
- Three parallel sessions in one working tree caused branch chaos (E11/E13 stashed each other's work). E10b session figured out git worktrees mid-flight.
- **Standing rule from round 3: each parallel session uses its own `git worktree`** — see `docs/orchestrator_prompts/README.md` for the pattern.
- E15 split: edit-field + schedule widget = E15. Add/delete = E15b (deferred).
- HTML sanitisation on `client_reports.html_content` deferred per E10b PR caveat — must be revisited before reports are emailed or rendered to non-editing users.

---

## Out-of-band tracks

| Track | Status |
|---|---|
| Service-role key rotation | ⏸ Optional, low urgency. Pasted into transcript 2026-04-29. |
| `next lint` broken on cc-dashboard | ⏸ Pre-existing, low urgency. |
| Schema migration parity in cc-dashboard | ⏸ Post-E18 hygiene. Standalone owns ~20 tables not in cc-dashboard's `supabase/migrations/`. |
| Canonical-vs-raw count fix in Chemicals + Species | ⏸ Optional follow-up. Mirrored standalone behaviour in E13. |
| HTML sanitisation on saved report HTML | ⏸ Low-medium urgency depending on E18 audience. |

---

## Next session entry point

1. Read this file + `docs/audit/standalone_feature_inventory.md`.
2. If round 3 (E12/E14/E15) is in flight, watch for PR notifications.
3. Once round 3 lands, plan round 4: probably E15b + E16 starts.
4. Update this status doc as briefs land.
