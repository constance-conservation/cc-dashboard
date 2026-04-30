# M04 — Tender Intake & Drafting Pipeline: live status

**Repo (canonical):** `constance-conservation/cc-dashboard`
**Last updated:** 2026-04-29 (initial scope, pre-implementation — E briefs not yet drafted)

---

## Goal

Eliminate the bulk of the time the operator spends on **tendering**: ingest tender opportunities from email and (where available) council portals, parse the brief documents, draft a response (capacity statement, methodology, narrative), and surface it for human review and send. Persist every tender — won, lost, pending — into the platform's client-context spine so future tenders can be answered in seconds with reference to past work for the same council/client.

Tendering today: emails arrive across multiple inboxes, the operator reads each PDF/portal page, walks the site (this stays manual — it's the competitive edge), then writes the methodology and capacity statements from a blank page. M04 removes the "from a blank page" half. The site visit and assessment quality remain entirely human.

---

## Brief status

| Brief | Scope | Status |
|---|---|---|
| **E19** | Tender ingestion: email pull (auto-forward → ingestion endpoint) + portal scraper for the 1–2 highest-volume council portals | ⏸ Queued — brief not yet drafted |
| **E20** | Tender document parsing — PDF / DOCX → structured fields (scope, budget, deadline, location, deliverables, evaluation criteria) | ⏸ Queued |
| **E21** | Tender record schema + storage — `tenders`, `tender_documents`, `tender_responses` tables; reads/writes hang off existing client/site spine | ⏸ Queued |
| **E22** | Response drafting engine — capacity statement, methodology, narrative drafts using past responses + site context as context | ⏸ Queued |
| **E23** | Tender review UI at `/reporting/tenders/*` — list, detail, edit-draft, mark-as-submitted, attach-final-response | ⏸ Queued |
| **E24** | Won/lost outcome tracking + feedback loop into resource history (joins to M05's project ledger) | ⏸ Queued — depends on M05 schema |

E briefs are drafted round-by-round, not all up-front. E19 + E20 are the natural first round (ingestion + parsing). E21 + E22 are the second (storage + drafting). E23 + E24 are the third (UI + outcome loop).

---

## Acceptance criteria

After M04 lands, the following holds:

- [ ] Tenders arriving by email at registered inboxes are ingested into the platform within 5 minutes of arrival.
- [ ] At least one council tender portal is scraped on a schedule (frequency TBD per portal's terms of service); new opportunities surface in the platform without manual checking.
- [ ] For at least 80% of ingested tenders, the parser extracts: title, issuing body, scope summary, budget (if disclosed), deadline, location, evaluation criteria — flagged for human review when confidence is low.
- [ ] Each tender has a draft response generated automatically, drawing on: prior responses to the same council, prior responses for similar scope, the site-context spine for the relevant client (if known).
- [ ] Operator can review, edit, accept, or reject the draft at `/reporting/tenders/[id]`. Editing is structured (per section: capacity statement, methodology, narrative) — not free-text overwrite.
- [ ] Final submitted response is stored against the tender record. Won/lost outcome can be marked retroactively.
- [ ] All tender data joins cleanly into the existing client-context spine — every tender is queryable by client, site, period, evaluation criterion, outcome.
- [ ] No tender data is lost: the system handles partial parsing, malformed PDFs, and document attachments gracefully (flag-and-store, never drop).

---

## Dependencies

- **M03b complete (E18 cutover landed).** The client-context spine has to be in cc-dashboard, not the standalone, before tenders start writing to it.
- **Email forwarding rules in place.** Tender emails from each registered inbox auto-forward to a single ingestion endpoint. This is an out-of-platform configuration step (Gmail/Outlook rules) — needs a one-time setup.
- **Anthropic API budget headroom.** The drafting engine uses `claude-sonnet-4-6` for response generation. Budget impact to be estimated once tender volume is known.
- **No new Supabase migrations until E21 lands.** Schema decisions are part of E21's brief, not made ahead.

---

## Decisions logged

### Pre-implementation (2026-04-29)

- M04 is sequenced before M05 (forecast cockpit) because tender ingestion writes the *opportunity-side* data; M05 writes the *resource-side* data and consumes M04's output for similarity matching. M04 + M05 are paired, but M04's storage layer needs to land first so M05's forecast can read it.
- Ingestion is email-first, portal-second. Council portals are heterogeneous and many don't expose APIs — email auto-forward is the universal lowest-common-denominator. Portals get scraped only where volume justifies it.
- The site visit and assessment workflow is **explicitly out of scope for M04**. That's the operator's competitive edge and stays manual until M06 (field capture) makes it tool-supported. M04 only addresses the document-side bottleneck.
- Drafts are *drafts*. Nothing auto-submits. The platform can't send a tender response on its own, ever.
- Response drafting context window: prior responses to the same council take precedence over generic templates. The platform should compound — every submitted response makes the next draft for that council better.

### Open questions (resolve at E-brief draft time)

- Schema shape for `tenders` — single table with JSON sidecar for parsed fields, or fully structured? Decide at E21.
- Email ingestion endpoint — Vercel function with bearer auth? Inbound webhook from a Gmail watch? Decide at E19.
- Portal scraping cadence and ToS posture — per-portal decision at E19.
- Response drafting confidence scoring — what threshold flags a draft for "operator must review every section before send" vs "operator can fast-path"? Decide at E22.

---

## Out-of-band tracks

| Track | Status |
|---|---|
| Tender outcome backfill (historical wins/losses for similarity training) | ⏸ Optional. Worth it if E22 drafting quality lags expectation. |
| Multi-inbox routing (different council families to different ingestion lanes) | ⏸ Defer. Single ingestion lane until volume forces splitting. |
| OCR for scanned-PDF tenders | ⏸ Defer. Most modern council tenders are text-PDFs. Add OCR if rejection rate at E20 exceeds 10%. |

---

## Next session entry point

1. Read this file + the post-M03b sequencing memory + `docs/vision.md` §5–6.
2. Confirm cap-table arrangement is settled per Peter's external notes (this is a non-engineering blocker — flag if not yet resolved).
3. Draft executor brief **E19** (tender ingestion: email + first portal) with: target inboxes, ingestion endpoint shape, storage of raw documents in Supabase Storage, idempotency keys.
4. Draft executor brief **E20** (parsing) in the same round if E19's brief leaves enough context window — they share file overlap considerations (see M03b round 4 for the worktree-isolation pattern).
5. Draft orchestrator session prompt for the E19+E20 round at `docs/orchestrator_prompts/E19_session_prompt.md`.
6. Update this status doc as briefs land.
