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
  status: 'draft' | 'published' | 'archived';
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
  created_at: string;
  updated_at: string;
}

export const useBlog = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async (status: string = 'published') => {
    try {
      let query = supabase
        .from('blog_posts')
        .select('*')
        .order('published_at', { ascending: false });

      // If status is not 'all', filter by status
      if (status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPosts((data || []) as BlogPost[]);
    } catch (error) {
      console.error('Error fetching blog posts:', error);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('blog_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  const getPostBySlug = useCallback(async (slug: string): Promise<BlogPost | null> => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();

      if (error) throw error;
      return data as BlogPost | null;
    } catch (error) {
      console.error('Error fetching blog post:', error);
      return null;
    }
  }, []);

  const createPost = async (post: Partial<BlogPost>) => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .insert([{
          title: post.title!,
          slug: post.slug!,
          content: post.content!,
          excerpt: post.excerpt,
          category: post.category || 'general',
          tags: post.tags || [],
          status: post.status || 'draft',
          meta_title: post.meta_title,
          meta_description: post.meta_description,
          author_id: (await supabase.auth.getUser()).data.user?.id || '',
          published_at: post.status === 'published' ? new Date().toISOString() : null,
        }])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error creating blog post:', error);
      return { data: null, error };
    }
  };

  const updatePost = async (id: string, updates: Partial<BlogPost>) => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating blog post:', error);
      return { data: null, error };
    }
  };

  const deletePost = async (id: string) => {
    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error deleting blog post:', error);
      return { error };
    }
  };

  const incrementViewCount = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.rpc('increment_blog_view_count', {
        post_id: id
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await Promise.all([fetchPosts(), fetchCategories()]);
      setLoading(false);
    };

    loadInitialData();
  }, []);

  return {
    posts,
    categories,
    loading,
    fetchPosts,
    fetchCategories,
    getPostBySlug,
    createPost,
    updatePost,
    deletePost,
    incrementViewCount,
  };
};