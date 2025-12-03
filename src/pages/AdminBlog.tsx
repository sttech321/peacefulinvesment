import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, Eye, Calendar, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useBlog, BlogPost, BlogCategory } from "@/hooks/useBlog";
import { useUserRole } from "@/hooks/useUserRole";

const AdminBlog = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { posts, categories, fetchPosts, createPost, updatePost, deletePost } = useBlog();
  const { isAdmin, loading: roleLoading } = useUserRole();

  // -------------------------
  // Hooks: always declared here (top of component)
  // -------------------------
  const [catSearch, setCatSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [formData, setFormData] = useState<any>({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    category: "general",
    tags: "",
    status: "draft" as "draft" | "published" | "archived",
    meta_title: "",
    meta_description: "",
    featured_image: "",
    previewUrl: "",
  });

  // build hierarchical options from flat categories (parent_id)
  const categoryOptions = useMemo(() => {
    const flat = (categories || []) as any[];

    // map by id
    const map = new Map<string, any>();
    flat.forEach((c) => map.set(c.id, { ...c, children: [] }));

    // attach children by parent_id
    map.forEach((node) => {
      const pid = node.parent_id ?? null;
      if (pid && map.has(pid)) {
        map.get(pid).children.push(node);
      }
    });

    // collect roots
    const roots = Array.from(map.values()).filter((n) => {
      const pid = n.parent_id ?? null;
      return !pid || !map.has(pid);
    });

    // sort helper
    const sortByName = (a: any, b: any) => a.name.localeCompare(b.name);
    roots.sort(sortByName);

    // traverse and flatten with depth
    const out: { id: string; slug: string; label: string; depth: number }[] = [];
    const visit = (node: any, depth = 0) => {
      out.push({ id: node.id, slug: node.slug, label: node.name, depth });
      (node.children || []).sort(sortByName).forEach((ch: any) => visit(ch, depth + 1));
    };
    roots.forEach((r) => visit(r, 0));

    // dedupe by slug (first occurrence wins)
    const seen = new Set<string>();
    const deduped = out.filter((o) => {
      if (seen.has(o.slug)) return false;
      seen.add(o.slug);
      return true;
    });

    // optional search filtering
    if (catSearch && catSearch.trim()) {
      const q = catSearch.trim().toLowerCase();
      return deduped.filter((d) => d.label.toLowerCase().includes(q));
    }

    return deduped;
  }, [categories, catSearch]);

  // Effects (also declared at top)
  useEffect(() => {
    if (!roleLoading && !isAdmin()) {
      navigate("/dashboard");
      toast({
        title: "Access Denied",
        description: "You don't have permission to access the admin blog.",
        variant: "destructive",
      });
    }
  }, [isAdmin, roleLoading, navigate, toast]);

  useEffect(() => {
    fetchPosts("all");
  }, [fetchPosts]);

  // -------------------------
  // Non-hook helpers
  // -------------------------
  const resetForm = () => {
    setFormData({
      title: "",
      slug: "",
      content: "",
      excerpt: "",
      category: "general",
      tags: "",
      status: "draft",
      meta_title: "",
      meta_description: "",
      featured_image: "",
      previewUrl: "",
    });
    setEditingPost(null);
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const generateSlug = (title: string) =>
    title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let base64Image: string | null = null;
    if (formData.featured_image instanceof File) {
      base64Image = await fileToBase64(formData.featured_image);
    }

    const { previewUrl, featured_image, ...cleanForm } = formData;
    const basePostData = {
      ...cleanForm,
      tags: cleanForm.tags
        .split(",")
        .map((tag: string) => tag.trim())
        .filter(Boolean),
      published_at: cleanForm.status === "published" ? new Date().toISOString() : null,
    };

    const payload = editingPost
      ? { ...basePostData, ...(base64Image !== null ? { featured_image: base64Image } : {}) }
      : { ...basePostData, featured_image: base64Image };

    try {
      if (editingPost) {
        const { error } = await updatePost(editingPost.id, payload);
        if (error) throw error;
        toast({ title: "Post Updated", description: "Blog post has been updated successfully." });
      } else {
        const { error } = await createPost(payload);
        if (error) throw error;
        toast({ title: "Post Created", description: "Blog post has been created successfully." });
      }

      setDialogOpen(false);
      resetForm();
      fetchPosts("all");
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to save blog post. Please try again.", variant: "destructive" });
    }
  };

  const handleEdit = (post: BlogPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt || "",
      category: post.category,
      tags: post.tags.join(", "),
      status: post.status,
      meta_title: post.meta_title || "",
      meta_description: post.meta_description || "",
      featured_image: "",
      previewUrl: post.featured_image || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      const { error } = await deletePost(postId);
      if (error) throw error;
      toast({ title: "Post Deleted", description: "Blog post has been deleted successfully." });
      fetchPosts("all");
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete blog post. Please try again.", variant: "destructive" });
    }
  };

  // ---------- Early return after hooks only ----------
  if (roleLoading) {
    return <div className="min-h-screen pt-20 px-6 bg-background">Loading...</div>;
  }
  if (!isAdmin()) {
    return null;
  }

  // -------------------------
  // Render
  // -------------------------
  return (
    <div className="min-h-screen pt-20 px-6 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Blog Management</h1>
            <p className="text-muted-foreground">Manage Catholic prayers, charity updates, and articles</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                New Post
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPost ? "Edit Blog Post" : "Create New Blog Post"}</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="featured_image">Featured Image</Label>
                  <Input
                    id="featured_image"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setFormData((prev: any) => ({ ...prev, featured_image: file }));
                      const reader = new FileReader();
                      reader.onload = () => setFormData((prev: any) => ({ ...prev, previewUrl: reader.result as string }));
                      reader.readAsDataURL(file);
                    }}
                  />
                  {formData.previewUrl && <img src={formData.previewUrl} alt="Preview" className="mt-2 max-h-48 rounded-lg object-cover" />}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value, slug: generateSlug(e.target.value) })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="slug">Slug</Label>
                    <Input id="slug" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} required />
                  </div>
                </div>

                <div>
                  <Label htmlFor="excerpt">Excerpt</Label>
                  <Textarea id="excerpt" value={formData.excerpt} onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })} rows={2} />
                </div>

                <div>
                  <Label htmlFor="content">Content (Markdown)</Label>
                  <Textarea id="content" value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} rows={15} required />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="category">Category</Label>

                    {/* <div className="mb-2">
                      <Input placeholder="Search categories..." value={catSearch} onChange={(e) => setCatSearch(e.target.value)} />
                    </div> */}

                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {/* only show default 'General' if no category with slug 'general' */}
                        {!categoryOptions.some((o) => o.slug === "general") && (
                          <SelectItem key="default-general" value="general">
                            General
                          </SelectItem>
                        )}

                        {categoryOptions.map((opt) => {
                          // always show just ONE dash if depth > 0
                          const prefix = opt.depth > 0 ? "— " : "";

                          return (
                            <SelectItem key={opt.id} value={opt.slug}>
                              <span
                                style={{
                                  display: "inline-block",
                                  marginLeft: opt.depth * 12, // visual indent only (you can adjust)
                                }}
                              >
                                {prefix}
                                {opt.label}
                              </span>
                            </SelectItem>
                          );
                        })}

                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input id="tags" value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} placeholder="prayer, morning, catholic" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="meta_title">Meta Title (SEO)</Label>
                    <Input id="meta_title" value={formData.meta_title} onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="meta_description">Meta Description (SEO)</Label>
                    <Input id="meta_description" value={formData.meta_description} onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })} />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">{editingPost ? "Update Post" : "Create Post"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Card key={post.id} className="glass-card">
              {post.featured_image && <img src={post.featured_image} alt={post.title} className="w-full h-40 object-cover rounded-t-lg mb-2" />}

              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={post.status === "published" ? "default" : "outline"} className={post.status === "published" ? "bg-green-500" : ""}>
                    {post.status}
                  </Badge>

                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye className="w-3 h-3" />
                    {post.view_count}
                  </div>
                </div>

                <CardTitle className="line-clamp-2">{post.title}</CardTitle>

                {post.excerpt && <p className="text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>}
              </CardHeader>

              <CardContent>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(post.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {post.tags.length} tags
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(post)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(post.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {posts.length === 0 && (
          <div className="text-center py-16">
            <h3 className="text-2xl font-semibold text-muted-foreground mb-4">No blog posts yet</h3>
            <p className="text-muted-foreground mb-6">Create your first blog post to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminBlog;
