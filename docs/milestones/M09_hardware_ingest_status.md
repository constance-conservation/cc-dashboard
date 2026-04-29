# M09 — Hardware Data Integration: live status

**Status:** ⏸ Queued. Outline only — full scope drafted at start of M09.
**Last updated:** 2026-04-29

---

## Goal

Ingest hardware-generated data (drone surveys, robot telemetry, machine-mounted vision feeds, autonomous mowing/spraying logs) into the cc-dashboard platform via a clean API, joining it to the existing client-context spine at the site/zone level. The platform becomes the integration substrate for any hardware that operates on the sites the platform already knows about.

**Strict scope boundary: no hardware engineering lives in this repo.** No firmware, no robotics control code, no drone autopilot integration, no vision-model training. M09 is *ingest only* — receive structured hardware-side data via a documented API, validate it, store it in the spine, surface it. The hardware itself is built and operated outside the cc-dashboard repo.

---

## Sketch of scope

- New ingest API at `/api/hardware/*` with bearer auth. One endpoint per hardware data type (drone survey, robot telemetry, camera observation, treatment-application log).
- Schema for hardware-derived observations — joins to existing `sites` and `zones`, distinct from human-captured `inspections` to keep provenance clean.
- Validation layer — rejects malformed payloads, flags low-confidence claims for human review (same confidence-scoring principle as elsewhere in the platform).
- Surfacing: hardware-derived data appears alongside human observations in the relevant site/zone views, marked as machine-sourced. Stream 2 effectiveness analytics (M08) optionally factor it in.

---

## Why this is queued last

Hardware integrations are gated by what hardware actually exists and is producing useful data. Until the hardware side has shipped a real product producing real data, there's nothing to ingest. Building the ingest layer ahead of the hardware is over-engineering; building it alongside the first hardware product is just-in-time.

This milestone activates after the China-trip hardware diligence (June 2026) lands in something concrete — at minimum, a defined data shape from a defined device that the platform should ingest.

---

## Dependencies

- A defined hardware product (or product family) with a stable output data shape — engineered outside this repo.
- The client-context spine (M03b + M04 + M06) deep enough that hardware-derived observations can be joined meaningfully.
- API authentication and rate-limiting decisions — particularly important if hardware streams large payloads frequently.

---

## Out of scope (permanently)

- **Any hardware engineering.** Firmware, control code, drone integration, vision training — all live outside this repo.
- **Hardware ownership or operations data.** This repo never knows the cap-table or commercial terms of the hardware side.
- **Hardware purchasing decisions.** Out of scope for the platform.

---

## Next session entry point

When M09 starts:
1. Read this file + the current state of the hardware-side product spec (which lives outside this repo).
2. Define the ingest data contract — what fields, what units, what frequency, what auth, what rate limits.
3. Draft E briefs for: ingest API, schema migration, validation, surfacing UI.
4. Confirm the data contract is stable on the hardware side before building — the platform shouldn't iterate on a moving spec.
