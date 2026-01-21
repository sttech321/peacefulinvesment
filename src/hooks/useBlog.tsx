// hooks/useBlog.ts
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BlogMedia {
  id: string;
  blog_post_id: string;
  media_type: "image" | "video" | "document";
  file_path: string;
  file_url: string;
  filename: string;
  mime_type: string;
  file_size: number;
  display_order: number;
  caption?: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

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
  media?: BlogMedia[]; // Optional: media items for the post
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  image_url?: string | null;
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

  const fetchPostMedia = useCallback(async (postId: string): Promise<BlogMedia[]> => {
    try {
      const { data, error } = await supabase
        .from("blog_media")
        .select("*")
        .eq("blog_post_id", postId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return (data || []) as BlogMedia[];
    } catch (error) {
      console.error("Error fetching blog media:", error);
      return [];
    }
  }, []);

  const getPostBySlug = useCallback(
    async (slug: string, includeMedia: boolean = true): Promise<BlogPost | null> => {
      try {
        const { data, error } = await supabase
          .from("blog_posts")
          .select("*")
          .eq("slug", slug)
          .eq("status", "published")
          .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        const post = data as BlogPost;
        if (includeMedia) {
          post.media = await fetchPostMedia(post.id);
        }
        return post;
      } catch (error) {
        console.error("Error fetching blog post:", error);
        return null;
      }
    },
    [fetchPostMedia]
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

  // Media management functions
  const uploadMedia = useCallback(async (
    postId: string,
    file: File,
    mediaType: "image" | "video" | "document",
    caption?: string,
    displayOrder?: number
  ): Promise<{ data: BlogMedia | null; error: any }> => {
    try {
      const user = await supabase.auth.getUser();
      const userId = user.data.user?.id;
      if (!userId) throw new Error("User not authenticated");

      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${userId}/${postId}/${uniqueFilename}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("blog-media")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("blog-media")
        .getPublicUrl(filePath);

      // Get current max display_order for this post
      const { data: existingMedia } = await supabase
        .from("blog_media")
        .select("display_order")
        .eq("blog_post_id", postId)
        .order("display_order", { ascending: false })
        .limit(1)
        .maybeSingle();

      const order = displayOrder ?? ((existingMedia?.display_order ?? -1) + 1);

      // Insert media record
      const { data, error: insertError } = await supabase
        .from("blog_media")
        .insert({
          blog_post_id: postId,
          media_type: mediaType,
          file_path: filePath,
          file_url: urlData.publicUrl,
          filename: file.name,
          mime_type: file.type,
          file_size: file.size,
          display_order: order,
          caption: caption || null,
          uploaded_by: userId,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return { data: data as BlogMedia, error: null };
    } catch (error) {
      console.error("Error uploading media:", error);
      return { data: null, error };
    }
  }, []);

  const deleteMedia = useCallback(async (mediaId: string, filePath: string): Promise<{ error: any }> => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("blog-media")
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: deleteError } = await supabase
        .from("blog_media")
        .delete()
        .eq("id", mediaId);

      if (deleteError) throw deleteError;
      return { error: null };
    } catch (error) {
      console.error("Error deleting media:", error);
      return { error };
    }
  }, []);

  const updateMedia = useCallback(async (
    mediaId: string,
    updates: { caption?: string; display_order?: number }
  ): Promise<{ data: BlogMedia | null; error: any }> => {
    try {
      const { data, error } = await supabase
        .from("blog_media")
        .update(updates)
        .eq("id", mediaId)
        .select()
        .single();

      if (error) throw error;
      return { data: data as BlogMedia, error: null };
    } catch (error) {
      console.error("Error updating media:", error);
      return { data: null, error };
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
    // Media management
    fetchPostMedia,
    uploadMedia,
    deleteMedia,
    updateMedia,
  };
};
