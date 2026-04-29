# M03b — Native Integration: live status

**Repo (canonical):** `constance-conservation/cc-dashboard`
**Last updated:** 2026-04-29 evening (round 4 merged: E15b + E16. Generation pipeline live in cc-dashboard.)

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
| **E15** | Inline CRUD across reporting views | ✅ Merged 2026-04-29 (`f7e03aa`) |
| **E12** | Pipeline Health page | ✅ Merged 2026-04-29 (`14cee96`) |
| **E14** | Global Sites view + sub-nav entry | ✅ Merged 2026-04-29 (`e98d42c`) |
| **E15b** | Add/delete sites + zones + new client | ✅ Merged 2026-04-29 (`5f332a1`, PR #42) |
| **E16** | Generation pipeline (full port + tests + Vercel Cron) | ✅ Merged 2026-04-29 (`84bdbec`, PR #43) |
| **E17** | Sync + webhook (incremental only — backfill dropped) | ⏸ Queued — brief drafted (round 5), session prompt ready |
| **E18** | Cutover — flip APPS card href, retire standalone | ⏸ Final brief |

After **E12 + E14**, the entire standalone is fully *viewable* through cc-dashboard.
After **E10b + E15 + E15b**, all CRUD is in cc-dashboard.
After **E16**, generation runs in cc-dashboard (manual button + daily Vercel Cron).
After **E17**, sync from the SC API runs in cc-dashboard.
After **E18**, standalone retired.

---

## Round 4 — merged 2026-04-29

```
E15b add/delete clients/sites/zones        ✅ 5f332a1 (PR #42 — no shared-file overlap with E16)
E16  generation pipeline + Vercel Cron     ✅ 84bdbec (PR #43 — Server Actions in lib/reporting/generation/actions.ts to avoid actions.ts conflict)
```

Both executed in parallel `git worktree` directories. By design (executor briefs and orchestrator prompts) the two PRs share no files: E15b appends CRUD to existing page-level `actions.ts` files, E16 places its Server Actions in a new `lib/reporting/generation/actions.ts`. Zero merge conflicts.

After round 4, M03b is at **fully editable + generation-capable** state. The reporting hierarchy can be created/edited/deleted, and reports can be generated on demand or on schedule from inside cc-dashboard. Forward queue: **E17** (sync + webhook), **E18** (cutover).

### What round 4 added

**E15b — CRUD primitives**
- New Server Actions in existing files: `createClient` (in `app/(dashboard)/reporting/clients/actions.ts`), `createSite`, `createZone`, `deleteSite`, `deleteZone` (in `app/(dashboard)/reporting/clients/[id]/sites/actions.ts`). All use the RLS-fallback pattern from E15: try user-session, fall back to admin client on RLS-shaped errors.
- Delete gating: site cannot be deleted while it has zones; zone cannot be deleted while it has inspections. Errors surface inline with the dependent count.
- New components: `AddClientButton`, `AddSiteButton`, `AddZoneButton`, `DeleteRowMenu`, plus a shared `Modal` primitive. No new npm deps.
- Wired into `/reporting/clients`, `/reporting/clients/[id]`, `/reporting/clients/[id]/sites/[siteId]`. Global `/reporting/sites` view remains read-only.
- `organization_id` resolution: `SELECT id FROM organizations LIMIT 1` (single-tenant pattern matching `lib/store/CCStateContext.tsx`'s boot-time logic). `createSite`/`createZone` copy `organization_id` from the parent row.

**E16 — Generation pipeline**
- Full port of standalone `src/report/` and `src/bin/generate_report.ts` to `lib/reporting/generation/` (~2700 LOC + 51 vitest tests, 38 ported + 13 new). `vitest run` is now `npm run test`.
- Server Actions in `lib/reporting/generation/actions.ts`: `generateClientReport`, `generateSiteReport`, `generateZoneReport`. Each returns `{ ok: true, clientReportId, htmlSize, docxBytes } | { ok: false, error }`.
- `<GenerateReportButton>` refactored from `<Link>` to client component that calls the Server Action; exported props (`{scope, id, label?}`) unchanged so all existing callsites continue to work.
- Vercel Cron route at `app/api/cron/generate-reports` — bearer-token auth via `CRON_SECRET`; iterates clients with non-null `report_frequency`, generates if due (idempotent, daily-with-skip).
- DOCX output uploaded to Supabase Storage bucket `reports` (auto-created on first run, private). `client_reports.docx_url` stores a 1-year signed URL.
- Anthropic SDK (`claude-sonnet-4-6`) for narratives; falls back to placeholders if `ANTHROPIC_API_KEY` is unset (matches standalone `--skip-llm`).
- New deps: `@anthropic-ai/sdk`, `docx`. New devDep: `vitest`. New config files: `vercel.json`, `vitest.config.mts`.

---

## Verification surface — round 4 (for engineers running regression)

**Required env vars on Vercel project (preview + production):**

| Var | Owner | Effect if missing |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | pre-existing | App fails to boot |
| `SUPABASE_SERVICE_ROLE_KEY` | pre-existing (E10b) | Generation fails; admin-fallback for CRUD fails |
| `ANTHROPIC_API_KEY` | E16 — optional | Narratives fall back to placeholders; reports still generate |
| `CRON_SECRET` | **E16 — NEW, must be set** | Cron route returns 500; manual generation Server Actions still work |

Generate `CRON_SECRET` with `openssl rand -hex 32` and add via Vercel dashboard or `vercel env add CRON_SECRET`. The Vercel platform sends it as `Authorization: Bearer <CRON_SECRET>` on every cron invocation.

> **Status (2026-04-29):** Peter is deferring the `CRON_SECRET` add — manual generation via the button works without it; only the daily cron is paused until it lands. Engineers running regression on the cron route will see 500 until then; safe to skip that one row of the checklist.

**Storage:**
- Bucket `reports` in Supabase project `ymcyunspmljaruodjpkd` is auto-created on the first generation call (private). No manual setup required.
- DOCX object key shape: `<client_uuid>/<filename>.docx`. `client_reports.docx_url` is a 1-year signed URL into this bucket.

**Cron registration:**
- `vercel.json` registers `/api/cron/generate-reports` on schedule `0 6 * * *` (daily 06:00 UTC).
- After deploy, verify in Vercel project → Settings → Crons.

**Regression checklist:**

CRUD (E15b):
- [ ] `/reporting/clients` "+ Add client" → modal → save → lands on new client detail page.
- [ ] Client detail "+ Add site" → modal → save → site appears in Sites panel.
- [ ] Site detail "+ Add zone" → modal → save → zone appears in Zones panel.
- [ ] "⋯ → Delete zone" on a zone with no inspections → confirm → row gone.
- [ ] "⋯ → Delete zone" on a zone with inspections → inline error includes count, row stays.
- [ ] "⋯ → Delete site" on a site with no zones → confirm → row gone.
- [ ] "⋯ → Delete site" on a site with zones → inline error includes count, row stays.
- [ ] Inline editing (E15) and CadenceSelector / ScheduleSelector still work — no regressions.
- [ ] Clicking the "⋯" menu inside a site card does NOT navigate to the site detail page.

Generation (E16):
- [ ] Click "Generate report" on a small zone → "Generating…" → land on `/reporting/reports/[id]` with rendered HTML.
- [ ] Download linked DOCX → opens in Word/LibreOffice without error.
- [ ] `client_reports` row in DB has `html_content`, `narrative_sections`, `docx_url` (signed URL).
- [ ] Re-generate same scope+period → upserts (no duplicate row in `client_reports`).
- [ ] `curl -H "Authorization: Bearer $CRON_SECRET" https://<preview>/api/cron/generate-reports` → 200 JSON `{ok: true, summary: {considered, generated[], skipped[], failed[]}}`.
- [ ] Same curl with no/wrong header → 401.
- [ ] Same curl when `CRON_SECRET` is unset on the deploy → 500.
- [ ] If `ANTHROPIC_API_KEY` unset, generation still completes; narrative sections contain placeholder bullets.
- [ ] `npm run test` (vitest) passes 51/51 in CI.

**Known limitations / round-4 caveats:**

1. **Signed URL TTL: 1 year.** `client_reports.docx_url` stores a 1-year signed URL — anyone holding the URL can download for that period. Acceptable for internal use; consider tightening before externally sharing reports (see out-of-band track).
2. **Cadence interval check uses approximate intervals** (30 days for monthly, 91 for quarterly, 365 for annually) inside `isClientDueForGeneration`. Period-bound calculation is calendar-aware and correct; only the "is this client due?" check is approximate. Drifts ~1 day per fire for monthly clients.
3. **`annually` report cadence falls back to `quarterly`** in the renderer (the standalone's `Cadence` type has only weekly/monthly/quarterly). Annually-cadence clients get a quarterly-shaped report covering the previous quarter, not the previous year. Flag if any client uses `annually`.

---

## Orchestrator handoff

A fresh orchestrator session can be spawned in `/Users/feelgood/Desktop/cc-dashboard/`.
Bootstrap from `docs/handoff/orchestrator_2026-04-29.md` — that file
covers what the new session needs that isn't in the live tracker
(Peter's preferences, round-2 lessons, Supabase setup, etc.).

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

### Round 4 (2026-04-29 evening)
- E15b `createClient` org-id resolution: option (b) — `SELECT id FROM organizations LIMIT 1`. Single-tenant deployment; mirrors `lib/store/CCStateContext.tsx` boot-time pattern. `createSite` / `createZone` copy `organization_id` from parent row.
- E15b deletes are hard-delete with no cascade. Block if site has zones / zone has inspections; surface count in error.
- E16 generation pipeline: full port (not CLI wrapper), placed under `lib/reporting/generation/`. New deps: `@anthropic-ai/sdk`, `docx`. New devDep: `vitest`.
- E16 storage: DOCX uploaded to Supabase Storage `reports` bucket (private, auto-created). `client_reports.docx_url` stores a 1-year signed URL — chosen over the object-path option to avoid query-layer changes that were out of scope for round 4.
- E16 cron schedule: daily `0 6 * * *`. Route is idempotent (skips when not due) so daily-with-skip is safe and lets monthly clients fire on the right day-of-month rather than waiting for the next Monday.
- E16 zone-scope auto-generation in cron: OFF for v1 — manual trigger only. Cron generates whole-client reports.
- E16 `ANTHROPIC_API_KEY` missing → placeholder narratives, no error. Matches standalone `--skip-llm`.
- E16 conflict-avoidance design: Server Actions placed in NEW `lib/reporting/generation/actions.ts` (not appended to page-level `actions.ts` files E15b modified). Resulted in zero file overlap with E15b at merge.

---

## Out-of-band tracks

| Track | Status |
|---|---|
| Service-role key rotation | ⏸ Optional, low urgency. Pasted into transcript 2026-04-29. |
| `next lint` broken on cc-dashboard | ⏸ Pre-existing, low urgency. |
| Schema migration parity in cc-dashboard | ⏸ Post-E18 hygiene. Standalone owns ~20 tables not in cc-dashboard's `supabase/migrations/`. |
| Canonical-vs-raw count fix in Chemicals + Species | ⏸ Optional follow-up. Mirrored standalone behaviour in E13. |
| HTML sanitisation on saved report HTML | ⏸ Low–medium urgency depending on E18 audience. |
| Signed-URL TTL on `client_reports.docx_url` | ⏸ Low urgency. Currently 1-year. Tighten by storing object path + adding a small append-only helper in `lib/reporting/queries.ts` that signs on each fetch (E15-style append). ~½-day brief, post-E18. |
| Cadence interval approximation in `isClientDueForGeneration` | ⏸ Low urgency. Uses 30/91/365-day intervals; drifts ~1 day per fire. Move to calendar-aware due-check if it ever causes a complaint. |
| `annually` cadence renderer | ⏸ Low urgency. Annually-cadence clients get a quarterly-shaped report covering the previous quarter. Add an `annually` branch to the renderer if any client uses it. |
| Style duplication across modal/Add buttons (E15b) | ⏸ Trivial nit. Extract `triggerStyle` / `inputStyle` / `btnPrimary` / `btnSecondary` into a shared `components/reporting/modalStyles.ts` if maintenance becomes painful. |

---

## Next session entry point

1. Read this file + `docs/audit/standalone_feature_inventory.md`.
2. Forward queue: **E17** (round 5 — brief and session prompt are ready at `docs/executor_briefs/E17_sync_webhook.md` and `docs/orchestrator_prompts/E17_session_prompt.md`), then **E18** (round 6, cutover).
3. **E17 plan settled (2026-04-29):** Backfill explicitly DROPPED from scope. Standalone has been syncing since project inception so historical data is already in Supabase. E17 ports incremental sync (Vercel Cron every 15 min) + webhook (`/api/webhooks/sc/`) only. If a one-shot full re-backfill is ever needed, run the standalone's `npm run sync:backfill` from the local clone at `~/Desktop/constance-reporting/`.
4. After E17 lands, **E18** is ~1 hour: flip the APPS card href on cc-dashboard home from `https://constance-reporting.vercel.app/` → `/reporting`, **update the registered webhook URL at Safety Culture** to point at cc-dashboard's `/api/webhooks/sc/`, retire standalone Vercel deploy, archive `FrostyFruit1/constance-reporting` repo. Optionally delete `/Users/feelgood/Desktop/CONSTANCE\ CONSERVATION/` legacy dir.
5. Update this status doc as briefs land.
