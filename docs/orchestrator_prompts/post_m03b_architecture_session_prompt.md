# Orchestrator prompt — Post-M03b architecture audit + integration design

Copy the body below into a fresh Claude Code instance opened in
`/Users/feelgood/Desktop/cc-dashboard/`.

**Note on shape:** this is **not** an executor round. No code changes. No PR.
Output is two architecture docs committed to main, plus a punch list of
decisions returned to Peter for sign-off. Single context window expected to
suffice; if it tightens, prioritise Phase 2 (design) over Phase 1 (audit).

---

```markdown
# Planning brief — Post-M03b architecture audit + integration design

## What this session is for

M03b is finishing (E17 merged, E18 cutover queued). The post-M03b roadmap
(M04–M09) has been planned at the milestone level. This session bridges
the gap: take the milestone plans, audit the existing cc-dashboard
codebase, and produce a concrete integration design that answers — for
every milestone — *where in the code does this live, what schema does it
add, what auth/infrastructure decisions does it force?*

You produce two documents and a punch list. You do not write executor
briefs (that's the next session, per milestone). You do not change code.
You do not run migrations. You make zero unilateral architectural
decisions — every call comes back to Peter as a proposal with rationale.

## Big picture

`constance-conservation/cc-dashboard` is the Next.js platform that's
absorbing the standalone reporting app via M03b. Post-M03b, six
milestones extend the platform:

| # | Milestone | One-liner |
|---|---|---|
| M04 | Tender Intake & Drafting Pipeline | Email → tender-doc parse → response draft |
| M05 | Resource Forecast & Allocation Cockpit | Plant/equipment/staff registry + forecast engine |
| M06 | Field Capture & Site-Triage Tool | Mobile photo + GPS + AI weed ID |
| M07 | Client Context & Relationship Layer | Internal client-intel view + curated client portal |
| M08 | Treatment Effectiveness Analytics (Stream 2) | Treatment × species × season effectiveness moat |
| M09 | Hardware Data Integration | Ingest drone/robot data via API; no hardware engineering in this repo |

Full milestone status docs live at `docs/milestones/MXX_*.md`.

## Cross-cutting principles (apply throughout the integration design)

These two principles are confirmed and load-bearing — every architectural
decision should respect them.

### 1. Spine-first
Every milestone writes additively to the M03b client-context spine
(`organizations → clients → sites → zones → inspections → client_reports`
+ operations tables). M03b's structure is canonical. New tables hang
off it; existing tables are not refactored.

### 2. Agentic-by-default
**Every domain operation has a Route Handler twin alongside its Server
Action.** UIs call the Server Action (type-safe, revalidates, handles
redirects). Agents call the Route Handler at `/api/{domain}/{op}`
(bearer auth, JSON in/out, idempotency keys). Both delegate to a shared
`lib/` function so business logic lives in one place.

This is non-negotiable — the platform is built to be operable by AI
agents, not just humans clicking buttons. It adds ~30% to the
implementation cost of every domain operation. The integration plan
must show concretely how this pattern lays out for M04–M09.

### 3. Tile-grid composition (dashboard chrome)
The home page is a tile-grid of independent workflow surfaces. Each
milestone earns its own top-level tile (`/reporting/*`, `/tenders/*`,
`/operations/*`, `/capture/*`, `/portal/*`, `/analytics/*`). Tenders
are **not** under reporting — tenders are upstream of reporting. The
integration plan must propose the updated tile shape.

## Settled scope decisions (do NOT re-litigate)

These came out of the planning conversation with Peter on 2026-04-29
and are locked. Reference but do not propose alternatives.

| # | Decision | Notes |
|---|---|---|
| 1 | Cover all six milestones (M04–M09) in the integration plan | M04+M05 deep, M06+M07 medium, M08+M09 sketch |
| 2 | Propose-for-sign-off mode | Zero unilateral architectural calls. Every decision returns to Peter for review. |
| 3 | M04 lives at top-level `/tenders/*`, not under `/reporting/` | And the broader tile-grid principle (see above) |
| 4 | M07 client portal is a separate route group `app/(portal)/*` in the same Next.js app | Different layout shell, different auth, same deployment, **all `lib/` code shared** |
| 5 | M06 capture is a PWA, not native | Lower friction. Upgrade to native only if camera/GPS reliability forces it after dogfooding. |
| 6 | Safety Culture template-change conversation is Peter's responsibility off-band | Integration plan does not draft Cameron-facing asks |
| 6b | SC retirement is a future M10 hypothesis-test, not a present decision | M06 runs alongside SC; if M06 demonstrates parity, M10 considers retirement |
| 7 | RBAC: identify inflection point (must-land-before-M06), sketch role taxonomy, flag as load-bearing | Full RBAC migration is its own E-brief later |

## Required reading (in order)

Read fully before producing anything. Do not skim.

1. **Strategic & roadmap context:**
   - `docs/vision.md` (especially §5–6)
   - `docs/milestones/M03b_native_integration_status.md` (current state + out-of-band tracks)
   - `docs/milestones/M04_tender_pipeline_status.md`
   - `docs/milestones/M05_resource_forecast_cockpit_status.md`
   - `docs/milestones/M06_field_capture_status.md`
   - `docs/milestones/M07_client_context_status.md`
   - `docs/milestones/M08_treatment_effectiveness_status.md`
   - `docs/milestones/M09_hardware_ingest_status.md`

2. **Repo conventions:**
   - `CLAUDE.md` (collaboration rules)
   - `docs/orchestrator_prompts/README.md` (worktree pattern)
   - `WORK.md` (sprint context — likely needs refresh after this session)
   - `docs/handoff/orchestrator_2026-04-29.md` (round-3+ context)

3. **External reference (read for Stream 2/4 schema patterns):**
   - `~/Desktop/constance-reporting/data_streams_spec.md`
   - `~/Desktop/constance-reporting/milestones/M06_data_warehouse.md`

4. **The cc-dashboard codebase audit (Phase 1 — read in this order):**
   - `app/page.tsx` and any home-page composition (the APPS card grid)
   - `app/layout.tsx`
   - `app/(dashboard)/layout.tsx` and the sub-nav structure
   - `app/(dashboard)/reporting/*` — full route tree, including `actions.ts` files per page
   - `app/api/cron/*` and `app/api/webhooks/*` (post-E17)
   - `lib/store/CCStateContext.tsx` (global state shape)
   - `lib/reporting/queries.ts`, `lib/reporting/types.ts`
   - `lib/reporting/generation/` (E16 pattern — full port with tests)
   - `lib/reporting/ingestion/` (post-E17 — sync + webhook pattern)
   - `lib/supabase/*` (client setup, RLS-fallback-to-admin pattern from E15+)
   - `supabase/migrations/*` (current schema state — note migration numbering)
   - `vercel.json` (cron entries)
   - `package.json` (current deps + scripts)
   - `vitest.config.mts`
   - `middleware.ts` if present

5. **Auto-memory (private context for this session):**
   - `~/.claude/projects/-Users-feelgood-Desktop-cc-dashboard/memory/MEMORY.md` and the linked files

## Phase 1 — Audit (~1 hour, read-only)

Produce `docs/architecture/current_state_2026-04-29.md`. Capture:

- **Route taxonomy** — every route currently in `app/`, what it does, what
  layout it uses, what auth (if any).
- **Sub-nav and tile composition** — current shape of the home page and
  the reporting sub-nav. Note: the tile-grid principle implies this needs
  updating; capture *what's there*, not what should change.
- **lib structure** — module boundaries, what each module owns, the
  pattern for Server Actions vs queries vs domain logic.
- **State/context** — `CCStateContext` shape, what global state is held,
  how auth/session bootstraps.
- **Schema state** — every table currently in `supabase/migrations/`,
  with one-line summaries and the migration number that introduced it.
  Note: E17 is recently merged, ingestion-driven schema may be in flux.
- **API surface** — every existing `/api/*` route handler, what it does,
  what auth gate (CRON_SECRET bearer pattern, etc.).
- **Auth model** — current single-role posture, RLS policies, the
  user-session-with-admin-fallback pattern.
- **Infrastructure** — Vercel project shape, env vars in `.env.local`
  (don't print values; just enumerate keys), cron entries, any external
  services (Anthropic SDK, etc.).
- **Test posture** — vitest setup, what's covered, the `lib/reporting/
  generation/__tests__/` pattern from E16.
- **Out-of-band tracks observed** — anything you notice that's pre-existing
  debt the next milestones might collide with (sanitisation, signed-URL
  TTL, cadence drift, etc., per M03b status doc).

Format: structured sections with file paths everywhere. This doc becomes
the reference for every future planning session — make it skim-able.

## Phase 2 — Integration design (~2 hours, propose-for-sign-off)

Produce `docs/architecture/post_m03b_integration_plan.md`. For each
milestone M04–M09, propose:

### Per-milestone sections

1. **Route placement** — exact paths, route groups, layouts. (M04+ confirmed
   top-level; M07 confirmed `(portal)`. Propose for the others.)
2. **lib placement** — directory layout under `lib/`, module boundaries.
   Mirror the M03b pattern (`lib/reporting/{queries,generation,ingestion}/`)
   adapted per milestone.
3. **Schema additions** — tables the milestone introduces, with a
   **reserved migration-number range** per milestone (e.g. M04 reserves
   `020-029`, M05 `030-039`, etc.). Don't write the SQL; specify the
   tables + key columns + relationships to the spine.
4. **API surface (agentic-by-default)** — for every domain operation,
   show the Server Action signature and the paired Route Handler endpoint.
   At minimum, list ~3–5 example operations per milestone in this
   table-of-twins format. The Route Handler auth gate pattern (bearer
   token, similar to E16's `CRON_SECRET` pattern but extended for
   agent-callable operations) is a load-bearing decision — propose a
   shape (e.g. per-org API keys with scopes) and flag for sign-off.
5. **Auth/RBAC implications** — what role(s) does this milestone
   introduce? When does multi-role become forced? The plan should
   identify the inflection (likely M06 or M07 — pick one and justify)
   and sketch the full role taxonomy: `operator`, `supervisor`,
   `project-manager`, `client`, `agent` (for API callers), `hardware-ingest`
   (for M09). Don't write the migration; specify what RBAC needs to do.
6. **Infrastructure decisions** — cron entries, external service
   dependencies (Anthropic SDK extensions, vision models for M06,
   embedding/ML for M05's similarity engine, etc.), file storage
   buckets, any service splits (default: stay all-Vercel-Supabase
   in-process; flag any forced splits with rationale).
7. **Tile-grid update** — what tile this milestone adds to the home
   page, what icon/label, what its "ready / coming soon / locked"
   state is at each phase.
8. **Cross-milestone dependencies** — what this milestone needs from
   prior milestones; what later milestones need from this one.

### Cross-cutting sections (after the per-milestone breakdowns)

- **Migration number reservation map** — clean table showing M04→M09
  ranges, with current `supabase/migrations/` state at the top.
- **API surface aggregate** — every Route Handler the platform will
  expose by end of M09, grouped by domain. Becomes the input to a
  future "Public API documentation" milestone if/when that ships.
- **RBAC migration timeline** — when each role lands, what permissions
  it gets, what data it can see/modify.
- **Home page evolution sequence** — how the tile grid changes as each
  milestone ships. Cleanest if home is data-driven (tiles loaded from
  config, not hardcoded) — flag if so.
- **Forced revisits to M03b** — any places where M04+ work *will* need
  to touch existing M03b code (e.g. extending `lib/reporting/queries.ts`
  for client-context joins). Be explicit; surprises here are bad.
- **M03b out-of-band track collisions** — for each pending out-of-band
  track (sanitisation, signed-URL TTL, cadence drift, `annually`
  cadence, schema parity), state whether M04+ work *forces* resolution
  or whether it stays parked.

### Punch list (the closing section of the integration plan)

A bulleted list of every architectural decision you've proposed,
explicitly flagged for Peter's sign-off. Format:

- **[Decision-N]** *<one-line statement of the decision>*
  - **Recommendation:** ...
  - **Alternative considered:** ...
  - **Rationale:** ...
  - **Awaiting:** Peter's confirm / adjust.

Every load-bearing decision gets one. The session does not move forward
on any [Decision-N] without explicit confirmation in a follow-up session.

## Hard constraints

- **NO code changes.** Read-only audit + new docs only.
- **NO migrations executed.** Schema reservations are paper-only.
- **NO E-brief drafting.** Phase 3 (round-by-round briefs) is a different session.
- **NO worktree needed** — all output is docs, single tree is fine.
- **NO modifications to any existing M03b file** (no edits to `app/(dashboard)/reporting/*`, `lib/reporting/*`, etc.). Audit reads only.
- **NO commercial / IP / cap-table material in either output doc.** This repo is engineering-only. If a decision touches commercial concerns, flag it in the punch list as "out-of-scope-for-this-doc, see Peter's personal notes" without elaborating.
- **NO unilateral architectural decisions.** Every call goes back to Peter via the punch list.
- **NO scope creep into M03b out-of-band tracks** unless an M04+ decision forces resolution. Flag collisions; do not pre-empt.
- **DO NOT push to `main` mid-session.** Single commit at end with both new docs.

## What you ARE expected to do

- Read everything in the required-reading list.
- Produce `docs/architecture/current_state_2026-04-29.md` (Phase 1).
- Produce `docs/architecture/post_m03b_integration_plan.md` (Phase 2).
- Update `WORK.md` to reflect the post-M03b sprint planning state (replace any stale M03b content with a "M04 ready to start, integration plan landed" entry).
- Update `docs/milestones/M03b_native_integration_status.md` with a note in the "Next session entry point" section pointing forward to the integration plan, so that a future session lands cleanly.
- Commit both docs to `main` directly (per repo convention: docs commits go straight to main with `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`).
- Final report-back to Peter (see format below).

## Branch + commit pattern

This is a docs-only session. Per `CLAUDE.md`:

```
git checkout main && git pull
# ... do the work ...
git add docs/architecture/ docs/milestones/M03b_native_integration_status.md WORK.md
git commit -m "$(cat <<'EOF'
docs: post-M03b architecture audit + integration plan

Captures current cc-dashboard state and proposes integration design
for M04–M09. Decisions returned via punch list for Peter's sign-off
before any executor work starts.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push origin main
```

No PR. No squash-merge. Single direct push to main.

## Report-back format

Surface back to Peter at the end of the session as a single chat message:

```
✅ Post-M03b architecture audit + integration design

Files created:
  - docs/architecture/current_state_2026-04-29.md (~N lines)
  - docs/architecture/post_m03b_integration_plan.md (~N lines)

Files updated:
  - docs/milestones/M03b_native_integration_status.md (forward pointer)
  - WORK.md (sprint state refreshed)

Commit: <sha> on main

Audit highlights:
  - <bullet 1>
  - <bullet 2>
  - <bullet 3>

Integration plan highlights:
  - Migration numbers reserved: M04 020-029, M05 030-039, ...
  - RBAC inflection: <milestone> — sketched <N> roles
  - API surface adds ~<N> Route Handlers across M04–M09
  - Tile-grid evolution: <summary>
  - Forced M03b revisits: <count, with paths>

Punch list — decisions awaiting Peter's sign-off:
  - [Decision-1] <statement>
  - [Decision-2] <statement>
  - ...

Concerns/risks identified:
  - <bullet, or "none material">

Suggested next session: M04 round 1 — draft executor briefs E19 (tender ingestion) + E20 (parsing) + orchestrator session prompt.
```

Then stop. Do not start drafting M04 E briefs. Do not begin any code work.

## Procedure summary

1. `git checkout main && git pull`.
2. Phase 1 — read everything in the required-reading list. Audit the codebase. Produce `docs/architecture/current_state_2026-04-29.md`.
3. Phase 2 — design the integration. Produce `docs/architecture/post_m03b_integration_plan.md` with per-milestone sections, cross-cutting sections, and the punch list.
4. Update `WORK.md` and `docs/milestones/M03b_native_integration_status.md` next-session pointer.
5. Commit + push to main per the pattern above.
6. Report back to Peter per the format above.
7. Stop.

## Length budget warning

This is a meaty single-context-window session. Estimate: ~3–4 hours of
session time. If your context begins to tighten:

- **Prioritise Phase 2 over Phase 1.** Audit can be lighter (skim the
  obvious bits, deep-read the load-bearing files); design must be
  thorough because the punch list is what blocks downstream work.
- **Don't drop the cross-cutting principles** — agentic-by-default and
  spine-first are non-optional in the integration plan.
- **Don't drop the punch list.** Even if half the per-milestone sections
  are sketches, the punch list of decisions is the single most
  important deliverable. It's what Peter needs to act on.
- **Better a complete plan with shallower sections than a deep plan
  half-done.**

If context fills before you finish, commit what you have, flag remaining
work in the report-back, and let Peter spawn a continuation session.
```
