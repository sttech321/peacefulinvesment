import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, Eye, Calendar, Tag, X, Image as ImageIcon, Video, FileText, Upload } from "lucide-react";
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
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useBlog, BlogPost, BlogCategory, BlogMedia } from "@/hooks/useBlog";
import { useUserRole } from "@/hooks/useUserRole";

const AdminBlog = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
    posts, 
    categories, 
    fetchPosts, 
    createPost, 
    updatePost, 
    deletePost, 
    loading: postsLoading,
    uploadMedia,
    deleteMedia,
    updateMedia,
    fetchPostMedia,
  } = useBlog();
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
  const [postMedia, setPostMedia] = useState<BlogMedia[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [pendingMediaFiles, setPendingMediaFiles] = useState<File[]>([]);
  const [featuredImageError, setFeaturedImageError] = useState<string>("");

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
    setPostMedia([]);
    setPendingMediaFiles([]);
    setFeaturedImageError("");
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
      let postId: string;
      let updatedPost: BlogPost;
      
      if (editingPost) {
        const { data, error } = await updatePost(editingPost.id, payload);
        if (error) throw error;
        postId = editingPost.id;
        updatedPost = data!;
        toast({ title: "Post Updated", description: "Blog post has been updated successfully." });
      } else {
        const { data, error } = await createPost(payload);
        if (error) throw error;
        postId = data!.id;
        updatedPost = data!;
        toast({ title: "Post Created", description: "Blog post has been created successfully." });
      }

      // Upload pending media files if any (for new posts)
      if (pendingMediaFiles.length > 0) {
        setUploadingMedia(true);
        try {
          for (const file of pendingMediaFiles) {
            let mediaType: "image" | "video" | "document" = "document";
            if (file.type.startsWith("image/")) {
              mediaType = "image";
            } else if (file.type.startsWith("video/")) {
              mediaType = "video";
            }

            const { error: uploadError } = await uploadMedia(postId, file, mediaType);
            if (uploadError) {
              console.error("Error uploading media:", uploadError);
              // Continue with other files even if one fails
            }
          }
          setPendingMediaFiles([]);
          toast({ title: "Media Uploaded", description: "Media files uploaded successfully." });
        } catch (err) {
          console.error("Error uploading pending media:", err);
          toast({ title: "Warning", description: "Post created but some media failed to upload. You can add them later.", variant: "destructive" });
        } finally {
          setUploadingMedia(false);
        }
      }

      // Refresh media list for the post
      const media = await fetchPostMedia(postId);
      setPostMedia(media);
      
      // Set as editing post so media section remains available
      setEditingPost(updatedPost);

      fetchPosts("all");
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to save blog post. Please try again.", variant: "destructive" });
    }
  };

  const handleEdit = async (post: BlogPost) => {
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
    
    // Fetch media for this post
    const media = await fetchPostMedia(post.id);
    setPostMedia(media);
    
    setDialogOpen(true);
  };

  const handleMediaUpload = async (files: FileList, postId: string) => {
    if (!files || files.length === 0) return;

    setUploadingMedia(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Determine media type based on MIME type
        let mediaType: "image" | "video" | "document" = "document";
        if (file.type.startsWith("image/")) {
          mediaType = "image";
        } else if (file.type.startsWith("video/")) {
          mediaType = "video";
        }

        const { data, error } = await uploadMedia(postId, file, mediaType);
        if (error) throw error;
        if (data) {
          setPostMedia((prev) => [...prev, data].sort((a, b) => a.display_order - b.display_order));
        }
      }
      toast({ title: "Media Uploaded", description: "Media files uploaded successfully." });
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to upload media. Please try again.", variant: "destructive" });
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleDeleteMedia = async (media: BlogMedia) => {
    if (!confirm("Are you sure you want to delete this media?")) return;

    try {
      const { error } = await deleteMedia(media.id, media.file_path);
      if (error) throw error;
      setPostMedia((prev) => prev.filter((m) => m.id !== media.id));
      toast({ title: "Media Deleted", description: "Media file deleted successfully." });
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to delete media. Please try again.", variant: "destructive" });
    }
  };

  const getMediaIcon = (mediaType: string) => {
    switch (mediaType) {
      case "image":
        return <ImageIcon className="w-4 h-4" />;
      case "video":
        return <Video className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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
    return (
    <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2 text-white pt-5">Loading Blog Posts </h2>
          <p className="text-muted-foreground">Fetching blog post data...</p>
        </div>
      </div>
    );
  }
  if (!isAdmin()) {
    return null;
  }

  // -------------------------
  // Render
  // -------------------------
  return (
    <div className="min-h-screen pt-0 px-6  p-0 rounded-lg">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Blog Management</h1>
            <p className="text-muted-foreground">Manage Catholic prayers, charity updates, and articles</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="rounded-[8px] hover:bg-primary/80">
                <Plus className="w-4 h-4 mr-1" />
                New Post
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl p-0 gap-0">

              <DialogHeader className="p-4">
                <DialogTitle>{editingPost ? "Edit Blog Post" : "Create New Blog Post"}</DialogTitle>
              </DialogHeader>

            <div className="px-4 mb-4 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="featured_image">Featured Image</Label>
                  <Input
                    id="featured_image"
                    type="file"
                    className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none"
                    style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) {
                        setFeaturedImageError("");
                        return;
                      }
                      
                      // Validate file type
                      if (!file.type.startsWith('image/')) {
                        setFeaturedImageError("Please select an image file (jpg, png, gif, webp, etc.)");
                        e.target.value = ""; // Reset input
                        setFormData((prev: any) => ({ ...prev, featured_image: "", previewUrl: prev.previewUrl }));
                        return;
                      }

                      // Validate file size (optional: limit to 10MB)
                      const maxSize = 10 * 1024 * 1024; // 10MB
                      if (file.size > maxSize) {
                        setFeaturedImageError("Image file size must be less than 10MB");
                        e.target.value = ""; // Reset input
                        setFormData((prev: any) => ({ ...prev, featured_image: "", previewUrl: prev.previewUrl }));
                        return;
                      }

                      // Clear any previous errors
                      setFeaturedImageError("");
                      
                      // Set the file and create preview
                      setFormData((prev: any) => ({ ...prev, featured_image: file }));
                      const reader = new FileReader();
                      reader.onload = () => setFormData((prev: any) => ({ ...prev, previewUrl: reader.result as string }));
                      reader.readAsDataURL(file);
                    }}
                  />
                  {featuredImageError && (
                    <p className="text-sm text-red-500 mt-1">{featuredImageError}</p>
                  )}
                  {formData.previewUrl && !featuredImageError && (
                    <img src={formData.previewUrl} alt="Preview" className="mt-2 max-h-48 rounded-lg object-cover" />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none"
                    style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value, slug: generateSlug(e.target.value) })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="slug">Slug</Label>
                    <Input id="slug" className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none"
                    style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties } value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} required />
                  </div>
                </div>

                <div>
                  <Label htmlFor="excerpt">Excerpt</Label>
                  <div className="mt-1">
                    <RichTextEditor
                      value={formData.excerpt || ''}
                      onChange={(value) => setFormData({ ...formData, excerpt: value })}
                      placeholder="Enter a brief excerpt for this blog post. You can format text, add headings, and links..."
                      className="rounded-[8px]"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    This excerpt will be displayed in blog listings and previews. You can format text with headings, bold, italic, and links.
                  </p>
                </div>

                <div>
                  <Label htmlFor="content">Content</Label>
                  <div className="mt-1">
                    <RichTextEditor
                      value={formData.content || ''}
                      onChange={(value) => setFormData({ ...formData, content: value })}
                      placeholder="Enter the main content for this blog post. You can format text, add headings, lists, links, and more..."
                      className="rounded-[8px]"
                      minHeight={300}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Use the formatting toolbar to style your content with headings, bold, italic, lists, links, and colors.
                  </p>
                </div>

                {/* Media Management Section */}
                <div>
                  <Label>Media (Images, Videos, Documents)</Label>
                  <div className="mt-2 space-y-4">
                    <div>
                      <Input
                        type="file"
                        multiple
                        accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                        className="rounded-[8px] shadow-none border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none"
                        style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
                        onChange={(e) => {
                          const files = e.target.files;
                          if (!files || files.length === 0) return;

                          if (editingPost) {
                            // Upload immediately if editing existing post
                            handleMediaUpload(files, editingPost.id);
                          } else {
                            // Store files for upload after post creation
                            setPendingMediaFiles((prev) => [...prev, ...Array.from(files)]);
                          }
                          e.target.value = ""; // Reset input
                        }}
                        disabled={uploadingMedia}
                      />
                      {uploadingMedia && (
                        <p className="text-sm text-muted-foreground mt-1">Uploading media...</p>
                      )}
                      {!editingPost && pendingMediaFiles.length > 0 && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {pendingMediaFiles.length} file(s) ready to upload after post creation
                        </p>
                      )}
                    </div>

                    {/* Show pending files for new posts */}
                    {!editingPost && pendingMediaFiles.length > 0 && (
                      <div className="space-y-2">
                        {pendingMediaFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-3 border border-muted-foreground/20 rounded-lg bg-white/5"
                          >
                            <div className="flex-shrink-0">
                              {file.type.startsWith("image/") ? (
                                <img
                                  src={URL.createObjectURL(file)}
                                  alt={file.name}
                                  className="w-16 h-16 object-cover rounded"
                                />
                              ) : (
                                <div className="w-16 h-16 flex items-center justify-center bg-muted/20 rounded">
                                  {file.type.startsWith("video/") ? (
                                    <Video className="w-4 h-4" />
                                  ) : (
                                    <FileText className="w-4 h-4" />
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{file.name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  {file.type.startsWith("image/") ? (
                                    <ImageIcon className="w-4 h-4" />
                                  ) : file.type.startsWith("video/") ? (
                                    <Video className="w-4 h-4" />
                                  ) : (
                                    <FileText className="w-4 h-4" />
                                  )}
                                  {file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "document"}
                                </span>
                                <span>•</span>
                                <span>{formatFileSize(file.size)}</span>
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                setPendingMediaFiles((prev) => prev.filter((_, i) => i !== index));
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Show uploaded media for existing posts */}
                    {editingPost && postMedia.length > 0 && (
                      <div className="space-y-2">
                        {postMedia.map((media) => (
                          <div
                            key={media.id}
                            className="flex items-center gap-3 p-3 border border-muted-foreground/20 rounded-lg bg-white/5"
                          >
                            <div className="flex-shrink-0">
                              {media.media_type === "image" ? (
                                <img
                                  src={media.file_url}
                                  alt={media.caption || media.filename}
                                  className="w-16 h-16 object-cover rounded"
                                />
                              ) : (
                                <div className="w-16 h-16 flex items-center justify-center bg-muted/20 rounded">
                                  {getMediaIcon(media.media_type)}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{media.filename}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  {getMediaIcon(media.media_type)}
                                  {media.media_type}
                                </span>
                                <span>•</span>
                                <span>{formatFileSize(media.file_size)}</span>
                              </div>
                              {media.caption && (
                                <p className="text-xs text-muted-foreground mt-1">{media.caption}</p>
                              )}
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteMedia(media)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="category">Category</Label>

                    {/* <div className="mb-2">
                      <Input placeholder="Search categories..." value={catSearch} onChange={(e) => setCatSearch(e.target.value)} />
                    </div> */}

                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger className='mt-1 rounded-[8px] shadow-none border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400' style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className='border-secondary-foreground bg-black/90 text-white'>
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
                      <SelectTrigger className='mt-1 rounded-[8px] shadow-none border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400' style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white/90">
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input id="tags" className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none" style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties } value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} placeholder="prayer, morning, catholic" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="meta_title">Meta Title (SEO)</Label>
                    <Input id="meta_title" value={formData.meta_title} onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })} className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none" style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties } />
                  </div>
                  <div>
                    <Label htmlFor="meta_description">Meta Description (SEO)</Label>
                    <Input id="meta_description" value={formData.meta_description} onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })} className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none" style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties } />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" className="rounded-[8px] border-0 hover:bg-white/80" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="rounded-[8px] border-0 hover:bg-primary/80">{editingPost ? "Update Post" : "Create Post"}</Button>
                </div>
              </form>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Posts Grid */}
        {postsLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold mb-2 text-white pt-5">Loading Blog Posts</h2>
              <p className="text-muted-foreground">Fetching blog post data...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
              {posts.map((post) => (
                <Card key={post.id} className="border border-muted/20 p-0 rounded-lg bg-white/5">
                  {post.featured_image && <img src={post.featured_image} alt={post.title} className="w-full h-40 object-cover rounded-t-lg mb-2" />}

                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={post.status === "published" ? "default" : "outline"} className={post.status === "published" ? "bg-green-500 border-0" : "text-white"}>
                        {post.status}
                      </Badge>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Eye className="w-4 h-4 text-primary" />
                        {post.view_count}
                      </div>
                    </div>

                    <CardTitle className="line-clamp-2">{post.title}</CardTitle>

                    {post.excerpt && (
                      <div 
                        className="text-sm text-muted-foreground line-clamp-3 prose prose-sm prose-invert prose-a:text-primary prose-a:underline"
                        dangerouslySetInnerHTML={{ __html: post.excerpt }}
                      />
                    )}
                  </CardHeader>

                  <CardContent>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-primary" />
                        {new Date(post.created_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Tag className="w-3 h-3 text-primary" />
                        {post.tags.length} tags
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button size="sm" className="rounded-[8px] border-0" variant="outline" onClick={() => handleEdit(post)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" className="rounded-[8px] border-0 text-destructive hover:text-destructive" variant="outline" onClick={() => handleDelete(post.id)}>
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
          </>
        )}
      </div>
    </div>
  );
};

export default AdminBlog;
