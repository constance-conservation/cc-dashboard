-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 006_projects_activities_sites
-- Introduces a three-tier project hierarchy: Project → Sites → Activities.
-- Adds carry-forward queue, custom allocations, and cost entries for margins.
--
-- client_contracts retains its existing scheduling/rate columns so the running
-- app continues to work during the code migration. Those columns are cleaned
-- up in a follow-up migration once all reads/writes have moved to activities.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── Section 1: Extend client_contracts ────────────────────────────────────────
-- Add project_number for administrative reference (optional).

ALTER TABLE client_contracts
  ADD COLUMN IF NOT EXISTS project_number text;


-- ── Section 2: Sites ──────────────────────────────────────────────────────────
-- Physical locations within a project. A project may have one or many sites.

CREATE TABLE IF NOT EXISTS sites (
  id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid        NOT NULL REFERENCES organizations(id),
  project_id      uuid        NOT NULL REFERENCES client_contracts(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  address         text,
  notes           text,
  active          boolean     NOT NULL DEFAULT true,
  sort_order      integer     NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sites_project_id_idx ON sites (project_id);
CREATE INDEX IF NOT EXISTS sites_org_id_idx     ON sites (organization_id);


-- ── Section 3: Activity types ─────────────────────────────────────────────────
-- Org-scoped lookup table for categorising work (e.g. "Bush Regeneration", "Survey").

CREATE TABLE IF NOT EXISTS activity_types (
  id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid        NOT NULL REFERENCES organizations(id),
  name            text        NOT NULL,
  description     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);


-- ── Section 4: Activities ─────────────────────────────────────────────────────
-- Work packages within a project, optionally scoped to a site.
-- All scheduling, crew, rate, and skill configuration lives here, not on the project.

CREATE TABLE IF NOT EXISTS activities (
  id                  uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     uuid        NOT NULL REFERENCES organizations(id),
  project_id          uuid        NOT NULL REFERENCES client_contracts(id) ON DELETE CASCADE,
  site_id             uuid        REFERENCES sites(id) ON DELETE SET NULL,
  activity_type_id    uuid        REFERENCES activity_types(id) ON DELETE SET NULL,
  name                text        NOT NULL,

  -- Scheduling
  -- 'even' spreads total_allocation uniformly across the date range;
  -- 'custom' uses per-period buckets in activity_allocations.
  allocation_strategy text        NOT NULL DEFAULT 'even',
  unit                text        NOT NULL DEFAULT 'days',   -- 'days' | 'hours'
  total_allocation    numeric     NOT NULL DEFAULT 0,
  -- Populated when initialising an already-started activity to record prior progress.
  units_completed     numeric     NOT NULL DEFAULT 0,
  start_date          text        NOT NULL DEFAULT '',       -- YYYY-MM-DD
  end_date            text        NOT NULL DEFAULT '',       -- YYYY-MM-DD

  -- Crew sizing
  crew_size_type      text        NOT NULL DEFAULT 'fixed',  -- 'fixed' | 'range' | 'any'
  min_crew            integer     NOT NULL DEFAULT 1,
  max_crew            integer,                               -- null when crew_size_type != 'range'

  -- Financial
  charge_out_rate     numeric     NOT NULL DEFAULT 0,
  overtime_flag       boolean     NOT NULL DEFAULT false,
  overtime_rate       numeric     NOT NULL DEFAULT 1.5,

  -- Classification
  required_skills     text[]      NOT NULL DEFAULT '{}',
  priority            text        NOT NULL DEFAULT 'medium', -- 'high' | 'medium' | 'low'
  status              text        NOT NULL DEFAULT 'active', -- 'active' | 'complete' | 'on_hold'

  notes               text,
  sort_order          integer     NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activities_project_id_idx ON activities (project_id);
CREATE INDEX IF NOT EXISTS activities_site_id_idx    ON activities (site_id);
CREATE INDEX IF NOT EXISTS activities_org_id_idx     ON activities (organization_id);


-- ── Section 5: Activity allocations ──────────────────────────────────────────
-- Custom per-period buckets for activities using allocation_strategy = 'custom'.
-- period: 'YYYY-MM' for monthly buckets or 'YYYY-MM-DD' for a specific date.

CREATE TABLE IF NOT EXISTS activity_allocations (
  id          uuid    PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id uuid    NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  period      text    NOT NULL,
  allocation  numeric NOT NULL DEFAULT 0,
  UNIQUE (activity_id, period)
);

CREATE INDEX IF NOT EXISTS activity_allocations_activity_id_idx ON activity_allocations (activity_id);


-- ── Section 6: Activity carryovers ────────────────────────────────────────────
-- Catch-up queue. When a rostered day is understaffed (crew < min_crew),
-- a record is created here. The director reviews pending items before the
-- next roster generation via a pre-generation review modal (Option A).

CREATE TABLE IF NOT EXISTS activity_carryovers (
  id                uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   uuid        NOT NULL REFERENCES organizations(id),
  activity_id       uuid        NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  original_date_key text        NOT NULL,    -- YYYY-MM-DD of the understaffed day
  units_missed      numeric     NOT NULL DEFAULT 1,
  status            text        NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'skipped'
  review_date       date,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_carryovers_activity_id_idx ON activity_carryovers (activity_id);
CREATE INDEX IF NOT EXISTS activity_carryovers_org_id_idx      ON activity_carryovers (organization_id);


-- ── Section 7: Cost entries ───────────────────────────────────────────────────
-- Non-labour costs per activity (materials, equipment hire, subcontractors, etc.).
-- Labour cost is derived at query time: roster_assignments × staff.pay_rate.

CREATE TABLE IF NOT EXISTS cost_entries (
  id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid        NOT NULL REFERENCES organizations(id),
  activity_id     uuid        NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  date            date        NOT NULL DEFAULT CURRENT_DATE,
  amount          numeric     NOT NULL DEFAULT 0,
  description     text        NOT NULL DEFAULT '',
  type            text        NOT NULL DEFAULT 'other', -- 'material' | 'equipment' | 'subcontractor' | 'other'
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cost_entries_activity_id_idx ON cost_entries (activity_id);
CREATE INDEX IF NOT EXISTS cost_entries_org_id_idx      ON cost_entries (organization_id);


-- ── Section 8: Extend roster_assignments ──────────────────────────────────────
-- Link each assignment to a specific activity and optionally a site.
-- Both columns are nullable so all existing assignments remain valid without
-- any data migration.

ALTER TABLE roster_assignments
  ADD COLUMN IF NOT EXISTS activity_id uuid REFERENCES activities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS site_id     uuid REFERENCES sites(id)      ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS roster_assignments_activity_id_idx ON roster_assignments (activity_id);
