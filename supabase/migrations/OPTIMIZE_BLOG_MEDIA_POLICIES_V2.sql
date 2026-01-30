-- Highly optimized RLS policies for blog_media table
-- This version minimizes auth.uid() calls to reduce Performance Advisor warnings

-- Drop existing policies first
DROP POLICY IF EXISTS "Public can view media for published posts" ON public.blog_media;
DROP POLICY IF EXISTS "Users can view media for published posts" ON public.blog_media;
DROP POLICY IF EXISTS "Authors can view their own media" ON public.blog_media;
DROP POLICY IF EXISTS "Authors can insert media for their posts" ON public.blog_media;
DROP POLICY IF EXISTS "Authors can update their own media" ON public.blog_media;
DROP POLICY IF EXISTS "Authors can delete their own media" ON public.blog_media;
DROP POLICY IF EXISTS "Admins can manage all media" ON public.blog_media;
DROP POLICY IF EXISTS "view_published_media" ON public.blog_media;
DROP POLICY IF EXISTS "insert_own_media" ON public.blog_media;
DROP POLICY IF EXISTS "update_own_media" ON public.blog_media;
DROP POLICY IF EXISTS "delete_own_media" ON public.blog_media;

-- Drop old helper functions if they exist
DROP FUNCTION IF EXISTS public.is_blog_post_author(UUID, UUID);
DROP FUNCTION IF EXISTS public.is_blog_post_published(UUID);

-- Create optimized helper function that takes auth.uid() as parameter only once
-- This function will be called with auth.uid() from the policy, minimizing re-evaluation
CREATE OR REPLACE FUNCTION public.check_blog_media_access(media_row public.blog_media, user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.blog_posts 
    WHERE id = media_row.blog_post_id 
    AND (
      status = 'published'
      OR author_id = user_id
    )
  ) OR EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = check_blog_media_access.user_id 
    AND role = 'admin'
  );
$$;

-- Create helper for insert check
CREATE OR REPLACE FUNCTION public.check_blog_media_insert(blog_post_id UUID, uploader_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.blog_posts 
    WHERE id = blog_post_id 
    AND author_id = uploader_id
  );
$$;

-- Optimized SELECT policy - single auth.uid() call
CREATE POLICY "view_published_media" 
ON public.blog_media 
FOR SELECT 
USING (public.check_blog_media_access(blog_media, auth.uid()));

-- Insert policy - single auth.uid() call in WITH CHECK
CREATE POLICY "insert_own_media" 
ON public.blog_media 
FOR INSERT 
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND public.check_blog_media_insert(blog_post_id, auth.uid())
);

-- Update policy - single auth.uid() call
CREATE POLICY "update_own_media" 
ON public.blog_media 
FOR UPDATE 
TO authenticated
USING (
  public.check_blog_media_insert(blog_post_id, auth.uid())
  OR EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Delete policy - single auth.uid() call
CREATE POLICY "delete_own_media" 
ON public.blog_media 
FOR DELETE 
TO authenticated
USING (
  public.check_blog_media_insert(blog_post_id, auth.uid())
  OR EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Ensure indexes exist for optimal performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_id_status_author ON public.blog_posts(id, status, author_id);
CREATE INDEX IF NOT EXISTS idx_blog_media_post_id_uploaded_by ON public.blog_media(blog_post_id, uploaded_by);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role ON public.user_roles(user_id, role);

