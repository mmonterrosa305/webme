-- WebMe clients table (Stripe checkout → active client).
-- The table already exists in Supabase with equivalent columns:
--   plan   → package
--   email  → owner_email
--   status → subscription_status
--
-- Run this only if you need to create the table from scratch in a new project.

CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  owner_name TEXT,
  owner_email TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  industry TEXT,
  package TEXT NOT NULL,
  one_time_amount NUMERIC NOT NULL DEFAULT 0,
  monthly_amount NUMERIC NOT NULL DEFAULT 0,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT NOT NULL,
  subscription_status TEXT NOT NULL DEFAULT 'active',
  site_slug TEXT,
  site_url TEXT,
  site_html TEXT,
  site_last_updated TIMESTAMPTZ,
  next_billing_date TIMESTAMPTZ,
  CONSTRAINT clients_lead_id_key UNIQUE (lead_id)
);

CREATE INDEX IF NOT EXISTS clients_stripe_customer_id_idx
  ON public.clients (stripe_customer_id);

CREATE INDEX IF NOT EXISTS clients_stripe_subscription_id_idx
  ON public.clients (stripe_subscription_id);

CREATE INDEX IF NOT EXISTS clients_subscription_status_idx
  ON public.clients (subscription_status);

-- Optional aliases if you prefer plan/email/status column names:
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS plan TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS status TEXT;

UPDATE public.clients
SET
  plan = COALESCE(plan, package),
  email = COALESCE(email, owner_email),
  status = COALESCE(status, subscription_status)
WHERE plan IS NULL OR email IS NULL OR status IS NULL;
