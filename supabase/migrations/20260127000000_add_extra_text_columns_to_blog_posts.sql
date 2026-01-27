-- Add header text fields to blog_posts (UI: AdminBlog "Header Text (Left/Right)")
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'blog_posts'
      AND column_name = 'header_left_text'
  ) THEN
    ALTER TABLE public.blog_posts ADD COLUMN header_left_text TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'blog_posts'
      AND column_name = 'header_right_text'
  ) THEN
    ALTER TABLE public.blog_posts ADD COLUMN header_right_text TEXT;
  END IF;
END $$;

-- Best-effort backfill from legacy system tags (may be URL-encoded).
-- If you used `extra_left:<value>` / `extra_right:<value>` tags previously, this copies them into the new columns.
UPDATE public.blog_posts
SET
  header_left_text = COALESCE(
    header_left_text,
    (
      SELECT regexp_replace(t, '^extra_left:', '', 'i')
      FROM unnest(tags) AS t
      WHERE t ILIKE 'extra_left:%'
      LIMIT 1
    )
  ),
  header_right_text = COALESCE(
    header_right_text,
    (
      SELECT regexp_replace(t, '^extra_right:', '', 'i')
      FROM unnest(tags) AS t
      WHERE t ILIKE 'extra_right:%'
      LIMIT 1
    )
  );

