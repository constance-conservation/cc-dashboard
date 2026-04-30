# M08 — Treatment Effectiveness Analytics (Stream 2): live status

**Status:** ⏸ Queued. Outline only — full scope drafted at start of M08.
**Last updated:** 2026-04-29

---

## Goal

Build the **treatment effectiveness data layer** — the long-form moat. For every treatment recorded (chemical × method × species × season × site-conditions), correlate against subsequent return-visit observations to derive an effectiveness score. Surface the resulting dataset as: (a) decision support for new tenders ("for this site type and weed mix, treatment X has historically yielded Y% effectiveness at $Z/m²"), (b) a defensible methodology in tender responses, (c) the foundation of a regulator-trusted assessor position over time.

This is Stream 2 from the standalone `data_streams_spec.md`. The standalone repo has the full schema sketch at `~/Desktop/constance-reporting/milestones/M06_data_warehouse.md` — the M08 brief here will promote that content into cc-dashboard's tree at start.

---

## Sketch of scope

- New tables (per the standalone spec): `treatment_outcomes`, `treatment_analysis` materialised view, indexes on existing inspection tables for cross-period queries.
- Optionally: a small Safety Culture template change to capture supervisor effectiveness ratings on return visits (effective / partial / ineffective). Decided per `data_streams_spec.md` Stream 2 — coordinated with Cameron + Ryan.
- Backfill script: identify overlapping site visits in existing data and flag for supervisor review.
- Surfacing UI at `/reporting/analytics/effectiveness/*` — filterable by chemical, species, season, site type, client.
- Integration into M05 forecast engine: similarity-matching can weight by historical-effectiveness, not just resource-consumption.
- Integration into M07 client portal: clients see "effectiveness on your sites" as a trust-building artefact.

---

## Why this is queued behind M04–M07

Treatment effectiveness needs **time-series observation data** to be meaningful. ≥3 months of clean Stream 1 + field-capture data after E18 cutover is the minimum, ≥6 months is ideal. M06 in particular dramatically improves the input quality (structured weed IDs, stage tags, density brackets at point-of-observation). Building M08 before M06 means the analytics layer is built on top of free-text inspection notes, which limits its precision.

---

## Dependencies

- M03b complete (Stream 1 ingestion stable in cc-dashboard).
- M06 in flight or landed (structured field-capture data significantly improves input quality).
- ≥3 months of accumulated post-E18 data, ideally ≥6.
- Optional: Safety Culture template change for return-visit effectiveness ratings (Cameron + Ryan to action).

---

## Out of scope

- Predictive modelling for *new* treatments (recommending treatments that haven't been tried before). Stays human judgment for v1 — the platform reports what's been observed, doesn't extrapolate.
- Cross-organisation benchmarking. Internal-only data. Don't dilute the moat.

---

## Next session entry point

When M08 starts:
1. Read this file + `~/Desktop/constance-reporting/milestones/M06_data_warehouse.md` (Stream 2 sections).
2. Audit cc-dashboard's accumulated data quality — is there enough volume and structure to make the analytics meaningful?
3. Coordinate with Cameron + Ryan on the Safety Culture template change for return-visit ratings.
4. Promote the Stream 2 schema design from the standalone milestone doc into a new `docs/architecture/treatment_effectiveness_schema.md`.
5. Draft E briefs for: schema migration, backfill, materialised views, surfacing UI, M05 forecast integration.
