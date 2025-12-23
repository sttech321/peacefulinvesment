-- Optimized storage policies for blog-media bucket
-- Drop existing policies first
DROP POLICY IF EXISTS "Public can view blog media files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view blog media files" ON storage.objects;
DROP POLICY IF EXISTS "Authors can upload blog media" ON storage.objects;
DROP POLICY IF EXISTS "Authors can update their blog media" ON storage.objects;
DROP POLICY IF EXISTS "Authors can delete their blog media" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all blog media files" ON storage.objects;

-- Combined SELECT policy for both anon and authenticated users
-- Bucket is public, so anyone can view
CREATE POLICY "view_blog_media_files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'blog-media');

-- Combined INSERT/UPDATE/DELETE policy for authors and admins
-- Authors can manage files in their own folder
CREATE POLICY "manage_own_blog_media" 
ON storage.objects 
FOR ALL 
TO authenticated
USING (
  bucket_id = 'blog-media' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
  )
);

