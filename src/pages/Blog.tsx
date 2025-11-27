import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBlog, BlogPost, BlogCategory } from "@/hooks/useBlog";
import Footer from "@/components/Footer";

const Blog = () => {
  const { posts, categories, loading } = useBlog();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredPosts = useMemo(
    () =>
      selectedCategory === "all"
        ? posts
        : posts.filter((post) => post.category === selectedCategory),
    [posts, selectedCategory]
  );

  if (loading) {
    return (
      <div className="min-h-screen pink-yellow-shadow pt-16">
        {/* Header */}
        <div className="text-center py-10 md:py-12 lg:py-24 px-6 animate-slide-up bg-black/20">
          <div className="max-w-4xl mx-auto">
            <Skeleton className="h-12 w-full mx-auto mb-4 opacity-50" />
            <Skeleton className="h-6 w-full mx-auto opacity-50" />
          </div>
        </div>

        <div className="px-6 py-10 md:py-12 lg:py-24">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <Card
                  className="bg-black/20 glass-card shadow-none opacity-50"
                  key={i}
                >
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
      </div>
    );
  }

  return (
    <div className="min-h-screen pink-yellow-shadow pt-20">
      {/* Header */}
      <div className="text-center py-10 md:py-12 lg:py-24 px-6 animate-slide-up bg-black/20">
        <div className="max-w-7xl mx-auto">
          <h1 className="mb-6 font-inter font-bold uppercase text-white text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
            Catholic <span className="text-[var(--yellowcolor)]">Faith & Prayer</span>
          </h1>
          <p className="max-w-2xl mx-auto font-inter text-lg md:text-[20px] font-normal text-white">
            Daily prayers, spiritual guidance, and charitable mission updates from
            Peaceful Investment
          </p>
        </div>
      </div>

      <div className="px-6 py-10 md:py-12 xl:py-20">
        <div className="max-w-7xl mx-auto">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-3 mb-8 md:mb-12 justify-center">
            <Badge
              variant={selectedCategory === "all" ? "default" : "outline"}
              className="cursor-pointer hover:scale-105 transition-transform px-4 py-2 text-white"
              onClick={() => setSelectedCategory("all")}
            >
              All Posts
            </Badge>
            {categories.map((category) => (
              <Badge
                key={category.slug}
                variant={
                  selectedCategory === category.slug ? "default" : "outline"
                }
                className="cursor-pointer hover:scale-105 transition-transform px-4 py-2"
                style={{
                  backgroundColor:
                    selectedCategory === category.slug
                      ? category.color
                      : "transparent",
                  borderColor: category.color,
                  color:
                    selectedCategory === category.slug
                      ? "white"
                      : category.color,
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
              <BlogPostCard
                key={post.id}
                post={post}
                categories={categories}
              />
            ))}
          </div>

          {filteredPosts.length === 0 && (
            <div className="text-center py-16">
              <h3 className="text-2xl font-semibold text-white mb-3">
                No posts found
              </h3>
              <p className="text-muted-foreground">
                No blog posts are available in this category yet.
              </p>
            </div>
          )}
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
  const categoryData =
    categories.find((cat) => cat.slug === post.category) || {
      name: "General",
      color: "#6B7280",
    };

  return (
    <Card className="group hover:scale-105 hover:glow-primary transition-all duration-300 cursor-pointer border-0 shadow-none bg-gradient-pink-to-yellow rounded-sm p-[2px]">
      <div className="bg-black rounded-sm p-0 h-full">
        <Link to={`/blog/${post.slug}`}>
          {post.featured_image && (
            <img
              src={post.featured_image}
              alt={post.title}
              className="w-full h-40 object-cover rounded-t-sm mb-2"
            />
          )}

          <CardHeader className="p-4 pb-0 space-y-0">
            <div className="flex items-center gap-2 mb-3">
              <Badge
                style={{
                  backgroundColor: categoryData.color,
                  color: "white",
                }}
                className="text-xs"
              >
                {categoryData.name}
              </Badge>
              <div className="flex items-center gap-1 text-xs text-white">
                <Eye className="w-3 h-3" />
                {post.view_count}
              </div>
            </div>

            <h3 className="text-lg font-inter font-semibold text-white line-clamp-2 pb-2">
              {post.title}
            </h3>

            {post.excerpt && (
              <p className="text-white font-open-sans font-normal text-sm line-clamp-3 mt-2">
                {post.excerpt}
              </p>
            )}
          </CardHeader>

          <CardContent className="p-4 pt-0">
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-4">
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
              <div className="flex flex-wrap gap-1 mt-4">
                {post.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs text-white">
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
