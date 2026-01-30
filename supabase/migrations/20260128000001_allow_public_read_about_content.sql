-- Allow anonymous/public users to read the About page content from app_settings.
-- This does NOT change table structure and only exposes the single key 'about_content'.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'app_settings'
      AND policyname = 'Public can view about_content'
  ) THEN
    CREATE POLICY "Public can view about_content"
    ON public.app_settings
    FOR SELECT
    USING (key = 'about_content');
  END IF;
END $$;

