-- Create function to increment blog post view count
CREATE OR REPLACE FUNCTION public.increment_blog_view_count(post_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.blog_posts 
  SET view_count = view_count + 1 
  WHERE id = post_id;
END;
$$;