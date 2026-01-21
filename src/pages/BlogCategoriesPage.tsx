import { useEffect, useMemo, useState } from "react";
import { useCategories, BlogCategory } from "@/hooks/useCategories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Edit2, Trash2, AlertCircle, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

const emptyForm = {
  name: "",
  slug: "",
  description: "",
  color: "#6B7280",
  parent_id: null as string | null,
  image_url: null as string | null,
};

type TreeNode = BlogCategory & {
  parent_id?: string | null;
  children: TreeNode[];
};

export default function AdminBlogCategories() {
  const { categories, loading, createCategory, updateCategory, deleteCategory, reorderCategories, reorderToPosition } =
    useCategories();
  const { toast } = useToast();

  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // state for tree UI: which nodes are expanded
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Drag and drop state
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setForm((f) => ({
      ...f,
      [name]: name === "parent_id" ? (value === "" ? null : value) : value,
    }));
  };

  const startCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setExpanded({}); // reset expansion
    setError(null); // clear any previous errors
    setImageFile(null);
    setImagePreviewUrl(null);
    setOpen(true);
  };

  const startEdit = (cat: BlogCategory & { parent_id?: string | null }) => {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description ?? "",
      color: cat.color ?? "#6B7280",
      parent_id: (cat as any).parent_id ?? null,
      image_url: (cat as any).image_url ?? null,
    });
    // optionally expand the parent chain so the current parent is visible
    setExpanded({});
    setError(null); // clear any previous errors
    setImageFile(null);
    setImagePreviewUrl((cat as any).image_url ?? null);
    setOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setError(null);
    setImageFile(null);
    setImagePreviewUrl(null);
  };

  // Preview cleanup (object URLs only)
  useEffect(() => {
    return () => {
      if (imagePreviewUrl && imagePreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const sanitizeFilename = (filename: string) => filename.replace(/[^a-zA-Z0-9._-]/g, "_");

  const uploadCategoryImage = async (categoryId: string, file: File) => {
    const safeName = sanitizeFilename(file.name);
    const path = `blog/categories/${categoryId}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("blog-media")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("blog-media").getPublicUrl(path);
    return { publicUrl: data.publicUrl, filePath: path };
  };

  const getErrorMessage = (error: any): string => {
    if (!error) return "An unknown error occurred";
    
    // Handle Supabase error codes
    if (error.code === "23505") {
      // Unique constraint violation
      if (error.message?.includes("blog_categories_name_key")) {
        return "A category with this name already exists. Please choose a different name.";
      }
      if (error.message?.includes("blog_categories_slug_key")) {
        return "A category with this slug already exists. Please choose a different slug.";
      }
      return "This category name or slug already exists. Please choose a different one.";
    }
    
    // Return the error message if available
    return error.message || "Failed to save category. Please try again.";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Category name is required.");
      return;
    }

    setSaving(true);
    setError(null); // Clear previous errors
    
    try {
      let result;
      if (editingId) {
        result = await updateCategory(editingId, form);
      } else {
        result = await createCategory(form);
      }

      // Check for errors in the result
      if (result.error) {
        const errorMessage = getErrorMessage(result.error);
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        // Don't close the modal - keep it open so user can fix the error
        return;
      }

      // Success - close modal and show success message
      const savedCategoryId = (result.data as any)?.id || editingId;
      if (!savedCategoryId) {
        // TODO: Should never happen, but avoid guessing
        throw new Error("Missing category id after save");
      }

      // If an image was selected, upload to storage and store ONLY the public URL
      if (imageFile) {
        const { publicUrl } = await uploadCategoryImage(savedCategoryId, imageFile);
        const updateRes = await updateCategory(savedCategoryId, { image_url: publicUrl });
        if (updateRes.error) {
          toast({
            title: "Warning",
            description: "Category saved but image upload failed. You can retry by editing the category.",
            variant: "destructive",
          });
        } else {
          setForm((f) => ({ ...f, image_url: publicUrl }));
        }
      }

      resetForm();
      setOpen(false);
      toast({
        title: "Success",
        description: editingId 
          ? "Category updated successfully" 
          : "Category created successfully",
      });
    } catch (err: any) {
      // Handle unexpected errors
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    await deleteCategory(id);
  };

  const handleReorder = async (categoryId: string, direction: 'up' | 'down', parentId: string | null = null) => {
    const result = await reorderCategories(categoryId, direction, parentId);
    if (result.error) {
      toast({
        title: "Error",
        description: "Failed to reorder category. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, categoryId: string) => {
    setDraggedId(categoryId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", categoryId);
    // Do not use base64 images; default drag preview is sufficient
  };

  const handleDragOver = (e: React.DragEvent, categoryId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if (draggedId && draggedId !== categoryId) {
      setDragOverId(categoryId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're actually leaving the row (not just moving to a child element)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverId(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetCategoryId: string, targetParentId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(null);
    
    if (!draggedId || draggedId === targetCategoryId) {
      setDraggedId(null);
      return;
    }

    // Get siblings for the target (same parent)
    const targetSiblings = targetParentId === null 
      ? roots 
      : (nodeMap.get(targetParentId)?.children || []);
    
    const draggedNode = nodeMap.get(draggedId);
    if (!draggedNode) {
      setDraggedId(null);
      return;
    }

    // Only allow reordering within the same parent level
    if (draggedNode.parent_id !== targetParentId) {
      toast({
        title: "Cannot reorder",
        description: "You can only reorder categories within the same level.",
        variant: "destructive",
      });
      setDraggedId(null);
      return;
    }

    const draggedIndex = targetSiblings.findIndex(n => n.id === draggedId);
    const targetIndex = targetSiblings.findIndex(n => n.id === targetCategoryId);

    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
      setDraggedId(null);
      return;
    }

    // Use the efficient reorderToPosition function to move directly to target
    const result = await reorderToPosition(draggedId, targetIndex, targetParentId);
    
    if (result.error) {
      toast({
        title: "Error",
        description: "Failed to reorder category. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Category order updated successfully.",
      });
    }

    setDraggedId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2 text-white pt-5">Loading Blog Categories </h2>
          <p className="text-muted-foreground">Fetching blog category data...</p>
        </div>
      </div>
    );
  }

  // ---------------- Build node map + tree ----------------
  const nodeMap = new Map<string, TreeNode>();
  categories.forEach((c) =>
    nodeMap.set(c.id, { ...(c as BlogCategory), parent_id: (c as any).parent_id ?? null, children: [] })
  );

  nodeMap.forEach((node) => {
    if (node.parent_id) {
      const parent = nodeMap.get(node.parent_id);
      if (parent) parent.children.push(node);
    }
  });

  const roots: TreeNode[] = Array.from(nodeMap.values()).filter((n) => !n.parent_id || !nodeMap.has(n.parent_id));

  const placeholderImage = "/placeholder.svg";

  const sortRec = (nodes: TreeNode[]) => {
    // Sort by sort_order first, then by name as fallback
    nodes.sort((a, b) => {
      const orderA = a.sort_order ?? 0;
      const orderB = b.sort_order ?? 0;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);

  // ---------------- Descendant set for editing node ----------------
  const collectDescendants = (id: string) => {
    const s = new Set<string>();
    const start = nodeMap.get(id);
    if (!start) return s;
    const stack = [...(start.children || [])];
    while (stack.length) {
      const n = stack.pop()!;
      s.add(n.id);
      (n.children || []).forEach((c) => stack.push(c));
    }
    return s;
  };
  const descendantSet = new Set<string>();
  if (editingId) {
    descendantSet.add(editingId);
    collectDescendants(editingId).forEach((x) => descendantSet.add(x));
  }

  // ---------------- Tree UI helpers ----------------
  const toggleExpand = (id: string) => {
    setExpanded((s) => ({ ...s, [id]: !s[id] }));
  };

  const selectParent = (id: string | null) => {
    // if id is null => no parent
    setForm((f) => ({ ...f, parent_id: id }));
  };

  // render tree rows (used in the modal)
  const renderTreeRows = (nodes: TreeNode[], depth = 0): JSX.Element[] => {
    const rows: JSX.Element[] = [];
    nodes.forEach((node) => {
      const hasChildren = node.children && node.children.length > 0;
      const isDisabled = editingId === node.id || descendantSet.has(node.id);
      const isSelected = form.parent_id === node.id;
      const isExpanded = !!expanded[node.id];

      rows.push(
        <div
          key={node.id}
          onClick={() => !isDisabled && selectParent(node.id)}
          className={`flex items-center justify-between gap-2 px-3 py-2 border rounded mb-1 transition-colors ${
            isDisabled 
              ? "opacity-50 cursor-not-allowed" 
              : "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700"
          } ${isSelected ? "bg-slate-100 dark:bg-slate-800" : ""}`}
          style={{ marginLeft: depth * 14 }}
          title={isDisabled ? "Cannot select this item" : `Select "${node.name}" as parent`}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent row click when clicking expand button
                  toggleExpand(node.id);
                }}
                className="text-sm select-none flex-shrink-0 hover:bg-slate-200 dark:hover:bg-slate-600 rounded px-1"
                aria-label={isExpanded ? "collapse" : "expand"}
              >
                {isExpanded ? "▾" : "▸"}
              </button>
            ) : (
              <span style={{ width: 16, display: "inline-block" }} className="flex-shrink-0" />
            )}

            <div className="text-left truncate flex-1 min-w-0">
              <span className="mr-2">
                {depth > 0 ? "—" : ""}
              </span>
              <span>{node.name}</span>
              {node.children.length > 0 && (
                <small className="ml-2 text-xs text-muted-foreground">({node.children.length})</small>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-muted-foreground">{node.slug}</span>
            <div>
              <Badge className="text-xs text-muted-foreground" style={{ backgroundColor: node.color, color: "white" }}>
                {node.color}
              </Badge>
            </div>
          </div>
        </div>
      );

      if (hasChildren && expanded[node.id]) {
        // Sort children by sort_order, then by name
        const sortedChildren = [...node.children].sort((a, b) => {
          const orderA = a.sort_order ?? 0;
          const orderB = b.sort_order ?? 0;
          if (orderA !== orderB) {
            return orderA - orderB;
          }
          return a.name.localeCompare(b.name);
        });
        rows.push(...renderTreeRows(sortedChildren, depth + 1));
      }
    });
    return rows;
  };

  // ---------------- listing table rows helper (same as before) ----------------
  const renderCategoryRows = (node: TreeNode, depth: number = 0, parentSiblings: TreeNode[] = []): JSX.Element[] => {
    const rows: JSX.Element[] = [];

    const isDragging = draggedId === node.id;
    const isDragOver = dragOverId === node.id;
    const nodeParentId = node.parent_id || null;

    rows.push(
      <tr 
        key={node.id} 
        draggable={true}
        onDragStart={(e) => handleDragStart(e, node.id)}
        onDragOver={(e) => handleDragOver(e, node.id)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, node.id, nodeParentId)}
        onDragEnd={handleDragEnd}
        className={`border-b border-muted/20 last:border-0 transition-all duration-150 ${
          isDragging 
            ? "opacity-40 cursor-grabbing bg-muted/20" 
            : "hover:bg-white/10 cursor-grab active:cursor-grabbing"
        } ${
          isDragOver ? "bg-primary/20 border-primary border-t-2 border-b-2 shadow-lg" : ""
        }`}
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        <td
          className="py-2 text-white px-4 whitespace-nowrap"
          style={{ paddingLeft: depth === 0 ? 16 : 24 * depth }}
        >
          <div className="flex items-center gap-2">
            <GripVertical 
              className="h-4 w-4 text-muted-foreground flex-shrink-0 cursor-grab active:cursor-grabbing" 
              style={{ opacity: isDragging ? 0.3 : 1 }}
            />
            <span>
              {depth > 0 ? "— " : ""}
              {node.name}
            </span>
          </div>
        </td>
        <td className="py-2 text-muted-foreground px-4 whitespace-nowrap">{node.slug}</td>
        <td className="py-2 px-4 whitespace-nowrap">
          <Badge
            className="text-xs border-0"
            style={{ backgroundColor: node.color, color: "white" }}
          >
            {node.color}
          </Badge>
        </td>
        <td className="py-2 text-right px-4 space-x-2 whitespace-nowrap">
          <Button
            variant="outline"
            size="icon"
            onClick={() => startEdit(node)}
            className="rounded-[8px] border-0 hover:bg-white/80"
            title="Edit category"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-[8px] border-0"
            onClick={() => handleDelete(node.id)}
            title="Delete category"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </td>
      </tr>
    );

    node.children.forEach((child) => {
      rows.push(...renderCategoryRows(child, depth + 1, node.children));
    });

    return rows;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Blog Categories</h1>
          <p className="text-sm text-muted-foreground">
            Manage blog categories and their colors.
          </p>
        </div>
        <Button onClick={startCreate} className="border-0 gap-0 rounded-[8px]">
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      {/* List (tree) */}
      <div className="border-muted/20  bg-white/5 border rounded-lg p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-muted/20 hover:bg-white/15 bg-white/15">
              <th className="text-left px-4 py-4 text-white">Name</th>
              <th className="text-left px-4 py-4 text-white">Slug</th>
              <th className="text-left px-4 py-4 text-white">Color</th>
              <th className="text-right px-4 py-4 text-white">Actions</th>
            </tr>
          </thead>
          <tbody
            onDragOver={(e) => {
              e.preventDefault(); // Allow drops on tbody
            }}
          >
            {roots.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="py-6 text-center text-white"
                >
                  No categories yet. Click "Add Category" to create one.
                </td>
              </tr>
            )}

            {roots.map((root) => renderCategoryRows(root, 0, roots))}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) resetForm();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Category" : "Create Category"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update the details of this blog category."
                : "Add a new category for organizing blog posts."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            {error && (
              <Alert variant="destructive" className="rounded-[8px]">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Name</label>
                <Input
                  name="name"
                  value={form.name}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm((f) => ({
                      ...f,
                      name: value,
                      slug:
                        f.slug ||
                        value.toLowerCase().trim().replace(/\s+/g, "-"),
                    }));
                  }}
                 className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none"
                                     style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
                  placeholder="e.g. Morning Prayers"
                />
              </div>
              <div className="w-40">
                <label className="block text-sm font-medium mb-1">Slug</label>
                <Input
                  name="slug"
                  value={form.slug}
                  onChange={handleChange}
                  placeholder="morning-prayers"
                  className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none"
                                      style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
                />
              </div>
            </div>

            {/* ---------- Optional category image ---------- */}
            <div>
              <label className="block text-sm font-medium mb-1">Category Image (optional)</label>
              <Input
                type="file"
                accept="image/*"
                className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none"
                style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setImageFile(file);
                  if (!file) {
                    setImagePreviewUrl(form.image_url ?? null);
                    return;
                  }
                  const url = URL.createObjectURL(file);
                  setImagePreviewUrl((prev) => {
                    if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
                    return url;
                  });
                }}
              />
              <div className="mt-2">
                <img
                  src={imagePreviewUrl || form.image_url || placeholderImage}
                  alt="Category preview"
                  loading="lazy"
                  decoding="async"
                  className="w-full max-h-48 object-cover rounded-lg border border-muted/20"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  If you don’t upload an image, the Catholic section will show a placeholder image.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Description (optional)
              </label>
              <Textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={2}
                className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none resize-none"
                                    style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
              />
            </div>

            {/* ---------- Tree parent picker UI ---------- */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Parent (optional)
              </label>

              <div className="border border-muted-foreground/60 rounded p-2 max-h-64 overflow-auto bg-white">
                {/* "No parent" row */}
                <div
                  onClick={() => selectParent(null)}
                  className={`flex items-center justify-between px-3 py-2 mb-1 rounded cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 ${
                    form.parent_id === null ? "bg-slate-100 dark:bg-slate-800 font-semibold" : ""
                  }`}
                  title="Select no parent (top-level category)"
                >
                  <div className="text-left">
                    — No parent —
                  </div>
                </div>

                {/* actual tree rows */}
                {renderTreeRows(roots, 0)}
              </div>

              <p className="text-xs text-muted-foreground mt-1">
                Click a category row to choose it as the parent. Categories that would create a loop are disabled.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Color
                </label>
                <input
                  type="color"
                  name="color"
                  value={form.color}
                  onChange={handleChange}
                  className="w-16 h-10 rounded-[8px] border"
                />
              </div>
              <span className="text-xs text-muted-foreground">
                Used as the badge color for this category.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button" 
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={saving}
                className="rounded-[8px] border-0 hover:bg-white/80 bg-white"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="rounded-[8px] border-0 hover:bg-primary/80">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingId ? "Save Changes" : "Create Category"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
