-- Add equipment and weather metadata to activity_types
ALTER TABLE activity_types
  ADD COLUMN IF NOT EXISTS required_equipment_ids jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS weather_constraints     jsonb DEFAULT '[]'::jsonb;
