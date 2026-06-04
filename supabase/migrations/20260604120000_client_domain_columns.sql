-- Custom domain claim flow for Pro/Elite client portal.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS domain_requested TEXT,
  ADD COLUMN IF NOT EXISTS domain_status TEXT;

COMMENT ON COLUMN public.clients.domain_requested IS 'Full domain the client requested (e.g. thepoolguys.com).';
COMMENT ON COLUMN public.clients.domain_status IS 'Domain lifecycle: pending, active, failed, etc.';
