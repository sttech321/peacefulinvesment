import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBlog, BlogPost, BlogCategory } from "@/hooks/useBlog";
import Footer from "@/components/Footer";

// Side images
import Left01 from "@/assets/left-01.jpg";
import Left02 from "@/assets/left-02.jpg";
import Left03 from "@/assets/left-03.jpg";
import Right01 from "@/assets/right-01.jpg";
import Right02 from "@/assets/right-02.jpg";
import Right03 from "@/assets/right-03.jpg";

/**
 * Blog.tsx — Parent badges with single expandable children row
 *
 * Behavior:
 * - Parent badges shown in first row.
 * - Clicking a parent toggles expansion (only one parent open at a time).
 * - If open, the next row shows that parent's children (multi-level flattened, indented).
 * - Caret/chevron only appears for parents that have children.
 * - Filter posts by selected category (parent or child) including all descendants.
 * - Works whether post.category stores slug or id.
 */

const Blog = () => {
  const { posts, categories, loading } = useBlog();

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [openParentId, setOpenParentId] = useState<string | null>(null);

  // Build maps and parents list
  const { parents, childrenMap, idMap, slugMap } = useMemo(() => {
    const idMap = new Map<string, BlogCategory>();
    const slugMap = new Map<string, BlogCategory>();
    categories.forEach((c) => {
      idMap.set(c.id, c);
      slugMap.set(c.slug, c);
    });

    const map = new Map<string, BlogCategory[]>();
    const parentsArr: BlogCategory[] = [];

    categories.forEach((c) => {
      const parentId = (c as any).parent_id ?? null;
      if (parentId === null) parentsArr.push(c);
      else {
        if (!map.has(parentId)) map.set(parentId, []);
        map.get(parentId)!.push(c);
      }
    });

    parentsArr.sort((a, b) => a.name.localeCompare(b.name));
    map.forEach((arr) => arr.sort((a, b) => a.name.localeCompare(b.name)));

    return { parents: parentsArr, childrenMap: map, idMap, slugMap };
  }, [categories]);

  // detect whether posts store slug or id
  const postCategoryType = useMemo(() => {
    const sample = posts.find(Boolean);
    if (!sample) return "slug";
    const val = sample.category;
    if (typeof val === "string" && val.includes("-") && val.length > 10) return "id";
    return "slug";
  }, [posts]);

  // Collect all descendants (ids & slugs) for a root id (recursive)
  const collectDescendants = (rootId: string) => {
    const ids = new Set<string>();
    const slugs = new Set<string>();
    const stack = [rootId];

    while (stack.length) {
      const id = stack.pop()!;
      if (ids.has(id)) continue;
      ids.add(id);
      const cat = idMap.get(id);
      if (cat) slugs.add(cat.slug);

      const children = childrenMap.get(id) ?? [];
      children.forEach((c) => stack.push(c.id));
    }

    return { ids, slugs };
  };

  // Robust filteredPosts — includes selected category + all descendants
  const filteredPosts = useMemo(() => {
    if (selectedCategory === "all") return posts;

    // resolve selected to id (selectedCategory could be slug or id)
    let selectedId: string | null = null;
    if (idMap.has(selectedCategory)) selectedId = selectedCategory;
    else {
      const bySlug = slugMap.get(selectedCategory);
      if (bySlug) selectedId = bySlug.id;
    }

    if (!selectedId) {
      // fallback: maybe posts store slug and selectedCategory is slug
      if (postCategoryType === "slug") {
        return posts.filter((p) => p.category === selectedCategory);
      }
      return [];
    }

    const { ids, slugs } = collectDescendants(selectedId);
    ids.add(selectedId);
    const rootCat = idMap.get(selectedId);
    if (rootCat) slugs.add(rootCat.slug);

    if (postCategoryType === "id") return posts.filter((p) => ids.has(p.category));
    return posts.filter((p) => slugs.has(p.category));
  }, [posts, selectedCategory, idMap, slugMap, childrenMap, postCategoryType]);

  // Toggle single open parent (only one open at a time)
  const toggleOpenParent = (parentId: string) => {
    setOpenParentId((prev) => (prev === parentId ? null : prev === parentId ? null : parentId));
  };

  const showAll = () => {
    setSelectedCategory("all");
    setOpenParentId(null);
  };

  // Render children flattened in order with indentation for multi-level
  const buildFlattenedChildren = (rootId: string) => {
    const result: { node: BlogCategory; depth: number }[] = [];
    const visit = (id: string, depth: number) => {
      const children = childrenMap.get(id) ?? [];
      children.forEach((child) => {
        result.push({ node: child, depth });
        visit(child.id, depth + 1);
      });
    };
    visit(rootId, 1);
    return result;
  };

  // compute children to show when a parent is open
  const openChildren = useMemo(() => {
    if (!openParentId) return [];
    return buildFlattenedChildren(openParentId);
  }, [openParentId, childrenMap]);

  if (loading) {
    return (
      <div className="min-h-screen pink-yellow-shadow pt-16">
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
                <Card className="bg-black/20 glass-card shadow-none opacity-50" key={i}>
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
      {/* Header with side images */}
      <div className="animate-slide-up bg-black/20 px-6 py-10 text-center md:py-12 lg:py-24">
        <div className="flex grid-cols-1 flex-wrap items-center justify-center gap-8 md:grid-cols-2 lg:grid-cols-3 lg:flex-nowrap">
          <div className="imgLeft01 max-w-40">
            <Link
              to="https://www.miracolieucaristici.org/en/Liste/scheda_c.html?nat=argentina&wh=buenosaires&ct=Buenos%20Aires,%201992-1994-1996"
              target="_blank"
              className="inline-block bg-white p-1"
            >
              <img src={Left01} alt="Left 01" />
            </Link>
          </div>

          <div className="mx-auto w-full max-w-7xl">
            <h1 className="mb-6 font-inter font-bold uppercase text-white text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
              Catholic <span className="text-[var(--yellowcolor)]">Faith &amp; Prayer</span>
            </h1>
            <p className="max-w-2xl mx-auto font-inter text-lg md:text-[20px] font-normal text-white">
              Daily prayers, spiritual guidance, and charitable mission updates from Peaceful Investment
            </p>
          </div>

          <div className="imgRight01 max-w-40">
            <Link
              to="https://www.miracolieucaristici.org/en/Liste/scheda.html?nat=india&wh=chirattakonam&ct=Chirattakonam,%202001"
              target="_blank"
              className="inline-block bg-white p-1"
            >
              <img src={Right01} alt="Right 01" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main content with side images */}
      <div className="px-6 py-10 md:py-12 xl:py-20">
        <div className="flex grid-cols-1 flex-wrap justify-center gap-8 md:grid-cols-2 lg:grid-cols-3 lg:flex-nowrap">
          {/* Left column images */}
          <div className="imgLeft01 max-w-40">
            <Link
              to="https://www.miracolieucaristici.org/en/Liste/scheda_c.html?nat=polonia&wh=sokolka&ct=Sok%C3%B3%C5%82ka%202008"
              target="_blank"
              className="inline-block bg-white p-1 mb-4"
            >
              <img src={Left02} alt="Left 02" />
            </Link>

            <Link
              to="https://knightsoftheholyrosary.wordpress.com/2012/06/23/the-sacred-heart-of-jesus-the-immaculate-heart-of-mary-and-the-message-of-fatima/"
              target="_blank"
              className="inline-block bg-white p-1"
            >
              <img src={Left03} alt="Left 03" />
            </Link>
          </div>

          {/* Center content (categories + posts) */}
          <div className="mx-auto w-full max-w-7xl">
            {/* Category Filter */}
            <div className="flex flex-col gap-3 mb-8 md:mb-12 items-center">
              <div className="flex flex-wrap gap-3 justify-center">
                <Badge
                  variant={selectedCategory === "all" ? "default" : "outline"}
                  className="cursor-pointer hover:scale-105 transition-transform px-4 py-2 text-white"
                  onClick={showAll}
                >
                  All Posts
                </Badge>

                {/* Parent badges */}
                {parents.map((parent) => {
                  const children = childrenMap.get(parent.id) ?? [];
                  const hasChildren = children.length > 0;
                  const isActive = selectedCategory === parent.slug || selectedCategory === parent.id;
                  return (
                    <Badge
                      key={parent.id}
                      variant={isActive ? "default" : "outline"}
                      className="cursor-pointer hover:scale-105 transition-transform px-4 py-2 flex items-center"
                      style={{
                        backgroundColor: isActive ? parent.color : "transparent",
                        borderColor: parent.color,
                        color: isActive ? "white" : parent.color,
                      }}
                      onClick={() => {
                        setSelectedCategory(parent.slug);
                        toggleOpenParent(parent.id);
                      }}
                      title={parent.description ?? parent.name}
                    >
                      {parent.name}
                      {hasChildren && (
                        <span
                          style={{
                            fontSize: 10,
                            marginLeft: 8,
                            opacity: 0.9,
                            transform: openParentId === parent.id ? "rotate(180deg)" : "none",
                            transition: "transform .12s ease",
                          }}
                        >
                          ▾
                        </span>
                      )}
                    </Badge>
                  );
                })}
              </div>

              {/* Single children row (for the open parent) */}
              {openParentId && openChildren.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 justify-center">
                  {openChildren.map(({ node, depth }) => {
                    const isActive = selectedCategory === node.slug || selectedCategory === node.id;
                    return (
                      <Badge
                        key={node.id}
                        variant={isActive ? "default" : "outline"}
                        className="cursor-pointer transition-transform px-3 py-1 text-sm"
                        style={{
                          marginLeft: depth === 1 ? 0 : depth * 6,
                          backgroundColor: isActive ? node.color : "transparent",
                          borderColor: node.color,
                          color: isActive ? "white" : node.color,
                        }}
                        onClick={() => {
                          setSelectedCategory(node.slug);
                        }}
                      >
                        {node.name}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Blog Posts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.map((post) => (
                <BlogPostCard key={post.id} post={post} categories={categories} />
              ))}
            </div>

            {filteredPosts.length === 0 && (
              <div className="text-center py-16">
                <h3 className="text-2xl font-semibold text-white mb-3">No posts found</h3>
                <p className="text-muted-foreground">No blog posts are available in this category yet.</p>
              </div>
            )}
          </div>

          {/* Right column images */}
          <div className="imgRight01 max-w-40">
            <Link
              to="https://www.miracolieucaristici.org/en/Liste/scheda_c.html?nat=polonia&wh=sokolka&ct=Sok%C3%B3%C5%82ka%202008"
              target="_blank"
              className="inline-block bg-white p-1 mb-4"
            >
              <img src={Right02} alt="Right 02" />
            </Link>
            <Link
              to="https://knightsoftheholyrosary.wordpress.com/2012/06/23/the-sacred-heart-of-jesus-the-immaculate-heart-of-mary-and-the-message-of-fatima/"
              target="_blank"
              className="inline-block bg-white p-1"
            >
              <img src={Right03} alt="Right 03" />
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

const BlogPostCard = ({ post, categories }: { post: BlogPost; categories: BlogCategory[] }) => {
  const categoryData = categories.find((cat) => cat.slug === post.category) || {
    name: "General",
    color: "#6B7280",
  };

  return (
    <Card className="group hover:scale-105 hover:glow-primary transition-all duration-300 cursor-pointer border-0 shadow-none bg-gradient-pink-to-yellow rounded-sm p-[2px]">
      <div className="bg-black rounded-sm p-0 h-full">
        <Link to={`/blog/${post.slug}`}>
          {post.featured_image && (
            <img src={post.featured_image} alt={post.title} className="w-full h-40 object-cover rounded-t-sm mb-2" />
          )}

          <CardHeader className="p-4 pb-0 space-y-0">
            <div className="flex items-center gap-2 mb-3">
              <Badge style={{ backgroundColor: categoryData.color, color: "white" }} className="text-xs">
                {categoryData.name}
              </Badge>
              <div className="flex items-center gap-1 text-xs text-white">
                <Eye className="w-3 h-3" />
                {post.view_count}
              </div>
            </div>

            <h3 className="text-lg font-inter font-semibold text-white line-clamp-2 pb-2">{post.title}</h3>

            {post.excerpt && (
              <p className="text-white font-open-sans font-normal text-sm line-clamp-3 mt-2">{post.excerpt}</p>
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
