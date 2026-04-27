-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 001_cc_dashboard_integration
-- Extends existing Supabase tables and adds new tables required for the
-- cc-dashboard director view. Does NOT recreate any existing tables.
-- No seed data — all production data is entered through the app.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── Section 1: Extend staff table ────────────────────────────────────────────
-- Add columns needed by the Employee type in cc-dashboard.
-- These are missing from the original reporting schema.

ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS pay_rate          numeric  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS employment_type   text     NOT NULL DEFAULT 'full-time',
  ADD COLUMN IF NOT EXISTS availability      jsonb    NOT NULL DEFAULT '{"mon":true,"tue":true,"wed":true,"thu":true,"fri":true,"sat":false}'::jsonb,
  ADD COLUMN IF NOT EXISTS email             text     NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone             text     NOT NULL DEFAULT '';


-- ── Section 2: Extend client_contracts table ─────────────────────────────────
-- Add scheduling, financial, and crew-planning columns needed by the
-- Project type in cc-dashboard.

ALTER TABLE client_contracts
  ADD COLUMN IF NOT EXISTS priority           text     NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS crew_size          integer  NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS charge_out_rate    numeric  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime_flag      boolean  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS overtime_rate      numeric  NOT NULL DEFAULT 1.5,
  ADD COLUMN IF NOT EXISTS monthly_allocation numeric  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS visits_per_month   integer  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit               text     NOT NULL DEFAULT 'days',
  ADD COLUMN IF NOT EXISTS spent              numeric  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS required_skills    text[]   NOT NULL DEFAULT '{}';


-- ── Section 3: Skills lookup table ───────────────────────────────────────────
-- Stores the canonical list of skill tags per organisation.
-- Replaces the old single-column skills table used during prototyping.

CREATE TABLE IF NOT EXISTS skills (
  id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid        NOT NULL REFERENCES organizations(id),
  name            text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);


-- ── Section 4: Roles lookup table ────────────────────────────────────────────
-- Stores the canonical list of staff roles per organisation.

CREATE TABLE IF NOT EXISTS roles (
  id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid        NOT NULL REFERENCES organizations(id),
  name            text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);


-- ── Section 5: Roster assignments table ──────────────────────────────────────
-- Links staff members to contracts on a specific calendar day.
-- date_key format: 'YYYY-MM-DD'. Unique per day/staff/contract combination.

CREATE TABLE IF NOT EXISTS roster_assignments (
  id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid        NOT NULL REFERENCES organizations(id),
  date_key        text        NOT NULL,
  staff_id        uuid        NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  contract_id     uuid        NOT NULL REFERENCES client_contracts(id) ON DELETE CASCADE,
  overtime_hours  numeric,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (date_key, staff_id, contract_id)
);


-- ── Section 6: Dashboard tasks table ─────────────────────────────────────────
-- Director to-do list, scoped per organisation.

CREATE TABLE IF NOT EXISTS dashboard_tasks (
  id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid        NOT NULL REFERENCES organizations(id),
  text            text        NOT NULL,
  done            boolean     NOT NULL DEFAULT false,
  added           date        NOT NULL DEFAULT CURRENT_DATE,
  created_at      timestamptz NOT NULL DEFAULT now()
);


-- ── Section 7: Vehicles table ─────────────────────────────────────────────────
-- Fleet management. staff.vehicle_id is currently a denormalised text field;
-- this table provides the proper structure for future normalisation.

CREATE TABLE IF NOT EXISTS vehicles (
  id                  uuid             PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     uuid             NOT NULL REFERENCES organizations(id),
  registration        text             NOT NULL,
  make                text             NOT NULL DEFAULT '',
  model               text             NOT NULL DEFAULT '',
  type                text             NOT NULL DEFAULT '',
  status              text             NOT NULL DEFAULT 'ok',
  odometer_km         numeric          NOT NULL DEFAULT 0,
  last_service_date   date,
  next_service_due_km numeric,
  gps_lat             double precision,
  gps_lon             double precision,
  current_driver_id   uuid             REFERENCES staff(id),
  active              boolean          NOT NULL DEFAULT true,
  created_at          timestamptz      NOT NULL DEFAULT now(),
  updated_at          timestamptz      NOT NULL DEFAULT now(),
  UNIQUE (organization_id, registration)
);


-- ── Section 8: Link staff to vehicles ────────────────────────────────────────
-- Adds a proper FK from staff to vehicles, replacing the denormalised
-- vehicle_id text column for future use.

ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS assigned_vehicle_id uuid REFERENCES vehicles(id);


-- ── Section 9: Tenders / pipeline table ──────────────────────────────────────
-- Tracks work in the sales pipeline before it becomes a contract.

CREATE TABLE IF NOT EXISTS tenders (
  id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid        NOT NULL REFERENCES organizations(id),
  client_id       uuid        REFERENCES clients(id),
  name            text        NOT NULL,
  value           numeric     NOT NULL DEFAULT 0,
  stage           text        NOT NULL DEFAULT 'prospect',
  due_date        date,
  submitted_date  date,
  awarded_date    date,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);


-- ── Section 10: Invoices table ───────────────────────────────────────────────
-- Tracks invoices issued against clients and contracts.

CREATE TABLE IF NOT EXISTS invoices (
  id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid        NOT NULL REFERENCES organizations(id),
  client_id       uuid        REFERENCES clients(id),
  contract_id     uuid        REFERENCES client_contracts(id),
  invoice_number  text,
  issue_date      date        NOT NULL DEFAULT CURRENT_DATE,
  due_date        date,
  paid_date       date,
  amount          numeric     NOT NULL DEFAULT 0,
  status          text        NOT NULL DEFAULT 'draft',
  description     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
