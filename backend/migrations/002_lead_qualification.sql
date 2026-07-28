-- Migration: add qualification columns to leads table
-- The leads table already exists in production, and Base.metadata.create_all()
-- never adds columns to existing tables — run this manually against Neon:
--
--   export PATH="/usr/local/Cellar/libpq/18.4/bin:$PATH"
--   psql "$NEON_CONNECTION_STRING" -f backend/migrations/002_lead_qualification.sql

ALTER TABLE leads ADD COLUMN IF NOT EXISTS litters_per_year VARCHAR;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS biggest_headache VARCHAR;
