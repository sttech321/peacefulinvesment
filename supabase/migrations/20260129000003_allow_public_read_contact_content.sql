-- Allow anonymous/public users to read the Contact page content from app_settings.
-- This does NOT change table structure and only exposes the single key 'contact_content'.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'app_settings'
      AND policyname = 'Public can view contact_content'
  ) THEN
    CREATE POLICY "Public can view contact_content"
    ON public.app_settings
    FOR SELECT
    USING (key = 'contact_content');
  END IF;
END $$;

