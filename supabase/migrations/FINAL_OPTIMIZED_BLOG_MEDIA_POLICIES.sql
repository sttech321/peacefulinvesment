-- Final optimized RLS policies for blog_media table
-- This version uses the simplest, most efficient approach

-- Drop existing policies
DROP POLICY IF EXISTS "view_published_media" ON public.blog_media;
DROP POLICY IF EXISTS "insert_own_media" ON public.blog_media;
DROP POLICY IF EXISTS "update_own_media" ON public.blog_media;
DROP POLICY IF EXISTS "delete_own_media" ON public.blog_media;
DROP POLICY IF EXISTS "Public can view media for published posts" ON public.blog_media;
DROP POLICY IF EXISTS "Users can view media for published posts" ON public.blog_media;
DROP POLICY IF EXISTS "Authors can view their own media" ON public.blog_media;
DROP POLICY IF EXISTS "Authors can insert media for their posts" ON public.blog_media;
DROP POLICY IF EXISTS "Authors can update their own media" ON public.blog_media;
DROP POLICY IF EXISTS "Authors can delete their own media" ON public.blog_media;
DROP POLICY IF EXISTS "Admins can manage all media" ON public.blog_media;

-- Drop old functions
DROP FUNCTION IF EXISTS public.is_blog_post_author(UUID, UUID);
DROP FUNCTION IF EXISTS public.is_blog_post_published(UUID);
DROP FUNCTION IF EXISTS public.check_blog_media_access(public.blog_media, UUID);
DROP FUNCTION IF EXISTS public.check_blog_media_insert(UUID, UUID);

-- Simple, direct policies using joins - most efficient approach
-- SELECT: Users can see published posts OR their own posts OR if they're admin
CREATE POLICY "view_published_media" 
ON public.blog_media 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.blog_posts bp
    WHERE bp.id = blog_media.blog_post_id 
    AND (bp.status = 'published' OR bp.author_id = auth.uid())
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- INSERT: Must be the author of the post and uploader
CREATE POLICY "insert_own_media" 
ON public.blog_media 
FOR INSERT 
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1 
    FROM public.blog_posts bp
    WHERE bp.id = blog_post_id 
    AND bp.author_id = auth.uid()
  )
);

-- UPDATE/DELETE: Must be the author or admin
CREATE POLICY "update_own_media" 
ON public.blog_media 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.blog_posts bp
    WHERE bp.id = blog_post_id 
    AND bp.author_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "delete_own_media" 
ON public.blog_media 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.blog_posts bp
    WHERE bp.id = blog_post_id 
    AND bp.author_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- Critical indexes for performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_id_status_author 
ON public.blog_posts(id, status, author_id) 
WHERE status = 'published' OR author_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_blog_media_post_id_uploaded_by 
ON public.blog_media(blog_post_id, uploaded_by);

