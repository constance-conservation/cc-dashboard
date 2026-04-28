-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 008_project_site_links
-- Replaces the single project_id FK on sites with a proper join table so the
-- same physical location can be linked to multiple contracts.
--
-- Changes:
--   1. Create project_site_links(organization_id, project_id, site_id)
--   2. Drop sites.address  (removed from data model per product decision)
--   3. Drop sites.project_id (replaced by join table; added in 007, never populated)
-- ─────────────────────────────────────────────────────────────────────────────


-- ── Step 1: Join table ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_site_links (
  organization_id uuid    NOT NULL REFERENCES organizations(id),
  project_id      uuid    NOT NULL REFERENCES client_contracts(id) ON DELETE CASCADE,
  site_id         uuid    NOT NULL REFERENCES sites(id)            ON DELETE CASCADE,
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, site_id)
);

CREATE INDEX IF NOT EXISTS psl_org_id_idx     ON project_site_links (organization_id);
CREATE INDEX IF NOT EXISTS psl_project_id_idx ON project_site_links (project_id);
CREATE INDEX IF NOT EXISTS psl_site_id_idx    ON project_site_links (site_id);


-- ── Step 2: Drop address column ───────────────────────────────────────────────

ALTER TABLE sites DROP COLUMN IF EXISTS address;


-- ── Step 3: Drop project_id column ───────────────────────────────────────────
-- Added in 007 and never populated — safe to drop.

DROP INDEX IF EXISTS sites_project_id_idx;
ALTER TABLE sites DROP COLUMN IF EXISTS project_id;
