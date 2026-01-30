-- Allow anonymous/public users to read header links from app_settings.
-- This does NOT change table structure and only exposes the single key 'header_links'.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'app_settings'
      AND policyname = 'Public can view header_links'
  ) THEN
    CREATE POLICY "Public can view header_links"
    ON public.app_settings
    FOR SELECT
    USING (key = 'header_links');
  END IF;
END $$;

