-- ---------------------------------------------------------------------
-- Create media type enum for blog media (SAFE / IDEMPOTENT)
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'blog_media_type'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.blog_media_type AS ENUM ('image', 'video', 'document');
  END IF;
END$$;

-- ---------------------------------------------------------------------
-- Create blog_media table
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blog_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  media_type public.blog_media_type NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  display_order INTEGER DEFAULT 0,
  caption TEXT,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Enable Row Level Security
-- ---------------------------------------------------------------------
ALTER TABLE public.blog_media ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- RLS Policies for blog_media
-- ---------------------------------------------------------------------

-- View published media OR own drafts OR admin
DROP POLICY IF EXISTS view_published_media ON public.blog_media;
CREATE POLICY view_published_media
ON public.blog_media
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.blog_posts bp
    WHERE bp.id = blog_media.blog_post_id
      AND (bp.status = 'published' OR bp.author_id = (select auth.uid()))
  )
  OR public.has_role((select auth.uid()), 'admin')
);

-- Insert media for own posts
DROP POLICY IF EXISTS insert_own_media ON public.blog_media;
CREATE POLICY insert_own_media
ON public.blog_media
FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = (select auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.blog_posts bp
    WHERE bp.id = blog_post_id
      AND bp.author_id = (select auth.uid())
  )
);

-- Update media for own posts or admin
DROP POLICY IF EXISTS update_own_media ON public.blog_media;
CREATE POLICY update_own_media
ON public.blog_media
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.blog_posts bp
    WHERE bp.id = blog_post_id
      AND bp.author_id = (select auth.uid())
  )
  OR public.has_role((select auth.uid()), 'admin')
);

-- Delete media for own posts or admin
DROP POLICY IF EXISTS delete_own_media ON public.blog_media;
CREATE POLICY delete_own_media
ON public.blog_media
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.blog_posts bp
    WHERE bp.id = blog_post_id
      AND bp.author_id = (select auth.uid())
  )
  OR public.has_role((select auth.uid()), 'admin')
);

-- ---------------------------------------------------------------------
-- Storage policies for blog-media bucket
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS view_blog_media_files ON storage.objects;
CREATE POLICY view_blog_media_files
ON storage.objects
FOR SELECT
USING (bucket_id = 'blog-media');

DROP POLICY IF EXISTS manage_own_blog_media ON storage.objects;
CREATE POLICY manage_own_blog_media
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'blog-media'
  AND (
    (select auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role((select auth.uid()), 'admin')
  )
);

-- ---------------------------------------------------------------------
-- Trigger for updated_at
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS update_blog_media_updated_at ON public.blog_media;
CREATE TRIGGER update_blog_media_updated_at
BEFORE UPDATE ON public.blog_media
FOR EACH ROW
EXECUTE FUNCTION public.update_blog_updated_at();

-- ---------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_blog_media_blog_post_id
  ON public.blog_media(blog_post_id);

CREATE INDEX IF NOT EXISTS idx_blog_media_media_type
  ON public.blog_media(media_type);

CREATE INDEX IF NOT EXISTS idx_blog_media_display_order
  ON public.blog_media(blog_post_id, display_order);

CREATE INDEX IF NOT EXISTS idx_blog_media_uploaded_by
  ON public.blog_media(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_blog_media_post_id_uploaded_by
  ON public.blog_media(blog_post_id, uploaded_by);

CREATE INDEX IF NOT EXISTS idx_blog_posts_id_status_author
  ON public.blog_posts(id, status, author_id);
