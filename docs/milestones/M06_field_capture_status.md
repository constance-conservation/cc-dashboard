# M06 — Field Capture & Site-Triage Tool: live status

**Status:** ⏸ Queued. Outline only — full scope drafted at start of M06.
**Last updated:** 2026-04-29

---

## Goal

A mobile-first field-capture tool that lets operators and supervisors record site state *as work happens*: photo + GPS + AI weed identification + zone tag + primary/secondary/maintenance stage label + density bracket. Replaces the current pattern (Apple Notes + photos in iOS Photos + zone numbers in heads + post-visit data entry) with a single capture flow that writes structured records into the client-context spine.

**Critical:** runs *alongside* Safety Culture, does not replace it. Cameron explicit — the reporting pipeline that M03b ports cannot be moved off SC for the foreseeable future. M06 captures the data SC doesn't capture (zone-level pins, walk-the-site notes, primary/secondary/maintenance stage tags, density estimates, weed IDs at point-of-observation). SC continues to own daily work reports and chemical application records.

---

## Sketch of scope

- Mobile-friendly progressive web app (or native if the camera/GPS access requires it). No app-store deployment in v1 — install via add-to-home-screen.
- Capture flow: open app → select site (or auto-detect by GPS proximity) → "drop pin" with photo, GPS, optional voice memo → AI suggests weed species ID with confidence, supervisor confirms/corrects → tag zone + stage + density bracket → save.
- Zone definitions are pulled from `sites.zone_info_json` (already in schema). Pins write to a new `site_observations` table joined to zone.
- AI weed ID uses on-device or platform-hosted vision model. Confidence threshold flags low-confidence IDs for desk review (per the standalone's confidence-scoring principle).
- Photos go to Supabase Storage with the same private-bucket pattern as M03b's `reports` bucket.
- Offline capture: pins queue locally if no connection; sync on reconnect. Idempotent uploads.

---

## Why this is the third milestone

M04 + M05 unblock operator time at the *desk* (tendering + forecasting). M06 unblocks operator time *in the field* (capturing without re-entering). Together they close the loop: less time entering, more captured, more accurate forecasts, faster confident bids. M06 also produces the input data that powers M08's treatment-effectiveness analytics — every weed-ID + stage tag + photo over time is the training signal for "what works."

---

## Dependencies

- M04 + M05 in flight or landed (this is a sequencing preference, not a hard dep — M06 could start in parallel if sufficient executor capacity exists).
- AI weed ID model selection — could be an off-the-shelf vision model, a fine-tuned model, or a tiered approach (cheap classifier + expensive verifier on low confidence). Decide at start of M06.
- Field-test cohort — at least one supervisor willing to dogfood the capture flow and provide feedback. Without dogfooding, the UX will not converge.

---

## Out of scope for v1

- Polygon drawing (the m² density problem flagged in `docs/audit/.../gap_analysis.md`). Stays manual via Google Earth until v2.
- Replacing Safety Culture's daily work report. Hard veto from Cameron.
- Drone-imagery ingestion — that's M09.

---

## Next session entry point

When M06 starts:
1. Read this file + `M04` + `M05` status + `~/Desktop/constance-reporting/docs/density_polygon_model.md`.
2. Decide PWA vs native (camera/GPS access is the deciding factor).
3. Decide AI weed ID approach (off-the-shelf vs fine-tuned vs tiered).
4. Draft E briefs for: capture flow UI, observations schema, weed-ID integration, offline sync, supervisor onboarding.
