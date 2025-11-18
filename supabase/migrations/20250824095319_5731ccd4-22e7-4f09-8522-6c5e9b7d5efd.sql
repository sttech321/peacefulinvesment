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
('Daily Morning Prayers', 'daily-morning-prayers', '# Daily Morning Prayers

## 1. Litany of Chastity

**O Jesus, meek and humble of heart, make our hearts like unto Thine.**

From every sin against chastity, **deliver us, O Lord.**
From every impure thought, **deliver us, O Lord.**
From every impure word, **deliver us, O Lord.**
From every impure action, **deliver us, O Lord.**
From every occasion of sin, **deliver us, O Lord.**
From the spirit of impurity, **deliver us, O Lord.**
From all evil desires, **deliver us, O Lord.**

**Lamb of God, who takes away the sins of the world, spare us, O Lord.**
**Lamb of God, who takes away the sins of the world, graciously hear us, O Lord.**
**Lamb of God, who takes away the sins of the world, have mercy on us, O Lord.**

**Pray for us, O Saint Joseph,**
That we may be made worthy of the promises of Christ.

Let us pray: O God, who has given us the commandment to be pure of heart, grant us the grace to serve Thee with a clean heart and a chaste body. Through Christ our Lord. **Amen.**

## 2. Guardian Angel Prayer

**Angel of God, my Guardian dear,**
To whom His love commits me here,
Ever this day be at my side,
To light and guard, to rule and guide.
**Amen.**

## 3. Angel of God (Extended)

**O holy Angel Guardian,**
keep my soul and body;
direct my thoughts, my words, and works;
never leave me,
and defend me from all temptations
and dangers of soul and body.
**Amen.**', 'Start your day with these powerful Catholic morning prayers including the Litany of Chastity and Guardian Angel prayers.', 'morning-prayers', ARRAY['prayers', 'morning', 'guardian-angel', 'chastity'], 'published', (SELECT user_id FROM public.profiles LIMIT 1), now()),

('Evening Prayer & Reflection', 'evening-prayer-reflection', '# Night Prayers

## Evening Prayer (Vespers)

**O God, come to my assistance.**
O Lord, make haste to help me.
Glory be to the Father, and to the Son, and to the Holy Spirit.
As it was in the beginning, is now, and ever shall be, world without end. **Amen.**

## Examination of Conscience

Take a moment to reflect on your day:
- What am I grateful for today?
- Where did I fall short of Christ''s example?
- How can I grow in virtue tomorrow?

## Act of Contrition

**O my God, I am heartily sorry for having offended Thee,**
and I detest all my sins because of Thy just punishments,
but most of all because they offend Thee, my God,
who art all good and deserving of all my love.
I firmly resolve, with the help of Thy grace,
to sin no more and to avoid the near occasions of sin.
**Amen.**

## Night Prayer

**Now I lay me down to sleep,**
I pray the Lord my soul to keep.
If I should die before I wake,
I pray the Lord my soul to take.
**Amen.**

**May the Lord grant us a peaceful night and a perfect end.**
**Amen.**', 'End your day in prayer with these traditional Catholic night prayers and examination of conscience.', 'night-prayers', ARRAY['prayers', 'night', 'vespers', 'examination'], 'published', (SELECT user_id FROM public.profiles LIMIT 1), now()),

('Recommended Catholic Apps', 'recommended-catholic-apps', '# Recommended Catholic Apps

Enhance your spiritual journey with these excellent Catholic mobile applications:

## Daily Prayer & Liturgy

### 📱 **Laudate** (Free)
- Complete daily prayers and readings
- Rosary, Divine Mercy Chaplet
- Saints calendar and reflections
- Available on both iOS and Android

### 📱 **iBreviary** (Free)
- Official Liturgy of the Hours
- Daily Mass readings
- Multiple language support
- Offline functionality

## Bible & Scripture

### 📱 **Catholic Bible** (Free)
- Complete Catholic Bible with Deuterocanonical books
- Daily readings and reflections
- Search functionality
- Audio narration available

### 📱 **Hallow** (Premium)
- Guided Catholic prayers and meditations
- Sleep stories with saints
- Advent and Lent programs
- Family-friendly content

## Rosary & Devotions

### 📱 **Rosary Deluxe** (Free)
- Beautiful rosary interface
- Multiple rosary types
- Audio-guided prayers
- Prayer tracking

### 📱 **Divine Mercy** (Free)
- Divine Mercy Chaplet
- Novena prayers
- Saint Faustina content
- Meditation guides

## Mass & Liturgy

### 📱 **Mass Times** (Free)
- Find nearby Catholic churches
- Mass times and contact information
- Worldwide coverage
- User reviews and photos

### 📱 **iMissal** (Premium)
- Complete Catholic Missal
- Daily Mass readings
- Saint of the day
- Liturgical calendar

*Download these apps to deepen your Catholic faith and maintain daily prayer habits.*', 'Discover the best Catholic mobile apps for prayer, scripture reading, and spiritual growth on iOS and Android.', 'catholic-apps', ARRAY['apps', 'mobile', 'technology', 'prayer', 'rosary'], 'published', (SELECT user_id FROM public.profiles LIMIT 1), now()),

('Our Commitment to Catholic Charity', 'commitment-catholic-charity', '# Our Commitment to Catholic Charity

## Supporting God''s Work Through Trading

At Peaceful Investment, we believe that our financial success should serve a higher purpose. As faithful Catholics, we are committed to using our trading expertise not just for personal gain, but to support the Church''s mission of caring for those in need.

## Performance Fee Donations

**A portion of every performance fee we earn gets donated directly to Catholic charities.**

This means that when you succeed with our trading platform, you''re not just building your own wealth – you''re also contributing to:

- **Catholic Relief Services** - Providing aid to the poor and vulnerable worldwide
- **Local Catholic Charities** - Supporting homeless shelters, food banks, and family services
- **Catholic Education** - Helping fund scholarships and school programs
- **Pro-Life Organizations** - Supporting the protection of human life from conception to natural death

## Our Mission

> *"For where your treasure is, there your heart will be also."* - Matthew 6:21

We believe that financial stewardship is a sacred responsibility. Our trading algorithms are designed not just to generate profits, but to create opportunities for charitable giving that align with Catholic social teaching.

## Transparency in Giving

Each quarter, we publish a report showing:
- Total donations made to Catholic charities
- Specific organizations supported
- Impact stories from our charitable partners

## How You Can Join Our Mission

When you trade with Peaceful Investment, you become part of this charitable mission. Additionally, you can:

- Set up automatic donations from your profits
- Choose specific Catholic charities to support
- Participate in our quarterly giving campaigns
- Pray for our trading decisions and charitable work

## Prayer for Our Work

**Heavenly Father,**
Guide our trading decisions with Your wisdom.
Help us to use our financial gifts responsibly,
supporting Your Church and caring for the poor.
May our work glorify You and serve Your kingdom.
Through Christ our Lord, **Amen.**

*Together, we can build wealth while building God''s kingdom on earth.*', 'Learn how Peaceful Investment donates a portion of performance fees to Catholic charities, supporting God''s work around the world.', 'charity', ARRAY['charity', 'giving', 'mission', 'catholic-social-teaching'], 'published', (SELECT user_id FROM public.profiles LIMIT 1), now());