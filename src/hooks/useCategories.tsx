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
  parent_id?: string | null;
  sort_order?: number;
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
  parent_id?: string | null;
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
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }); // Fallback to name if sort_order is same

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
          parent_id: cat.parent_id ?? null,
          sort_order: cat.sort_order ?? 0,
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
      // Get the maximum sort_order for categories with the same parent
      let maxOrderQuery = supabase
        .from("blog_categories")
        .select("sort_order");
      
      if (input.parent_id === null) {
        maxOrderQuery = maxOrderQuery.is("parent_id", null);
      } else {
        maxOrderQuery = maxOrderQuery.eq("parent_id", input.parent_id);
      }
      
      const { data: siblings } = await maxOrderQuery
        .order("sort_order", { ascending: false })
        .limit(1);
      
      const nextSortOrder = siblings && siblings.length > 0 
        ? (siblings[0].sort_order ?? 0) + 1 
        : 0;

      const { data, error } = await supabase
        .from("blog_categories")
        .insert([
          {
            name: input.name,
            slug: input.slug,
            description: input.description ?? null,
            color: input.color ?? "#6B7280",
            parent_id: input.parent_id ?? null,
            sort_order: nextSortOrder,
          },
        ])
        .select(
          `
         *
        `
        )
        .single();

      if (error) throw error;

      const newCat: BlogCategory = {
        ...data,
        subcategories: [],
        sort_order: data.sort_order ?? 0,
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
         *
        `
        )
        .single();

      if (error) throw error;

      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === id ? { ...data, subcategories: cat.subcategories || [], sort_order: data.sort_order ?? cat.sort_order ?? 0 } : cat
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

  const reorderCategories = async (categoryId: string, direction: 'up' | 'down', parentId: string | null = null) => {
    try {
      // Get all categories with the same parent (siblings)
      let query = supabase
        .from("blog_categories")
        .select("id, sort_order");
      
      // Handle null parent_id correctly
      if (parentId === null) {
        query = query.is("parent_id", null);
      } else {
        query = query.eq("parent_id", parentId);
      }
      
      const { data: siblings, error: fetchError } = await query
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (fetchError) throw fetchError;
      if (!siblings || siblings.length <= 1) {
        return { error: null }; // Nothing to reorder
      }

      // Find current category index
      const currentIndex = siblings.findIndex(cat => cat.id === categoryId);
      if (currentIndex === -1) {
        return { error: { message: "Category not found" } };
      }

      // Calculate new index
      let newIndex: number;
      if (direction === 'up') {
        if (currentIndex === 0) {
          return { error: null }; // Already at top
        }
        newIndex = currentIndex - 1;
      } else {
        if (currentIndex === siblings.length - 1) {
          return { error: null }; // Already at bottom
        }
        newIndex = currentIndex + 1;
      }

      // Swap sort_order values
      const currentCat = siblings[currentIndex];
      const targetCat = siblings[newIndex];

      // Update both categories
      const updates = [
        { id: currentCat.id, sort_order: targetCat.sort_order },
        { id: targetCat.id, sort_order: currentCat.sort_order }
      ];

      // Use a transaction-like approach with Promise.all
      const updatePromises = updates.map(update =>
        supabase
          .from("blog_categories")
          .update({ sort_order: update.sort_order })
          .eq("id", update.id)
      );

      const results = await Promise.all(updatePromises);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        throw errors[0].error;
      }

      // Refresh categories
      await fetchCategories();

      return { error: null };
    } catch (error) {
      console.error("Error reordering categories:", error);
      return { error };
    }
  };

  // More efficient reorder function that moves a category to a specific target position
  const reorderToPosition = async (
    categoryId: string, 
    targetIndex: number, 
    parentId: string | null = null
  ) => {
    try {
      // Get all categories with the same parent (siblings)
      let query = supabase
        .from("blog_categories")
        .select("id, sort_order");
      
      // Handle null parent_id correctly
      if (parentId === null) {
        query = query.is("parent_id", null);
      } else {
        query = query.eq("parent_id", parentId);
      }
      
      const { data: siblings, error: fetchError } = await query
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (fetchError) throw fetchError;
      if (!siblings || siblings.length <= 1) {
        return { error: null };
      }

      // Find current category index
      const currentIndex = siblings.findIndex(cat => cat.id === categoryId);
      if (currentIndex === -1) {
        return { error: { message: "Category not found" } };
      }

      // Clamp target index to valid range
      const clampedTargetIndex = Math.max(0, Math.min(targetIndex, siblings.length - 1));
      
      if (currentIndex === clampedTargetIndex) {
        return { error: null }; // Already at target position
      }

      // Create a new array with the reordered items
      const reordered = [...siblings];
      const [movedItem] = reordered.splice(currentIndex, 1);
      reordered.splice(clampedTargetIndex, 0, movedItem);

      // Calculate new sort_order values (use increments of 10 for easier reordering later)
      const updates = reordered.map((cat, index) => ({
        id: cat.id,
        sort_order: index * 10
      }));

      // Update all categories in parallel
      const updatePromises = updates.map(update =>
        supabase
          .from("blog_categories")
          .update({ sort_order: update.sort_order })
          .eq("id", update.id)
      );

      const results = await Promise.all(updatePromises);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        throw errors[0].error;
      }

      // Refresh categories
      await fetchCategories();

      return { error: null };
    } catch (error) {
      console.error("Error reordering categories to position:", error);
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
    reorderCategories,
    reorderToPosition,
  };
}
