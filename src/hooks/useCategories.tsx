import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Subcategory {
  id: string;
  slug: string;
  name: string;
}

export interface BlogCategory {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  color: string;
  created_at?: string;
  updated_at?: string;
  subcategories?: Subcategory[];
}

export interface CategoryMap {
  [slug: string]: {
    name: string;
    color: string;
    subcategories: Subcategory[];
  };
}

type CreateCategoryInput = {
  name: string;
  slug: string;
  description?: string;
  color?: string;
};

type UpdateCategoryInput = Partial<
  Omit<BlogCategory, "id" | "created_at" | "updated_at">
>;

export function useCategories() {
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("blog_categories")
        .select(
          `
          *
        `
        )
        .order("name");

      if (error) throw error;

      const mapped: BlogCategory[] =
        (data || []).map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          color: cat.color,
          created_at: cat.created_at,
          updated_at: cat.updated_at,
          subcategories: cat.blog_subcategories || [],
        })) ?? [];

      setCategories(mapped);
    } catch (e) {
      console.error("Failed to load categories:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // derived map for frontend usage
  const categoryMap: CategoryMap = useMemo(() => {
    const map: CategoryMap = {};
    categories.forEach((cat) => {
      map[cat.slug] = {
        name: cat.name,
        color: cat.color,
        subcategories: cat.subcategories || [],
      };
    });
    return map;
  }, [categories]);

  const createCategory = async (input: CreateCategoryInput) => {
    try {
      const { data, error } = await supabase
        .from("blog_categories")
        .insert([
          {
            name: input.name,
            slug: input.slug,
            description: input.description ?? null,
            color: input.color ?? "#6B7280",
          },
        ])
        .select(
          `
          id,
          name,
          slug,
          description,
          color,
          created_at,
          updated_at
        `
        )
        .single();

      if (error) throw error;

      const newCat: BlogCategory = {
        ...data,
        subcategories: [],
      };

      setCategories((prev) => [...prev, newCat]);

      return { data: newCat, error: null };
    } catch (error) {
      console.error("Error creating category:", error);
      return { data: null, error };
    }
  };

  const updateCategory = async (id: string, updates: UpdateCategoryInput) => {
    try {
      const { data, error } = await supabase
        .from("blog_categories")
        .update(updates)
        .eq("id", id)
        .select(
          `
          id,
          name,
          slug,
          description,
          color,
          created_at,
          updated_at
        `
        )
        .single();

      if (error) throw error;

      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === id ? { ...data, subcategories: cat.subcategories || [] } : cat
        )
      );

      return { data, error: null };
    } catch (error) {
      console.error("Error updating category:", error);
      return { data: null, error };
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from("blog_categories")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setCategories((prev) => prev.filter((cat) => cat.id !== id));

      return { error: null };
    } catch (error) {
      console.error("Error deleting category:", error);
      return { error };
    }
  };

  return {
    categories,     // for admin list / forms
    categoryMap,    // for frontend badges etc.
    loading,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
