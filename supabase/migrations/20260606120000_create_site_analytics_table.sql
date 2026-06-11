CREATE TABLE IF NOT EXISTS public.site_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_slug TEXT NOT NULL,
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS site_analytics_site_slug_idx
  ON public.site_analytics (site_slug);

CREATE INDEX IF NOT EXISTS site_analytics_created_at_idx
  ON public.site_analytics (created_at);
