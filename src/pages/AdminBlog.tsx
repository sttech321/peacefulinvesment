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
import { Checkbox } from "@/components/ui/checkbox";
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
import { supabase } from "@/integrations/supabase/client";

type PrayerTaskRow = {
  id: string;
  name: string;
  link_or_video?: string | null;
  folder_id?: string | null;
  duration_days?: number | null;
  number_of_days?: number | null;
  start_date?: string | null;
  start_time?: string | null;
  is_shared?: boolean | null;
  blog_post_id?: string | null;
};

type PrayerFolder = { id: string; name: string; parent_id: string | null };

function extractPrayerTaskIdFromPostTags(tags: unknown): string | null {
  if (!Array.isArray(tags)) return null;
  for (const t of tags) {
    if (typeof t !== "string") continue;
    const m = t.trim().match(/^prayer_task:(?<id>[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
    if (m?.groups?.id) return m.groups.id;
  }
  return null;
}

function extractExtraTextsFromTags(tags: unknown): { extra_left: string; extra_right: string } {
  let extra_left = "";
  let extra_right = "";
  if (!Array.isArray(tags)) return { extra_left, extra_right };
  for (const raw of tags) {
    const t = String(raw || "").trim();
    const mLeft = t.match(/^extra_left:(?<v>.+)$/i);
    if (mLeft?.groups?.v) {
      try {
        extra_left = decodeURIComponent(mLeft.groups.v);
      } catch {
        extra_left = mLeft.groups.v;
      }
      continue;
    }
    const mRight = t.match(/^extra_right:(?<v>.+)$/i);
    if (mRight?.groups?.v) {
      try {
        extra_right = decodeURIComponent(mRight.groups.v);
      } catch {
        extra_right = mRight.groups.v;
      }
      continue;
    }
  }
  return { extra_left, extra_right };
}

function stripSystemTags(tags: string[]) {
  return tags.filter((t) => {
    const s = String(t || "").trim();
    if (/^prayer_task:[0-9a-f-]{36}$/i.test(s)) return false;
    if (/^extra_left:/i.test(s)) return false;
    if (/^extra_right:/i.test(s)) return false;
    return true;
  });
}

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
  const todayIso = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [catSearch, setCatSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [formData, setFormData] = useState<any>({
    title: "",
    slug: "",
    header_left_text: "",
    header_right_text: "",
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
  const [featuredPreviewObjectUrl, setFeaturedPreviewObjectUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [prayerEnabled, setPrayerEnabled] = useState(true);
  const [linkedPrayerTaskId, setLinkedPrayerTaskId] = useState<string | null>(null);
  const [prayerFolders, setPrayerFolders] = useState<PrayerFolder[]>([]);
  const [loadingPrayerFolders, setLoadingPrayerFolders] = useState(false);
  const [prayerForm, setPrayerForm] = useState({
    name: "",
    link_or_video: "",
    folder_id: "none",
    duration_days: 1,
    start_date: todayIso,
    start_time: "06:00",
    is_shared: true,
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Cleanup object URL previews (preview only; never persisted)
  useEffect(() => {
    return () => {
      if (featuredPreviewObjectUrl) {
        URL.revokeObjectURL(featuredPreviewObjectUrl);
      }
    };
  }, [featuredPreviewObjectUrl]);

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

  // Load prayer folders for prayer task section
  useEffect(() => {
    const loadPrayerFolders = async () => {
      try {
        setLoadingPrayerFolders(true);
        const { data, error } = await (supabase as any).from("prayer_folders").select("id,name,parent_id").order("name", { ascending: true });
        if (error) throw error;
        setPrayerFolders((data || []) as PrayerFolder[]);
      } catch (e) {
        console.warn("[AdminBlog] Failed to load prayer folders:", e);
        setPrayerFolders([]);
      } finally {
        setLoadingPrayerFolders(false);
      }
    };
    void loadPrayerFolders();
  }, []);

  // -------------------------
  // Non-hook helpers
  // -------------------------
  const resetForm = () => {
    setFieldErrors({});
    setFormData({
      title: "",
      slug: "",
      header_left_text: "",
      header_right_text: "",
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
    setFeaturedPreviewObjectUrl(null);
    setPrayerEnabled(true);
    setLinkedPrayerTaskId(null);
    setPrayerForm({
      name: "",
      link_or_video: "",
      folder_id: "none",
      duration_days: 1,
      start_date: todayIso,
      start_time: "06:00",
      is_shared: true,
    });
  };

  const sanitizeFilename = (filename: string) => filename.replace(/[^a-zA-Z0-9._-]/g, "_");

  const tryGetStoragePathFromPublicUrl = (publicUrl: string) => {
    // Expected shape: .../storage/v1/object/public/{bucket}/{path}
    const marker = "/storage/v1/object/public/blog-media/";
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return null;
    return publicUrl.slice(idx + marker.length);
  };

  const uploadFeaturedImageToStorage = async (postId: string, file: File) => {
    const safeName = sanitizeFilename(file.name);
    const filePath = `blog/featured/${postId}/${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("blog-media")
      .upload(filePath, file, { upsert: true, contentType: file.type });
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from("blog-media").getPublicUrl(filePath);
    return { publicUrl: urlData.publicUrl, filePath };
  };

  const generateSlug = (title: string) =>
    title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

  const buildPrayerLinkDefault = (slug: string) => `/blog/${String(slug || "").trim()}`;

  const loadLinkedPrayerTaskForPost = async (post: BlogPost): Promise<PrayerTaskRow | null> => {
    try {
      const byBlog = await (supabase as any)
        .from("prayer_tasks")
        .select("id,name,link_or_video,folder_id,duration_days,number_of_days,start_date,start_time,is_shared,blog_post_id")
        .eq("blog_post_id", post.id)
        .maybeSingle();

      if (byBlog?.data) return byBlog.data as PrayerTaskRow;

      const mappedId = extractPrayerTaskIdFromPostTags((post as any).tags);
      if (!mappedId) return null;

      const byId = await (supabase as any)
        .from("prayer_tasks")
        .select("id,name,link_or_video,folder_id,duration_days,number_of_days,start_date,start_time,is_shared,blog_post_id")
        .eq("id", mappedId)
        .maybeSingle();
      return (byId?.data ?? null) as PrayerTaskRow | null;
    } catch (e) {
      console.warn("[AdminBlog] Failed to load linked prayer task:", e);
      return null;
    }
  };

  const validateUnifiedForm = () => {
    const errs: Record<string, string> = {};

    const title = String(formData.title || "").trim();
    const slug = String(formData.slug || "").trim();
    const content = String(formData.content || "").trim();

    if (!title) errs.title = "Title is required.";
    if (!slug) errs.slug = "Slug is required.";
    if (!content) errs.content = "Content is required.";

    if (prayerEnabled) {
      const prayerName = String(prayerForm.name || "").trim() || title;
      const days = Math.max(1, Math.floor(Number(prayerForm.duration_days || 1)));
      const startDate = String(prayerForm.start_date || "").trim();
      const startTime = String(prayerForm.start_time || "").trim();

      if (!prayerName) errs.prayer_name = "Prayer Task name is required.";
      if (!Number.isFinite(days) || days < 1) errs.prayer_duration_days = "Duration must be at least 1 day.";
      if (!startDate) errs.prayer_start_date = "Start date is required.";
      if (!startTime) errs.prayer_start_time = "Start time is required.";
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setFieldErrors({});
    if (!validateUnifiedForm()) return;

    const { previewUrl, featured_image, header_left_text, header_right_text, ...cleanForm } = formData;
    const featuredFile = featured_image instanceof File ? (featured_image as File) : null;

    // Human-entered tags (comma-separated)
    const baseTags: string[] = cleanForm.tags
      .split(",")
      .map((tag: string) => tag.trim())
      .filter(Boolean);

    // We keep mapping tags out of the input; the backend RPC will manage prayer_task:<uuid>.
    const finalTags = stripSystemTags(baseTags);

    const basePostData = {
      ...cleanForm,
      // Store extra text fields as real DB columns on blog_posts
      header_left_text: String(header_left_text || "").trim() || null,
      header_right_text: String(header_right_text || "").trim() || null,
      tags: finalTags,
    };

    try {
      setSaving(true);

      const title = String(basePostData.title || "").trim();
      const slug = String(basePostData.slug || "").trim();

      const prayerPayload = {
        name: String(prayerForm.name || "").trim() || title,
        link_or_video: String(prayerForm.link_or_video || "").trim() || buildPrayerLinkDefault(slug),
        folder_id: prayerForm.folder_id !== "none" ? prayerForm.folder_id : null,
        duration_days: Math.max(1, Math.floor(Number(prayerForm.duration_days || 1))),
        start_date: prayerForm.start_date,
        start_time: prayerForm.start_time,
        is_shared: Boolean(prayerForm.is_shared),
      };

      const { data: upsertResult, error: upsertError } = await (supabase as any).rpc(
        "admin_upsert_blog_post_with_prayer_task",
        {
          p_post_id: editingPost?.id ?? null,
          p_post: basePostData,
          p_prayer: prayerPayload,
          p_with_prayer: Boolean(prayerEnabled),
        }
      );
      if (upsertError) throw upsertError;

      const postId = String(upsertResult?.post_id || "");
      const prayerId = upsertResult?.prayer_task_id ? String(upsertResult.prayer_task_id) : null;
      if (!postId) throw new Error("Failed to save: missing post id.");
      setLinkedPrayerTaskId(prayerId);

      // If featured image was changed, upload to Supabase Storage and store ONLY public URL
      if (featuredFile) {
        const previousFeatured = editingPost?.featured_image;
        const { publicUrl, filePath: newFilePath } = await uploadFeaturedImageToStorage(postId, featuredFile);

        const { error: updateImageError } = await updatePost(postId, { featured_image: publicUrl });
        if (updateImageError) throw updateImageError;

        // Optionally delete old storage file (best-effort)
        if (previousFeatured && typeof previousFeatured === "string") {
          const oldPath = tryGetStoragePathFromPublicUrl(previousFeatured);
          if (oldPath && oldPath !== newFilePath) {
            try {
              await supabase.storage.from("blog-media").remove([oldPath]);
            } catch {
              // best-effort cleanup only
            }
          }
        }
      }

      toast({
        title: editingPost ? "Updated" : "Created",
        description: prayerEnabled
          ? "Blog post + prayer task saved successfully."
          : "Blog post saved successfully.",
      });

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
      const { data: freshPost } = await supabase.from("blog_posts").select("*").eq("id", postId).maybeSingle();
      if (freshPost) setEditingPost(freshPost as BlogPost);

      fetchPosts("all");
    } catch (err) {
      console.error(err);
      const msg = (err as any)?.message ? String((err as any).message) : "Failed to save blog post. Please try again.";
      // Map a few common DB errors to fields
      const nextErrors: Record<string, string> = {};
      if (/blog_posts_slug_key/i.test(msg) || /duplicate key/i.test(msg)) {
        nextErrors.slug = "That slug is already in use. Please choose another.";
      } else if (/Missing required field: title/i.test(msg)) {
        nextErrors.title = "Title is required.";
      } else if (/Missing required field: slug/i.test(msg)) {
        nextErrors.slug = "Slug is required.";
      } else if (/Missing required field: content/i.test(msg)) {
        nextErrors.content = "Content is required.";
      }
      if (Object.keys(nextErrors).length) setFieldErrors((p) => ({ ...p, ...nextErrors }));

      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (post: BlogPost) => {
    setEditingPost(post);
    setFieldErrors({});
    setFeaturedPreviewObjectUrl(null);
    const extractedExtras = extractExtraTextsFromTags((post as any).tags); // legacy fallback

    const safeDecode = (val: unknown) => {
      const s = String(val ?? "").trim();
      if (!s) return "";
      try {
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    };

    // Prefer DB columns if present; fall back to legacy system tags.
    const extraLeft = safeDecode((post as any)?.header_left_text) || extractedExtras.extra_left || "";
    const extraRight = safeDecode((post as any)?.header_right_text) || extractedExtras.extra_right || "";
    setFormData({
      title: post.title,
      slug: post.slug,
      header_left_text: extraLeft,
      header_right_text: extraRight,
      content: post.content,
      excerpt: post.excerpt || "",
      category: post.category,
      tags: stripSystemTags(post.tags).join(", "),
      status: post.status,
      meta_title: post.meta_title || "",
      meta_description: post.meta_description || "",
      featured_image: "",
      previewUrl: post.featured_image || "",
    });

    const linkedTask = await loadLinkedPrayerTaskForPost(post);
    if (linkedTask) {
      setPrayerEnabled(true);
      setLinkedPrayerTaskId(linkedTask.id);
      setPrayerForm({
        name: linkedTask.name || "",
        link_or_video: linkedTask.link_or_video || buildPrayerLinkDefault(post.slug),
        folder_id: linkedTask.folder_id ? String(linkedTask.folder_id) : "none",
        duration_days: Number(linkedTask.duration_days ?? linkedTask.number_of_days ?? 1) || 1,
        start_date: String(linkedTask.start_date || todayIso),
        start_time: String(linkedTask.start_time || "06:00").slice(0, 5),
        is_shared: Boolean(linkedTask.is_shared ?? true),
      });
    } else {
      setPrayerEnabled(false);
      setLinkedPrayerTaskId(null);
      setPrayerForm({
        name: post.title || "",
        link_or_video: buildPrayerLinkDefault(post.slug),
        folder_id: "none",
        duration_days: 1,
        start_date: todayIso,
        start_time: "06:00",
        is_shared: true,
      });
    }
    
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
                {/* Section 1: Prayer Task */}
                <Card className="border border-muted/20 p-0 rounded-lg bg-white/5">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-base text-black">Prayer Task</CardTitle>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          className="rounded-[2px]"
                          checked={prayerEnabled}
                          onCheckedChange={(v) => setPrayerEnabled(Boolean(v))}
                        />
                        <span className="text-sm text-black">Create / update linked prayer task</span>
                      </div>
                    </div>
                    {linkedPrayerTaskId ? (
                      <p className="text-xs text-muted-foreground mt-2">
                        Linked Prayer Task ID: <code className="text-xs">{linkedPrayerTaskId}</code>
                      </p>
                    ) : null}
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    <div className={prayerEnabled ? "space-y-4" : "opacity-60 pointer-events-none select-none space-y-4"}>
                      <div>
                        <Label>Task Name *</Label>
                        <Input
                          value={prayerForm.name}
                          onChange={(e) => setPrayerForm((p) => ({ ...p, name: e.target.value }))}
                          placeholder="e.g., Peaceful Investment"
                          className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none"
                          style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
                        />
                        {fieldErrors.prayer_name ? <p className="text-sm text-red-500 mt-1">{fieldErrors.prayer_name}</p> : null}
                      </div>

                      <div>
                        <Label>Link or Video</Label>
                        <Input
                          value={prayerForm.link_or_video}
                          onChange={(e) => setPrayerForm((p) => ({ ...p, link_or_video: e.target.value }))}
                          placeholder={buildPrayerLinkDefault(formData.slug)}
                          className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none"
                          style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
                        />
                        <p className="text-xs text-muted-foreground mt-2">Recommended: link to the blog post URL so users open the prayer easily.</p>
                      </div>

                      <div>
                        <Label>Folder</Label>
                        <Select value={prayerForm.folder_id} onValueChange={(v) => setPrayerForm((p) => ({ ...p, folder_id: v }))}>
                          <SelectTrigger
                            className="mt-1 rounded-[8px] shadow-none border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400"
                            style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}
                          >
                            <SelectValue placeholder={loadingPrayerFolders ? "Loading..." : "Unassigned"} />
                          </SelectTrigger>
                          <SelectContent className="border-secondary-foreground bg-black/90 text-white">
                            <SelectItem value="none">Unassigned</SelectItem>
                            {(() => {
                              // Flatten folders into a simple tree list for the select
                              const map = new Map<string, PrayerFolder & { children: PrayerFolder[] }>();
                              prayerFolders.forEach((f) => map.set(f.id, { ...(f as any), children: [] }));
                              map.forEach((node) => {
                                if (node.parent_id && map.has(String(node.parent_id))) {
                                  map.get(String(node.parent_id))!.children.push(node);
                                }
                              });
                              const roots = Array.from(map.values()).filter((n) => !n.parent_id || !map.has(String(n.parent_id)));
                              const sortByName = (a: PrayerFolder, b: PrayerFolder) => a.name.localeCompare(b.name);
                              roots.sort(sortByName);
                              const out: Array<{ id: string; label: string; depth: number }> = [];
                              const visit = (n: any, depth: number) => {
                                out.push({ id: n.id, label: n.name, depth });
                                (n.children || []).sort(sortByName).forEach((c: any) => visit(c, depth + 1));
                              };
                              roots.forEach((r) => visit(r, 0));
                              return out.map((f) => (
                                <SelectItem key={f.id} value={f.id}>
                                  <span style={{ marginLeft: f.depth * 12 }}>{f.depth > 0 ? "— " : ""}{f.label}</span>
                                </SelectItem>
                              ));
                            })()}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Duration (Days) *</Label>
                          <Input
                            type="number"
                            min={1}
                            value={prayerForm.duration_days}
                            onChange={(e) => setPrayerForm((p) => ({ ...p, duration_days: Number(e.target.value) || 1 }))}
                            className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none"
                            style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
                          />
                          {fieldErrors.prayer_duration_days ? <p className="text-sm text-red-500 mt-1">{fieldErrors.prayer_duration_days}</p> : null}
                        </div>
                        <div>
                          <Label>Start Date *</Label>
                          <Input
                            type="date"
                            value={prayerForm.start_date}
                            onChange={(e) => setPrayerForm((p) => ({ ...p, start_date: e.target.value }))}
                            className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none"
                            style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
                          />
                          {fieldErrors.prayer_start_date ? <p className="text-sm text-red-500 mt-1">{fieldErrors.prayer_start_date}</p> : null}
                        </div>
                        <div>
                          <Label>Start Time *</Label>
                          <Input
                            type="time"
                            value={prayerForm.start_time}
                            onChange={(e) => setPrayerForm((p) => ({ ...p, start_time: e.target.value }))}
                            className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none"
                            style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
                          />
                          {fieldErrors.prayer_start_time ? <p className="text-sm text-red-500 mt-1">{fieldErrors.prayer_start_time}</p> : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Checkbox
                          className="rounded-[2px]"
                          checked={Boolean(prayerForm.is_shared)}
                          onCheckedChange={(v) => setPrayerForm((p) => ({ ...p, is_shared: Boolean(v) }))}
                        />
                        <span className="text-sm text-black">Shared (visible to everyone; users can join)</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Section 2: Blog Post */}
                <Card className="border border-muted/20 p-0 rounded-lg bg-white/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-black">Blog Post</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
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
                      // Preview is frontend-only using object URLs (no base64 / FileReader)
                      setFormData((prev: any) => ({ ...prev, featured_image: file }));
                      const objectUrl = URL.createObjectURL(file);
                      setFeaturedPreviewObjectUrl((prev) => {
                        if (prev) URL.revokeObjectURL(prev);
                        return objectUrl;
                      });
                      setFormData((prev: any) => ({ ...prev, previewUrl: objectUrl }));
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
                      className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none bg-black/5"
                    style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
                      value={formData.title}
                      onChange={(e) => {
                        const nextTitle = e.target.value;
                        setFormData({ ...formData, title: nextTitle, slug: generateSlug(nextTitle) });
                        if (!editingPost) {
                          setPrayerForm((p) => ({ ...p, name: p.name ? p.name : nextTitle }));
                        }
                      }}
                      required
                    />
                    {fieldErrors.title ? <p className="text-sm text-red-500 mt-1">{fieldErrors.title}</p> : null}
                  </div>
                  <div>
                    <Label htmlFor="slug">Slug</Label>
                    <Input id="slug" className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none bg-black/10"
                    style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties } value={formData.slug} onChange={(e) => {
                      const nextSlug = e.target.value;
                      setFormData({ ...formData, slug: nextSlug });
                      setPrayerForm((p) => {
                        const current = String(p.link_or_video || "").trim();
                        const nextDefault = buildPrayerLinkDefault(nextSlug);
                        if (!current || current.startsWith("/blog/")) return { ...p, link_or_video: nextDefault };
                        return p;
                      });
                    }} required />
                    {fieldErrors.slug ? <p className="text-sm text-red-500 mt-1">{fieldErrors.slug}</p> : null}
                  </div>
                </div>

                {/* Extra text fields (saved as hidden system tags) */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="header_left_text">Header Text (Left)</Label>
                    <Input
                      id="header_left_text"
                      value={formData.header_left_text || ""}
                      onChange={(e) => setFormData({ ...formData, header_left_text: e.target.value })}
                      placeholder="Optional extra text"
                      className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none bg-black/5"
                      style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
                    />
                  </div>
                  <div>
                    <Label htmlFor="header_right_text">Header Text (Right)</Label>
                    <Input
                      id="header_right_text"
                      value={formData.header_right_text || ""}
                      onChange={(e) => setFormData({ ...formData, header_right_text: e.target.value })}
                      placeholder="Optional extra text"
                      className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none bg-black/10"
                      style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="excerpt">Excerpt</Label>
                  <div className="mt-1 bg-black/5 rounded-[8px] p-1">
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
                  <div className="mt-1 bg-black/10 rounded-[8px] p-1">
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
                  {fieldErrors.content ? <p className="text-sm text-red-500 mt-2">{fieldErrors.content}</p> : null}
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
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-2 pb-2">
                  <Button type="button" variant="outline" className="rounded-[8px] border-0 hover:bg-white/80" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="rounded-[8px] border-0 hover:bg-primary/80" disabled={saving || uploadingMedia}>
                    {saving ? "Saving..." : editingPost ? "Update" : "Create"}
                  </Button>
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
                      <Button size="sm" className="rounded-[8px] border-0 bg-muted/20 hover:bg-muted/40 text-white h-[36px] px-3" variant="outline" onClick={() => handleEdit(post)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" className="rounded-[8px] border-0 text-white bg-red-600 hover:bg-red-700 h-[36px] px-3" variant="outline" onClick={() => handleDelete(post.id)}>
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
