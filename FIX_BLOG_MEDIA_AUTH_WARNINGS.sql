-- Fix Auth RLS Initialization Plan warnings for blog_media table
-- Replace auth.uid() with (select auth.uid()) to cache the result

-- Drop existing policies (including any that might have been created manually)
DROP POLICY IF EXISTS "view_published_media" ON public.blog_media;
DROP POLICY IF EXISTS "insert_own_media" ON public.blog_media;
DROP POLICY IF EXISTS "update_own_media" ON public.blog_media;
DROP POLICY IF EXISTS "delete_own_media" ON public.blog_media;
DROP POLICY IF EXISTS "Blog media write access" ON public.blog_media;

-- Recreate with optimized auth.uid() calls using (select auth.uid())
-- SELECT: Users can see published posts OR their own posts OR if they're admin
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

-- INSERT: Must be the author of the post and uploader
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

-- UPDATE: Must be the author or admin
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

-- DELETE: Must be the author or admin
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

