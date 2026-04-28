-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 007_reconcile_project_sites
-- The existing `sites` table IS the project-delivery-sites concept (147 rows of
-- real location names like "Harrington Forest", "Camden Town Farm", etc.) — it
-- just lacks the project-hierarchy columns added in this dashboard work.
--
-- This migration:
--   1. Drops the empty `project_sites` table from 006 (removes FK deps first).
--   2. Extends `sites` with the columns the dashboard needs:
--        project_id  — links a site to a specific contract (nullable so existing
--                      rows stay valid; dashboard filters to non-null project_id)
--        active      — soft-delete / visibility toggle
--        sort_order  — ordering within a project's site list
--        address     — human-readable delivery address (separate from GPS)
--        notes       — free-text notes
--   3. Re-adds site_id FK on activities + roster_assignments pointing to sites.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── Step 1: Remove FK columns that reference project_sites ───────────────────

ALTER TABLE activities          DROP COLUMN IF EXISTS site_id;
ALTER TABLE roster_assignments  DROP COLUMN IF EXISTS site_id;


-- ── Step 2: Drop the empty project_sites table ───────────────────────────────

DROP TABLE IF EXISTS project_sites;


-- ── Step 3: Extend the existing sites table ───────────────────────────────────

ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS project_id  uuid    REFERENCES client_contracts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS active      boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sort_order  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS address     text,
  ADD COLUMN IF NOT EXISTS notes       text;

CREATE INDEX IF NOT EXISTS sites_project_id_idx ON sites (project_id);


-- ── Step 4: Re-add site_id FK columns referencing sites ──────────────────────

ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES sites(id) ON DELETE SET NULL;

ALTER TABLE roster_assignments
  ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES sites(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS activities_site_id_idx          ON activities (site_id);
CREATE INDEX IF NOT EXISTS roster_assignments_site_id_idx  ON roster_assignments (site_id);
