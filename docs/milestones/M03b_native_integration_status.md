# M03b — Native Integration: live status

**Repo (canonical):** `constance-conservation/cc-dashboard`
**Source-of-truth plan:** originally
`~/Desktop/constance-reporting/milestones/M03b_native_integration.md`,
mirrored here as the **live tracker** since `constance-reporting` will
be archived in E18. Keep this file updated as briefs ship.

**Last updated:** 2026-04-29 (post-audit, plan revised E10–E18).

**Audit artefacts:**
- `docs/audit/standalone_feature_inventory.md` — master feature inventory + revised plan
- `docs/audit/operations_data_wiring.md` — Operations 3-page deep-dive (parallel session)

---

## Goal

Replace the standalone reporting app at `constance-reporting.vercel.app`
with native Next.js routes inside cc-dashboard at
`app/(dashboard)/reporting/*`, then archive the standalone repo and
retire its Vercel deploy.

Original plan (E8–E12) was sketched before the standalone was fully
crawled. After the audit, surface area is bigger than five briefs —
revised lineup is **E8 + F1 + E9 + E10–E18 (10 forward briefs, ~9 days)**.

---

## Brief status

| Brief | Scope | Status | Detail |
|---|---|---|---|
| **E8** | Scaffold `/reporting/*` + landing page | ✅ Merged 2026-04-29 (`abe77e2`) | PR #9 |
| **F1** | Sub-nav (Overview / Operations / Reports) | ✅ Merged with E8 (`9ba953f` then squashed) | — |
| **E9** | Clients / Sites / Zones drill-down + cadence selector on client detail | ✅ Merged 2026-04-29 (`3f28162`) | PR #29 · `docs/executor_briefs/E9_clients_sites_zones_hierarchy.md` |
| **E10** | Reports list + read-only viewer (open PDF in new tab, download DOCX). Edit mode deferred to E10b. | 🟡 Brief drafted post-audit, not yet implemented. | `docs/executor_briefs/E10_reports_page.md` |
| **E11** | Inspections page — wide table + 4 KPIs | ⏸ Queued | — |
| **E12** | Pipeline Health page — KPIs, donut, bar list, recent failures, sync state | ⏸ Queued | — |
| **E13** | Operations 3-pages: Staff & Hours, Chemicals, Species (read-only) | ⏸ Queued, scoping done | `docs/audit/operations_data_wiring.md` |
| **E14** | Global Sites view — cross-client roll-up (added per Peter 2026-04-29) | ⏸ Queued. Adds nav entry. | — |
| **E15** | Inline CRUD across reporting views: editable fields, add/delete sites and zones, schedule widget for sites/zones | ⏸ Queued. Confirmed in scope by Peter. | — |
| **E10b** | Edit mode + image uploads (`contentEditable` iframe + drop zones for location maps + period maps) | ⏸ Deferred — Peter said "edit mode can come later" | — |
| **E16** | Generation pipeline — port `src/report/` + `src/bin/generate_report.ts` into cc-dashboard's `lib/reporting/generation/`. Wire to "Generate Now" + Vercel Cron. **Includes tests for incoming reports + analysis/processing logic per Peter.** | ⏸ Queued. Full port (NOT lightweight CLI wrap). | — |
| **E17** | Sync pipeline + webhook | ⏸ Queued. Default: Vercel Cron incremental + manual CLI for full backfill. Confirm before implementing. | — |
| **E18** | Cutover — flip APPS card href, retire standalone Vercel deploy, archive `FrostyFruit1/constance-reporting` | ⏸ Final brief | — |

---

## Decisions logged

### Pre-audit
- **Stack mismatch resolved by porting, not merging.** Standalone is Node + TS pipeline; cc-dashboard is Next.js 16. (Pre-E8.)
- **Both apps point at the same Supabase project** (`ymcyunspmljaruodjpkd`), confirmed 2026-04-29. F2 finding "more photos on port" was data drift, not divergence.
- **F1 sub-nav design:** 5 items mapped to existing routes are linked; 3 Operations items greyed.
- **Reporting views read-only initially**, with one approved exception in E9: cadence selector (writes `clients.report_frequency`).
- **Sort on `/reporting/clients`:** alphabetical by `long_name || name`. Archived clients NOT hidden.

### Post-audit (2026-04-29)
- **`page-sites` (E14) — IN.** Cross-client global sites view will be ported and added to sub-nav as `Overview → Sites`.
- **CRUD on reporting views (E15) — IN.** Inline editing on `/reporting/clients/*` and similar reporting routes, in addition to cc-dashboard's master `/clients` CRUD page.
- **Generation pipeline (E16) — full port.** Lift `src/report/` into cc-dashboard's `lib/reporting/generation/` with tests for incoming reports + analysis/processing. NOT a lightweight CLI wrapper.
- **Sync pipeline (E17) — undecided.** Default if not overridden: Vercel Cron incremental sync + manual CLI for full backfill (60s Cron timeout likely insufficient for backfill).
- **Edit mode (E10b) — deferred.** Comes after E16. Read-only viewer (E10) ships first.
- **Operations brief (E13) is one PR**, not three sub-briefs. Recommended by parallel-session audit (`operations_data_wiring.md` §4): all three pages share infrastructure, are zero-schema, and the sub-nav un-greying should be atomic.

---

## Recommended order of execution

```
1. E10  Reports read-only viewer       (½ day)
2. E11  Inspections page               (½ day)
3. E12  Pipeline Health page           (½ day)
4. E13  Operations 3-pages             (1 day)
5. E14  Global Sites view              (½ day) — un-greyed nav final
6. E15  Inline CRUD                    (1 day)
7. E16  Generation pipeline + cron     (2 days)
8. E10b Edit mode + uploads            (1 day)
9. E17  Sync + webhook                 (1 day)
10. E18 Cutover                        (~1h)
```

After step 5: standalone is fully VIEWABLE through cc-dashboard.
After steps 6+8: all editing is in cc-dashboard.
After step 7: generation is in cc-dashboard (manual + cron).
After step 9: all data flow is in cc-dashboard (sync + webhook).
After step 10: standalone retired.

---

## Out-of-band tracks

| Track | Status | Detail |
|---|---|---|
| Service-role key rotation | ⏸ Optional, low urgency. | Service-role JWT was pasted into a parallel session transcript on 2026-04-29 to unblock `vercel env pull`. Anon key + URL are designed-public, lower concern. |
| `next lint` broken on cc-dashboard | ⏸ Pre-existing, low urgency. | Next 16 removed `next lint`. `package.json` script needs replacing with `eslint .`. |
| Schema migration parity in cc-dashboard | ⏸ Post-E18 hygiene. | Standalone owns ~20 tables that cc-dashboard's `supabase/migrations/` does not contain. After E18 retires standalone, these migrations should be backfilled into cc-dashboard for ownership clarity. |
| Canonical-vs-raw count fix in Chemicals + Species | ⏸ Optional, post-E13. | Standalone uses `*_name_raw` for the count and `canonical_name` for matching, so cards under-count. Mirror standalone in E13 for parity, fix as follow-up if Peter agrees. |

---

## Next session entry point

1. Read this file + `docs/audit/standalone_feature_inventory.md`.
2. If E10 brief at `docs/executor_briefs/E10_reports_page.md` is still aligned with goals, cut `feature/reporting-port-e10` off `main` and implement.
3. Update this status doc as briefs land.
