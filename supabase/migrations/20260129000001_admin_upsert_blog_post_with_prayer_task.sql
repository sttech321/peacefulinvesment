-- Unified Admin Blog + Prayer Task upsert
-- - Ensures a safe 1:1 relationship via prayer_tasks.blog_post_id
-- - Provides an atomic RPC to create/update both records together
-- - Backfills existing legacy tag mappings (blog_posts.tags contains prayer_task:<uuid>)

-- 1) Ensure blog_post_id exists on prayer_tasks (older installs may not have run prior migrations)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'prayer_tasks'
      AND column_name = 'blog_post_id'
  ) THEN
    -- Add column with FK only if blog_posts exists
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'blog_posts'
    ) THEN
      ALTER TABLE public.prayer_tasks
        ADD COLUMN blog_post_id UUID REFERENCES public.blog_posts(id) ON DELETE SET NULL;
    ELSE
      ALTER TABLE public.prayer_tasks
        ADD COLUMN blog_post_id UUID;
    END IF;
  END IF;
END $$;

-- 2) Enforce at most one prayer task per blog post
CREATE UNIQUE INDEX IF NOT EXISTS idx_prayer_tasks_blog_post_id_unique
  ON public.prayer_tasks(blog_post_id)
  WHERE blog_post_id IS NOT NULL;

-- 3) Backfill: map legacy blog_posts.tags prayer_task:<uuid> -> prayer_tasks.blog_post_id
WITH mappings AS (
  SELECT
    bp.id AS blog_post_id,
    (regexp_match(t, '^prayer_task:([0-9a-fA-F-]{36})$'))[1]::uuid AS prayer_task_id
  FROM public.blog_posts bp
  CROSS JOIN LATERAL unnest(bp.tags) AS t
  WHERE t ~* '^prayer_task:[0-9a-f-]{36}$'
)
UPDATE public.prayer_tasks pt
SET blog_post_id = m.blog_post_id
FROM mappings m
WHERE pt.id = m.prayer_task_id
  AND (pt.blog_post_id IS NULL OR pt.blog_post_id = m.blog_post_id);

-- 4) Atomic RPC for admin workflow
CREATE OR REPLACE FUNCTION public.admin_upsert_blog_post_with_prayer_task(
  p_post_id UUID DEFAULT NULL,
  p_post JSONB DEFAULT '{}'::jsonb,
  p_prayer JSONB DEFAULT '{}'::jsonb,
  p_with_prayer BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_post_id UUID;
  v_prayer_id UUID;

  v_title TEXT := NULLIF(trim(coalesce(p_post->>'title','')), '');
  v_slug TEXT := NULLIF(trim(coalesce(p_post->>'slug','')), '');
  v_content TEXT := NULLIF(coalesce(p_post->>'content',''), '');
  v_excerpt TEXT := NULLIF(coalesce(p_post->>'excerpt',''), '');
  v_category TEXT := NULLIF(trim(coalesce(p_post->>'category','')), '');
  v_status TEXT := NULLIF(trim(coalesce(p_post->>'status','')), '');
  v_meta_title TEXT := NULLIF(coalesce(p_post->>'meta_title',''), '');
  v_meta_description TEXT := NULLIF(coalesce(p_post->>'meta_description',''), '');
  v_header_left_text TEXT := NULLIF(coalesce(p_post->>'header_left_text',''), '');
  v_header_right_text TEXT := NULLIF(coalesce(p_post->>'header_right_text',''), '');

  v_tags TEXT[] := '{}'::text[];
  v_clean_tags TEXT[] := '{}'::text[];

  v_prayer_name TEXT := NULLIF(trim(coalesce(p_prayer->>'name','')), '');
  v_prayer_link TEXT := NULLIF(trim(coalesce(p_prayer->>'link_or_video','')), '');
  v_prayer_folder_id UUID := NULL;
  v_prayer_duration INT := NULL;
  v_prayer_start_date DATE := NULL;
  v_prayer_start_time TIME := NULL;
  v_prayer_is_shared BOOLEAN := true;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_admin(v_actor) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_title IS NULL THEN
    RAISE EXCEPTION 'Missing required field: title';
  END IF;
  IF v_slug IS NULL THEN
    RAISE EXCEPTION 'Missing required field: slug';
  END IF;
  IF v_content IS NULL THEN
    RAISE EXCEPTION 'Missing required field: content';
  END IF;

  -- tags: accept JSON array of strings
  IF jsonb_typeof(p_post->'tags') = 'array' THEN
    SELECT coalesce(array_agg(value::text), '{}'::text[])
    INTO v_tags
    FROM jsonb_array_elements_text(p_post->'tags');
  END IF;

  v_category := coalesce(v_category, 'general');
  v_status := coalesce(v_status, 'draft');

  IF p_post_id IS NULL THEN
    INSERT INTO public.blog_posts (
      title,
      slug,
      header_left_text,
      header_right_text,
      content,
      excerpt,
      featured_image,
      category,
      tags,
      status,
      author_id,
      published_at,
      meta_title,
      meta_description
    ) VALUES (
      v_title,
      v_slug,
      v_header_left_text,
      v_header_right_text,
      v_content,
      v_excerpt,
      NULL,
      v_category,
      v_tags,
      v_status,
      v_actor,
      CASE WHEN v_status = 'published' THEN now() ELSE NULL END,
      v_meta_title,
      v_meta_description
    )
    RETURNING id INTO v_post_id;
  ELSE
    UPDATE public.blog_posts
    SET
      title = v_title,
      slug = v_slug,
      header_left_text = v_header_left_text,
      header_right_text = v_header_right_text,
      content = v_content,
      excerpt = v_excerpt,
      category = v_category,
      tags = v_tags,
      status = v_status,
      published_at = CASE WHEN v_status = 'published' THEN coalesce(published_at, now()) ELSE NULL END,
      meta_title = v_meta_title,
      meta_description = v_meta_description
    WHERE id = p_post_id
    RETURNING id INTO v_post_id;

    IF v_post_id IS NULL THEN
      RAISE EXCEPTION 'Blog post not found';
    END IF;
  END IF;

  IF NOT p_with_prayer THEN
    RETURN jsonb_build_object('post_id', v_post_id, 'prayer_task_id', NULL);
  END IF;

  -- Parse prayer payload
  BEGIN
    v_prayer_folder_id := NULLIF(trim(coalesce(p_prayer->>'folder_id','')), '')::uuid;
  EXCEPTION WHEN others THEN
    v_prayer_folder_id := NULL;
  END;

  BEGIN
    v_prayer_duration := NULLIF(trim(coalesce(p_prayer->>'duration_days','')), '')::int;
  EXCEPTION WHEN others THEN
    v_prayer_duration := NULL;
  END;
  v_prayer_duration := coalesce(v_prayer_duration, 1);

  BEGIN
    v_prayer_start_date := NULLIF(trim(coalesce(p_prayer->>'start_date','')), '')::date;
  EXCEPTION WHEN others THEN
    v_prayer_start_date := current_date;
  END;

  BEGIN
    v_prayer_start_time := NULLIF(trim(coalesce(p_prayer->>'start_time','')), '')::time;
  EXCEPTION WHEN others THEN
    v_prayer_start_time := '06:00'::time;
  END;

  BEGIN
    v_prayer_is_shared := coalesce((p_prayer->>'is_shared')::boolean, true);
  EXCEPTION WHEN others THEN
    v_prayer_is_shared := true;
  END;

  v_prayer_name := coalesce(v_prayer_name, v_title);
  v_prayer_link := coalesce(v_prayer_link, '/blog/' || v_slug);

  -- Upsert prayer task by blog_post_id (1:1)
  SELECT id
  INTO v_prayer_id
  FROM public.prayer_tasks
  WHERE blog_post_id = v_post_id
  LIMIT 1;

  IF v_prayer_id IS NULL THEN
    INSERT INTO public.prayer_tasks (
      name,
      link_or_video,
      status,
      folder_id,
      number_of_days,
      duration_days,
      start_date,
      start_time,
      is_shared,
      created_by,
      blog_post_id
    ) VALUES (
      v_prayer_name,
      v_prayer_link,
      'TODO',
      v_prayer_folder_id,
      v_prayer_duration,
      v_prayer_duration,
      v_prayer_start_date,
      v_prayer_start_time,
      v_prayer_is_shared,
      v_actor,
      v_post_id
    )
    RETURNING id INTO v_prayer_id;
  ELSE
    UPDATE public.prayer_tasks
    SET
      name = v_prayer_name,
      link_or_video = v_prayer_link,
      folder_id = v_prayer_folder_id,
      number_of_days = v_prayer_duration,
      duration_days = v_prayer_duration,
      start_date = v_prayer_start_date,
      start_time = v_prayer_start_time,
      is_shared = v_prayer_is_shared,
      blog_post_id = v_post_id
    WHERE id = v_prayer_id;
  END IF;

  -- Ensure the legacy tag mapping stays in sync for backward compatibility
  -- Remove any existing prayer_task:<uuid> tags, then append the correct one.
  SELECT coalesce(array_agg(t), '{}'::text[])
  INTO v_clean_tags
  FROM unnest(coalesce(v_tags, '{}'::text[])) AS t
  WHERE t !~* '^prayer_task:[0-9a-f-]{36}$';

  UPDATE public.blog_posts
  SET tags = array_append(v_clean_tags, 'prayer_task:' || v_prayer_id::text)
  WHERE id = v_post_id;

  RETURN jsonb_build_object('post_id', v_post_id, 'prayer_task_id', v_prayer_id);
END;
$$;

-- Allow logged-in clients to call the function (it enforces admin role internally).
GRANT EXECUTE ON FUNCTION public.admin_upsert_blog_post_with_prayer_task(UUID, JSONB, JSONB, BOOLEAN) TO authenticated;

