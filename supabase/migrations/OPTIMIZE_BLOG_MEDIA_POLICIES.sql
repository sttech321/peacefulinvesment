-- Optimized RLS policies for blog_media table
-- This script improves performance by using STABLE functions and optimized queries

-- Drop existing policies first
DROP POLICY IF EXISTS "Public can view media for published posts" ON public.blog_media;
DROP POLICY IF EXISTS "Users can view media for published posts" ON public.blog_media;
DROP POLICY IF EXISTS "Authors can view their own media" ON public.blog_media;
DROP POLICY IF EXISTS "Authors can insert media for their posts" ON public.blog_media;
DROP POLICY IF EXISTS "Authors can update their own media" ON public.blog_media;
DROP POLICY IF EXISTS "Authors can delete their own media" ON public.blog_media;
DROP POLICY IF EXISTS "Admins can manage all media" ON public.blog_media;

-- Create optimized helper function to check if user is post author
-- STABLE function caches the result within a single query
CREATE OR REPLACE FUNCTION public.is_blog_post_author(post_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.blog_posts 
    WHERE id = post_id 
    AND author_id = user_id
  );
$$;

-- Create helper function to check if post is published
CREATE OR REPLACE FUNCTION public.is_blog_post_published(post_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.blog_posts 
    WHERE id = post_id 
    AND status = 'published'
  );
$$;

-- Optimized SELECT policies (combined for better performance)
-- Public and authenticated users can view media for published posts
CREATE POLICY "view_published_media" 
ON public.blog_media 
FOR SELECT 
USING (
  public.is_blog_post_published(blog_post_id)
  OR public.is_blog_post_author(blog_post_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

-- Authors can insert media for their own posts
-- Using direct column check where possible
CREATE POLICY "insert_own_media" 
ON public.blog_media 
FOR INSERT 
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND public.is_blog_post_author(blog_post_id, auth.uid())
);

-- Authors can update media for their own posts
CREATE POLICY "update_own_media" 
ON public.blog_media 
FOR UPDATE 
TO authenticated
USING (
  public.is_blog_post_author(blog_post_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

-- Authors can delete media for their own posts
CREATE POLICY "delete_own_media" 
ON public.blog_media 
FOR DELETE 
TO authenticated
USING (
  public.is_blog_post_author(blog_post_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

-- Admins can manage all media (included in above policies, but kept for clarity)
-- The admin check is already included in SELECT, UPDATE, DELETE policies above

-- Add composite index on blog_posts to support policy queries
-- This index helps the EXISTS queries in our helper functions
CREATE INDEX IF NOT EXISTS idx_blog_posts_id_status_author 
ON public.blog_posts(id, status, author_id);

-- Add composite index on blog_media for common query patterns
CREATE INDEX IF NOT EXISTS idx_blog_media_post_id_uploaded_by 
ON public.blog_media(blog_post_id, uploaded_by);

