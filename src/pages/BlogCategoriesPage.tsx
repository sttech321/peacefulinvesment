import { useState } from "react";
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
import { Loader2, Plus, Edit2, Trash2 } from "lucide-react";

const emptyForm = {
  name: "",
  slug: "",
  description: "",
  color: "#6B7280",
  parent_id: null as string | null,
};

type TreeNode = BlogCategory & {
  parent_id?: string | null;
  children: TreeNode[];
};

export default function AdminBlogCategories() {
  const { categories, loading, createCategory, updateCategory, deleteCategory } =
    useCategories();

  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  // state for tree UI: which nodes are expanded
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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
    });
    // optionally expand the parent chain so the current parent is visible
    setExpanded({});
    setOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setSaving(true);
    try {
      if (editingId) {
        await updateCategory(editingId, form);
      } else {
        await createCategory(form);
      }
      resetForm();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    await deleteCategory(id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading categories…</span>
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

  const sortRec = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
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
          className={`flex items-center justify-between gap-2 px-3 py-2 border rounded mb-1 ${isSelected ? "bg-slate-100 dark:bg-slate-800" : ""
            }`}
          style={{ marginLeft: depth * 14 }}
        >
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleExpand(node.id)}
                className="text-sm select-none"
                aria-label={isExpanded ? "collapse" : "expand"}
              >
                {isExpanded ? "▾" : "▸"}
              </button>
            ) : (
              <span style={{ width: 16, display: "inline-block" }} />
            )}

            <button
              type="button"
              onClick={() => !isDisabled && selectParent(node.id)}
              className={`text-left truncate ${isDisabled ? "text-muted-foreground cursor-not-allowed" : "cursor-pointer"
                }`}
              title={isDisabled ? "Cannot select this item" : node.name}
            >
              <span className="mr-2">
                {depth > 0 ? "—" : ""}
              </span>
              <span>{node.name}</span>
              {node.children.length > 0 && (
                <small className="ml-2 text-xs text-muted-foreground">({node.children.length})</small>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{node.slug}</span>
            <div  >
              <Badge className="text-xs text-muted-foreground" style={{ backgroundColor: node.color, color: "white" }}>
                {node.color}
              </Badge>
            </div>
          </div>
        </div>
      );

      if (hasChildren && expanded[node.id]) {
        rows.push(...renderTreeRows(node.children.sort((a,b)=>a.name.localeCompare(b.name)), depth + 1));
      }
    });
    return rows;
  };

  // ---------------- listing table rows helper (same as before) ----------------
  const renderCategoryRows = (node: TreeNode, depth: number = 0): JSX.Element[] => {
    const rows: JSX.Element[] = [];

    rows.push(
      <tr key={node.id} className="border-b">
        <td
          className="py-2 text-white"
          style={{ paddingLeft: depth === 0 ? 0 : 24 * depth }}
        >
          {depth > 0 ? "— " : ""}
          {node.name}
        </td>
        <td className="py-2 text-muted-foreground">{node.slug}</td>
        <td className="py-2">
          <Badge
            className="text-xs"
            style={{ backgroundColor: node.color, color: "white" }}
          >
            {node.color}
          </Badge>
        </td>
        <td className="py-2 text-right space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => startEdit(node)}
            className="rounded-[8px]"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-[8px]"
            onClick={() => handleDelete(node.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </td>
      </tr>
    );

    node.children.forEach((child) => {
      rows.push(...renderCategoryRows(child, depth + 1));
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
        <Button onClick={startCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      {/* List (tree) */}
      <div className="border-muted/20  bg-white/5 border rounded-lg p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 text-white">Name</th>
              <th className="text-left py-2 text-white">Slug</th>
              <th className="text-left py-2 text-white">Color</th>
              <th className="text-right py-2 text-white">Actions</th>
            </tr>
          </thead>
          <tbody>
            {roots.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="py-6 text-center text-white"
                >
                  No categories yet. Click “Add Category” to create one.
                </td>
              </tr>
            )}

            {roots.map((root) => renderCategoryRows(root, 0))}
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
                />
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
              />
            </div>

            {/* ---------- Tree parent picker UI ---------- */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Parent (optional)
              </label>

              <div className="border rounded p-2 max-h-64 overflow-auto bg-white">
                {/* "No parent" row */}
                <div
                  className={`flex items-center justify-between px-3 py-2 mb-1 rounded ${form.parent_id === null ? "bg-slate-100" : ""
                    }`}
                >
                  <div>
                    <button
                      type="button"
                      onClick={() => selectParent(null)}
                      className={`text-left ${form.parent_id === null ? "font-semibold" : ""}`}
                    >
                      — No parent —
                    </button>
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
                  className="w-16 h-10 rounded border"
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
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
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
