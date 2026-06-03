-- Custom client portal OTP codes (sent via Resend, not Supabase Auth email).
CREATE TABLE IF NOT EXISTS public.client_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_otps_email_created_idx
  ON public.client_otps (email, created_at DESC);

CREATE INDEX IF NOT EXISTS client_otps_email_active_idx
  ON public.client_otps (email)
  WHERE used = false;
