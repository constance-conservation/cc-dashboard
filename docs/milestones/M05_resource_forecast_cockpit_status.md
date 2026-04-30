# M05 — Resource Forecast & Allocation Cockpit: live status

**Repo (canonical):** `constance-conservation/cc-dashboard`
**Last updated:** 2026-04-29 (initial scope, pre-implementation — E briefs not yet drafted)

---

## Goal

Turn the platform into the **operations brain**: a single source of truth for plant, equipment, staff, and projects-in-flight that can answer "do we have capacity for this tender?" with numbers rather than gut-feel. The forecast engine matches an incoming tender brief against past similar projects, estimates resources required, and diffs against current allocation to recommend take / sub-contract / hire / pass.

Today: hours and project state live in Google Sheets (one tab per site). Equipment is tracked by QR codes that field staff often forget to update. Allocation lives in the operator's head. New tender arrives and the question "can we deliver this?" gets answered by intuition, which is good but unscalable. M05 makes the answer queryable, defensible, and improvable over time.

---

## Brief status

| Brief | Scope | Status |
|---|---|---|
| **E25** | Resource registry — plant, equipment, staff, certifications. Schema + CRUD + onboarding flow | ⏸ Queued — brief not yet drafted |
| **E26** | Allocation state — live "who/what is where" view backed by `staff_allocations`, `equipment_allocations`. Auto-updates from inspection records (M03b spine) where possible. | ⏸ Queued |
| **E27** | Historic project ledger — every past project's resources-consumed (hours, equipment-days, materials, kilometres) joined to the client/site spine. Backfilled from M03b's existing `inspections` data on day one. | ⏸ Queued |
| **E28** | Similarity-matching engine — given a tender brief (from M04), find the closest historical projects by scope, location, weed mix, density, season, client. Returns ranked matches with confidence. | ⏸ Queued — depends on M04 tender storage (E21) |
| **E29** | Forecast layer — for a tender, return resource estimate (X tractor-days, Y staff-hours, Z plant) with confidence bands. Diffs against current allocation. Outputs take / sub / hire / pass recommendation. | ⏸ Queued |
| **E30** | Cockpit UI at `/reporting/operations/cockpit` — live capacity view, forecast-on-demand for any tender, drag-to-reallocate scratchpad | ⏸ Queued |

E briefs are drafted round-by-round. E25 + E26 + E27 are the natural first round (registry + state + history). E28 + E29 land once M04's tender storage is real. E30 is the surfacing UI.

---

## Acceptance criteria

After M05 lands:

- [ ] Every piece of plant, equipment, and staff member is registered with capabilities/certifications and a clear "available / allocated / unavailable" state.
- [ ] Live allocation view shows where every resource is committed for the next 30 days, with confidence (e.g. "Joe is on site X with 80% confidence — last update 3 days ago").
- [ ] Historic project ledger covers ≥6 months of past projects backfilled from M03b's `inspections` data, with resources-consumed per project queryable.
- [ ] Given any new tender (parsed via M04), the platform returns within 5 seconds: top-3 historical matches with similarity scores, estimated resources required (with confidence bands), gap vs current capacity, and a take/sub/hire/pass recommendation.
- [ ] Recommendation is *advisory*, not binding — the operator can override and record why.
- [ ] Forecast accuracy improves over time: every won tender's actual consumption gets fed back into the ledger, retraining the similarity model implicitly.
- [ ] No silent failures — if data quality is too poor for a confident estimate, the platform says so rather than guessing.

---

## Dependencies

- **M04 in flight or landed.** The forecast engine reads tender records from M04's storage layer. M05 can start (E25–E27) before M04 finishes — registry, state, and history don't need tenders. E28+ requires M04's tender schema.
- **M03b complete.** The historic ledger backfill (E27) reads from M03b's `inspections` + `client_reports` tables. Without those, the ledger has no priors and the forecast engine has nothing to learn from.
- **Field-capture data is a force-multiplier, not a blocker.** The forecast quality improves as M06's structured field data lands (better records of "what was actually done"), but M05 starts with M03b data and improves on its own.

---

## Decisions logged

### Pre-implementation (2026-04-29)

- **M05 is a forecast engine, not a circuit-breaker.** The goal is to make bidding *easier* with intelligent estimates, not to throttle it with a no-bid threshold. The operator should bid more confidently and faster, not less.
- **Forecast learns from M03b data on day one.** The platform already has months of "what resources were used per site per month" in the existing `inspections` and `client_reports` tables. The historic ledger (E27) backfills from that — M05 doesn't wait for M04 to start producing tender data.
- **Resource registry is single-tenant.** Same pattern as the existing `organizations` resolution in `lib/store/CCStateContext.tsx` — one organisation, no multi-tenant scaffolding for the registry.
- **Allocation state inference is best-effort.** Where staff/equipment allocations can be derived from inspection records (`inspection_personnel`, equipment-on-site fields), they auto-update. Where they can't, they're manually maintained. Don't block on perfect inference.
- **Similarity matching is feature-engineered first, embedding-based later.** E28 starts with handcrafted features (scope match, location distance, weed-mix overlap, density bracket, seasonality, client) — interpretable, debuggable, defensible. Embedding-based similarity is a follow-on if the simple approach plateaus.
- **The recommendation engine is advisory.** No automation that auto-submits, auto-passes, or auto-allocates. The operator decides; the platform shows them the numbers.

### Open questions (resolve at E-brief draft time)

- Schema for the historic ledger — denormalised flat table optimised for similarity queries, or normalised joins to existing `inspections`? Decide at E27.
- Where does staff capability data live — extend `staff` table, or new `staff_capabilities` joined table? Decide at E25.
- Forecast confidence calibration — Bayesian, conformal prediction, or simple bootstrap intervals? Decide at E29.
- Cockpit UI — net-new page or extension of the existing `/reporting/operations/*` family? Decide at E30.

---

## Out-of-band tracks

| Track | Status |
|---|---|
| Multi-tenant resource registry (when CC takes on a sister contracting business) | ⏸ Defer. Not needed in v1. |
| Auto-roster generation from forecast outputs (system suggests who works where) | ⏸ Out of scope for M05. Possible follow-on. |
| Equipment maintenance scheduling (forecasting when plant goes offline) | ⏸ Defer. Add if equipment-failure rate becomes a forecast accuracy issue. |
| External similarity training data (e.g. industry benchmarks) | ⏸ Defer. Internal data is the moat — don't dilute. |

---

## Next session entry point

1. Read this file + `M04_tender_pipeline_status.md` + `docs/vision.md` §5–6.
2. Confirm M04's E21 schema decision is locked (M05's E27/E28 design depends on the tender record shape).
3. Draft executor brief **E25** (resource registry) — schema, CRUD pages, onboarding flow.
4. Draft executor brief **E26** (allocation state) and **E27** (historic ledger) in parallel if file isolation allows. E26 writes new pages; E27 writes a backfill script + materialised view. Should not overlap.
5. Draft orchestrator session prompt for the E25+E26+E27 round at `docs/orchestrator_prompts/E25_session_prompt.md`.
6. Update this status doc as briefs land.
