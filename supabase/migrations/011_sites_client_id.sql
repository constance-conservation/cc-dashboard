-- Migration: 011_sites_client_id
-- Adds client_id FK to sites so sites can belong to a client.
-- Run manually in Supabase SQL Editor.

ALTER TABLE sites ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS sites_client_id_idx ON sites (client_id);

-- Best-effort migration: assign existing sites to a client via the first linked project
UPDATE sites s
SET client_id = (
  SELECT cc.client_id
  FROM project_site_links psl
  JOIN client_contracts cc ON cc.id = psl.project_id
  WHERE psl.site_id = s.id
    AND cc.client_id IS NOT NULL
  LIMIT 1
)
WHERE s.client_id IS NULL;
