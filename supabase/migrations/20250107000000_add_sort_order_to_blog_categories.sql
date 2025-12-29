-- Add sort_order column to blog_categories table
ALTER TABLE public.blog_categories
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_blog_categories_sort_order 
ON public.blog_categories(parent_id, sort_order);

-- Update existing categories to have sequential sort_order based on current order
-- This ensures existing categories have a proper sort order
DO $$
DECLARE
    cat RECORD;
    order_counter INTEGER := 0;
BEGIN
    -- For root categories (no parent)
    FOR cat IN 
        SELECT id 
        FROM public.blog_categories 
        WHERE parent_id IS NULL 
        ORDER BY created_at
    LOOP
        UPDATE public.blog_categories 
        SET sort_order = order_counter 
        WHERE id = cat.id;
        order_counter := order_counter + 1;
    END LOOP;
    
    -- For each parent, update children sort_order
    FOR cat IN 
        SELECT DISTINCT parent_id 
        FROM public.blog_categories 
        WHERE parent_id IS NOT NULL
    LOOP
        order_counter := 0;
        FOR cat IN 
            SELECT id 
            FROM public.blog_categories 
            WHERE parent_id = cat.parent_id 
            ORDER BY created_at
        LOOP
            UPDATE public.blog_categories 
            SET sort_order = order_counter 
            WHERE id = cat.id;
            order_counter := order_counter + 1;
        END LOOP;
    END LOOP;
END $$;

