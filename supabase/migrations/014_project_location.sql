-- Add lat/lng to client_contracts for weather API and equipment travel checks
ALTER TABLE client_contracts
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;
