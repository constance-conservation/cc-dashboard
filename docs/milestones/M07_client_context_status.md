# M07 — Client Context & Relationship Layer: live status

**Status:** ⏸ Queued. Outline only — full scope drafted at start of M07.
**Last updated:** 2026-04-29

---

## Goal

Surface the **client-context spine** — the data accumulated progressively by M03b (reports), M04 (tenders), M05 (resource history), and M06 (field captures) — as relationship intelligence. This milestone is *all reads*: it doesn't write new data, it makes the data already in the spine usable for relationship-building.

Two distinct surfaces, designed together:

1. **Internal view** (Cameron, Ryan, project managers) — a "client intelligence" page per client showing: tender history, win/loss patterns, all sites + their trends, delivery history, recent observations, what they care about, who at the council holds the relationship, recent meeting notes, billing patterns. Includes commercial intel that should never be shown to the client themselves.
2. **Client-facing portal** — a curated subset of the internal view, exposed to the client themselves. The "we noticed X on your site" angle: trend dashboards, recent observations, photo galleries, treatment summaries, upcoming work. Deepens trust and stickiness — clients see they're getting more than just a contractor, they're getting a data partner.

---

## Why two surfaces matter

The exact data shown on the client-facing portal is **a load-bearing decision** taken at M07 design time, not now. Some data (tender history, internal cost) must never leak. Other data (site trends, treatment effectiveness, photo galleries) is high-value to share. The boundary is also commercial — the more the platform shows clients about *their* sites, the more they value continued engagement, but also the more careful the data-rights terms in the underlying contract have to be.

This is flagged for explicit decision at M07 kickoff, with operator input on what's safe to share vs. what creates a competitive risk.

---

## Sketch of scope

- New route family at `/reporting/clients/[id]/intel` for the internal view.
- Aggregation queries over the spine — most are reads against existing tables; some materialised views may help (decided at start of M07).
- Client-portal surface lives at a separate domain or sub-path with its own auth (clients shouldn't see the operator dashboard chrome). Likely a separate Next.js route group with a thin auth layer.
- Per-client data-rights config — what's shared, what's withheld, configurable per contract.
- Notification surface (optional v1): proactive intel pushes — "we noticed X on your site, here's what we recommend."

---

## Why this is queued, not earlier

The spine has to be deep before the surface is worth building. With only M03b's reporting data, the per-client view is thin. After M04 (tender history), M05 (resource history), and M06 (field observations) have written for a few months, the per-client view becomes substantial enough to be a relationship asset. Building M07 too early surfaces a thin spine and undersells the platform.

---

## Dependencies

- **M04, M05, M06 landed.** All three feed the spine. Without them, M07 surfaces little of value.
- **Data-rights legal review.** Before the client-facing portal goes live, the underlying contracts need terms that explicitly name what data is shared and who owns derivatives.
- **Client design partner.** At least one client willing to be the first portal user and provide feedback.

---

## Out of scope

- Client self-service editing (clients changing their own data). Out of scope; the platform is a window, not a bidirectional sync.
- Per-client white-labelling. Defer until volume justifies it.
- Real-time push notifications. Daily digest in v1.

---

## Next session entry point

When M07 starts:
1. Read this file + the four prior milestone status docs.
2. Hold an explicit decision session on **what data goes on the client-facing portal** — output is a permitted-data-list signed off by the operator.
3. Confirm contract data-rights language is in place for the first design-partner client.
4. Draft E briefs for: internal client-intel page, client portal scaffolding, auth, data-rights config, the first design-partner onboarding.
