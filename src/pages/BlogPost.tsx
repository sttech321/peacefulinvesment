import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, Eye, Tag, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useBlog, type BlogPost as BlogPostType } from "@/hooks/useBlog";
import ReactMarkdown from "react-markdown";

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
      <div className="min-h-screen pt-20 px-6 bg-background">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-8 w-32 mb-8" />
          <Skeleton className="h-12 w-full mb-4" />
          <Skeleton className="h-6 w-96 mb-8" />
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
      <div className="min-h-screen pt-20 px-6 bg-background">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Post not found</h1>
          <Link to="/blog">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
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
    <div className="min-h-screen pt-20 px-6 bg-background">
      <article className="max-w-4xl mx-auto">
        {/* Navigation */}
        <div className="mb-8">
          <Link to="/blog">
            <Button variant="ghost" className="hover:bg-muted">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Button>
          </Link>
        </div>

        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Badge
              style={{
                backgroundColor: categoryData.color,
                color: 'white',
              }}
            >
              {categoryData.name}
            </Badge>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(post.published_at || post.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
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
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="text-xl text-muted-foreground mb-6 leading-relaxed">
              {post.excerpt}
            </p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
            
            <Button 
              onClick={sharePost} 
              variant="outline" 
              size="sm"
              className="flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </div>
        </header>

        {/* Content */}
        <div className="prose prose-lg max-w-none dark:prose-invert">
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="text-3xl font-bold text-foreground mb-6 mt-8">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-2xl font-semibold text-foreground mb-4 mt-8">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">{children}</h3>
              ),
              p: ({ children }) => (
                <p className="text-foreground mb-4 leading-relaxed">{children}</p>
              ),
              strong: ({ children }) => (
                <strong className="font-bold text-primary">{children}</strong>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-primary pl-6 italic text-muted-foreground my-6">
                  {children}
                </blockquote>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside space-y-2 mb-4 text-foreground">{children}</ul>
              ),
              li: ({ children }) => (
                <li className="text-foreground">{children}</li>
              ),
            }}
          >
            {post.content}
          </ReactMarkdown>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-border">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              Share this prayer with others who might benefit
            </p>
            <div className="flex justify-center gap-4">
              <Link to="/blog">
                <Button variant="outline">
                  Read More Articles
                </Button>
              </Link>
              <Button onClick={sharePost}>
                <Share2 className="w-4 h-4 mr-2" />
                Share Article
              </Button>
            </div>
          </div>
        </footer>
      </article>
    </div>
  );
};

export default BlogPost;