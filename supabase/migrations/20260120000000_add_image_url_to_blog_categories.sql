-- Add optional image URL for blog categories (Catholic folder cards)
-- Stores ONLY a public URL (no base64, no blobs)
ALTER TABLE public.blog_categories
ADD COLUMN IF NOT EXISTS image_url TEXT NULL;

