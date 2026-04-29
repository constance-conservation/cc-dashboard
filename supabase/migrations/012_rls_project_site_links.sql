-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 012_rls_project_site_links
-- Adds RLS policies for the project_site_links join table.
--
-- Migration 008 created this table but omitted RLS policies, causing INSERT
-- to fail with error 42501 (new row violates row-level security policy).
-- This migration adds the same anon-all pattern used by all other tables.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE project_site_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_project_site_links"
  ON project_site_links
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
