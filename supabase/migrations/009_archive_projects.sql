-- Migration: 009_archive_projects
-- Adds archived flag to client_contracts so projects can be soft-archived.
-- Run manually in Supabase SQL Editor.

ALTER TABLE client_contracts ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS cc_archived_idx ON client_contracts (archived);
