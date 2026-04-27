-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 003_rls_secondary_tables
-- Enables RLS and adds anon access policies for invoices, tenders, and vehicles.
-- Run this in Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenders  ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_invoices" ON invoices FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_tenders"  ON tenders  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_vehicles" ON vehicles FOR ALL TO anon USING (true) WITH CHECK (true);
