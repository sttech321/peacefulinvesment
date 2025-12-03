-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create blog_posts table
CREATE TABLE public.blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL,
    excerpt TEXT,
    featured_image TEXT,
    category TEXT DEFAULT 'general',
    tags TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'draft', -- draft, published, archived
    author_id UUID NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    view_count INTEGER DEFAULT 0,
    meta_title TEXT,
    meta_description TEXT
);

-- Enable RLS on blog_posts
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Create blog_categories table
CREATE TABLE public.blog_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on blog_categories
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for blog_posts
CREATE POLICY "Anyone can view published posts"
ON public.blog_posts
FOR SELECT
TO authenticated
USING (status = 'published');

CREATE POLICY "Public can view published posts"
ON public.blog_posts
FOR SELECT
TO anon
USING (status = 'published');

CREATE POLICY "Authors can manage their own posts"
ON public.blog_posts
FOR ALL
TO authenticated
USING (auth.uid() = author_id);

CREATE POLICY "Admins can manage all posts"
ON public.blog_posts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for blog_categories
CREATE POLICY "Anyone can view categories"
ON public.blog_categories
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Public can view categories"
ON public.blog_categories
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Admins can manage categories"
ON public.blog_categories
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_blog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_blog_posts_updated_at
    BEFORE UPDATE ON public.blog_posts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_blog_updated_at();

CREATE TRIGGER update_blog_categories_updated_at
    BEFORE UPDATE ON public.blog_categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_blog_updated_at();

CREATE TRIGGER update_user_roles_updated_at
    BEFORE UPDATE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_blog_updated_at();

-- Insert default categories
INSERT INTO public.blog_categories (name, slug, description, color) VALUES
('Morning Prayers', 'morning-prayers', 'Daily morning prayers and devotions', '#F59E0B'),
('Night Prayers', 'night-prayers', 'Evening prayers and reflections', '#6366F1'),
('Catholic Apps', 'catholic-apps', 'Recommended Catholic mobile applications', '#10B981'),
('Charity', 'charity', 'Catholic charity work and donations', '#EF4444'),
('General', 'general', 'General Catholic content and teachings', '#6B7280');

-- Insert sample Catholic prayers content
INSERT INTO public.blog_posts (title, slug, content, excerpt, category, tags, status, author_id, published_at) VALUES
('Daily Morning Prayers', 'daily-morning-prayers', '...LONG CONTENT 1...', 'Start your day with these powerful Catholic morning prayers including the Litany of Chastity and Guardian Angel prayers.', 'morning-prayers', ARRAY['prayers', 'morning', 'guardian-angel', 'chastity'], 'published', (SELECT user_id FROM public.profiles LIMIT 1), now()),
('Evening Prayer & Reflection', 'evening-prayer-reflection', '...LONG CONTENT 2...', 'End your day in prayer with these traditional Catholic night prayers and examination of conscience.', 'night-prayers', ARRAY['prayers', 'night', 'vespers', 'examination'], 'published', (SELECT user_id FROM public.profiles LIMIT 1), now()),
('Recommended Catholic Apps', 'recommended-catholic-apps', '...LONG CONTENT 3...', 'Discover the best Catholic mobile apps for prayer, scripture reading, and spiritual growth on iOS and Android.', 'catholic-apps', ARRAY['apps', 'mobile', 'technology', 'prayer', 'rosary'], 'published', (SELECT user_id FROM public.profiles LIMIT 1), now()),
('Our Commitment to Catholic Charity', 'commitment-catholic-charity', '...LONG CONTENT 4...', 'Learn how Peaceful Investment donates a portion of performance fees to Catholic charities, supporting God''s work around the world.', 'charity', ARRAY['charity', 'giving', 'mission', 'catholic-social-teaching'], 'published', (SELECT user_id FROM public.profiles LIMIT 1), now());
