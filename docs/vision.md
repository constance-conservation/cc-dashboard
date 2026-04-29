# Constance Conservation — Vision

> **Status:** skeleton — 2026-04-29. Captures the orientation framing inherited from
> the standalone repo's foundation docs (`SOUL.md`, `PRINCIPLES.md`,
> `data_streams_spec.md`, `scope.md`, `milestones/M06_data_warehouse.md` at
> `~/Desktop/constance-reporting/`). Sections marked **TBD** will be filled in
> from the business-detail transcript that drives the next planning session.

---

## 1. Mission

Constance Conservation is the platform that turns a manual, labour-intensive
ecological reporting operation into a **data-driven platform** that:

1. **Automates** the Safety Culture → client-report pipeline (the "report
   factory" — saves the 6–8 hours/month of manual consolidation per client).
2. **Builds** a structured ecological database (the "data moat") from every
   inspection processed.
3. **Delivers** client-facing and internal dashboards that replace manual
   status updates and enable data-driven decisions about treatment, crew
   deployment, and contract performance.

It does **not** exist to: replace human judgment on ecological assessments,
send communications autonomously, or make business decisions about pricing,
staffing, or client strategy. All outputs are drafts for human review.

(Mission inherited from the standalone's `SOUL.md`. Restated here in
cc-dashboard's voice; the standalone gets archived in E18.)

---

## 2. Operating principles

Carried forward from the standalone (`PRINCIPLES.md`). Apply to all design
and engineering decisions on this platform:

- **Reliability over speed.** The reporting pipeline must never lose data.
- **Accuracy over automation.** AI-enriched outputs use confidence scoring;
  low-confidence results go to human review, not auto-acceptance.
- **Incremental delivery over big-bang releases.** Each milestone produces
  usable output; partially automated drafts that need human review beat
  waiting for full automation.
- **Domain language matters.** Ecological land management terms (bush
  regeneration, riparian zones, weed species, chemical application methods,
  cubic metres cleared) — not generic tech speak.
- **Text > brain.** Decisions, gotchas, API behaviours go into doc files
  immediately. Memory rots; files persist.

---

## 3. The six data streams

The platform's value compounds across six streams. Stream 1 is the
foundation; Streams 2–6 derive from or extend Stream 1's data and earn
their cost only after enough of it has accumulated.

| # | Stream | Status | Source | Human input |
|---|---|---|---|---|
| 1 | **Automated extraction** — site, crew, hours, chemicals, species, photos, observations | ✅ Live (Stream 1 ingestion via standalone; M03b ports it into cc-dashboard) | Safety Culture Daily Work Reports + Chemical Application Records | None |
| 2 | **Treatment effectiveness** — what works on which species in which conditions | ⏸ Future (needs 3–6 months of Stream 1 data accumulation) | Stream 1 + small SC template change | Supervisor review of inferred effectiveness |
| 3 | **Crew & equipment intelligence** — hours-per-zone trends, staff capability tags, equipment usage | ⏸ Future | Stream 1 + capability tags layer | Manual capability tagging once |
| 4 | **Ecological knowledge base** — species IDs (with photos), planting records, follow-up survival, seasonal calendar, chemical interactions | ⏸ Future | Stream 1 + targeted enrichment + planting/assessment templates in SC | Manual species ID confirmation; planting/assessment data entry |
| 5 | **Stakeholder & contract intelligence** — committee members, meeting notes, contracts, KPIs | ⏸ Future | Manual entry + meeting transcripts | Substantial — this is administrative data |
| 6 | **Financial intelligence** — TBD scope (mentioned in `data_streams_spec.md`) | ⏸ Future | TBD | TBD |

Stream details (tables, materialised views, prerequisites) live in
`~/Desktop/constance-reporting/milestones/M06_data_warehouse.md`. Promote
the relevant content into cc-dashboard's `docs/milestones/` as each stream
is started.

---

## 4. Where we are (2026-04-29)

**M03b — Native Integration** is the active milestone. It's the port of
the standalone reporting app into cc-dashboard at `app/(dashboard)/reporting/*`,
followed by retiring the standalone deploy.

- ✅ Rounds 1–4 merged. UI scaffold, drilldown, viewer, edit mode + uploads,
  inspections, operations pages, pipeline health, global sites, inline
  editing, full CRUD, generation pipeline + Vercel Cron.
- 🔄 Round 5 in flight: E17 (sync + webhook port, incremental only — backfill
  dropped because Stream 1 data is already in Supabase from the standalone's
  prior runs).
- ⏸ Round 6: E18 (cutover — flip the home-page APPS card href, update SC
  webhook registration, retire the standalone deploy, archive the repo).

After E18, **Stream 1 is fully resident in cc-dashboard.** That's the
foundation Streams 2–6 build on.

Live status: `docs/milestones/M03b_native_integration_status.md`.

---

## 5. What comes after M03b

The post-M03b direction shifts from *reporting* (now solved) to **operator
efficiency**. The bottleneck is not insight-starvation — it's the time
the business owners spend on tendering, rostering, and resource allocation
that should be spent on strategy, partnerships, and the next stage of the
moat. Until that time is freed, no amount of analytics moves the needle:
nobody has the bandwidth to act on it.

The shaping observations:

- **Tendering eats most of one operator's time.** Email-driven, council-by-council,
  document-heavy, judgment-heavy. The site-visit and assessment work is
  competitive edge — the response *drafting* work is repetitive and
  AI-tractable.
- **Capacity is the constraint, not pipeline.** The business is winning
  more than it can deliver. Capacity-aware bidding (intelligent estimates
  of resources required for a new tender, diffed against current commitments)
  is the unlock — making bidding *easier* with accurate forecasts, not
  throttling it.
- **Industry knowledge sits in two heads.** Primary/secondary/maintenance
  staging, weed ID, density estimation, zone triage. Field tools that
  capture this *as work happens* are the only way to delegate it without
  losing fidelity.
- **Client relationships compound.** Every tender, every site visit, every
  report deepens what's known about a given client and their sites. If
  this context is captured structurally rather than tribally, it becomes
  the asset the platform sells on.

**Cross-cutting design principle:** every milestone after M03b writes
into a single **client-context spine** (the `organizations → clients →
sites → zones → inspections → client_reports` hierarchy that M03b ships).
Tenders hang off it. Resource consumption hangs off it. Field captures
hang off it. The spine is additive, not rewritten — and it becomes the
asset that justifies treating cc-dashboard as a standalone product over
time.

---

## 6. Scope plan

Milestones M04–M09. M04 and M05 are immediately actionable post-E18
cutover; M06–M09 are queued with scope sketched but deferred for round-by-round
expansion. Each milestone follows M03b's status-doc conventions
(`docs/milestones/MXX_*.md`), with executor briefs and orchestrator
session prompts written round-by-round once the technical shape is
locked.

| # | Milestone | One-line scope | What it writes to the spine | Status |
|---|---|---|---|---|
| **M04** | Tender Intake & Drafting Pipeline | Email → tender-doc parse → response draft. Owner reviews and sends. | Tender artefacts per client/site (bid history, methodology, scope) | ⏸ Queued — full status doc at `docs/milestones/M04_tender_pipeline_status.md` |
| **M05** | Resource Forecast & Allocation Cockpit | Plant/equipment/staff registry + live allocation + historic-project ledger + similarity-matching: "this tender needs X, you have Y, gap is Z" | Resource consumption per past project, joined to client/site | ⏸ Queued — `docs/milestones/M05_resource_forecast_cockpit_status.md` |
| **M06** | Field Capture & Site-Triage Tool | Mobile photo + GPS + AI weed ID + zone tag + primary/secondary/maintenance stage. Runs alongside Safety Culture. | Photos, density, weed IDs, stage tags per site | ⏸ Queued — outline at `docs/milestones/M06_field_capture_status.md` |
| **M07** | Client Context & Relationship Layer | Two surfaces: (a) internal relationship intelligence aggregating the spine, (b) curated client-facing portal | (Reads only — surfaces what M03b/M04/M05/M06 wrote) | ⏸ Queued — outline at `docs/milestones/M07_client_context_status.md` |
| **M08** | Treatment Effectiveness Analytics (Stream 2) | Treatment × species × season effectiveness — the long-cycle data moat | (Reads + computes derived materialised views) | ⏸ Queued — outline at `docs/milestones/M08_treatment_effectiveness_status.md` |
| **M09** | Hardware Data Integration | Ingest hardware-generated data (drone surveys, robot telemetry) via clean API. No hardware engineering in this repo. | Site-level survey data (vegetation indices, machine activity) | ⏸ Queued — outline at `docs/milestones/M09_hardware_ingest_status.md` |

**Sequencing rationale:** M04 and M05 are paired — M04 puts tender data into
the spine; M05's forecast engine is what makes that data load-bearing for
decisions. M06 is the field-side counterpart that closes the operator loop
(less time entering, more captured). M07 is the surfacing layer that makes
the spine externally visible. M08 (the long-form analytics moat) earns
its keep only after Streams 1 + field-capture have fed it for ≥3 months.
M09 lands when external hardware data is ready to ingest — engineered
elsewhere, ingested here.

**Conventions retained from M03b:**
- One status doc per milestone (`docs/milestones/MXX_*.md`).
- Executor briefs at `docs/executor_briefs/EXX_<short_name>.md` — written round-by-round.
- Orchestrator session prompts at `docs/orchestrator_prompts/EXX_session_prompt.md`.
- Each parallel executor session uses its own `git worktree`.
- Squash-merge feature PRs with subject `feat(<scope>): <title> (E<N>)`.

---

## 7. Source materials (until E18 archives them)

The standalone repo at `/Users/feelgood/Desktop/constance-reporting/` holds
the canonical foundation. Read these for context that isn't yet in
cc-dashboard's tree:

- `SOUL.md` — mission, identity, values
- `PRINCIPLES.md` — operating principles (text > brain, flag > guess, etc.)
- `POLICIES.md` — policies
- `scope.md` — original M00–M06 milestone roadmap
- `data_streams_spec.md` — the six data streams, in detail
- `docs/gap_analysis.md` — report-template → SC-data → schema gap map
- `docs/ingestion_architecture.md` — dual-path ingestion design
- `docs/density_polygon_model.md` — density bands + polygon workflow
- `docs/report_generation_pipeline.md` — pipeline architecture
- `milestones/M06_data_warehouse.md` — warehouse + Streams 2–6 deliverables
- `milestones/M07_historical_backfill.md` — historical backfill (relevance TBD)

After E18 archives the repo, the local clone at `~/Desktop/constance-reporting/`
remains as a read-only reference — clones don't disappear when GitHub repos
are archived. Promote the load-bearing content into cc-dashboard's
`docs/` tree before considering deleting the local clone.
