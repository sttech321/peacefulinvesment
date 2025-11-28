import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useBlog, BlogPost, BlogCategory } from '@/hooks/useBlog';
import Footer from '@/components/Footer';
import Left01 from '@/assets/left-01.jpg';
import Left02 from '@/assets/left-02.jpg';
import Left03 from '@/assets/left-03.jpg';
import Right01 from '@/assets/right-01.jpg';
import Right02 from '@/assets/right-02.jpg';
import Right03 from '@/assets/right-03.jpg';

const Blog = () => {
  const { posts, categories, loading } = useBlog();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredPosts = useMemo(
    () =>
      selectedCategory === 'all'
        ? posts
        : posts.filter(post => post.category === selectedCategory),
    [posts, selectedCategory]
  );

  if (loading) {
    return (
      <div className='pink-yellow-shadow min-h-screen pt-16'>
        {/* Header */}
        <div className='animate-slide-up bg-black/20 px-6 py-10 text-center md:py-12 lg:py-24'>
          <div className='mx-auto max-w-4xl'>
            <Skeleton className='mx-auto mb-4 h-12 w-full opacity-50' />
            <Skeleton className='mx-auto h-6 w-full opacity-50' />
          </div>
        </div>

        <div className='px-6 py-10 md:py-12 lg:py-24'>
          <div className='mx-auto max-w-7xl'>
            <div className='grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3'>
              {[...Array(6)].map((_, i) => (
                <Card
                  className='glass-card bg-black/20 opacity-50 shadow-none'
                  key={i}
                >
                  <CardHeader>
                    <Skeleton className='mb-2 h-6 w-full' />
                    <Skeleton className='h-4 w-3/4' />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className='h-32 w-full' />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='pink-yellow-shadow min-h-screen pt-20'>
      {/* Header */}
      <div className='animate-slide-up bg-black/20 px-6 py-10 text-center md:py-12 lg:py-24'>
        <div className='flex grid-cols-1 flex-wrap items-center justify-center gap-8 md:grid-cols-2 lg:grid-cols-3 lg:flex-nowrap'>
          <div className='imgLeft01 max-w-40'>
            <Link
              to='https://www.miracolieucaristici.org/en/Liste/scheda_c.html?nat=argentina&wh=buenosaires&ct=Buenos%20Aires,%201992-1994-1996'
              target='_blank'
              className='inline-block bg-white p-1'
            >
              <img src={Left01} alt='Left 01' />
            </Link>
          </div>
          <div className='mx-auto w-full max-w-7xl'>
            <h1 className='mb-6 font-inter text-3xl font-bold uppercase text-white md:text-4xl lg:text-5xl xl:text-6xl'>
              Catholic{' '}
              <span className='text-[var(--yellowcolor)]'>Faith & Prayer</span>
            </h1>
            <p className='mx-auto max-w-2xl font-inter text-lg font-normal text-white md:text-[20px]'>
              Daily prayers, spiritual guidance, and charitable mission updates
              from Peaceful Investment
            </p>
          </div>

          <div className='imgRight01 max-w-40'>
            <Link
              to='https://www.miracolieucaristici.org/en/Liste/scheda.html?nat=india&wh=chirattakonam&ct=Chirattakonam,%202001'
              target='_blank'
              className='inline-block bg-white p-1'
            >
              <img src={Right01} alt='Right 01' />
            </Link>
          </div>
        </div>
      </div>

      <div className='px-6 py-10 md:py-12 xl:py-20'>

        <div className='flex grid-cols-1 flex-wrap justify-center gap-8 md:grid-cols-2 lg:grid-cols-3 lg:flex-nowrap'>

          <div className='imgLeft01 max-w-40'>
            <Link
              to='https://www.miracolieucaristici.org/en/Liste/scheda_c.html?nat=polonia&wh=sokolka&ct=Sok%C3%B3%C5%82ka%202008'
              target='_blank'
              className='inline-block bg-white p-1 mb-4'
            >
              <img src={Left02} alt='Left 02' />
            </Link>


            <Link
              to='https://knightsoftheholyrosary.wordpress.com/2012/06/23/the-sacred-heart-of-jesus-the-immaculate-heart-of-mary-and-the-message-of-fatima/'
              target='_blank'
              className='inline-block bg-white p-1'
            >
              <img src={Left03} alt='Left 03' />
            </Link>

          </div>


          <div className='mx-auto w-full max-w-7xl'>
            {/* Category Filter */}
            <div className='mb-8 flex flex-wrap justify-center gap-3 md:mb-12'>
              <Badge
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                className='cursor-pointer px-4 py-2 text-white transition-transform hover:scale-105'
                onClick={() => setSelectedCategory('all')}
              >
                All Posts
              </Badge>
              {categories.map(category => (
                <Badge
                  key={category.slug}
                  variant={
                    selectedCategory === category.slug ? 'default' : 'outline'
                  }
                  className='cursor-pointer px-4 py-2 transition-transform hover:scale-105'
                  style={{
                    backgroundColor:
                      selectedCategory === category.slug
                        ? category.color
                        : 'transparent',
                    borderColor: category.color,
                    color:
                      selectedCategory === category.slug
                        ? 'white'
                        : category.color,
                  }}
                  onClick={() => setSelectedCategory(category.slug)}
                >
                  {category.name}
                </Badge>
              ))}
            </div>

            {/* Blog Posts Grid */}
            <div className='grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3'>
              {filteredPosts.map(post => (
                <BlogPostCard
                  key={post.id}
                  post={post}
                  categories={categories}
                />
              ))}
            </div>

            {filteredPosts.length === 0 && (
              <div className='py-16 text-center'>
                <h3 className='mb-3 text-2xl font-semibold text-white'>
                  No posts found
                </h3>
                <p className='text-muted-foreground'>
                  No blog posts are available in this category yet.
                </p>
              </div>
            )}
          </div>

          <div className='imgRight01 max-w-40'>
            <Link
              to='https://www.miracolieucaristici.org/en/Liste/scheda_c.html?nat=polonia&wh=sokolka&ct=Sok%C3%B3%C5%82ka%202008'
              target='_blank'
              className='inline-block bg-white p-1 mb-4'
            >
              <img src={Right02} alt='Right 03' />
            </Link>
            <Link
              to='https://knightsoftheholyrosary.wordpress.com/2012/06/23/the-sacred-heart-of-jesus-the-immaculate-heart-of-mary-and-the-message-of-fatima/'
              target='_blank'
              className='inline-block bg-white p-1'
            >
              <img src={Right03} alt='Right 03' />
            </Link>
          </div>

        </div>
      </div>

      <Footer />
    </div>
  );
};

const BlogPostCard = ({
  post,
  categories,
}: {
  post: BlogPost;
  categories: BlogCategory[];
}) => {
  const categoryData = categories.find(cat => cat.slug === post.category) || {
    name: 'General',
    color: '#6B7280',
  };

  return (
    <Card className='hover:glow-primary bg-gradient-pink-to-yellow group cursor-pointer rounded-sm border-0 p-[2px] shadow-none transition-all duration-300 hover:scale-105'>
      <div className='h-full rounded-sm bg-black p-0'>
        <Link to={`/blog/${post.slug}`}>
          {post.featured_image && (
            <img
              src={post.featured_image}
              alt={post.title}
              className='mb-2 h-40 w-full rounded-t-sm object-cover'
            />
          )}

          <CardHeader className='space-y-0 p-4 pb-0'>
            <div className='mb-3 flex items-center gap-2'>
              <Badge
                style={{
                  backgroundColor: categoryData.color,
                  color: 'white',
                }}
                className='text-xs'
              >
                {categoryData.name}
              </Badge>
              <div className='flex items-center gap-1 text-xs text-white'>
                <Eye className='h-3 w-3' />
                {post.view_count}
              </div>
            </div>

            <h3 className='line-clamp-2 pb-2 font-inter text-lg font-semibold text-white'>
              {post.title}
            </h3>

            {post.excerpt && (
              <p className='mt-2 line-clamp-3 font-open-sans text-sm font-normal text-white'>
                {post.excerpt}
              </p>
            )}
          </CardHeader>

          <CardContent className='p-4 pt-0'>
            <div className='flex items-center justify-between pt-4 text-xs text-muted-foreground'>
              <div className='flex items-center gap-1'>
                <Calendar className='h-3 w-3' />
                {new Date(
                  post.published_at || post.created_at
                ).toLocaleDateString()}
              </div>
              <div className='flex items-center gap-1'>
                <Clock className='h-3 w-3' />
                {Math.ceil(post.content.length / 200)} min read
              </div>
            </div>

            {post.tags.length > 0 && (
              <div className='mt-4 flex flex-wrap gap-1'>
                {post.tags.slice(0, 3).map(tag => (
                  <Badge
                    key={tag}
                    variant='outline'
                    className='text-xs text-white'
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Link>
      </div>
    </Card>
  );
};

export default Blog;
