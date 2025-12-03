ALTER TABLE public.blog_categories
ADD COLUMN parent_id uuid NULL;

ALTER TABLE public.blog_categories
ADD CONSTRAINT blog_categories_parent_fk
  FOREIGN KEY (parent_id)
  REFERENCES public.blog_categories(id)
  ON DELETE CASCADE;
