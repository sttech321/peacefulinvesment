import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, Eye, Tag, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useBlog, type BlogPost as BlogPostType } from "@/hooks/useBlog";
import ReactMarkdown from "react-markdown";
import Footer from "@/components/Footer";

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { getPostBySlug, incrementViewCount } = useBlog();
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPost = useCallback(async () => {
    if (!slug) return;
    
    setLoading(true);
    const postData = await getPostBySlug(slug);
    
    if (postData) {
      setPost(postData);
      // Increment view count
      await incrementViewCount(postData.id);
    } else {
      navigate('/blog');
    }
    
    setLoading(false);
  }, [slug, navigate]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const sharePost = async () => {
    if (navigator.share && post) {
      try {
        await navigator.share({
          title: post.title,
          text: post.excerpt || '',
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback to copying URL
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pink-yellow-shadow px-6 pt-16 flex items-center justify-center">
        <div className="max-w-7xl mx-auto w-full opacity-20">
          <Skeleton className="h-8 w-32 mb-8" />
          <Skeleton className="h-12 w-full mb-4" />
          <Skeleton className="h-6 w-full mb-8" />
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
         <div className="min-h-screen pink-yellow-shadow pt-16 flex items-center justify-center">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="mb-6 font-inter font-bold uppercase text-white text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
            Post <span className="text-[var(--yellowcolor)]">not found</span> </h1>
          <Link to="/blog" className="bg-gradient-pink-to-yellow rounded-[12px] p-[2px] inline-block">
            <Button variant="outline" className="bg-gradient-yellow-to-pink hover:bg-gradient-pink-to-yellow flex rounded-[10px] border-0 p-0 px-5 font-inter text-sm font-semibold uppercase text-white hover:text-white"> 
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Blog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const categoryData = {
    'morning-prayers': { color: '#F59E0B', name: 'Morning Prayers' },
    'night-prayers': { color: '#6366F1', name: 'Night Prayers' },
    'catholic-apps': { color: '#10B981', name: 'Catholic Apps' },
    'charity': { color: '#EF4444', name: 'Charity' },
    'general': { color: '#6B7280', name: 'General' },
  }[post.category] || { color: '#6B7280', name: 'General' };

  return (
    <> 

    <div className="min-h-screen pink-yellow-shadow pt-16 blog-singlepost">
      <article>

        <div className="px-6 py-10 md:py-12 lg:py-20 bg-black/20">
        <div className="max-w-7xl mx-auto">
        {/* Navigation */}
        {/* <div className="mb-0">
          <Link to="/blog">
            <Button variant="ghost" className="hover:bg-transparent bg-transparent text-white hover:text-muted-foreground p-0">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Blog
            </Button>
          </Link>
        </div> */}

        {/* Header */}
        <header className="mb-0">
          <div className="grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 flex-wrap lg:flex-nowrap flex items-center">
          <div className="flex flex-wrap items-center gap-0 mb-0 max-w-3xl pr-0 lg:pr-5">
         
            <div className="flex flex-wrap items-center gap-2 md:gap-4 text-sm text-muted-foreground pb-5 md:pb-7">
                 <Badge className="bg-gradient-yellow-to-pink block rounded-[20px] border-0 py-1 px-2 font-inter text-xs font-semibold uppercase text-white">
              {categoryData.name}
            </Badge>

              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(post.published_at || post.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {Math.ceil(post.content.length / 200)} min read
              </div>
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {post.view_count} views
              </div>
            </div>
           
          <h1 className="pb-5 md:pb-7 font-inter text-2xl font-bold text-white md:text-3xl">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="mx-auto max-w-3xl font-open-sans text-lg text-white pb-7">
              {post.excerpt}
            </p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs font-normal font-open-sans text-white p-1 px-3">
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
              ))}
           
            
            
            <Button 
              onClick={sharePost} 
              variant="outline" 
              size="sm"
              className="flex items-center gap-2 ml-0 p-1 px-4 border-0 h-26 bg-primary text-black hover:bg-primary/70 focus:ring-2 focus:ring-offset-2 focus:ring-primary hover:text-white"
            >
              <Share2 className="w-4 h-4" />
              Share
            </Button>
             </div>
          </div>
          </div>
          <div className="">
             {post.featured_image && (
            <img 
              src={post.featured_image} 
              alt={post.title} 
              className="w-full h-auto object-cover rounded-md mt-0" 
            />
          )}
          </div>     
          </div>
             </header>
        </div>
</div>


        {/* Content */}
        <div className="px-6">
        <div className="max-w-7xl mx-auto">
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="text-3xl font-bold text-foreground mb-6 pt-8 text-white">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-[22px] font-semibold text-foreground mb-4 mt-8 text-white">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-xl font-semibold text-foreground mb-3 mt-6 text-white">{children}</h3>
              ),
              p: ({ children }) => (
                <p className="font-open-sans text-[16px] text-foreground mb-4 leading-relaxed text-white">{children}</p>
              ),
              strong: ({ children }) => (
                <strong className="font-bold text-primary">{children}</strong>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-primary pl-6 italic text-white my-6">
                  {children}
                </blockquote>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside space-y-2 mb-4 text-white">{children}</ul>
              ),
              li: ({ children }) => (
                <li className="text-white">{children}</li>
              ),
            }}
          >
            {post.content}
          </ReactMarkdown>
        </div>
</div>

        {/* Footer */}
        <footer className="border-0 border-muted-foreground/10 px-5 py-10 md:py-12 xl:py-14">
          <div className="text-center">
            <p className="text-white mb-4">
              Share this prayer with others who might benefit
            </p>
            <div className="flex justify-center gap-4">
              <Link to="/blog" className="bg-gradient-pink-to-yellow rounded-[12px] p-[2px]">
                <Button variant="outline" className=" hover:bg-gradient-pink-to-yellow block rounded-[10px] border-0 bg-black p-0 px-5 font-inter text-xs font-semibold uppercase text-white hover:text-white">
                  Read More Articles
                </Button>
              </Link>
              <span className="bg-gradient-pink-to-yellow rounded-[12px] p-[2px]">
              <Button onClick={sharePost} className="bg-gradient-yellow-to-pink hover:bg-gradient-pink-to-yellow flex rounded-[10px] border-0 p-0 px-5 font-inter text-xs font-semibold uppercase text-white">
                <Share2 className="w-4 h-4 mr-1" />
                Share Article
              </Button></span>
            </div>
          </div>
        </footer>
      </article>
    </div>
     <Footer />
    </>
  );
};

export default BlogPost;