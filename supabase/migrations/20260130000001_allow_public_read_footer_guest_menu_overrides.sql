-- Allow anonymous/public users to read guest footer menu overrides from app_settings.
-- This does NOT change table structure and only exposes the single key 'footer_guest_menu_overrides'.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'app_settings'
      AND policyname = 'Public can view footer_guest_menu_overrides'
  ) THEN
    CREATE POLICY "Public can view footer_guest_menu_overrides"
    ON public.app_settings
    FOR SELECT
    USING (key = 'footer_guest_menu_overrides');
  END IF;
END $$;
