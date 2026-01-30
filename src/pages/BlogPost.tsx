import { useMemo, useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, Eye, Tag, Share2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import {
  useBlog,
  type BlogPost as BlogPostType,
  type BlogCategory,
} from "@/hooks/useBlog";
import Footer from "@/components/Footer";
import { boxShadow } from "html2canvas/dist/types/css/property-descriptors/box-shadow";
import {
  StartPrayerDialog,
  type StartPrayerDialogForm,
  type TraditionalDateRange,
} from "@/components/prayer/StartPrayerDialog";
import { locationService } from "@/services/location/LocationService";

type PrayerTaskLite = {
  id: string;
  number_of_days?: number | null;
  duration_days?: number | null;
  schedule_mode?: "FIXED" | "DAILY_UNLIMITED";
  start_date?: string | null;
  end_date?: string | null;
};

type PrayerUserTaskLite = {
  id: string;
  task_id: string;
  user_id: string | null;
  email: string;
  phone_number: string | null;
  person_needs_help: string | null;
  prayer_time: string;
  timezone: string;
  start_date: string;
  end_date: string | null;
  current_day: number;
  is_active: boolean;
  schedule_mode?: "FIXED" | "DAILY_UNLIMITED";
  completed_days?: number[];
  task?: PrayerTaskLite;
};

function extractPrayerTaskIdFromTags(tags: unknown): string | null {
  if (!Array.isArray(tags)) return null;
  for (const t of tags) {
    if (typeof t !== "string") continue;
    const m = t.trim().match(/^prayer_task:(?<id>[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
    if (m?.groups?.id) return m.groups.id;
  }
  return null;
}

function stripPrayerTaskTags(tags: string[]) {
  return tags.filter((t) => {
    const s = String(t || "").trim();
    if (/^prayer_task:[0-9a-f-]{36}$/i.test(s)) return false;
    if (/^extra_left:/i.test(s)) return false;
    if (/^extra_right:/i.test(s)) return false;
    return true;
  });
}

function parseTraditionalDatesFromTags(tags: unknown): TraditionalDateRange | null {
  if (!Array.isArray(tags)) return null;
  let start: string | null = null;
  let end: string | null = null;
  let label: string | undefined;

  for (const raw of tags) {
    const t = String(raw || "").trim();
    if (!t) continue;

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

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { getPostBySlug, incrementViewCount, categories } = useBlog();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();

  const [post, setPost] = useState<BlogPostType | null>(null);
  const [loading, setLoading] = useState(true);
  const [userTask, setUserTask] = useState<PrayerUserTaskLite | null>(null);
  const [joining, setJoining] = useState(false);
  const [completing, setCompleting] = useState(false);

  const [mappedPrayerTaskId, setMappedPrayerTaskId] = useState<string | null>(null);

  // Backward compatible prayer-task resolution:
  // 1) Prefer legacy mapping tag: prayer_task:<uuid>
  // 2) Fallback to the newer relationship: prayer_tasks.blog_post_id = blog_posts.id
  useEffect(() => {
    if (!post) {
      setMappedPrayerTaskId(null);
      return;
    }

    const fromTags = extractPrayerTaskIdFromTags((post as any)?.tags);
    if (fromTags) {
      setMappedPrayerTaskId(fromTags);
      return;
    }

    let cancelled = false;
    const resolve = async () => {
      try {
        const { data } = await (supabase as any)
          .from("prayer_tasks")
          .select("id")
          .eq("blog_post_id", post.id)
          .maybeSingle();
        if (!cancelled) setMappedPrayerTaskId(data?.id ? String(data.id) : null);
      } catch {
        if (!cancelled) setMappedPrayerTaskId(null);
      }
    };
    void resolve();
    return () => {
      cancelled = true;
    };
  }, [post]);

  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [joinForm, setJoinForm] = useState<StartPrayerDialogForm>(() => ({
    name: "",
    email: "",
    phone_country_code: "",
    phone_number: "",
    times_per_day: 1,
    person_needs_help: "",
    start_date: "",
    end_date: undefined,
    schedule_mode: undefined,
    duration_days: undefined,
    prayer_time: "07:00",
    timezone: userTimezone,
  }));
  const [traditionalDates, setTraditionalDates] = useState<TraditionalDateRange | undefined>(undefined);
  const [resolvedPrayerTask, setResolvedPrayerTask] = useState<PrayerTaskLite | null>(null);
  const [resolvingPrayerTask, setResolvingPrayerTask] = useState(false);

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

  const addDaysToYmd = useCallback((yyyyMmDd: string, daysToAdd: number): string => {
    const m = String(yyyyMmDd || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return yyyyMmDd;
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const dt = new Date(Date.UTC(y, mo, d + Math.max(0, daysToAdd)));
    return dt.toISOString().slice(0, 10);
  }, []);

  const getCurrentDay = useCallback(
    (ut: PrayerUserTaskLite): number => {
      /**
       * IMPORTANT:
       * The backend `can_complete_prayer_day()` computes "today" using the prayer's stored timezone.
       * We mirror that here so the UI and backend stay consistent.
       */
      const MS_DAY = 24 * 60 * 60 * 1000;

      const parseDateToUtcMs = (dateStr: string | null | undefined): number | null => {
        const s = String(dateStr || "").trim();
        const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!m) return null;
        const y = Number(m[1]);
        const mo = Number(m[2]) - 1;
        const d = Number(m[3]);
        if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
        return Date.UTC(y, mo, d);
      };

      const startMs = parseDateToUtcMs(ut.start_date);
      const endMs = parseDateToUtcMs(ut.end_date);
      if (startMs === null) return 0;

      const now = new Date();
      const tz = (ut as any)?.timezone || "UTC";
      const getTodayInTzUtcMs = (timeZone: string): number => {
        try {
          const parts = new Intl.DateTimeFormat("en-US", {
            timeZone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).formatToParts(now);
          const y = Number(parts.find((p) => p.type === "year")?.value);
          const mo = Number(parts.find((p) => p.type === "month")?.value) - 1;
          const d = Number(parts.find((p) => p.type === "day")?.value);
          if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) throw new Error("bad date parts");
          return Date.UTC(y, mo, d);
        } catch {
          return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
        }
      };
      const todayTzMs = getTodayInTzUtcMs(tz);

      const totalDays = endMs === null ? Number.POSITIVE_INFINITY : (Math.floor((endMs - startMs) / MS_DAY) + 1);
      const day = Math.floor((todayTzMs - startMs) / MS_DAY) + 1;

      if (day < 1) return 0; // Not started yet
      if (Number.isFinite(totalDays) && day > totalDays) return totalDays as number; // Completed (fixed prayers)
      return day;
    },
    []
  );

  const isUnlimitedDaily = useCallback((ut: PrayerUserTaskLite | null): boolean => {
    if (!ut) return false;
    return (
      String((ut as any)?.schedule_mode || "") === "DAILY_UNLIMITED" ||
      (ut as any)?.end_date == null ||
      String((ut as any)?.task?.schedule_mode || "") === "DAILY_UNLIMITED"
    );
  }, []);

  const getDurationForUserTask = useCallback((ut: PrayerUserTaskLite | null): number | null => {
    if (!ut) return null;
    if (isUnlimitedDaily(ut)) return null;
    const s = String(ut.start_date || "").trim();
    const e = String(ut.end_date || "").trim();
    const ms = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const me = e.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ms && me) {
      const sy = Number(ms[1]);
      const smo = Number(ms[2]) - 1;
      const sd = Number(ms[3]);
      const ey = Number(me[1]);
      const emo = Number(me[2]) - 1;
      const ed = Number(me[3]);
      if ([sy, smo, sd, ey, emo, ed].every(Number.isFinite)) {
        const startMs = Date.UTC(sy, smo, sd);
        const endMs = Date.UTC(ey, emo, ed);
        const MS_DAY = 24 * 60 * 60 * 1000;
        const diff = Math.floor((endMs - startMs) / MS_DAY) + 1;
        if (Number.isFinite(diff) && diff >= 1) return diff;
      }
    }
    const fallback = Number((ut as any)?.task?.duration_days || (ut as any)?.task?.number_of_days || 1);
    return Number.isFinite(fallback) && fallback >= 1 ? Math.floor(fallback) : 1;
  }, [isUnlimitedDaily]);

  const canCompleteToday = useMemo(() => {
    if (!userTask) return false;
    const currentDay = getCurrentDay(userTask);
    const duration = getDurationForUserTask(userTask);
    if (currentDay < 1 || (duration !== null && currentDay > duration)) return false;
    return !((userTask.completed_days || []).includes(currentDay));
  }, [getCurrentDay, getDurationForUserTask, userTask]);

  const fetchPost = useCallback(async () => {
    if (!slug) return;

    setLoading(true);
    const postData = await getPostBySlug(slug);

    if (postData) {
      setPost(postData);
      // Increment view count
      await incrementViewCount(postData.id);
    } else {
      navigate('/blog');
    }

    setLoading(false);
  }, [slug, navigate]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  // Load user's prayer instance for this blog/prayer (mapped via tag prayer_task:<uuid>)
  const loadUserTask = useCallback(async () => {
    if (!user || !mappedPrayerTaskId) {
      setUserTask(null);
      return;
    }

    try {
      const { data: ut, error } = await (supabase as any)
        .from("prayer_user_tasks")
        .select("*, task:prayer_tasks(id,number_of_days,duration_days)")
        .eq("is_active", true)
        .eq("user_id", user.id)
        .eq("task_id", mappedPrayerTaskId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!ut) {
        setUserTask(null);
        return;
      }

      // Fetch completed days
      const { data: completions } = await (supabase as any)
        .from("prayer_daily_completions")
        .select("day_number")
        .eq("user_task_id", ut.id);

      setUserTask({
        ...(ut as any),
        completed_days: (completions || []).map((c: any) => c.day_number),
      } as PrayerUserTaskLite);
    } catch (e: any) {
      console.warn("[BlogPost] Failed to load prayer progress:", e);
      setUserTask(null);
    }
  }, [mappedPrayerTaskId, user]);

  useEffect(() => {
    void loadUserTask();
  }, [loadUserTask]);

  const openJoinPrayerDialog = useCallback(async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!mappedPrayerTaskId) {
      toast({
        title: "Missing Prayer Task",
        description: "This post is not linked to a prayer task yet (missing prayer_task:<uuid> tag).",
        variant: "destructive",
      });
      return;
    }

    try {
      // Prefill basics
      const nameFromProfile = (profile as any)?.full_name || (profile as any)?.name || "";
      const emailFromProfile = (profile as any)?.email || user.email || "";
      const fallbackName = user.email ? user.email.split("@")[0] : "User";

      const normalizeDialCode = (val: string) => {
        const trimmed = String(val || "").trim();
        if (!trimmed) return "";
        const digits = trimmed.replace(/[^\d+]/g, "");
        if (!digits) return "";
        return digits.startsWith("+") ? digits : `+${digits.replace(/\D/g, "")}`;
      };

      const profileCountryRaw = String((profile as any)?.country_code || (profile as any)?.dial_code || (profile as any)?.dialCode || "").trim();
      let derivedCountryCode = normalizeDialCode(profileCountryRaw);
      if (!derivedCountryCode && /^[A-Za-z]{2}$/.test(profileCountryRaw)) {
        const iso = profileCountryRaw.toUpperCase();
        const c = locationService.getCountryByCode(iso);
        const mapped = normalizeDialCode(String((c as any)?.callingCode || ""));
        if (mapped) derivedCountryCode = mapped;
      }

      const profilePhoneRaw = String((profile as any)?.phone || (profile as any)?.phone_number || "").trim();
      let derivedPhoneRemainder = profilePhoneRaw;
      if (derivedCountryCode && profilePhoneRaw.startsWith(derivedCountryCode)) {
        derivedPhoneRemainder = profilePhoneRaw.slice(derivedCountryCode.length).trim();
      } else if (!derivedCountryCode) {
        const m = profilePhoneRaw.match(/^\s*(\+\d{1,3})(?=[\s\-\(\.)])\s*(.*)$/);
        if (m) {
          derivedCountryCode = normalizeDialCode(m[1] || "");
          derivedPhoneRemainder = (m[2] || "").trim();
        }
      }

      setJoinForm({
        name: String(nameFromProfile || fallbackName),
        email: String(emailFromProfile || ""),
        phone_country_code: derivedCountryCode,
        phone_number: derivedPhoneRemainder.replace(/\D/g, ""),
        times_per_day: 1,
        person_needs_help: "",
        start_date: "",
        end_date: undefined,
        schedule_mode: undefined,
        duration_days: undefined,
        prayer_time: "07:00",
        timezone: userTimezone,
      });

      setTraditionalDates(undefined);
      setResolvedPrayerTask(null);
      setJoinDialogOpen(true);

      // Resolve linked task for suggested dates + duration
      setResolvingPrayerTask(true);
      const { data: task, error: taskError } = await (supabase as any)
        .from("prayer_tasks")
        .select("id,number_of_days,duration_days,schedule_mode,start_date,end_date")
        .eq("id", mappedPrayerTaskId)
        .maybeSingle();
      if (taskError) throw taskError;
      if (!task) throw new Error("Prayer task not found.");
      setResolvedPrayerTask(task as PrayerTaskLite);

      const fromTask =
        (task as any)?.start_date && (task as any)?.end_date
          ? { start_date: String((task as any).start_date), end_date: String((task as any).end_date) }
          : null;
      const nextTraditional = fromTask || parseTraditionalDatesFromTags((post as any)?.tags);
      setTraditionalDates(nextTraditional || undefined);
      if (nextTraditional) {
        setJoinForm((prev) => ({
          ...prev,
          start_date: nextTraditional.start_date,
          end_date: nextTraditional.end_date,
        }));
      }
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to prepare join dialog.", variant: "destructive" });
    } finally {
      setResolvingPrayerTask(false);
    }
  }, [mappedPrayerTaskId, navigate, post, profile, toast, user, userTimezone]);

  const confirmJoinPrayerFromDialog = useCallback(async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!mappedPrayerTaskId || !resolvedPrayerTask) {
      toast({
        title: "Missing Prayer Task",
        description: "This post is not linked to a prayer task yet.",
        variant: "destructive",
      });
      return;
    }

    try {
      setJoining(true);

      // If already joined, just refresh state
      const { data: existing } = await (supabase as any)
        .from("prayer_user_tasks")
        .select("id")
        .eq("is_active", true)
        .eq("user_id", user.id)
        .eq("task_id", mappedPrayerTaskId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        toast({ title: "Already Joined", description: "You already have an active prayer for this post." });
        await loadUserTask();
        setJoinDialogOpen(false);
        return;
      }

      const scheduleMode: "FIXED" | "DAILY_UNLIMITED" =
        String((joinForm as any)?.schedule_mode || (resolvedPrayerTask as any)?.schedule_mode || "").trim() === "DAILY_UNLIMITED"
          ? "DAILY_UNLIMITED"
          : "FIXED";
      const durationFromFormRaw = Number((joinForm as any)?.duration_days);
      const durationFromForm =
        Number.isFinite(durationFromFormRaw) && durationFromFormRaw >= 1 ? Math.floor(durationFromFormRaw) : 0;
      const durationFromTask = Math.max(
        1,
        Math.floor(Number((resolvedPrayerTask as any)?.duration_days || (resolvedPrayerTask as any)?.number_of_days || 1))
      );

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
          description: "Please select a country code (e.g. +91) to receive SMS/phone call alerts.",
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

      const customStart = (joinForm.start_date || "").trim();
      const customEnd = String((joinForm as any).end_date || "").trim();

      let startDateYmd: string;
      let endDateYmd: string | null;

      if (customStart) {
        startDateYmd = customStart;
      } else if (traditionalDates?.start_date) {
        startDateYmd = traditionalDates.start_date;
      } else {
        const today = new Date().toISOString().slice(0, 10);
        startDateYmd = today;
      }

      if (scheduleMode === "DAILY_UNLIMITED") {
        endDateYmd = null;
      } else if (customEnd) {
        endDateYmd = customEnd;
      } else if (!customStart && traditionalDates?.end_date) {
        endDateYmd = traditionalDates.end_date;
      } else {
        const duration = durationFromForm || durationFromTask;
        endDateYmd = addDaysToYmd(startDateYmd, Math.max(1, duration) - 1);
      }

      const insertData: any = {
        task_id: mappedPrayerTaskId,
        user_id: user.id,
        name: effectiveName,
        email: effectiveEmail,
        phone_number: effectivePhone,
        times_per_day: timesPerDay,
        person_needs_help: joinForm.person_needs_help.trim() || null,
        prayer_time: prayerTime,
        timezone: tz,
        start_date: startDateYmd,
        end_date: endDateYmd,
        current_day: 1,
        is_active: true,
        schedule_mode: scheduleMode,
      };

      const { data: created, error } = await (supabase as any)
        .from("prayer_user_tasks")
        .insert([insertData])
        .select("id")
        .single();
      if (error) throw error;

      toast({ title: "Prayer Joined", description: "You’ve joined this prayer. You can now mark days as completed." });

      // Fire server-side notifications (email + SMS + call). Best-effort.
      if (created?.id) {
        try {
          await supabase.functions.invoke("send-prayer-start-notification", {
            body: { user_task_id: created.id },
          });
        } catch (e) {
          console.warn("[BlogPost] send-prayer-start-notification failed:", e);
        }
      }

      setJoinDialogOpen(false);
      await loadUserTask();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to join prayer.", variant: "destructive" });
    } finally {
      setJoining(false);
    }
  }, [addDaysToYmd, joinForm, loadUserTask, mappedPrayerTaskId, navigate, profile, resolvedPrayerTask, toast, traditionalDates, user, userTimezone]);

  const handleCompleteToday = useCallback(async () => {
    if (!userTask) return;
    const dayNumber = getCurrentDay(userTask);
    try {
      setCompleting(true);

      const { data: canComplete, error: checkError } = await supabase.rpc("can_complete_prayer_day" as any, {
        p_user_task_id: userTask.id,
        p_day_number: dayNumber,
      });
      if (checkError) throw checkError;

      if (!canComplete) {
        toast({
          title: "Cannot Complete",
          description: "This day cannot be marked as completed. It may be a future day or already completed.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await (supabase as any)
        .from("prayer_daily_completions")
        .insert([{ user_task_id: userTask.id, day_number: dayNumber }]);
      if (error) throw error;

      const newCurrentDay = Math.max(userTask.current_day || 1, dayNumber + 1);
      await (supabase as any).from("prayer_user_tasks").update({ current_day: newCurrentDay }).eq("id", userTask.id);

      toast({ title: "Day Completed", description: `Day ${dayNumber} has been marked as completed.` });

      // Refresh state (cheap)
      setUserTask((prev) =>
        prev
          ? {
              ...prev,
              current_day: newCurrentDay,
              completed_days: Array.from(new Set([...(prev.completed_days || []), dayNumber])).sort((a, b) => a - b),
            }
          : prev
      );
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to mark day as completed.", variant: "destructive" });
    } finally {
      setCompleting(false);
    }
  }, [getCurrentDay, toast, userTask]);

  // Strip HTML tags from excerpt for sharing (plain text only)
  const stripHtmlTags = (html: string): string => {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const sharePost = async () => {
    if (!post) return;

    const url = window.location.href;
    const message = `${post.title}\n${url}`;

    // 1) Native share (best on mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.excerpt ? stripHtmlTags(post.excerpt) : message,
          url,
        });
        return;
      } catch {
        // fall through to SMS/copy fallback
      }
    }

    // 2) SMS composer fallback (does NOT send automatically; it opens the messaging app)
    try {
      const ua = navigator.userAgent || "";
      const isIOS = /iPad|iPhone|iPod/i.test(ua);
      const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
      if (isMobile) {
        const smsUrl = isIOS ? `sms:&body=${encodeURIComponent(message)}` : `sms:?body=${encodeURIComponent(message)}`;
        window.location.href = smsUrl;
        return;
      }
    } catch {
      // ignore and fall back to copy
    }

    // 3) Copy link fallback (desktop)
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link Copied", description: "Share link copied to clipboard." });
    } catch {
      toast({ title: "Share", description: "Could not open share. Please copy the URL from the address bar." });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pink-yellow-shadow px-6 pt-16 flex items-center justify-center">
        <div className="max-w-7xl mx-auto w-full opacity-20">
          <Skeleton className="h-8 w-32 mb-8" />
          <Skeleton className="h-12 w-full mb-4" />
          <Skeleton className="h-6 w-full mb-8" />
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen pink-yellow-shadow pt-16 flex items-center justify-center">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="mb-6 font-inter font-bold uppercase text-white text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
            Post <span className="text-[var(--yellowcolor)]">not found</span> </h1>
          <Link to="/blog" className="bg-gradient-pink-to-yellow rounded-[12px] p-[2px] inline-block">
            <Button variant="outline" className="bg-gradient-yellow-to-pink hover:bg-gradient-pink-to-yellow flex rounded-[10px] border-0 p-0 px-5 font-inter text-sm font-semibold uppercase text-white hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Blog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const categoryData: { name: string; color: string } =
    categories.find((cat: BlogCategory) => cat.slug === post.category) || {
      name: "General",
      color: "#6B7280",
    };

  const headerLeftText = String((post as any)?.header_left_text || "").trim();
  const headerRightText = String((post as any)?.header_right_text || "").trim();

  const displayTags = stripPrayerTaskTags(post.tags || []);
  const currentDay = userTask ? getCurrentDay(userTask) : 0;
  const totalDays = userTask ? getDurationForUserTask(userTask) : null;

  return (
    <>

      <div className="min-h-screen pink-yellow-shadow pt-16 blog-singlepost">
        <article>

          <div className="px-6 py-10 md:py-12 lg:py-24 bg-black/20">
            <div className="max-w-7xl mx-auto">
              {/* Navigation */}
              {/* <div className="mb-0">
          <Link to="/blog">
            <Button variant="ghost" className="hover:bg-transparent bg-transparent text-white hover:text-muted-foreground p-0">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Blog
            </Button>
          </Link>
        </div> */}

              {/* Header */}
              <header className="mb-0">
                <div className="grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 flex-wrap lg:flex-nowrap flex items-center">
                  <div className="flex flex-wrap items-center gap-0 mb-0 max-w-3xl pr-0 lg:pr-5">

                    <div className="flex flex-wrap items-center gap-2 md:gap-4 text-sm text-muted-foreground pb-5 md:pb-7 w-full">
                      <Badge className="bg-gradient-yellow-to-pink block rounded-[20px] border-0 py-1 px-2 font-inter text-xs font-semibold uppercase text-white">
                        {categoryData.name}
                      </Badge>

                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(post.published_at || post.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {Math.ceil(post.content.length / 200)} min read
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {post.view_count} views
                      </div>
                    </div>

                    <h1 className="pb-5 md:pb-7 font-inter text-2xl font-bold text-white md:text-3xl w-full">
                      {post.title}
                    </h1>

                    {(headerLeftText || headerRightText) && (
                      <div className="w-full flex flex-wrap items-center justify-between gap-3 pb-5 md:pb-7">
                        {headerLeftText ? (
                          <div className="rounded-full bg-white/10 border border-white/10 px-3 py-1 text-xs text-white/90">
                            {headerLeftText}
                          </div>
                        ) : (
                          <span />
                        )}
                        {headerRightText ? (
                          <div className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-white/80 ml-auto">
                            {headerRightText}
                          </div>
                        ) : null}
                      </div>
                    )}

                      {post.excerpt && (
                       <div
                         className="blog-excerpt mx-auto max-w-3xl font-open-sans text-lg text-white pb-7 w-full prose prose-invert prose-headings:text-white prose-p:text-white prose-strong:text-white prose-ul:text-white prose-ol:text-white prose-li:text-white prose-span:text-white prose-em:text-white prose-code:text-white"
                         dangerouslySetInnerHTML={{ 
                           __html: (() => {
                             let html = post.excerpt || '';
                             console.log('Original excerpt HTML:', html);
                            
                             html = html.replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, '');
                             // Process links: ensure protocol, add target/rel if missing
                             // Match: <a ... href="url" ...> or <a href="url" ...>
                             html = html.replace(
                               /<a([^>]*)\bhref\s*=\s*["']([^"']+)["']([^>]*)>/gi,
                               (match, beforeAttrs, url, afterAttrs) => {
                                 console.log('Found link:', { match, beforeAttrs, url, afterAttrs });
                                 
                                 // Fix URLs that incorrectly point to our domain but should be external
                                 // e.g., https://www.peacefulinvestment.com/admin/www.google.com -> https://www.google.com
                                 let fullUrl = url;
                                 const ourDomainPattern = /^https?:\/\/(www\.)?peacefulinvestment\.com\/admin\/(.+)$/i;
                                 const domainMatch = url.match(ourDomainPattern);
                                 
                                 if (domainMatch) {
                                   // Extract the external domain from the path
                                   const externalDomain = domainMatch[2];
                                   fullUrl = 'https://' + externalDomain;
                                   console.log('Fixed incorrect domain redirect in excerpt:', url, '->', fullUrl);
                                 } else if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('mailto:') && !url.startsWith('#') && !url.startsWith('/')) {
                                   // URLs without protocol - add https://
                                   fullUrl = 'https://' + url;
                                   console.log('Added https:// protocol:', fullUrl);
                                 }
                                 
                                 // Check if target/rel already exist
                                 const hasTarget = /target\s*=/i.test(beforeAttrs + afterAttrs);
                                 const hasRel = /rel\s*=/i.test(beforeAttrs + afterAttrs);
                                 
                                 // Build additional attributes
                                 let additionalAttrs = '';
                                 if (!hasTarget && (fullUrl.startsWith('http://') || fullUrl.startsWith('https://'))) {
                                   additionalAttrs += ' target="_blank"';
                                 }
                                 if (!hasRel && (fullUrl.startsWith('http://') || fullUrl.startsWith('https://'))) {
                                   additionalAttrs += ' rel="noopener noreferrer"';
                                 }
                                 
                                 // Reconstruct the link tag with correct href
                                 const newMatch = `<a${beforeAttrs} href="${fullUrl}"${afterAttrs}${additionalAttrs}>`;
                                 console.log('Processed link:', newMatch);
                                 return newMatch;
                               }
                             );
                             
                             console.log('Final processed HTML:', html);
                             return html;
                           })()
                         }}
                       />
                     )}

                    <div className="flex items-center justify-between w-full">
                      <div className="flex flex-wrap gap-2">
                        {displayTags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs font-normal font-open-sans text-white p-1 px-3 bg-transparent">
                            <Tag className="w-3 h-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}



                        <Button
                          onClick={sharePost}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2 ml-0 p-1 px-4 border-0 h-26 bg-primary text-black hover:bg-primary/70 focus:ring-2 focus:ring-offset-2 focus:ring-primary hover:text-white shadow-none"
                          style={{ boxShadow: 'none' }}
                        >
                          <Share2 className="w-4 h-4" />
                          Share
                        </Button>
                      </div>
                    </div>

                    {/* Daily progress + Done (logged-in users only, requires mapping tag prayer_task:<uuid>) */}
                    {user && mappedPrayerTaskId && (
                      <div className="mt-6 w-full max-w-3xl">
                        <div className="rounded-lg border border-muted-foreground/20 bg-white/5 p-4">
                          {userTask ? (
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                              <div>
                                <div className="text-white font-semibold">My Prayer Progress</div>
                                <div className="text-white/70 text-sm">
                                  Day {currentDay}
                                  {totalDays === null ? "" : ` of ${totalDays}`} • Prayer Time: {userTask.prayer_time} ({userTask.timezone})
                                </div>
                                {currentDay < 1 && (
                                  <div className="text-white/60 text-xs mt-1">
                                    Starts on: {userTask.start_date} ({userTask.timezone || "UTC"})
                                  </div>
                                )}
                                {userTask.person_needs_help && (
                                  <div className="text-white/70 text-sm">For: {userTask.person_needs_help}</div>
                                )}
                              </div>
                              {/* <div className="flex gap-2">
                                <Button
                                  className="rounded-[8px] border-0 hover:bg-primary/80"
                                  disabled={!canCompleteToday || completing}
                                  onClick={handleCompleteToday}
                                  title={
                                    currentDay < 1
                                      ? `This prayer starts on ${userTask.start_date} (${userTask.timezone || "UTC"}).`
                                      : undefined
                                  }
                                >
                                  {completing ? "Saving..." : currentDay < 1 ? "Starts Soon" : "Done (Mark Today Complete)"}
                                </Button>
                              </div> */}
                            </div>
                          ) : (
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                              <div className="text-white/70 text-sm">
                                You haven’t joined this prayer yet. Join to track progress and mark days as completed.
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  className="rounded-[8px] border-0 hover:bg-primary/80"
                                  disabled={joining}
                                  onClick={openJoinPrayerDialog}
                                >
                                  {joining ? "Joining..." : "Join Prayer"}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="">
                    {post.featured_image && (
                      <img
                        src={post.featured_image}
                        alt={post.title}
                        className="w-full h-auto object-cover rounded-md mt-0"
                      />
                    )}
                  </div>
                </div>
              </header>
            </div>
          </div>


          {/* Content */}
          <div className="px-6">
            <div className="max-w-7xl mx-auto pt-10">
              <div
                className="prose prose-lg prose-invert max-w-none font-open-sans prose-headings:text-white prose-headings:font-bold prose-h1:text-3xl prose-h1:mb-6 prose-h1:pt-8 prose-h2:text-[22px] prose-h2:font-semibold prose-h2:mb-4 prose-h2:mt-8 prose-h3:text-xl prose-h3:font-semibold prose-h3:mb-3 prose-h3:mt-6 prose-p:text-white prose-p:text-[16px] prose-p:mb-4 prose-p:leading-relaxed prose-strong:text-white prose-strong:font-bold prose-blockquote:text-white prose-blockquote:border-primary prose-blockquote:border-l-4 prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:my-6 prose-ul:text-white prose-ul:list-disc prose-ul:list-inside prose-ul:space-y-2 prose-ul:mb-4 prose-ol:text-white prose-li:text-white prose-a:text-white prose-a:underline hover:prose-a:text-primary prose-code:text-white prose-pre:text-white prose-em:text-white prose-span:text-white"
                dangerouslySetInnerHTML={{ 
                  __html: (() => {
                    let html = post.content || '';
                    console.log('Original content HTML:', html);
                    
                    // Remove empty paragraph tags with just line breaks: <p><br></p>, <p><br/></p>, <p><br /></p>
                    html = html.replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, '');
                    console.log('Removed empty <p><br></p> tags from content');
                    
                    // Process links: ensure protocol, add target/rel if missing
                    html = html.replace(
                      /<a([^>]*)\bhref\s*=\s*["']([^"']+)["']([^>]*)>/gi,
                      (match, beforeAttrs, url, afterAttrs) => {
                        console.log('Found link in content:', { match, beforeAttrs, url, afterAttrs });
                        
                        // Fix URLs that incorrectly point to our domain but should be external
                        // e.g., https://www.peacefulinvestment.com/admin/www.google.com -> https://www.google.com
                        let fullUrl = url;
                        const ourDomainPattern = /^https?:\/\/(www\.)?peacefulinvestment\.com\/admin\/(.+)$/i;
                        const domainMatch = url.match(ourDomainPattern);
                        
                        if (domainMatch) {
                          // Extract the external domain from the path
                          const externalDomain = domainMatch[2];
                          fullUrl = 'https://' + externalDomain;
                          console.log('Fixed incorrect domain redirect in content:', url, '->', fullUrl);
                        } else if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('mailto:') && !url.startsWith('#') && !url.startsWith('/')) {
                          // URLs without protocol - add https://
                          fullUrl = 'https://' + url;
                          console.log('Added https:// protocol to content link:', fullUrl);
                        }
                        
                        // Check if target/rel already exist
                        const hasTarget = /target\s*=/i.test(beforeAttrs + afterAttrs);
                        const hasRel = /rel\s*=/i.test(beforeAttrs + afterAttrs);
                        
                        // Build additional attributes
                        let additionalAttrs = '';
                        if (!hasTarget && (fullUrl.startsWith('http://') || fullUrl.startsWith('https://'))) {
                          additionalAttrs += ' target="_blank"';
                        }
                        if (!hasRel && (fullUrl.startsWith('http://') || fullUrl.startsWith('https://'))) {
                          additionalAttrs += ' rel="noopener noreferrer"';
                        }
                        
                        // Reconstruct the link tag with correct href
                        const newMatch = `<a${beforeAttrs} href="${fullUrl}"${afterAttrs}${additionalAttrs}>`;
                        console.log('Processed content link:', newMatch);
                        return newMatch;
                      }
                    );
                    
                    console.log('Final processed content HTML:', html);
                    return html;
                  })()
                }}
              />
            </div>
          </div>

          {/* Media Gallery */}
          {post.media && post.media.length > 0 && (
            <div className="px-6">
              <div className="max-w-7xl mx-auto pt-10">
                <h2 className="text-2xl font-bold text-white mb-6">Media Gallery</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {post.media.map((media) => (
                    <div key={media.id} className="relative group">
                      {media.media_type === "image" ? (
                        <img
                          src={media.file_url}
                          alt={media.caption || media.filename}
                          className="w-full h-64 object-cover rounded-lg"
                        />
                      ) : media.media_type === "video" ? (
                        <video
                          src={media.file_url}
                          controls
                          className="w-full h-64 object-cover rounded-lg"
                        >
                          Your browser does not support the video tag.
                        </video>
                      ) : (
                        <a
                          href={media.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-8 border border-muted-foreground/20 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-center"
                        >
                          <FileText className="w-12 h-12 mx-auto mb-2 text-primary" />
                          <p className="text-sm text-white font-medium truncate">{media.filename}</p>
                          {media.caption && (
                            <p className="text-xs text-muted-foreground mt-1">{media.caption}</p>
                          )}
                        </a>
                      )}
                      {media.caption && media.media_type !== "document" && (
                        <p className="text-sm text-muted-foreground mt-2">{media.caption}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <footer className="border-0 border-muted-foreground/10 px-5 py-10 md:py-12 xl:py-14">
            <div className="text-center">
              <p className="text-white mb-4">
                Share this prayer with others who might benefit
              </p>
              <div className="flex justify-center gap-4">
                <Link to="/blog" className="bg-gradient-pink-to-yellow rounded-[12px] p-[2px]">
                  <Button variant="outline" className=" hover:bg-gradient-pink-to-yellow block rounded-[10px] border-0 bg-black p-0 px-5 font-inter text-xs font-semibold uppercase text-white hover:text-white">
                    Read More Prayers
                  </Button>
                </Link>
                <span className="bg-gradient-pink-to-yellow rounded-[12px] p-[2px]">
                  <Button onClick={sharePost} className="bg-gradient-yellow-to-pink hover:bg-gradient-pink-to-yellow flex rounded-[10px] border-0 p-0 px-5 font-inter text-xs font-semibold uppercase text-white">
                    <Share2 className="w-4 h-4 mr-1" />
                    Share Prayers
                  </Button></span>
              </div>
            </div>
          </footer>
        </article>
      </div>

      {/* Join Prayer dialog (client-side) */}
      <StartPrayerDialog
        open={joinDialogOpen}
        onOpenChange={setJoinDialogOpen}
        title="Join Prayer"
        description={
          <>
            {post?.title}
            <span className="block text-xs text-muted-foreground mt-1">
              Your email and phone details are auto-filled from your profile. You can edit them if needed.
            </span>
          </>
        }
        submitting={joining || resolvingPrayerTask}
        submitDisabled={
          !resolvedPrayerTask ||
          resolvingPrayerTask ||
          !String(joinForm.phone_number || "").replace(/\D/g, "") ||
          !String(joinForm.phone_country_code || "").replace(/[^\d+]/g, "").trim()
        }
        submitLabel="Join Prayer"
        showStartDatePicker={true}
        traditionalDates={traditionalDates}
        defaultScheduleMode={
          resolvedPrayerTask && String((resolvedPrayerTask as any)?.schedule_mode || "").trim() === "DAILY_UNLIMITED"
            ? "DAILY_UNLIMITED"
            : "FIXED"
        }
        defaultDurationDays={
          resolvedPrayerTask
            ? Number((resolvedPrayerTask as any)?.duration_days ?? (resolvedPrayerTask as any)?.number_of_days ?? null)
            : null
        }
        form={joinForm}
        setForm={setJoinForm}
        timezoneOptions={commonTimezones}
        onSubmit={confirmJoinPrayerFromDialog}
      />

      <Footer />
    </>
  );
};


export default BlogPost;