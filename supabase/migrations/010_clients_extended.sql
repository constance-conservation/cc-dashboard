-- Migration: 010_clients_extended
-- Adds contact info, status, client type, and ABN to the clients table.
-- Run manually in Supabase SQL Editor.

ALTER TABLE clients ADD COLUMN IF NOT EXISTS status       text    NOT NULL DEFAULT 'active';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_name text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email        text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone        text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes        text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS abn          text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_type  text;

CREATE INDEX IF NOT EXISTS clients_status_idx ON clients (status);

-- RLS: ensure authenticated users can read, insert, update, and delete clients.
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clients_select_authenticated ON clients;
CREATE POLICY clients_select_authenticated ON clients FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS clients_insert_authenticated ON clients;
CREATE POLICY clients_insert_authenticated ON clients FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS clients_update_authenticated ON clients;
CREATE POLICY clients_update_authenticated ON clients FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS clients_delete_authenticated ON clients;
CREATE POLICY clients_delete_authenticated ON clients FOR DELETE TO authenticated USING (true);
