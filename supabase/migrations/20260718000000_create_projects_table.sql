-- Sites built via the Create Site (Web Design Agent) page.
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  business_name TEXT NOT NULL,
  city TEXT NOT NULL,
  industry TEXT,
  site_html TEXT NOT NULL,
  site_slug TEXT NOT NULL,
  site_built_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  site_metadata JSONB,
  CONSTRAINT projects_site_slug_key UNIQUE (site_slug)
);

CREATE INDEX IF NOT EXISTS projects_created_at_idx
  ON public.projects (created_at DESC);

CREATE INDEX IF NOT EXISTS projects_business_name_city_idx
  ON public.projects (business_name, city);
