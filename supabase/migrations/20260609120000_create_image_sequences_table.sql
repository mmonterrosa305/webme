CREATE TABLE IF NOT EXISTS public.image_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry TEXT NOT NULL,
  label TEXT NOT NULL,
  frames_urls TEXT[] NOT NULL,
  thumbnail_url TEXT NOT NULL,
  frame_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS image_sequences_industry_idx
  ON public.image_sequences (industry);

CREATE INDEX IF NOT EXISTS image_sequences_created_at_idx
  ON public.image_sequences (created_at);
