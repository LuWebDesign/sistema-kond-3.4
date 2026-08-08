-- Order-detail data completeness: preserve checkout contact snapshots.
ALTER TABLE public.pedidos_catalogo
  ADD COLUMN IF NOT EXISTS cliente_localidad TEXT,
  ADD COLUMN IF NOT EXISTS cliente_codigo_postal TEXT,
  ADD COLUMN IF NOT EXISTS cliente_provincia TEXT,
  ADD COLUMN IF NOT EXISTS cliente_notas TEXT;
