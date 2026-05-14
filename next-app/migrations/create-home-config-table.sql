-- Migration: create home_config table
-- Run this in the Supabase SQL editor ONCE before using the Website admin page.

CREATE TABLE IF NOT EXISTS home_config (
  id          BIGSERIAL PRIMARY KEY,
  tenant_id   UUID        NOT NULL,
  config      JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per tenant
CREATE UNIQUE INDEX IF NOT EXISTS home_config_tenant_id_key ON home_config (tenant_id);

-- RLS: only service_role can read/write (admin API routes use service_role key)
ALTER TABLE home_config ENABLE ROW LEVEL SECURITY;

-- Allow service_role unrestricted access (no policy needed — it bypasses RLS).
-- Public clients (anon key) have no access by default.
