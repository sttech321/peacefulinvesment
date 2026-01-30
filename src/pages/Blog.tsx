import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, Clock, Eye, Heart, ArrowLeft, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useBlog, BlogPost, BlogCategory } from "@/hooks/useBlog";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Footer from "@/components/Footer";
import { StartPrayerDialog, type StartPrayerDialogForm } from "@/components/prayer/StartPrayerDialog";
import { locationService } from "@/services/location/LocationService";

// Side images
import Left01 from "@/assets/left-01.jpg";
import Left02 from "@/assets/left-02.jpg";
import Right01 from "@/assets/right-01.jpg";
import Right02 from "@/assets/right-02.jpg";

const POSTS_PER_BATCH = 9;

type PrayerTaskLite = {
  id: string;
  name: string;
  number_of_days: number;
  duration_days?: number | null;
  start_date?: string | null;
  end_date?: string | null;
};

function parsePrayerTaskIdFromTags(tags: unknown): string | null {
  if (!Array.isArray(tags)) return null;
  for (const t of tags) {
    if (typeof t !== "string") continue;
    const m = t.trim().match(/^prayer_task:(?<id>[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
    if (m?.groups?.id) return m.groups.id;
  }
  return null;
}

function parseTraditionalDatesFromTags(tags: unknown): { start_date: string; end_date: string; label?: string } | null {
  if (!Array.isArray(tags)) return null;
  let start: string | null = null;
  let end: string | null = null;
  let label: string | undefined;

  for (const raw of tags) {
    const t = String(raw || "").trim();
    if (!t) continue;

    // Accept a few safe, non-technical tag formats (no IDs shown in UI):
    // - traditional_dates:YYYY-MM-DD..YYYY-MM-DD
    // - traditional_start:YYYY-MM-DD + traditional_end:YYYY-MM-DD
    // - fixed_dates:YYYY-MM-DD..YYYY-MM-DD
    const mRange = t.match(/^(traditional_dates|fixed_dates):(?<s>\d{4}-\d{2}-\d{2})\.\.(?<e>\d{4}-\d{2}-\d{2})$/i);
    if (mRange?.groups?.s && mRange?.groups?.e) {
      start = mRange.groups.s;
      end = mRange.groups.e;
      continue;
    }
    const mStart = t.match(/^(traditional_start|fixed_start):(?<s>\d{4}-\d{2}-\d{2})$/i);
    if (mStart?.groups?.s) {
      start = mStart.groups.s;
      continue;
    }
    const mEnd = t.match(/^(traditional_end|fixed_end):(?<e>\d{4}-\d{2}-\d{2})$/i);
    if (mEnd?.groups?.e) {
      end = mEnd.groups.e;
      continue;
    }
    const mLabel = t.match(/^(traditional_label|fixed_label):(?<label>.+)$/i);
    if (mLabel?.groups?.label) {
      label = mLabel.groups.label.trim();
      continue;
    }
  }

  if (!start || !end) return null;
  return { start_date: start, end_date: end, label };
}

const Blog = () => {
  const { posts, categories, loading, initializing } = useBlog();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();

  const addDaysToYmd = useCallback((yyyyMmDd: string, daysToAdd: number): string => {
    const m = String(yyyyMmDd || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return yyyyMmDd;
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const dt = new Date(Date.UTC(y, mo, d + Math.max(0, daysToAdd)));
    return dt.toISOString().slice(0, 10);
  }, []);

  // STATE
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [openParentId, setOpenParentId] = useState<string | null>(null);

  // BUILD PARENTS & CHILDREN MAP
  const { parents, childrenMap } = useMemo(() => {
    const map = new Map<string, BlogCategory[]>();
    const parentsArr: BlogCategory[] = [];

    categories.forEach((c) => {
      const parentId = c.parent_id ?? null;
      if (parentId === null) {
        parentsArr.push(c);
      } else {
        if (!map.has(parentId)) map.set(parentId, []);
        map.get(parentId)!.push(c);
      }
    });

    return { parents: parentsArr, childrenMap: map };
  }, [categories]);

  // TOGGLE ONLY ONE PARENT OPEN
  const toggleOpenParent = (parentId: string) => {
    setOpenParentId((prev) => (prev === parentId ? null : parentId));
  };

  // Render subcategories level-by-level (clean UI) while respecting direct parent_id relationships.
  const getSortedChildren = useCallback(
    (parentId: string) => {
      const children = childrenMap.get(parentId) ?? [];
      return [...children].sort((a, b) => a.name.localeCompare(b.name));
    },
    [childrenMap]
  );

  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const selectedCategoryNode = useMemo(() => {
    if (!selectedCategory || selectedCategory === "all") return null;
    return categories.find((c) => c.slug === selectedCategory) ?? null;
  }, [categories, selectedCategory]);

  const subcategoryPathIds = useMemo(() => {
    if (!openParentId) return [];

    // If nothing selected yet (or parent itself selected), show only one level.
    if (!selectedCategoryNode) return [openParentId];

    // Build ancestry from selected node up; only expand if the open parent is in the ancestry chain.
    const ancestry: string[] = [];
    let cur: BlogCategory | null = selectedCategoryNode;
    while (cur) {
      ancestry.unshift(cur.id);
      const pid = cur.parent_id ?? null;
      if (!pid) break;
      cur = categoriesById.get(pid) ?? null;
    }

    const idx = ancestry.indexOf(openParentId);
    if (idx === -1) return [openParentId];
    return ancestry.slice(idx);
  }, [categoriesById, openParentId, selectedCategoryNode]);

  // Folder navigation (blog_categories with parent_id)
  const [categoryStack, setCategoryStack] = useState<string[]>([]);
  const currentCategoryId = categoryStack.length ? categoryStack[categoryStack.length - 1] : null;
  const parentCategoryId = categoryStack.length >= 2 ? categoryStack[categoryStack.length - 2] : null;

  const [visibleCount, setVisibleCount] = useState<number>(POSTS_PER_BATCH);

  const categoriesByParent = useMemo(() => {
    const map = new Map<string | null, BlogCategory[]>();
    for (const c of categories) {
      const pid = (c as any).parent_id ?? null;
      if (!map.has(pid)) map.set(pid, []);
      map.get(pid)!.push(c);
    }
    for (const [pid, arr] of map) {
      arr.sort((a, b) => a.name.localeCompare(b.name));
      map.set(pid, arr);
    }
    return map;
  }, [categories]);

  const currentChildren = useMemo(
    () => categoriesByParent.get(currentCategoryId) ?? [],
    [categoriesByParent, currentCategoryId]
  );

  const isLeafCategory = currentCategoryId !== null && currentChildren.length === 0;
  const currentCategoriesToShow = useMemo(
    () => (currentCategoryId ? currentChildren : categoriesByParent.get(null) ?? []),
    [categoriesByParent, currentCategoryId, currentChildren]
  );

  const siblings = useMemo(() => categoriesByParent.get(parentCategoryId) ?? [], [categoriesByParent, parentCategoryId]);
  const siblingIndex = useMemo(
    () => (currentCategoryId ? siblings.findIndex((s) => s.id === currentCategoryId) : -1),
    [currentCategoryId, siblings]
  );
  const prevSiblingId = siblingIndex > 0 ? siblings[siblingIndex - 1].id : null;
  const nextSiblingId = siblingIndex >= 0 && siblingIndex < siblings.length - 1 ? siblings[siblingIndex + 1].id : null;

  const openCategory = useCallback((id: string) => setCategoryStack((prev) => [...prev, id]), []);
  const goBack = useCallback(() => setCategoryStack((prev) => prev.slice(0, -1)), []);
  const goToSibling = useCallback((id: string) => setCategoryStack((prev) => (prev.length ? [...prev.slice(0, -1), id] : prev)), []);

  // Reset batch rendering when changing category level
  useEffect(() => {
    setVisibleCount(POSTS_PER_BATCH);
  }, [currentCategoryId]);

  // Reset batch rendering when changing selected category/subcategory (badge-based navigation)
  useEffect(() => {
    setVisibleCount(POSTS_PER_BATCH);
  }, [selectedCategory]);

  // Detect whether posts store category as slug or id
  const postCategoryType = useMemo(() => {
    const sample = posts.find(Boolean);
    if (!sample || !sample.category) return "slug";
    const val = sample.category;
    if (typeof val === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)) {
      return "id";
    }
    return "slug";
  }, [posts]);

  const idMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // Category-based filtering for blog/prayer cards (do not show any blogs until a category/subcategory is selected)
  const filteredPosts = useMemo(() => {
    if (!selectedCategory || selectedCategory === "all") return [];

    const selectedNode = categories.find((c) => c.slug === selectedCategory);
    if (!selectedNode) return [];

    const isParent = (selectedNode.parent_id ?? null) === null;

    const allowedNodes: BlogCategory[] = [selectedNode];
    if (isParent) {
      const descendants: BlogCategory[] = [];
      const visit = (id: string) => {
        const children = childrenMap.get(id) ?? [];
        for (const child of children) {
          descendants.push(child);
          visit(child.id);
        }
      };
      visit(selectedNode.id);
      allowedNodes.push(...descendants);
    }

    const allowedSlugs = new Set(
      allowedNodes
        .map((c) => String(c.slug || "").toLowerCase().trim())
        .filter(Boolean)
    );
    const allowedIds = new Set(allowedNodes.map((c) => String(c.id)).filter(Boolean));

    return posts.filter((p) => {
      if (!p.category) return false;
      if (postCategoryType === "id") return allowedIds.has(String(p.category));
      return allowedSlugs.has(String(p.category).toLowerCase().trim());
    });
  }, [categories, childrenMap, postCategoryType, posts, selectedCategory]);

  const filteredVisiblePosts = useMemo(() => filteredPosts.slice(0, visibleCount), [filteredPosts, visibleCount]);

  const leafPosts = useMemo(() => {
    if (!isLeafCategory || !currentCategoryId) return [];
    const cat = idMap.get(currentCategoryId);
    if (!cat) return [];

    const catId = cat.id;
    const catSlug = (cat.slug || "").toLowerCase().trim();

    return posts.filter((p) => {
      if (!p.category) return false;
      if (postCategoryType === "id") return p.category === catId;
      const postCat = typeof p.category === "string" ? p.category.toLowerCase().trim() : "";
      return postCat === catSlug;
    });
  }, [currentCategoryId, idMap, isLeafCategory, postCategoryType, posts]);

  const visiblePosts = useMemo(() => leafPosts.slice(0, visibleCount), [leafPosts, visibleCount]);

  // ---------- Prayer actions (Join / Save reminder) ----------
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [actionOpen, setActionOpen] = useState(false);
  const [actionMode, setActionMode] = useState<"join" | "save">("join");
  const [actionPost, setActionPost] = useState<BlogPost | null>(null);
  const [resolvedPrayerTask, setResolvedPrayerTask] = useState<PrayerTaskLite | null>(null);
  const [resolvingPrayerTask, setResolvingPrayerTask] = useState(false);
  const [saving, setSaving] = useState(false);
  const [joinedTaskIds, setJoinedTaskIds] = useState<Set<string>>(new Set());
  const [taskIdByBlogPostId, setTaskIdByBlogPostId] = useState<Map<string, string>>(new Map());

  const [contactEmail, setContactEmail] = useState<string>("");
  const [contactCountryCode, setContactCountryCode] = useState<string>("");
  const [contactPhoneNumber, setContactPhoneNumber] = useState<string>("");
  const [timezone, setTimezone] = useState<string>(userTimezone);

  const [personName, setPersonName] = useState("");
  const [prayerTime, setPrayerTime] = useState("07:00");
  const [reminderType, setReminderType] = useState<"date" | "days" | "weeks">("days");
  const [reminderDate, setReminderDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [reminderDays, setReminderDays] = useState<number>(1);
  const [reminderWeeks, setReminderWeeks] = useState<number>(1);

  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [descriptionPost, setDescriptionPost] = useState<BlogPost | null>(null);
  const [traditionalDates, setTraditionalDates] = useState<{ start_date: string; end_date: string; label?: string } | null>(null);

  const [joinForm, setJoinForm] = useState<StartPrayerDialogForm>(() => ({
    name: "",
    email: "",
    phone_country_code: "",
    phone_number: "",
    times_per_day: 1,
    person_needs_help: "",
    start_date: "",
    end_date: "",
    prayer_time: "07:00",
    timezone: userTimezone,
  }));

  const openDescription = useCallback((post: BlogPost) => {
    setDescriptionPost(post);
    setDescriptionOpen(true);
  }, []);

  // ---------- Blog / Prayer request modal ----------
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestType, setRequestType] = useState<"blog" | "prayer" | "">("");
  const [requestTitle, setRequestTitle] = useState("");
  const [requestContent, setRequestContent] = useState("");
  const [requestName, setRequestName] = useState("");
  const [requestEmail, setRequestEmail] = useState("");

  const openRequestModal = useCallback(() => {
    const nameFromProfile = (profile as any)?.full_name || (profile as any)?.name || "";
    const emailFromProfile = (profile as any)?.email || user?.email || "";
    const fallbackName = user?.email ? user.email.split("@")[0] : "";

    setRequestType("");
    setRequestTitle("");
    setRequestContent("");
    setRequestName(String(nameFromProfile || fallbackName || ""));
    setRequestEmail(String(emailFromProfile || ""));
    setRequestOpen(true);
  }, [profile, user?.email]);

  const submitRequest = useCallback(async () => {
    if (!requestType) {
      toast({ title: "Missing Type", description: "Please select Blog or Prayer.", variant: "destructive" });
      return;
    }
    if (!requestTitle.trim()) {
      toast({ title: "Missing Title", description: "Please enter a title.", variant: "destructive" });
      return;
    }
    if (!requestContent.trim()) {
      toast({ title: "Missing Content", description: "Please enter a description.", variant: "destructive" });
      return;
    }
    if (!requestName.trim()) {
      toast({ title: "Missing Name", description: "Please enter your name.", variant: "destructive" });
      return;
    }
    const email = requestEmail.trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }

    try {
      setRequestSubmitting(true);

      const typeLabel = requestType === "blog" ? "Blog" : "Prayer";
      const subject = `Blog/Prayer Request: ${typeLabel} — ${requestTitle.trim()}`;
      const message = [
        `Request Type: ${typeLabel}`,
        `Title: ${requestTitle.trim()}`,
        "",
        "Content / Description:",
        requestContent.trim(),
        "",
        "Submitted from: Blog page (Catholic Faith & Prayer)",
      ].join("\n");

      // 1) Email admin/support via Edge Function (required)
      const idempotencyKey =
        (globalThis as any)?.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const { error: functionError } = await supabase.functions.invoke("send-contact-notification", {
        body: {
          contactData: {
            full_name: requestName.trim(),
            email,
            phone: null,
            subject,
            priority: "medium",
            message,
            contact_method: "email",
          },
        },
        headers: {
          "Idempotency-Key": idempotencyKey,
        },
      });
      if (functionError) throw functionError;

      // 2) Optional: save in DB as a pending request (best-effort; admin-only visibility)
      try {
        await supabase.from("contact_requests" as any).insert([
          {
            full_name: requestName.trim(),
            email,
            phone: null,
            subject,
            priority: "medium",
            message,
            contact_method: "email",
            status: "pending",
          },
        ]);
      } catch {
        // non-critical
      }

      toast({
        title: "Request Sent",
        description: "Thank you for your request. It has been sent for review.",
      });

      setRequestOpen(false);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Failed to send your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRequestSubmitting(false);
    }
  }, [requestContent, requestEmail, requestName, requestTitle, requestType, toast]);

  // Common timezones (same list used in PrayerTasks.tsx)
  const commonTimezones = useMemo(
    () => [
      { value: "America/New_York", label: "Eastern Time (ET)" },
      { value: "America/Chicago", label: "Central Time (CT)" },
      { value: "America/Denver", label: "Mountain Time (MT)" },
      { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
      { value: "America/Phoenix", label: "Arizona Time" },
      { value: "America/Anchorage", label: "Alaska Time" },
      { value: "Pacific/Honolulu", label: "Hawaii Time" },
      { value: "UTC", label: "UTC" },
      { value: "Europe/London", label: "London (GMT)" },
      { value: "Europe/Paris", label: "Paris (CET)" },
      { value: "Asia/Dubai", label: "Dubai (GST)" },
      { value: "Asia/Tokyo", label: "Tokyo (JST)" },
      { value: "Asia/Shanghai", label: "Shanghai (CST)" },
      { value: "Australia/Sydney", label: "Sydney (AEDT)" },
    ],
    []
  );

  const personOptions = useMemo(() => {
    const raw = (profile as any)?.metadata?.prayer_people;
    return Array.isArray(raw) ? raw.filter((x) => typeof x === "string" && x.trim()) : [];
  }, [profile]);

  // Load active joined prayer task ids for the logged-in user (used to disable "Join Prayer" on cards)
  useEffect(() => {
    const loadJoined = async () => {
      if (!user) {
        setJoinedTaskIds(new Set());
        return;
      }
      try {
        const { data, error } = await (supabase as any)
          .from("prayer_user_tasks")
          .select("task_id")
          .eq("is_active", true)
          .eq("user_id", user.id);
        if (error) throw error;
        const ids = new Set<string>((data || []).map((r: any) => r.task_id).filter(Boolean));
        setJoinedTaskIds(ids);
      } catch {
        // best-effort: don't break UI if this fails
        setJoinedTaskIds(new Set());
      }
    };
    void loadJoined();
  }, [user]);

  // Backward compatible mapping: if a post doesn't have the legacy tag `prayer_task:<uuid>`,
  // resolve it via the canonical relationship `prayer_tasks.blog_post_id = blog_posts.id`.
  // This also enables correct "Joined" state on cards.
  useEffect(() => {
    const ids = (filteredVisiblePosts || []).map((p) => String(p.id)).filter(Boolean);
    if (!ids.length) {
      setTaskIdByBlogPostId(new Map());
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("prayer_tasks")
          .select("id,blog_post_id")
          .in("blog_post_id", ids);
        if (error) throw error;

        const map = new Map<string, string>();
        (data || []).forEach((r: any) => {
          if (r?.blog_post_id && r?.id) map.set(String(r.blog_post_id), String(r.id));
        });
        if (!cancelled) setTaskIdByBlogPostId(map);
      } catch {
        if (!cancelled) setTaskIdByBlogPostId(new Map());
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [filteredVisiblePosts]);

  const ensurePersonSaved = useCallback(
    async (name: string) => {
      if (!user) return;
      const trimmed = name.trim();
      if (!trimmed) return;

      const current = new Set<string>(personOptions.map((x: string) => x.trim()).filter(Boolean));
      if (current.has(trimmed)) return;
      current.add(trimmed);

      const existingMetadata = (profile as any)?.metadata || {};
      const nextMetadata = { ...existingMetadata, prayer_people: Array.from(current) };

      // NOTE: This assumes profiles table has a `metadata` jsonb column (already used elsewhere in the app)
      // TODO: If RLS prevents this update in production, store the list in an existing per-user table instead (no schema guessing here).
      await (supabase as any).from("profiles").update({ metadata: nextMetadata }).eq("user_id", user.id);
    },
    [personOptions, profile, user]
  );

  const computeStartDate = useCallback(() => {
    const today = new Date();
    if (actionMode === "join") return today;
    if (reminderType === "date") return new Date(reminderDate + "T00:00:00");
    if (reminderType === "weeks") {
      const d = new Date(today);
      d.setDate(d.getDate() + reminderWeeks * 7);
      return d;
    }
    const d = new Date(today);
    d.setDate(d.getDate() + reminderDays);
    return d;
  }, [actionMode, reminderDate, reminderDays, reminderType, reminderWeeks]);

  const reminderStartPreview = useMemo(() => {
    if (actionMode === "join") return null;
    try {
      const d = computeStartDate();
      return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return null;
    }
  }, [actionMode, computeStartDate]);

  const resolvePrayerTaskForPost = useCallback(
    async (post: BlogPost) => {
      /**
       * Mapping strategy (backward compatible):
       * 1) Preferred: embed the prayer_task id in the blog post tags: `prayer_task:<uuid>`
       * 2) Canonical relation: `prayer_tasks.blog_post_id = blog_posts.id`
       * 3) Next-best: `prayer_tasks.link_or_video` contains `/blog/<slug>`
       * 4) Fallback: exact name match (`prayer_tasks.name === blog_posts.title`)
       */

      const taggedTaskId = parsePrayerTaskIdFromTags((post as any).tags);
      if (taggedTaskId) {
        const { data, error } = await (supabase as any)
          .from("prayer_tasks")
          .select("id,name,number_of_days,duration_days,start_date,end_date")
          .eq("id", taggedTaskId)
          .maybeSingle();
        if (error) throw error;
        return (data || null) as PrayerTaskLite | null;
      }

      // Canonical relation
      const { data: byRel, error: relError } = await (supabase as any)
        .from("prayer_tasks")
        .select("id,name,number_of_days,duration_days,start_date,end_date")
        .eq("blog_post_id", post.id)
        .maybeSingle();
      if (relError) throw relError;
      if (byRel) return (byRel || null) as PrayerTaskLite | null;

      // Try mapping by blog URL stored in prayer_tasks.link_or_video
      const blogPath = `/blog/${post.slug}`;
      try {
        const { data, error } = await (supabase as any)
          .from("prayer_tasks")
          .select("id,name,number_of_days,duration_days,start_date,end_date,link_or_video")
          .ilike("link_or_video", `%${blogPath}%`)
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          const { id, name, number_of_days, duration_days } = data as any;
          return { id, name, number_of_days, duration_days } as PrayerTaskLite;
        }
      } catch {
        // ignore and fall back
      }

      // Fallback: exact name match
      const { data, error } = await (supabase as any)
        .from("prayer_tasks")
        .select("id,name,number_of_days,duration_days,start_date,end_date")
        .eq("name", post.title)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data || null) as PrayerTaskLite | null;
    },
    []
  );

  const openPrayerAction = useCallback(
    async (mode: "join" | "save", post: BlogPost) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setActionMode(mode);
      setActionPost(post);
      setResolvedPrayerTask(null);
      setPersonName("");
      setContactEmail((profile as any)?.email || user.email || "");

      // Auto-fill country code + phone number (still editable)
      const profileCountryCodeRaw =
        (profile as any)?.country_code || (profile as any)?.countryCode || (profile as any)?.dial_code || (profile as any)?.dialCode || "";
      const profilePhoneRaw = (profile as any)?.phone || (profile as any)?.phone_number || "";

      const normalizeCountryCode = (val: string) => {
        const trimmed = (val || "").trim();
        if (!trimmed) return "";
        const digits = trimmed.replace(/[^\d+]/g, "");
        if (!digits) return "";
        return digits.startsWith("+") ? digits : `+${digits.replace(/\D/g, "")}`;
      };

      const rawCountryCode = String(profileCountryCodeRaw || "").trim();
      let ccFromProfile = normalizeCountryCode(rawCountryCode);
      // If profile stores ISO country code (e.g. "US"), map it to a calling code (+1).
      if (!ccFromProfile && /^[A-Za-z]{2}$/.test(rawCountryCode)) {
        const iso = rawCountryCode.toUpperCase();
        const c = locationService.getCountryByCode(iso);
        const mapped = normalizeCountryCode(String((c as any)?.callingCode || ""));
        if (mapped) ccFromProfile = mapped;
      }
      const rawPhone = String(profilePhoneRaw || "").trim();

      // If we have an explicit profile country code, prefer it and strip it from the phone field if present.
      let derivedCountryCode = ccFromProfile;
      let derivedPhoneRemainder = rawPhone;
      if (ccFromProfile && rawPhone.startsWith(ccFromProfile)) {
        derivedPhoneRemainder = rawPhone.slice(ccFromProfile.length).trim();
      } else if (!ccFromProfile) {
        // Best-effort parse only when there is a visible separator after the country code (avoids guessing for "+17723211897")
        const m = rawPhone.match(/^\s*(\+\d{1,3})(?=[\s\-\(\.)])\s*(.*)$/);
        if (m) {
          derivedCountryCode = normalizeCountryCode(m[1] || "");
          derivedPhoneRemainder = (m[2] || "").trim();
        }
      }

      setContactCountryCode(derivedCountryCode);
      setContactPhoneNumber(derivedPhoneRemainder.replace(/\D/g, ""));
      setTimezone(userTimezone);
      setActionOpen(true);

      // Will be filled after resolving the linked prayer task (preferred) or tags (fallback)
      setTraditionalDates(null);

      // Keep the shared dialog values in sync for Join Prayer
      setJoinForm((prev) => ({
        ...prev,
        name: String((profile as any)?.full_name || user.email?.split("@")[0] || "User"),
        email: String((profile as any)?.email || user.email || ""),
        phone_country_code: derivedCountryCode,
        phone_number: derivedPhoneRemainder.replace(/\D/g, ""),
        person_needs_help: "",
        start_date: "",
        end_date: "",
        prayer_time: prayerTime,
        timezone: userTimezone,
      }));

      try {
        setResolvingPrayerTask(true);
        const task = await resolvePrayerTaskForPost(post);
        setResolvedPrayerTask(task);

        // Prefer traditional/fixed dates from the linked prayer task (authoritative),
        // fall back to non-technical blog tags when present.
        const fromTask =
          task?.start_date && task?.end_date ? { start_date: String(task.start_date), end_date: String(task.end_date) } : null;
        const nextTraditional = fromTask || parseTraditionalDatesFromTags((post as any).tags);
        setTraditionalDates(nextTraditional);
        setJoinForm((prev) => ({
          ...prev,
          start_date: nextTraditional?.start_date || "",
          end_date: nextTraditional?.end_date || "",
        }));

        if (!task) {
          toast({
            title: "Missing Prayer Task",
            description:
              "This prayer post is not linked to a prayer task yet. Please create a matching prayer task (same name) or provide a mapping key.",
            variant: "destructive",
          });
        }
      } catch (e: any) {
        toast({ title: "Error", description: e?.message || "Failed to load prayer task.", variant: "destructive" });
      } finally {
        setResolvingPrayerTask(false);
      }
    },
    [navigate, profile, resolvePrayerTaskForPost, toast, user, userTimezone]
  );

  const confirmPrayerAction = useCallback(async () => {
    if (!user || !actionPost || !resolvedPrayerTask) return;
    try {
      setSaving(true);

      const start = computeStartDate();
      const duration = resolvedPrayerTask.duration_days || resolvedPrayerTask.number_of_days;
      const end = new Date(start);
      end.setDate(end.getDate() + duration - 1);

      const person = personName.trim() || null;
      if (person) {
        try {
          await ensurePersonSaved(person);
        } catch {
          // best-effort: do not block joining/saving if metadata update fails
        }
      }

      const effectiveEmail = contactEmail.trim() || user.email || "";
      if (!effectiveEmail) {
        toast({ title: "Missing Email", description: "Please enter your email.", variant: "destructive" });
        return;
      }

      const cc = (contactCountryCode || "").trim();
      const ccNormalized = cc ? (cc.startsWith("+") ? cc : `+${cc.replace(/\D/g, "")}`) : "";
      const digitsOnlyPhone = (contactPhoneNumber || "").replace(/\D/g, "");
      if (digitsOnlyPhone && !ccNormalized) {
        toast({
          title: "Missing Country Code",
          description: "Please enter a country code (e.g. +91) to receive SMS/phone call alerts.",
          variant: "destructive",
        });
        return;
      }
      const effectivePhone = digitsOnlyPhone ? `${ccNormalized}${digitsOnlyPhone}`.trim() : null;

      const insertData: any = {
        task_id: resolvedPrayerTask.id,
        user_id: user.id,
        name: (profile as any)?.full_name || user.email?.split("@")[0] || "User",
        email: effectiveEmail,
        phone_number: effectivePhone,
        person_needs_help: person,
        prayer_time: prayerTime,
        timezone,
        start_date: start.toISOString().split("T")[0],
        end_date: end.toISOString().split("T")[0],
        current_day: 1,
        is_active: true,
      };

      const { data: created, error } = await (supabase as any)
        .from("prayer_user_tasks")
        .insert([insertData])
        .select("id")
        .single();
      if (error) throw error;

      toast({
        title: actionMode === "join" ? "Prayer Joined" : "Saved",
        description:
          actionMode === "join"
            ? `You've joined "${actionPost.title}". You'll receive daily reminders.`
            : `Saved "${actionPost.title}". You'll start receiving reminders on ${insertData.start_date}.`,
      });

      // Server-side notifications (email + SMS + call) on start/join. Best-effort.
      if (created?.id) {
        try {
          const { data: notifData, error: notifError } = await supabase.functions.invoke("send-prayer-start-notification", {
            body: { user_task_id: created.id },
          });
          if (notifError) throw notifError;

          // Optional user-facing hint when phone is missing or provider is not configured.
          const smsSent = Boolean((notifData as any)?.sms_sent);
          const callPlaced = Boolean((notifData as any)?.call_placed);
          const smsError = String((notifData as any)?.sms_error || "");
          const callError = String((notifData as any)?.call_error || "");

          if (!effectivePhone) {
            toast({
              title: "Joined (No Phone Alerts)",
              description: "Add your phone number (with country code, e.g. +919988629175) to receive SMS/phone call alerts.",
            });
          } else if (!smsSent && !callPlaced) {
            toast({
              title: "Joined (Alerts Not Sent)",
              description:
                smsError ||
                callError ||
                "Your prayer was joined, but SMS/call could not be sent. Check Twilio setup (AUTH_TOKEN, From number, trial verified number).",
            });
          } else {
            toast({
              title: "Alert Sent",
              description: `We sent a notification to ${effectivePhone}.`,
            });
          }
        } catch (e) {
          console.warn("[Blog] send-prayer-start-notification failed:", e);
          if (!effectivePhone) {
            toast({
              title: "Joined (No Phone Alerts)",
              description: "Add your phone number (with country code, e.g. +919988629175) to receive SMS/phone call alerts.",
            });
          } else {
            toast({
              title: "Joined (Alerts Failed)",
              description: "Your prayer was joined, but sending SMS/call failed. Please try again later or contact support.",
            });
          }
        }
      }

      setActionOpen(false);

      // Update local joined set immediately so cards reflect "Joined" without reload
      setJoinedTaskIds((prev) => {
        const next = new Set(prev);
        next.add(resolvedPrayerTask.id);
        return next;
      });
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to save prayer.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [
    actionMode,
    actionPost,
    computeStartDate,
    contactEmail,
    contactCountryCode,
    contactPhoneNumber,
    ensurePersonSaved,
    personName,
    prayerTime,
    profile,
    resolvedPrayerTask,
    timezone,
    toast,
    user,
  ]);

  const confirmJoinPrayerFromDialog = useCallback(async () => {
    if (!user || !actionPost || !resolvedPrayerTask) return;
    try {
      setSaving(true);

      const duration = resolvedPrayerTask.duration_days || resolvedPrayerTask.number_of_days;

      const effectiveName = joinForm.name.trim() || (profile as any)?.full_name || user.email?.split("@")[0] || "User";
      const effectiveEmail = joinForm.email.trim() || user.email || "";
      if (!effectiveEmail) {
        toast({ title: "Missing Email", description: "Please enter your email.", variant: "destructive" });
        return;
      }

      const cc = (joinForm.phone_country_code || "").trim();
      const ccNormalized = cc ? (cc.startsWith("+") ? cc : `+${cc.replace(/\D/g, "")}`) : "";
      const digitsOnlyPhone = (joinForm.phone_number || "").replace(/\D/g, "");
      const timesPerDay = Math.max(1, Math.floor(Number((joinForm as any).times_per_day || 1)));
      if (!digitsOnlyPhone) {
        toast({
          title: "Missing Phone Number",
          description: "Please enter your phone number to receive reminders.",
          variant: "destructive",
        });
        return;
      }
      if (!ccNormalized) {
        toast({
          title: "Missing Country Code",
          description: "Please enter a country code (e.g. +91) to receive SMS/phone call alerts.",
          variant: "destructive",
        });
        return;
      }
      const effectivePhone = `${ccNormalized}${digitsOnlyPhone}`.trim();
      if (!Number.isFinite(timesPerDay) || timesPerDay < 1) {
        toast({
          title: "Invalid Prayer Frequency",
          description: "Please set prayer frequency to at least 1 time per day.",
          variant: "destructive",
        });
        return;
      }
      const prayerTime = String((joinForm as any).prayer_time || "").trim();
      const tz = String((joinForm as any).timezone || userTimezone || "").trim();
      if (!prayerTime) {
        toast({ title: "Missing Time", description: "Please select a daily prayer time.", variant: "destructive" });
        return;
      }
      if (!tz) {
        toast({ title: "Missing Timezone", description: "Please select your timezone.", variant: "destructive" });
        return;
      }

      let startDateYmd: string;
      let endDateYmd: string;
      const customStart = (joinForm.start_date || "").trim();
      const customEnd = String(joinForm.end_date || "").trim();

      if (customStart) {
        startDateYmd = customStart;
      } else if (traditionalDates?.start_date) {
        startDateYmd = traditionalDates.start_date;
      } else {
        const start = computeStartDate(); // default: join starts today
        startDateYmd = start.toISOString().split("T")[0];
      }

      if (customEnd) {
        endDateYmd = customEnd;
      } else if (!customStart && traditionalDates?.end_date) {
        // If no custom date override was provided, honor the traditional end date when available.
        endDateYmd = traditionalDates.end_date;
      } else {
        // If user only picked a start date (or no traditional range exists), compute end from duration.
        endDateYmd = addDaysToYmd(startDateYmd, Math.max(1, duration) - 1);
      }

      const person = joinForm.person_needs_help.trim() || null;
      if (person) {
        try {
          await ensurePersonSaved(person);
        } catch {
          // best-effort
        }
      }

      const insertData: any = {
        task_id: resolvedPrayerTask.id,
        user_id: user.id,
        name: effectiveName,
        email: effectiveEmail,
        phone_number: effectivePhone,
        times_per_day: timesPerDay,
        person_needs_help: person,
        prayer_time: prayerTime,
        timezone: tz,
        start_date: startDateYmd,
        end_date: endDateYmd,
        current_day: 1,
        is_active: true,
      };

      const { data: created, error } = await (supabase as any)
        .from("prayer_user_tasks")
        .insert([insertData])
        .select("id")
        .single();
      if (error) throw error;

      toast({
        title: "Prayer Joined",
        description: `You've joined \"${actionPost.title}\". You'll receive daily reminders.`,
      });

      // Server-side notifications (email + SMS + call). Best-effort.
      if (created?.id) {
        try {
          const { data: notifData, error: notifError } = await supabase.functions.invoke("send-prayer-start-notification", {
            body: { user_task_id: created.id },
          });
          if (notifError) throw notifError;

          const smsSent = Boolean((notifData as any)?.sms_sent);
          const callPlaced = Boolean((notifData as any)?.call_placed);
          const smsError = String((notifData as any)?.sms_error || "");
          const callError = String((notifData as any)?.call_error || "");

          if (!effectivePhone) {
            toast({
              title: "Joined (No Phone Alerts)",
              description: "Add your phone number (with country code, e.g. +919988629175) to receive SMS/phone call alerts.",
            });
          } else if (!smsSent && !callPlaced) {
            toast({
              title: "Joined (Alerts Not Sent)",
              description:
                smsError ||
                callError ||
                "Your prayer was joined, but SMS/call could not be sent. Check Twilio setup (AUTH_TOKEN, From number, trial verified number).",
            });
          } else {
            toast({
              title: "Alert Sent",
              description: `We sent a notification to ${effectivePhone}.`,
            });
          }
        } catch (e) {
          console.warn("[Blog] send-prayer-start-notification failed:", e);
        }
      }

      setActionOpen(false);
      setJoinedTaskIds((prev) => {
        const next = new Set(prev);
        next.add(resolvedPrayerTask.id);
        return next;
      });
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to join prayer.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [actionPost, addDaysToYmd, ensurePersonSaved, joinForm, profile, resolvedPrayerTask, toast, user]);

  // Loader
  if (initializing || loading) {
    return (
      <div className="min-h-screen pink-yellow-shadow flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pink-yellow-shadow pt-20">
      {/* Header with side images */}
      <div className="animate-slide-up bg-black/20 px-6 py-10 text-center md:py-12 lg:py-24">
        <div className="flex grid-cols-1 flex-wrap items-center justify-center gap-8 md:grid-cols-2 lg:grid-cols-3 lg:flex-nowrap">
          <div className="imgLeft01 max-w-40">
            <Link
              to="https://www.miracolieucaristici.org/en/Liste/scheda_c.html?nat=argentina&wh=buenosaires&ct=Buenos%20Aires,%201992-1994-1996"
              target="_blank"
              className="inline-block bg-white p-1"
            >
              <img src={Left01} alt="Left 01" />
            </Link>
          </div>

          <div className="mx-auto w-full max-w-7xl">
            <h1 className="mb-6 font-inter font-bold uppercase text-white text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
              Catholic <span className="text-[var(--yellowcolor)]">Faith &amp; Prayer</span>
            </h1>
            <p className="max-w-2xl mx-auto font-inter text-lg md:text-[20px] font-normal text-white mb-6">
              Daily prayers, spiritual guidance, and charitable mission updates from Peaceful Investment
            </p>
            <div className="flex justify-center gap-4 flex-wrap">
               

              <Link
                  to='/prayer-tasks'
                  className='bg-gradient-pink-to-yellow rounded-[12px] p-[2px]'
                >
                  <Button
                    variant='ghost'
                    className='hover:bg-gradient-pink-to-yellow h-[40px] rounded-[10px] border-0 bg-black p-0 px-5 font-inter text-xs font-semibold uppercase text-white hover:text-white'
                  >
                    Prayer Tasks
                  </Button>
                </Link>

<span className='bg-gradient-pink-to-yellow rounded-[12px] p-[2px]'>
               <Button
                onClick={openRequestModal}
                className="hover:bg-gradient-pink-to-yellow h-[40px] rounded-[10px] border-0 bg-black p-0 px-5 font-inter text-xs font-semibold uppercase text-white hover:text-white flex items-center gap-2"
              >
                <Heart className="h-5 w-5" />
                Request a Blog / Prayer
              </Button></span>
            </div>
          </div>

          <div className="imgRight01 max-w-40">
            <Link
              to="https://www.miracolieucaristici.org/en/Liste/scheda.html?nat=india&wh=chirattakonam&ct=Chirattakonam,%202001"
              target="_blank"
              className="inline-block bg-white p-1"
            >
              <img src={Right01} alt="Right 01" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main content with side images */}
      <div className="px-6 py-10 md:py-12 xl:py-20">
        <div className="flex grid-cols-1 flex-wrap justify-center gap-8 md:grid-cols-2 lg:grid-cols-3 lg:flex-nowrap">
          {/* Left column image */}
          <div className="imgLeft01 max-w-40">
            <Link
              to="https://www.miracolieucaristici.org/en/Liste/scheda_c.html?nat=polonia&wh=sokolka&ct=Sok%C3%B3%C5%82ka%202008"
              target="_blank"
              className="inline-block bg-white p-1 mb-4"
            >
              <img src={Left02} alt="Left 02" />
            </Link>
          </div>

          {/* Center content (folders + leaf posts) */}
          <div className="mx-auto w-full max-w-7xl">
            {/* Navigation */}
            <div className="flex flex-col gap-3 mb-8 md:mb-12 items-center">
              {/* PARENT CATEGORIES */}
              <div className="flex flex-wrap gap-3 justify-center">
                {parents.map((parent) => {
                  const hasChildren = (childrenMap.get(parent.id) ?? []).length > 0;
                  const isActive = selectedCategory === parent.slug;

                  return (
                    <Badge
                      key={parent.id}
                      onClick={() => {
                        setSelectedCategory(parent.slug);
                        toggleOpenParent(parent.id);
                      }}
                      style={{
                        backgroundColor: isActive ? parent.color : "transparent",
                        borderColor: parent.color,
                        color: isActive ? "white" : parent.color,
                      }}
                      className="cursor-pointer px-4 py-2"
                    >
                      {parent.name}
                      {hasChildren && <span className="ml-2">▾</span>}
                    </Badge>
                  );
                })}
              </div>

              {/* SUBCATEGORIES (ONLY FOR OPEN PARENT) */}
              {openParentId && (childrenMap.get(openParentId) ?? []).length > 0 && (
                <div className="w-full mt-3 flex flex-col items-center gap-3">
                  {subcategoryPathIds.map((parentId, levelIdx) => {
                    const children = getSortedChildren(parentId);
                    if (!children.length) return null;
                    const activeChildId = subcategoryPathIds[levelIdx + 1] ?? null;

                    return (
                      <div key={parentId} className="flex flex-wrap gap-2 justify-center">
                        {children.map((node) => {
                          const hasChildren = (childrenMap.get(node.id) ?? []).length > 0;
                          const isActive =
                            (activeChildId && node.id === activeChildId) ||
                            (!activeChildId && selectedCategory === node.slug);

                          return (
                            <Badge
                              key={node.id}
                              onClick={() => setSelectedCategory(node.slug)}
                              style={{
                                backgroundColor: isActive ? node.color : "transparent",
                                borderColor: node.color,
                                color: isActive ? "white" : node.color,
                              }}
                              className="cursor-pointer px-3 py-1 text-sm"
                            >
                              {node.name}
                              {hasChildren && <span className="ml-2 opacity-80">▾</span>}
                            </Badge>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 justify-center">
                {categoryStack.length > 0 && (
                  <Button variant="outline" className="border-white text-white bg-transparent hover:bg-white/10" onClick={goBack}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                )}
                {prevSiblingId && (
                  <Button variant="outline" className="border-white text-white bg-transparent hover:bg-white/10" onClick={() => goToSibling(prevSiblingId)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                )}
                {nextSiblingId && (
                  <Button variant="outline" className="border-white text-white bg-transparent hover:bg-white/10" onClick={() => goToSibling(nextSiblingId)}>
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>

            {/* Category images/cards are intentionally hidden (categories are shown above as badges) */}

            {/* Blogs / prayers (only after a category/subcategory is selected) */}
            {selectedCategory !== "all" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredVisiblePosts.map((post) => (
                    (() => {
                      const mappedId =
                        parsePrayerTaskIdFromTags((post as any).tags) ||
                        taskIdByBlogPostId.get(String(post.id)) ||
                        null;
                      const joined = mappedId ? joinedTaskIds.has(mappedId) : false;
                      const hasPrayerTask = Boolean(mappedId);
                      return (
                    <BlogPostCard
                      key={post.id}
                      post={post}
                      joined={joined}
                      hasPrayerTask={hasPrayerTask}
                      onJoin={(p) => void openPrayerAction("join", p)}
                      onSave={(p) => void openPrayerAction("save", p)}
                      onDescription={openDescription}
                    />
                      );
                    })()
                  ))}
                </div>

                {visibleCount < filteredPosts.length && (
                  <div className="flex justify-center mt-10">
                    <Button
                      variant="outline"
                      className="border-white text-white bg-transparent hover:bg-white/10"
                      onClick={() => setVisibleCount((c) => Math.min(c + POSTS_PER_BATCH, filteredPosts.length))}
                    >
                      Load More
                    </Button>
                  </div>
                )}

                {filteredPosts.length === 0 && (
                  <div className="text-center py-16">
                    <h3 className="text-2xl font-semibold text-white mb-3">No prayers found</h3>
                    <p className="text-muted-foreground">No items are available in this category yet.</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right column image */}
          <div className="imgRight01 max-w-40">
            <Link
              to="https://www.miracolieucaristici.org/en/Liste/scheda_c.html?nat=polonia&wh=sokolka&ct=Sok%C3%B3%C5%82ka%202008"
              target="_blank"
              className="inline-block bg-white p-1 mb-4"
            >
              <img src={Right02} alt="Right 02" />
            </Link>
          </div>
        </div>
      </div>

      <Footer />

      {/* Blog / Prayer request popup */}
      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Request a Blog / Prayer</DialogTitle>
            <DialogDescription>
              Submit a request for review. This will not be published automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Request Type *</Label>
              <Select value={requestType} onValueChange={(v: any) => setRequestType(v)}>
                <SelectTrigger className="mt-1 rounded-[8px] border-muted-foreground/60 hover:border-muted-foreground shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent h-[40px]" style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}>
                  <SelectValue placeholder="Select Blog or Prayer" />
                </SelectTrigger>
                <SelectContent className="border-secondary-foreground bg-black/90 text-white">
                  <SelectItem value="blog">Blog</SelectItem>
                  <SelectItem value="prayer">Prayer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Title *</Label>
              <Input
                value={requestTitle}
                onChange={(e) => setRequestTitle(e.target.value)}
                placeholder="Enter a title"
                className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none"
                style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
              />
            </div>

            <div>
              <Label>Content / Description *</Label>
              <Textarea
                value={requestContent}
                onChange={(e) => setRequestContent(e.target.value)}
                placeholder="Write your request here..."
                className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none min-h-[140px]"
                style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Name *</Label>
                <Input
                  value={requestName}
                  onChange={(e) => setRequestName(e.target.value)}
                  placeholder="Your name"
                  className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={requestEmail}
                  onChange={(e) => setRequestEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-[8px] border-0 hover:bg-muted/10" onClick={() => setRequestOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-[8px] border-0 hover:bg-primary/80" disabled={requestSubmitting} onClick={submitRequest}>
              {requestSubmitting ? "Sending..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Prayer action popup (Join / Save reminder) */}
      <StartPrayerDialog
        open={actionOpen && actionMode === "join"}
        onOpenChange={setActionOpen}
        title="Join Prayer"
        description={
          <>
            {actionPost?.title}
            <span className="block text-xs text-muted-foreground mt-1">
              Your email and phone details are auto-filled from your profile. You can edit them if needed.
            </span>
            {!resolvedPrayerTask && (
              <span className="block text-xs text-muted-foreground mt-2">
                {resolvingPrayerTask
                  ? "Loading prayer task…"
                  : "No prayer task is linked to this post yet. Please ask an admin to map it, or request one."}
              </span>
            )}
          </>
        }
        submitting={saving || resolvingPrayerTask}
        submitDisabled={
          !resolvedPrayerTask ||
          resolvingPrayerTask ||
          !String(joinForm.phone_number || "").replace(/\D/g, "") ||
          !String(joinForm.phone_country_code || "").replace(/[^\d+]/g, "").trim()
        }
        submitLabel="Join Prayer"
        showStartDatePicker={false}
        traditionalDates={traditionalDates || undefined}
        form={joinForm}
        setForm={setJoinForm}
        timezoneOptions={commonTimezones}
        onSubmit={confirmJoinPrayerFromDialog}
      />

      <Dialog open={actionOpen && actionMode === "save"} onOpenChange={setActionOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{actionMode === "join" ? "Join Prayer" : "Save with Reminder"}</DialogTitle>
            <DialogDescription>
              {actionPost?.title}
              <span className="block text-xs text-muted-foreground mt-1">
                Your email and phone details are auto-filled from your profile. You can edit them if needed.
              </span>
            </DialogDescription>
          </DialogHeader>

          {!resolvedPrayerTask ? (
            <div className="text-sm text-muted-foreground">
              {actionPost
                ? resolvingPrayerTask
                  ? "Loading prayer task…"
                  : "No prayer task is linked to this post yet. Please ask an admin to map it, or request one."
                : "Select a prayer first."}
              {!resolvingPrayerTask && actionPost && (
                <div className="mt-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-[8px] border-0 hover:bg-muted/10"
                    onClick={() => navigate("/prayer-tasks")}
                  >
                    Request a Prayer Task
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Your Email *</Label>
                  <Input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none"
                    style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
                  />
                </div>
                <div>
                  <Label>Phone Number</Label>
                  <div className="mt-1 flex gap-2">
                    <Input
                      type="tel"
                      value={contactCountryCode}
                      onChange={(e) => setContactCountryCode(e.target.value.replace(/[^\d+]/g, ""))}
                      placeholder="+Code"
                      className="w-[88px] rounded-[8px] shadow-none border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none"
                      style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
                    />
                    <Input
                      type="tel"
                      value={contactPhoneNumber}
                      onChange={(e) => setContactPhoneNumber(e.target.value.replace(/\D/g, ""))}
                      placeholder="Enter phone number"
                      className="flex-1 rounded-[8px] shadow-none border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none"
                      style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label>Person Who Needs Help (optional)</Label>
                <Select value={personName || "__custom__"} onValueChange={(v) => setPersonName(v === "__custom__" ? "" : v)}>
                  <SelectTrigger className="rounded-[8px] border-muted-foreground/60 hover:border-muted-foreground shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400 h-[40px]">
                    <SelectValue placeholder="Select a person (optional)" />
                  </SelectTrigger>
                  <SelectContent className="border-secondary-foreground bg-black/90 text-white">
                    <SelectItem value="__custom__">Add / Type a new name</SelectItem>
                    {personOptions.map((p: string) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className="mt-2 rounded-[8px] shadow-none border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
                  placeholder="Type a name (saved to your account)"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                />
              </div>

              {actionMode === "save" && (
                <div className="space-y-3">
                  <Label>When should reminders start?</Label>
                  <Select value={reminderType} onValueChange={(v: any) => setReminderType(v)}>
                    <SelectTrigger className="rounded-[8px] border-muted-foreground/60 hover:border-muted-foreground shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400 h-[40px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-secondary-foreground bg-black/90 text-white">
                      <SelectItem value="days">After a number of days</SelectItem>
                      <SelectItem value="weeks">After a number of weeks</SelectItem>
                      <SelectItem value="date">On a specific date</SelectItem>
                    </SelectContent>
                  </Select>
                  {reminderStartPreview && (
                    <p className="text-xs text-muted-foreground">Starts on: {reminderStartPreview}</p>
                  )}

                  {reminderType === "date" && (
                    <div>
                      <Label>Start date</Label>
                      <Input type="date" value={reminderDate} onChange={(e) => setReminderDate(e.target.value)} />
                    </div>
                  )}
                  {reminderType === "days" && (
                    <div>
                      <Label>Number of days</Label>
                      <Input type="number" min={0} value={reminderDays} onChange={(e) => setReminderDays(Number(e.target.value) || 0)} />
                    </div>
                  )}
                  {reminderType === "weeks" && (
                    <div>
                      <Label>Number of weeks</Label>
                      <Input type="number" min={0} value={reminderWeeks} onChange={(e) => setReminderWeeks(Number(e.target.value) || 0)} />
                    </div>
                  )}
                </div>
              )}

              <div>
                <Label>Reminder Time (daily)</Label>
                <Input type="time" value={prayerTime} onChange={(e) => setPrayerTime(e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">You’ll receive reminders at this time daily</p>
              </div>

              <div>
                <Label>Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="rounded-[8px] border-muted-foreground/60 hover:border-muted-foreground shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400 h-[40px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-secondary-foreground bg-black/90 text-white">
                    {commonTimezones.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" className="rounded-[8px] border-0 hover:bg-muted/10" onClick={() => setActionOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-[8px] border-0 hover:bg-primary/80" disabled={saving || !resolvedPrayerTask} onClick={confirmPrayerAction}>
              {actionMode === "join" ? "Join Prayer" : "Save Reminder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Prayer description popup (only shown on explicit click) */}
      <Dialog open={descriptionOpen} onOpenChange={setDescriptionOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Prayer Description</DialogTitle>
            <DialogDescription>{descriptionPost?.title}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-auto text-sm text-white/90 leading-relaxed">
            {descriptionPost?.content ? (
              <div dangerouslySetInnerHTML={{ __html: descriptionPost.content }} />
            ) : (
              <p className="text-muted-foreground">No description available.</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-[8px] border-0 hover:bg-muted/10"
              onClick={() => setDescriptionOpen(false)}
              type="button"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const BlogPostCard = memo(function BlogPostCard({
  post,
  joined,
  hasPrayerTask,
  onJoin,
  onSave,
  onDescription,
}: {
  post: BlogPost;
  joined: boolean;
  hasPrayerTask: boolean;
  onJoin: (post: BlogPost) => void;
  onSave: (post: BlogPost) => void;
  onDescription: (post: BlogPost) => void;
}) {
  const safeTags = Array.isArray((post as any).tags) ? ((post as any).tags as string[]) : [];
  const displayTags = safeTags
    .map((t) => String(t || "").trim())
    .filter(Boolean)
    .filter((t) => !/^prayer_task:/i.test(t))
    .filter((t) => !/^extra_left:/i.test(t))
    .filter((t) => !/^extra_right:/i.test(t));

  return (
    <Card className="group hover:scale-105 hover:glow-primary transition-all duration-300 cursor-pointer border-0 shadow-none bg-gradient-pink-to-yellow rounded-sm p-[2px]">
      <div className="bg-black rounded-sm p-0 h-full">
        <Link to={`/blog/${post.slug}`}>
          {post.featured_image && (
            <img
              src={post.featured_image}
              alt={post.title}
              loading="lazy"
              decoding="async"
              className="w-full h-40 object-cover rounded-t-sm mb-2"
            />
          )}

          <CardHeader className="p-4 pb-0 space-y-0">
            <h3 className="text-lg font-inter font-semibold text-white line-clamp-2 pb-2">{post.title}</h3>

            {!joined && post.excerpt && (
              <p className="text-white font-open-sans font-normal text-sm line-clamp-3 mt-2" dangerouslySetInnerHTML={{ __html: post.excerpt }}></p>
            )}
          </CardHeader>

          <CardContent className="p-4 pt-0">
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-4">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(post.published_at || post.created_at).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {Math.ceil(post.content.length / 200)} min read
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3 text-xs text-white/70">
              <Eye className="w-3 h-3" />
              {post.view_count}
            </div>

            {!joined && displayTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-4">
                {displayTags.slice(0, 1).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs text-white bg-transparent">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Link>

        {/* Two required buttons in the card footer area (do not navigate to post) */}
        <div className="p-4 pt-0">
          <div className={`grid ${hasPrayerTask ? "grid-cols-3" : "grid-cols-2"} gap-2`}>
            {hasPrayerTask && (
              <Button
                className="flex-1 rounded-[8px] border-0 hover:bg-primary/80 bg-primary gap-0"
                disabled={joined}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onJoin(post);
                }}
              >
                <Heart className="h-4 w-4 mr-1" />
                {joined ? "Joined" : "Join Prayer"}
              </Button>
            )}
            <Button
              variant="outline"
              className="flex-1 rounded-[8px] border-white/30 text-white bg-transparent hover:bg-white/10"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSave(post);
              }}
            >
              Save
            </Button>
            <Button
              variant="outline"
              className="flex-1 rounded-[8px] border-white/30 text-white bg-transparent hover:bg-white/10"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDescription(post);
              }}
            >
              Description
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
});

export default Blog;
