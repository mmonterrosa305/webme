CREATE TABLE IF NOT EXISTS public.video_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry TEXT NOT NULL,
  label TEXT NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS video_presets_industry_idx
  ON public.video_presets (industry);

CREATE INDEX IF NOT EXISTS video_presets_created_at_idx
  ON public.video_presets (created_at);
