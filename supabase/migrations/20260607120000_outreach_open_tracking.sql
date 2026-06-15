ALTER TABLE public.outreach
  ADD COLUMN IF NOT EXISTS tracking_token TEXT,
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS outreach_tracking_token_idx
  ON public.outreach (tracking_token)
  WHERE tracking_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS outreach_sent_at_idx
  ON public.outreach (sent_at);
