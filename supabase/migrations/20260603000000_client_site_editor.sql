-- Editable site metadata for client portal (headline, tagline, hours, image URLs).
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS site_metadata JSONB;

-- Storage bucket for client-uploaded logos and photos.
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-assets', 'client-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read access for published client assets.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public read client assets'
  ) THEN
    CREATE POLICY "Public read client assets"
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'client-assets');
  END IF;
END $$;
