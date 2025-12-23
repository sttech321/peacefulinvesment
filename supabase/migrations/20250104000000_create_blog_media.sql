-- Create media type enum for blog media
CREATE TYPE public.blog_media_type AS ENUM ('image', 'video', 'document');

-- Create blog_media table
CREATE TABLE public.blog_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  media_type blog_media_type NOT NULL,
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

-- Enable Row Level Security
ALTER TABLE public.blog_media ENABLE ROW LEVEL SECURITY;

-- NOTE: Storage bucket 'blog-media' must be created manually via Supabase Dashboard
-- Go to Storage → Buckets → New bucket
-- Name: blog-media
-- Public: Yes (enabled)

-- Note: We're using (select auth.uid()) directly in policies instead of helper functions
-- This avoids the function call overhead and ensures auth.uid() is cached per query

-- Optimized RLS Policies for blog_media
-- Using (select auth.uid()) to cache auth.uid() result and avoid re-evaluation per row
-- Combined SELECT policy (more efficient than separate policies)
CREATE POLICY "view_published_media" 
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

-- Authors can insert media for their own posts
CREATE POLICY "insert_own_media" 
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

-- Authors can update media for their own posts
CREATE POLICY "update_own_media" 
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

-- Authors can delete media for their own posts
CREATE POLICY "delete_own_media" 
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

-- Optimized storage policies for blog-media bucket
-- Combined SELECT policy (bucket is public)
CREATE POLICY "view_blog_media_files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'blog-media');

-- Combined INSERT/UPDATE/DELETE policy for authors and admins
-- Using (select auth.uid()) to cache auth.uid() result
CREATE POLICY "manage_own_blog_media" 
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

-- Create trigger for updated_at timestamp
CREATE TRIGGER update_blog_media_updated_at
  BEFORE UPDATE ON public.blog_media
  FOR EACH ROW
  EXECUTE FUNCTION public.update_blog_updated_at();

-- Add indexes for better performance
CREATE INDEX idx_blog_media_blog_post_id ON public.blog_media(blog_post_id);
CREATE INDEX idx_blog_media_media_type ON public.blog_media(media_type);
CREATE INDEX idx_blog_media_display_order ON public.blog_media(blog_post_id, display_order);
CREATE INDEX idx_blog_media_uploaded_by ON public.blog_media(uploaded_by);
-- Composite index to support policy queries
CREATE INDEX idx_blog_media_post_id_uploaded_by ON public.blog_media(blog_post_id, uploaded_by);

-- Add composite index on blog_posts to support policy helper functions
CREATE INDEX IF NOT EXISTS idx_blog_posts_id_status_author ON public.blog_posts(id, status, author_id);

