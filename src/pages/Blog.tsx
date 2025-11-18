import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, Eye, Tag, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBlog, BlogPost } from "@/hooks/useBlog";
import ReactMarkdown from "react-markdown";
import Footer from "@/components/Footer";

const Blog = () => {
  const { posts, categories, loading } = useBlog();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredPosts = selectedCategory === 'all' 
    ? posts 
    : posts.filter(post => post.category === selectedCategory);

  if (loading) {
    return (
      <div className="min-h-screen pt-20 px-6 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Skeleton className="h-12 w-96 mx-auto mb-4" />
            <Skeleton className="h-6 w-128 mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 px-6 bg-background">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Catholic <span className="text-gradient">Faith & Prayer</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Daily prayers, spiritual guidance, and charitable mission updates from Peaceful Investment
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-3 mb-12 justify-center">
          <Badge
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            className="cursor-pointer hover:scale-105 transition-transform px-4 py-2"
            onClick={() => setSelectedCategory('all')}
          >
            All Posts
          </Badge>
          {categories.map((category) => (
            <Badge
              key={category.slug}
              variant={selectedCategory === category.slug ? 'default' : 'outline'}
              className="cursor-pointer hover:scale-105 transition-transform px-4 py-2"
              style={{
                backgroundColor: selectedCategory === category.slug ? category.color : 'transparent',
                borderColor: category.color,
                color: selectedCategory === category.slug ? 'white' : category.color,
              }}
              onClick={() => setSelectedCategory(category.slug)}
            >
              {category.name}
            </Badge>
          ))}
        </div>

        {/* Blog Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.map((post) => (
            <BlogPostCard key={post.id} post={post} />
          ))}
        </div>

        {filteredPosts.length === 0 && (
          <div className="text-center py-16">
            <h3 className="text-2xl font-semibold text-muted-foreground mb-4">
              No posts found
            </h3>
            <p className="text-muted-foreground">
              No blog posts are available in this category yet.
            </p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

const BlogPostCard = ({ post }: { post: BlogPost }) => {
  const categoryData = {
    'morning-prayers': { color: '#F59E0B', name: 'Morning Prayers' },
    'night-prayers': { color: '#6366F1', name: 'Night Prayers' },
    'catholic-apps': { color: '#10B981', name: 'Catholic Apps' },
    'charity': { color: '#EF4444', name: 'Charity' },
    'general': { color: '#6B7280', name: 'General' },
  }[post.category] || { color: '#6B7280', name: 'General' };

  return (
    <Card className="group hover:scale-105 transition-all duration-300 cursor-pointer glass-card">
      <Link to={`/blog/${post.slug}`}>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2 mb-3">
            <Badge
              style={{
                backgroundColor: categoryData.color,
                color: 'white',
              }}
              className="text-xs"
            >
              {categoryData.name}
            </Badge>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Eye className="w-3 h-3" />
              {post.view_count}
            </div>
          </div>
          
          <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
            {post.title}
          </h3>
          
          {post.excerpt && (
            <p className="text-muted-foreground text-sm line-clamp-3 mt-2">
              {post.excerpt}
            </p>
          )}
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(post.published_at || post.created_at).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {Math.ceil(post.content.length / 200)} min read
            </div>
          </div>
          
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {post.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Link>
    </Card>
  );
};

export default Blog;