import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, Clock, Eye, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useBlog, BlogPost, BlogCategory } from "@/hooks/useBlog";
import Footer from "@/components/Footer";

// Side images
import Left01 from "@/assets/left-01.jpg";
import Left02 from "@/assets/left-02.jpg";
import Left03 from "@/assets/left-03.jpg";
import Right01 from "@/assets/right-01.jpg";
import Right02 from "@/assets/right-02.jpg";
import Right03 from "@/assets/right-03.jpg";

const POSTS_PER_BATCH = 9;

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
  const { posts, categories, loading, initializing } = useBlog();
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [openParentId, setOpenParentId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(POSTS_PER_BATCH);
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
    if (!sample || !sample.category) return "slug";
    const val = sample.category;
    // Check if it looks like a UUID (typical format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    if (typeof val === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)) {
      return "id";
    }
    return "slug";
  }, [posts]);

  // Cache descendant lookups per root category id (invalidates when category tree changes)
  const getDescendants = useMemo(() => {
    const cache = new Map<string, { ids: Set<string>; slugs: Set<string> }>();

    return (rootId: string) => {
      const cached = cache.get(rootId);
      if (cached) return cached;

      const ids = new Set<string>();
      const slugs = new Set<string>();
      const stack = [rootId];

      while (stack.length) {
        const id = stack.pop()!;
        if (ids.has(id)) continue;
        ids.add(id);
        const cat = idMap.get(id);
        if (cat?.slug) {
          const normalized = cat.slug.toLowerCase().trim();
          slugs.add(cat.slug);
          slugs.add(normalized);
        }

        const children = childrenMap.get(id);
        if (children?.length) {
          for (const child of children) stack.push(child.id);
        }
      }

      const result = { ids, slugs };
      cache.set(rootId, result);
      return result;
    };
  }, [childrenMap, idMap]);

  // Robust filteredPosts — includes selected category + all descendants
  const filteredPosts = useMemo(() => {
    if (selectedCategory === "all") return posts;

    // resolve selected to id (selectedCategory could be slug or id)
    let selectedId: string | null = null;
    let selectedSlug: string | null = null;
    
    if (idMap.has(selectedCategory)) {
      selectedId = selectedCategory;
      const cat = idMap.get(selectedCategory);
      if (cat) selectedSlug = cat.slug;
    } else {
      const bySlug = slugMap.get(selectedCategory);
      if (bySlug) {
        selectedId = bySlug.id;
        selectedSlug = bySlug.slug;
      }
    }

    // If we couldn't resolve, try direct slug matching (case-insensitive)
    if (!selectedId && !selectedSlug) {
      const normalizedSelected = selectedCategory.toLowerCase().trim();
      for (const cat of slugMap.values()) {
        if (cat.slug.toLowerCase().trim() === normalizedSelected) {
          selectedId = cat.id;
          selectedSlug = cat.slug;
          break;
        }
      }
    }

    // If still not found, try direct match on posts (fallback)
    if (!selectedId) {
      const normalizedSelected = selectedCategory.toLowerCase().trim();
      return posts.filter((p) => {
        if (!p.category) return false;
        const postCategory = typeof p.category === 'string' ? p.category.toLowerCase().trim() : '';
        return postCategory === normalizedSelected;
      });
    }

    // Collect all descendant IDs and slugs (includes the selected category itself)
    const { ids, slugs } = getDescendants(selectedId);
    
    // Ensure the selected category's slug is in the set
    if (selectedSlug) {
      slugs.add(selectedSlug);
      slugs.add(selectedSlug.toLowerCase().trim());
    }
    
    // Also add from idMap in case it wasn't in collectDescendants
    const rootCat = idMap.get(selectedId);
    if (rootCat && rootCat.slug) {
      slugs.add(rootCat.slug);
      slugs.add(rootCat.slug.toLowerCase().trim());
    }

    // Filter posts based on whether they store ID or slug
    if (postCategoryType === "id") {
      return posts.filter((p) => {
        if (!p.category) return false;
        return ids.has(p.category);
      });
    }
    
    // Posts store slugs - match against collected slugs (case-insensitive)
    const normalizedSlugSet = new Set(Array.from(slugs, (s) => s.toLowerCase().trim()));

    return posts.filter((p) => {
      if (!p.category) return false;
      const postCategory = typeof p.category === "string" ? p.category.toLowerCase().trim() : "";
      return normalizedSlugSet.has(postCategory);
    });
  }, [posts, selectedCategory, idMap, slugMap, postCategoryType, getDescendants]);

  // Toggle single open parent (only one open at a time)
  const toggleOpenParent = useCallback((parentId: string) => {
    setOpenParentId((prev) => (prev === parentId ? null : parentId));
  }, []);

  const showAll = useCallback(() => {
    setSelectedCategory((prev) => (prev === "all" ? prev : "all"));
    setOpenParentId((prev) => (prev === null ? prev : null));
  }, []);

  // Reset batch rendering when the filter changes (keeps switching snappy)
  useEffect(() => {
    setVisibleCount(POSTS_PER_BATCH);
  }, [selectedCategory]);

  // Render children flattened in order with indentation for multi-level
  const buildFlattenedChildren = useCallback((rootId: string) => {
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
  }, [childrenMap]);

  // compute children to show when a parent is open
  const openChildren = useMemo(() => {
    if (!openParentId) return [];
    return buildFlattenedChildren(openParentId);
  }, [openParentId, buildFlattenedChildren]);

  const categoryDisplayMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    for (const cat of categories) {
      const display = { name: cat.name, color: cat.color };
      map.set(cat.id, display);
      map.set(cat.slug, display);
      map.set(cat.slug.toLowerCase().trim(), display);
    }
    return map;
  }, [categories]);

  const visiblePosts = useMemo(() => filteredPosts.slice(0, visibleCount), [filteredPosts, visibleCount]);

  // Keep loader visible until we have either posts or categories to render.
  if (initializing || loading || (!posts.length && !categories.length)) {
    return (
      <div className="min-h-screen pink-yellow-shadow flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
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
            <p className="max-w-2xl mx-auto font-inter text-lg md:text-[20px] font-normal text-white mb-6">
              Daily prayers, spiritual guidance, and charitable mission updates from Peaceful Investment
            </p>
            <div className="flex justify-center">
              <Button
                onClick={() => navigate('/prayer-tasks')}
                className="bg-gradient-to-r from-[var(--yellowcolor)] to-orange-500 hover:from-orange-500 hover:to-[var(--yellowcolor)] text-black font-semibold px-8 py-6 text-lg rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
              >
                <Heart className="h-5 w-5" />
                Join in Prayer - Prayer Tasks
              </Button>
            </div>
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

           
          </div>

          {/* Center content (categories + posts) */}
          <div className="mx-auto w-full max-w-7xl">
            {/* Category Filter */}
            <div className="flex flex-col gap-3 mb-8 md:mb-12 items-center">
              <div className="flex flex-wrap gap-3 justify-center">
                <Button
                  onClick={() => navigate('/prayer-tasks')}
                  className="bg-gradient-to-r from-[var(--yellowcolor)] to-orange-500 hover:from-orange-500 hover:to-[var(--yellowcolor)] text-black font-semibold px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 mb-4"
                >
                  <Heart className="h-4 w-4" />
                  Prayer Tasks
                </Button>
              </div>
              <div className="flex flex-wrap gap-3 justify-center">
                <Badge
                  variant={selectedCategory === "all" ? "default" : "outline"}
                  className="cursor-pointer hover:scale-105 transition-transform px-4 py-2 text-white bg-transparent hover:bg-transparent border-white"
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
                        setSelectedCategory((prev) => (prev === parent.slug ? prev : parent.slug));
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
                          setSelectedCategory((prev) => (prev === node.slug ? prev : node.slug));
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
              {visiblePosts.map((post) => (
                <BlogPostCard key={post.id} post={post} categoryDisplayMap={categoryDisplayMap} postCategoryType={postCategoryType} />
              ))}
            </div>

            {visibleCount < filteredPosts.length && (
              <div className="flex justify-center mt-10">
                <Button
                  variant="outline"
                  className="border-white text-white bg-transparent hover:bg-white/10"
                  onClick={() => setVisibleCount((c) => Math.min(c + POSTS_PER_BATCH, filteredPosts.length))}
                >
                  Load More
                </Button>
              </div>
            )}

            {!loading && (posts.length > 0 || categories.length > 0) && filteredPosts.length === 0 && (
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
            
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

const BlogPostCard = memo(
  ({
    post,
    categoryDisplayMap,
    postCategoryType,
  }: {
    post: BlogPost;
    categoryDisplayMap: Map<string, { name: string; color: string }>;
    postCategoryType: "id" | "slug";
  }) => {
    const rawCategory = typeof post.category === "string" ? post.category : "";
    const normalizedCategory = rawCategory.toLowerCase().trim();
    const categoryData =
      categoryDisplayMap.get(postCategoryType === "id" ? rawCategory : normalizedCategory) ??
      categoryDisplayMap.get(rawCategory) ??
      categoryDisplayMap.get(normalizedCategory) ?? {
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
                loading="lazy"
                decoding="async"
                className="w-full h-40 object-cover rounded-t-sm mb-2"
              />
            )}

            <CardHeader className="p-4 pb-0 space-y-0">
              <div className="flex items-center gap-2 mb-3">
                <Badge style={{ backgroundColor: categoryData.color, color: "white" }} className="text-xs border-0">
                  {categoryData.name}
                </Badge>
                <div className="flex items-center gap-1 text-xs text-white">
                  <Eye className="w-3 h-3" />
                  {post.view_count}
                </div>
              </div>

              <h3 className="text-lg font-inter font-semibold text-white line-clamp-2 pb-2">{post.title}</h3>

              {post.excerpt && (
                <p
                  className="text-white font-open-sans font-normal text-sm line-clamp-3 mt-2"
                  dangerouslySetInnerHTML={{ __html: post.excerpt }}
                ></p>
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
                    <Badge key={tag} variant="outline" className="text-xs text-white bg-transparent">
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
  },
  (prev, next) =>
    prev.post === next.post &&
    prev.postCategoryType === next.postCategoryType &&
    prev.categoryDisplayMap === next.categoryDisplayMap
);

export default Blog;
