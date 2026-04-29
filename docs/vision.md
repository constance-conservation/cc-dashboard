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

**TBD** — to be filled in from the business-detail transcript.

The framing we'll be building from in the next planning session:

- **Three plausible directions** for the immediately-next phase:
  1. **Polish M03b debt** — sanitisation, signed-URL TTL, cadence accuracy,
     other out-of-band tracks. ~½ day. Conservative.
  2. **One thin analytics slice** — pick a single high-value cut (e.g.,
     chemical × species effectiveness over time, or hours-per-zone trends)
     and prototype it as a new `/reporting/analytics` page on top of existing
     Stream 1 data. ~3–5 days. Validates analytics *value* before paying the
     M06 warehouse cost.
  3. **Full M06 warehouse buildout** — schema + materialised views + ingestion
     pipelines for Streams 2–4 per the milestone doc. ~2–4 weeks. Substantial
     ahead-of-need investment; benefits compound as more data lands.
- **Working hypothesis (orchestrator's recommendation, 2026-04-29):**
  option 2 — pick a single most-asked-for analytics cut, ship it, validate
  the value, then decide whether to invest in the full M06 schema or iterate
  on more slices first.
- **What the transcript will inform:** which specific business questions are
  most valuable to answer first, what the priority ordering across Streams 2–6
  looks like in light of how the business actually works, and any constraints
  (contract obligations, stakeholder visibility requirements, billing
  triggers) that should shape the build.

---

## 6. Scope plan

**TBD** — to be drafted in the planning session that consumes the transcript.

Will live as concrete milestone briefs under `docs/milestones/` once the
shape is settled, following the M03b conventions:
- One status doc per milestone (e.g., `M04_*.md`, `M06_*.md`).
- Executor briefs at `docs/executor_briefs/EXX_<short_name>.md`.
- Orchestrator session prompts at `docs/orchestrator_prompts/EXX_session_prompt.md`.

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
