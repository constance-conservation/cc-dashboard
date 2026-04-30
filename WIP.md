# WIP — Work In Progress

> Snapshot of where we left off. Read this at the start of the next session to pick up immediately.
> Last updated: 2026-04-30

---

## Where we are

**Active branch:** `feat/allocation-spread-panel`
**All 46 tests passing. TypeScript clean. Branch pushed to remote.**

The rostering module received a major intelligence pass this session (continued from prior context):

- `isLeaderRole(role)` — exported regex replacing exact-string LEADERSHIP_ROLES set; matches "Supervisor", "Field Supervisor", "Team Leader", etc.
- Hard leader constraint in `autoGenerate` — if no leader-role employee is available for an activity on a given day, that activity is skipped entirely (not amber-warned)
- Two-tier activity scoring: `priorityScore + deadlinePriorityBonus()` — escalates priority as project deadline approaches
- `computeProjectShortfalls()` — reactive, recomputes from roster state on every change
- `ShortfallModal` — post-auto-generate popup listing all under-target activities with roll-over-to-next-month option
- `computeActivityMonthVisits()` + status bar per activity in ProjectsDrawer (actual vs allocated days/hours)
- Supervisor detection fixed: was `e.role === 'Field Supervisor'` exact match; now `isLeaderRole(e.role)` regex

**Pending DB migrations (need James approval before applying):**
- `supabase/migrations/014_project_location.sql` — adds `lat`, `lng` to `client_contracts`
- `supabase/migrations/015_activity_type_metadata.sql` — adds `required_equipment_ids`, `weather_constraints` JSONB to `activity_types`

---

## OpenClaw agent integration — planning in progress

This session we drafted a comprehensive prompt for a separate Claude session to plan the OpenClaw AI agent integration. That session hasn't happened yet — James was preparing to start it.

**What OpenClaw is:** An AI agent to be integrated into the CC-Dashboard ecosystem. Will have access to the Supabase database and eventually control the dashboard. Initial comms via Telegram + Slack for testing.

**Key decisions made this session:**

### API layer architecture
- **Decision: Next.js API routes** over Supabase Edge Functions
- Reasoning: already have the framework, auth middleware, Supabase client; ~30 min to bootstrap; no extra infra or deploy pipeline
- Pattern: `app/api/v1/[resource]/route.ts`; bearer token auth for the agent; Supabase service-role key server-side
- Edge Functions deferred until background jobs or webhooks are needed

### Services to give OpenClaw (to be confirmed in the planning session)
Discussed candidates: Microsoft 365 seat (Outlook, Word, Excel, Teams), Nextcloud (read-only initially), Slack, Telegram, external APIs, GIS/mapping. Full analysis to come from the planning session.

### Setup tasks identified (before Campbell starts agent work)
1. Audit Supabase schema → plain-English data catalogue
2. Decide integration pattern (confirmed: Next.js API routes)
3. Scaffold `app/api/v1/` with a health endpoint on a new `feat/agent-infra` branch
4. Document module completion roadmap (live vs coming-soon, data tables, sprint-readiness)
5. Apply migrations 014 and 015 (pending James approval)

### Campbell resourcing
- Works **2 days/week** initially
- Work will be structured as **epics → stories → sprints**
- James and Claude will work through sprints together before Campbell executes them
- The OpenClaw planning session will produce a staging guide formatted for assignment to Campbell

---

## The improved OpenClaw planning prompt

Copy this into a new Claude session to run the planning exercise:

---

**Context for this session:**

I'm building a director-level operations dashboard for **Constance Conservation**, an environmental field services company. The stack is Next.js 16 App Router, TypeScript, Supabase (PostgreSQL + auth), and React Context state. The dashboard currently has working modules for: **rostering** (calendar-based crew scheduling with auto-generate intelligence, carryovers, weather and equipment gating), **projects** (three-tier hierarchy: Project → Site → Activity, with crew sizing, allocation strategies, and cost tracking), **employees**, and **clients**. Coming-soon modules include: tendering, finances, fleet & equipment management, inventory tracking, and reporting. The data lives in Supabase; auth is email magic-link restricted to `@constanceconservation.com.au`.

We are also planning to integrate an AI agent — internally referred to as **OpenClaw** — into this ecosystem. OpenClaw will be a conversational, agentic assistant with access to the company's Supabase database and (eventually) the ability to interact with and control this dashboard and its associated modules.

I want you to help me think through this integration comprehensively. Please treat this as two phases:

**Phase 1 — Services and environment access to give OpenClaw**

Beyond database access and dashboard control, what other services and environments should we give OpenClaw access to in order to maximise its usefulness for a field services environmental consultancy? For example:

- A dedicated Microsoft 365 seat (Outlook, Word, Excel, Teams, OneDrive) so it can draft reports, read and update spreadsheets, send emails on behalf of the business
- Slack and Telegram (for conversational testing and staff-facing query interfaces)
- The company runs a self-hosted **Nextcloud** server — I'm open to read-only access initially but want your honest view on the risk profile
- Any other categories I haven't thought of (external APIs, comms platforms, file systems, field data, GIS/mapping, etc.)

For each suggested service, please note: **what it unlocks**, **the realistic risk**, and **priority** (essential / high value / nice-to-have).

**Phase 2 — What can we actually do with OpenClaw in this ecosystem?**

Give me an **extensive and comprehensive list** of use cases and opportunities for integrating OpenClaw into what we've been building. Range from the straightforward and obvious (querying roster data, summarising project status) to the most creative and ambitious possibilities (autonomous scheduling decisions, client-facing report generation, predictive staffing, proactive compliance flagging, etc.).

Organise these roughly by theme (e.g. Rostering & Scheduling, Project Management, HR & Crew, Finance & Reporting, Client Management, Field Operations, etc.).

**Phase 3 — Staging plan (after I review Phase 2)**

After I've reviewed the Phase 2 list and told you which items I want to include, prepare a **week-by-week staging guide** for gradually implementing these features. The implementation resource is **Campbell**, a developer working **two days per week** initially. The plan should be structured as **epics → stories → sprints**, formatted so I can take these directly into a project management tool and assign them to Campbell. For each sprint, note dependencies, what James needs to provide or approve, and what can be done autonomously by Campbell.

---

## Next actions when resuming

1. **Run the OpenClaw planning prompt** (above) in a new session → collect the Phase 2 list → decide inclusions → get the staging guide
2. **Approve migrations 014 + 015** when ready — run via Supabase MCP
3. **Scaffold `feat/agent-infra`** — `app/api/v1/health/route.ts` as the first endpoint, establish the bearer-token auth pattern
4. **Test the ShortfallModal flow** — auto-generate the roster, confirm the popup appears with the right under-target activities, roll some over and verify carryovers are created
