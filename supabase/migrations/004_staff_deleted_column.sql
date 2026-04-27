-- 004: Add deleted column to staff table
-- Distinguishes archived staff (active=false, deleted=false — recoverable)
-- from permanently deleted staff (active=false, deleted=true — hidden).
-- Hard deletes are not possible due to FK references in reporting tables.

ALTER TABLE staff ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false;
