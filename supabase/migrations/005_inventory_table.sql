-- 005: Create inventory_items table
CREATE TABLE IF NOT EXISTS inventory_items (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid        REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name            text        NOT NULL,
  category        text        NOT NULL DEFAULT 'General',
  quantity        numeric     NOT NULL DEFAULT 0,
  unit            text        NOT NULL DEFAULT 'units',
  min_stock       numeric     NOT NULL DEFAULT 0,
  location        text,
  notes           text,
  active          boolean     NOT NULL DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage inventory"
  ON inventory_items FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS inventory_items_org_idx ON inventory_items (organization_id);
