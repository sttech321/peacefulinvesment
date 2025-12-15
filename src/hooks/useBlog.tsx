// hooks/useBlog.ts
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featured_image?: string;
  category: string;
  tags: string[];
  status: "draft" | "published" | "archived";
  author_id: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
  view_count: number;
  meta_title?: string;
  meta_description?: string;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  parent_id?: string | null;
  created_at: string;
  updated_at: string;
}

/** internal helper type for building tree */
type CategoryRow = BlogCategory & { children?: CategoryRow[] };

export const useBlog = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]); // flat list
  const [categoriesTree, setCategoriesTree] = useState<CategoryRow[]>([]); // nested tree
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);

  const fetchPosts = useCallback(async (status: string = "published") => {
    try {
      let query = supabase
        .from("blog_posts")
        .select("*")
        .order("published_at", { ascending: false });

      if (status !== "all") {
        query = query.eq("status", status);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPosts((data || []) as BlogPost[]);
    } catch (error) {
      console.error("Error fetching blog posts:", error);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      // fetch flat rows including parent_id (ensure column exists in DB)
      const { data, error } = await supabase
        .from("blog_categories")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      const flat = (data || []) as BlogCategory[];

      // build one-level tree: parents with children arrays
      const map = new Map<string, CategoryRow>();
      flat.forEach((r) => map.set(r.id, { ...r, children: [] }));

      const roots: CategoryRow[] = [];
      map.forEach((node) => {
        if (node.parent_id) {
          const parent = map.get(node.parent_id);
          if (parent) {
            parent.children = parent.children || [];
            parent.children.push(node);
          } else {
            // parent not found (orphan) -> treat as root
            roots.push(node);
          }
        } else {
          roots.push(node);
        }
      });

      // optional: sort children & roots by name
      const sortRec = (arr: CategoryRow[]) => {
        arr.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        arr.forEach((c) => c.children && sortRec(c.children));
      };
      sortRec(roots);

      // update state
      setCategories(flat);
      setCategoriesTree(roots);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  }, []);

  const getPostBySlug = useCallback(
    async (slug: string): Promise<BlogPost | null> => {
      try {
        const { data, error } = await supabase
          .from("blog_posts")
          .select("*")
          .eq("slug", slug)
          .eq("status", "published")
          .maybeSingle();

        if (error) throw error;
        return (data as BlogPost) || null;
      } catch (error) {
        console.error("Error fetching blog post:", error);
        return null;
      }
    },
    []
  );

  const createPost = async (post: Partial<BlogPost>) => {
    try {
      const user = await supabase.auth.getUser();
      const authorId = user.data.user?.id || "";
      const { data, error } = await supabase
        .from("blog_posts")
        .insert([
          {
            title: post.title!,
            slug: post.slug!,
            content: post.content!,
            excerpt: post.excerpt,
            category: post.category || "general",
            tags: post.tags || [],
            status: post.status || "draft",
            meta_title: post.meta_title,
            meta_description: post.meta_description,
            author_id: authorId,
            published_at:
              post.status === "published" ? new Date().toISOString() : null,
            featured_image: post.featured_image ?? null,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error("Error creating blog post:", error);
      return { data: null, error };
    }
  };

  const updatePost = async (id: string, updates: Partial<BlogPost>) => {
    try {
      const safeUpdates: Partial<BlogPost> = { ...updates };

      // If featured_image is null/undefined, don't include it in update payload
      if (
        "featured_image" in safeUpdates &&
        (safeUpdates.featured_image === null ||
          safeUpdates.featured_image === undefined)
      ) {
        delete safeUpdates.featured_image;
      }

      const { data, error } = await supabase
        .from("blog_posts")
        .update(safeUpdates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error("Error updating blog post:", error);
      return { data: null, error };
    }
  };

  const deletePost = async (id: string) => {
    try {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error("Error deleting blog post:", error);
      return { error };
    }
  };

  const incrementViewCount = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.rpc("increment_blog_view_count", {
        post_id: id,
      });
      if (error) throw error;
    } catch (error) {
      console.error("Error incrementing view count:", error);
    }
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setInitializing(true);
      await Promise.all([fetchPosts(), fetchCategories()]);
      setLoading(false);
      setInitializing(false);
    };
    loadInitialData();
  }, [fetchPosts, fetchCategories]);

  return {
    posts,
    categories, // flat list
    categoriesTree, // nested parents with children[]
    loading,
    initializing,
    fetchPosts,
    fetchCategories,
    getPostBySlug,
    createPost,
    updatePost,
    deletePost,
    incrementViewCount,
  };
};
