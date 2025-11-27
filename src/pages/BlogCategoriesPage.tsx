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
};

export default function AdminBlogCategories() {
  const {
    categories,
    loading,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategories();

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const startEdit = (cat: BlogCategory) => {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description ?? "",
      color: cat.color,
    });
    setOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Blog Categories</h1>
          <p className="text-sm text-muted-foreground">
            Manage blog categories and their colors.
          </p>
        </div>
        <Button onClick={startCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      {/* List */}
      <div className="bg-card border rounded-lg p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Name</th>
              <th className="text-left py-2">Slug</th>
              <th className="text-left py-2">Color</th>
              <th className="text-left py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id} className="border-b last:border-0">
                <td className="py-2">{cat.name}</td>
                <td className="py-2 text-muted-foreground">{cat.slug}</td>
                <td className="py-2">
                  <Badge
                    className="text-xs"
                    style={{ backgroundColor: cat.color, color: "white" }}
                  >
                    {cat.color}
                  </Badge>
                </td>
                <td className="py-2 text-right space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => startEdit(cat)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDelete(cat.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}

            {categories.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="py-6 text-center text-muted-foreground"
                >
                  No categories yet. Click “Add Category” to create one.
                </td>
              </tr>
            )}
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
        <DialogContent>
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
                <label className="block text-sm font-medium mb-1">
                  Name
                </label>
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
                <label className="block text-sm font-medium mb-1">
                  Slug
                </label>
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
