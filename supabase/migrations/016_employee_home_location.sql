ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS address   text,
  ADD COLUMN IF NOT EXISTS home_lat  double precision,
  ADD COLUMN IF NOT EXISTS home_lng  double precision;
