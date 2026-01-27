import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Heart, 
  Search, 
  Calendar,
  Clock,
  Loader2,
  Phone,
  Mail,
  User,
  Link as LinkIcon,
  Video,
  Send,
  AlertCircle,
  CheckCircle2,
  PlayCircle,
  StopCircle,
  RotateCcw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Footer from "@/components/Footer";
import { StartPrayerDialog } from "@/components/prayer/StartPrayerDialog";

interface PrayerTask {
  id: string;
  name: string;
  link_or_video: string | null;
  status: 'TODO' | 'DONE' | 'NOT DONE';
  person_needs_help: string | null;
  number_of_days: number;
  duration_days: number;
  current_day: number;
  start_date: string;
  end_date: string | null;
  start_time: string;
  email: string | null;
  phone_number: string | null;
  folder_id: string | null;
  is_shared: boolean;
  created_by: string | null;
  claimed_by: string | null;
  created_at: string;
  updated_at: string;
}

interface PrayerUserTask {
  id: string;
  task_id: string;
  user_id: string | null;
  anonymous_user_id: string | null;
  name: string;
  email: string;
  phone_number: string | null;
  person_needs_help: string | null;
  prayer_time: string;
  timezone: string;
  start_date: string;
  end_date: string;
  current_day: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  task?: PrayerTask;
  completed_days?: number[];
}

export default function PrayerTasks() {
  const { toast } = useToast();
  const { user } = useAuth();
  // Supabase generated types in this repo don't include the prayer_* tables/rpcs, so use any for those calls.
  const sb: any = supabase as any;
  const [tasks, setTasks] = useState<PrayerTask[]>([]);
  const [userTasks, setUserTasks] = useState<PrayerUserTask[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<PrayerTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [startInstanceDialogOpen, setStartInstanceDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<PrayerTask | null>(null);
  const [starting, setStarting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);
  const [stopping, setStopping] = useState<string | null>(null);
  const [restarting, setRestarting] = useState<string | null>(null);
  const [prayerDialogOpen, setPrayerDialogOpen] = useState(false);
  const [activePrayerTask, setActivePrayerTask] = useState<PrayerUserTask | null>(null);

  // Get user's timezone
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [instanceFormData, setInstanceFormData] = useState({
    name: "",
    email: "",
    phone_country_code: "",
    phone_number: "",
    person_needs_help: "",
    start_date: new Date().toISOString().split("T")[0],
    prayer_time: "07:00",
    timezone: userTimezone,
  });

  const [emailFormData, setEmailFormData] = useState({
    email: "",
    prayer_request: "",
  });

  useEffect(() => {
    fetchTasks();
    fetchUserTasks();

    // Set up real-time subscriptions
    const tasksChannel = supabase
      .channel('prayer-tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prayer_tasks',
        },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    const userTasksChannel = supabase
      .channel('prayer-user-tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prayer_user_tasks',
        },
        () => {
          fetchUserTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(userTasksChannel);
    };
  }, [user]);

  useEffect(() => {
    // Auto-fill email and phone for logged-in users
    if (user && user.email) {
      setInstanceFormData(prev => ({
        ...prev,
        email: user.email || "",
      }));
    }
  }, [user]);

  useEffect(() => {
    filterTasks();
  }, [tasks, searchTerm]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await sb
        .from('prayer_tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "Error",
        description: "Failed to fetch prayer tasks.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserTasks = async () => {
    try {
      const { data, error } = await sb
        .from('prayer_user_tasks')
        .select(`
          *,
          task:prayer_tasks(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter by user
      let filtered = data || [];
      if (user) {
        filtered = filtered.filter((ut: PrayerUserTask) => ut.user_id === user.id);
      } else {
        // For anonymous users, we'd need email-based filtering
        // This is a simplified version
        filtered = filtered.filter((ut: PrayerUserTask) => !ut.user_id);
      }

      // Fetch completed days for each user task
      const tasksWithCompletions = await Promise.all(
        filtered.map(async (ut: PrayerUserTask) => {
          const { data: completions } = await sb
            .from('prayer_daily_completions')
            .select('day_number')
            .eq('user_task_id', ut.id);
          
          return {
            ...ut,
            completed_days: completions?.map(c => c.day_number) || [],
          };
        })
      );

      setUserTasks(tasksWithCompletions);
    } catch (error) {
      console.error('Error fetching user tasks:', error);
    }
  };

  const filterTasks = () => {
    let filtered = tasks;

    // Show only shared tasks or tasks user has instances of
    const userTaskIds = new Set(userTasks.map(ut => ut.task_id));
    filtered = filtered.filter(task => 
      task.is_shared || userTaskIds.has(task.id)
    );

    // Filter by search term (name)
    if (searchTerm) {
      filtered = filtered.filter(task =>
        task.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredTasks(filtered);
  };

  const handleStartInstance = async () => {
    if (!selectedTask) return;

    try {
      if (!instanceFormData.name.trim() || !instanceFormData.email.trim()) {
        toast({
          title: "Error",
          description: "Please fill in required fields (Name and Email).",
          variant: "destructive",
        });
        return;
      }

      setStarting(true);

      const duration = selectedTask.duration_days || selectedTask.number_of_days;

      // Use selected start date from the form (cron-safe and user-controlled)
      const startDateYmd = String((instanceFormData as any).start_date || selectedTask.start_date || "").trim();
      const fixedEnd = String((instanceFormData as any).end_date || (selectedTask as any).end_date || "").trim();
      const endDateYmd = fixedEnd || addDaysToYmd(startDateYmd, Math.max(1, duration) - 1);

      // Create user prayer instance
      const normalizeCountryCode = (val: string) => {
        const trimmed = (val || "").trim();
        if (!trimmed) return "";
        const digits = trimmed.replace(/[^\d+]/g, "");
        if (!digits) return "";
        return digits.startsWith("+") ? digits : `+${digits.replace(/\D/g, "")}`;
      };

      const digitsOnlyPhone = String(instanceFormData.phone_number || "").replace(/\D/g, "");
      const ccNormalized = normalizeCountryCode(String((instanceFormData as any).phone_country_code || ""));
      if (digitsOnlyPhone && !ccNormalized) {
        toast({
          title: "Missing Country Code",
          description: "Please enter a country code (e.g. +91) to receive SMS/call notifications.",
          variant: "destructive",
        });
        return;
      }
      const effectivePhone = digitsOnlyPhone ? `${ccNormalized}${digitsOnlyPhone}`.trim() : null;

      const insertData: any = {
        task_id: selectedTask.id,
        name: instanceFormData.name,
        email: instanceFormData.email,
        phone_number: effectivePhone,
        person_needs_help: instanceFormData.person_needs_help || null,
        prayer_time: instanceFormData.prayer_time,
        timezone: instanceFormData.timezone,
        start_date: startDateYmd,
        end_date: endDateYmd,
        current_day: 1,
        is_active: true,
      };

      if (user) {
        insertData.user_id = user.id;
      } else {
        insertData.anonymous_user_id = instanceFormData.email; // Use email as identifier
      }

      const { data: created, error } = await sb
        .from('prayer_user_tasks')
        .insert([insertData])
        .select('id')
        .single();

      if (error) throw error;

      toast({
        title: "Prayer Started",
        description: `You've started the ${selectedTask.name} prayer. You'll receive daily reminders.`,
      });

      // Server-side notifications (email + SMS + call) on start/join. Best-effort.
      if ((created as any)?.id) {
        try {
          const { data: notifData, error: notifError } = await supabase.functions.invoke("send-prayer-start-notification", {
            body: { user_task_id: (created as any).id },
          });
          if (notifError) throw notifError;

          const smsSent = Boolean((notifData as any)?.sms_sent);
          const callPlaced = Boolean((notifData as any)?.call_placed);
          const smsError = String((notifData as any)?.sms_error || "");
          const callError = String((notifData as any)?.call_error || "");

          if (!effectivePhone) {
            toast({
              title: "Started (No Phone Alerts)",
              description: "Add your phone number (with country code) to receive SMS/phone call alerts.",
            });
          } else if (!smsSent && !callPlaced) {
            toast({
              title: "Started (Alerts Not Sent)",
              description: smsError || callError || "Twilio did not send SMS/call. Check Twilio geo-permissions and trial verification.",
            });
          } else {
            toast({
              title: "Alert Sent",
              description: `We sent a notification to ${effectivePhone}.`,
            });
          }
        } catch (e) {
          console.warn("[PrayerTasks] send-prayer-start-notification failed:", e);
          if (effectivePhone) {
            toast({
              title: "Started (Alerts Failed)",
              description: "Your prayer was started, but SMS/call sending failed. Check Twilio setup and try again.",
            });
          }
        }
      }

      setStartInstanceDialogOpen(false);
      setSelectedTask(null);
      setInstanceFormData({
        name: "",
        email: user?.email || "",
        phone_country_code: "",
        phone_number: "",
        person_needs_help: "",
        start_date: new Date().toISOString().split("T")[0],
        prayer_time: "07:00",
        timezone: userTimezone,
      });

      fetchUserTasks();
    } catch (error) {
      console.error("Error starting prayer instance:", error);
      toast({
        title: "Error",
        description: "Failed to start prayer instance.",
        variant: "destructive",
      });
    } finally {
      setStarting(false);
    }
  };

  const formatDuration = (ms: number): string => {
    const clampedSec = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(clampedSec / 3600);
    const minutes = Math.floor((clampedSec % 3600) / 60);
    if (hours <= 0) return `${Math.max(1, minutes)} min`;
    if (minutes <= 0) return `${hours} hr`;
    return `${hours} hr ${minutes} min`;
  };

  const getTzOffsetMs = (timeZone: string, date: Date): number => {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).formatToParts(date);
      const y = Number(parts.find((p) => p.type === "year")?.value);
      const mo = Number(parts.find((p) => p.type === "month")?.value) - 1;
      const d = Number(parts.find((p) => p.type === "day")?.value);
      const h = Number(parts.find((p) => p.type === "hour")?.value);
      const mi = Number(parts.find((p) => p.type === "minute")?.value);
      const s = Number(parts.find((p) => p.type === "second")?.value);
      if (![y, mo, d, h, mi, s].every(Number.isFinite)) return 0;
      const asUtc = Date.UTC(y, mo, d, h, mi, s);
      return asUtc - date.getTime();
    } catch {
      return 0;
    }
  };

  const getYmdInTz = (timeZone: string, date: Date): { y: number; mo: number; d: number } | null => {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(date);
      const y = Number(parts.find((p) => p.type === "year")?.value);
      const mo = Number(parts.find((p) => p.type === "month")?.value);
      const d = Number(parts.find((p) => p.type === "day")?.value);
      if (![y, mo, d].every(Number.isFinite)) return null;
      return { y, mo, d };
    } catch {
      return null;
    }
  };

  const nextMidnightInTzMs = (timeZone: string, now: Date): number | null => {
    const ymd = getYmdInTz(timeZone, now);
    if (!ymd) return null;
    const localAsUtc = Date.UTC(ymd.y, ymd.mo - 1, ymd.d + 1, 0, 0, 0);
    let guess = localAsUtc - getTzOffsetMs(timeZone, now);
    for (let i = 0; i < 2; i++) {
      const offset = getTzOffsetMs(timeZone, new Date(guess));
      guess = localAsUtc - offset;
    }
    return guess;
  };

  const midnightOfDateInTzMs = (yyyyMmDd: string, timeZone: string, now: Date): number | null => {
    const s = String(yyyyMmDd || "").trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    if (![y, mo, d].every(Number.isFinite)) return null;
    const localAsUtc = Date.UTC(y, mo, d, 0, 0, 0);
    let guess = localAsUtc - getTzOffsetMs(timeZone, now);
    for (let i = 0; i < 2; i++) {
      const offset = getTzOffsetMs(timeZone, new Date(guess));
      guess = localAsUtc - offset;
    }
    return guess;
  };

  const handleCompleteDay = async (userTaskId: string, dayNumber: number) => {
    try {
      setCompleting(userTaskId);

      // Check if day can be completed
      const { data: canComplete, error: checkError } = await sb
        .rpc('can_complete_prayer_day', {
          p_user_task_id: userTaskId,
          p_day_number: dayNumber,
        });

      if (checkError) throw checkError;

      if (!canComplete) {
        const ut = userTasks.find((t) => t.id === userTaskId);
        const todayDay = ut ? getCurrentDay(ut) : 0;
        const alreadyCompleted = Boolean((ut?.completed_days || []).includes(dayNumber));
        const tz = ut?.timezone || "UTC";
        const now = new Date();

        const description = alreadyCompleted
          ? `You already completed Day ${dayNumber}.`
          : todayDay < 1
            ? (() => {
                const startMs = ut?.start_date ? midnightOfDateInTzMs(ut.start_date, tz, now) : null;
                if (startMs) return `This prayer hasn’t started yet. Please wait ${formatDuration(startMs - now.getTime())}.`;
                return "This prayer hasn’t started yet. Please come back on the start date.";
              })()
            : dayNumber > todayDay
              ? (() => {
                  const nextMs = nextMidnightInTzMs(tz, now);
                  if (nextMs) return `Please wait ${formatDuration(nextMs - now.getTime())} and try again.`;
                  return `You can only complete up to today (Day ${todayDay}). Please come back tomorrow.`;
                })()
              : "This day can’t be completed right now.";

        toast({
          title: "Cannot Complete",
          description,
        });
        return;
      }

      // Insert completion
      const { error } = await sb
        .from('prayer_daily_completions')
        .insert([{
          user_task_id: userTaskId,
          day_number: dayNumber,
        }]);

      if (error) throw error;

      // Update current_day in user task
      const userTask = userTasks.find(ut => ut.id === userTaskId);
      if (userTask) {
        const duration = getDurationForUserTask(userTask);
        const newCurrentDay = Math.max(userTask.current_day, dayNumber + 1);
        const justCompleted = dayNumber >= duration;

        const updatePayload: any = { current_day: newCurrentDay };
        if (justCompleted) updatePayload.is_active = false;

        await sb.from('prayer_user_tasks').update(updatePayload).eq('id', userTaskId);

        // Completed Prayer Folder Handling (best-effort)
        if (justCompleted && user?.id) {
          try {
            const folderName = "Completed Prayers";
            const { data: existingFolder } = await sb
              .from("prayer_folders")
              .select("id")
              .eq("created_by", user.id)
              .eq("name", folderName)
              .maybeSingle();

            let folderId: string | null = existingFolder?.id ? String(existingFolder.id) : null;

            if (!folderId) {
              const { data: createdFolder, error: folderErr } = await sb
                .from("prayer_folders")
                .insert([
                  {
                    name: folderName,
                    created_by: user.id,
                    email: user.email || null,
                    phone_number: userTask.phone_number || null,
                  },
                ])
                .select("id")
                .single();
              if (folderErr) throw folderErr;
              folderId = createdFolder?.id ? String(createdFolder.id) : null;
            }

            // Save completed prayer under the user's folder.
            // Only apply folder/status to non-shared tasks to avoid impacting other users.
            if (folderId && userTask.task && !userTask.task.is_shared) {
              await sb
                .from("prayer_tasks")
                .update({ folder_id: folderId, status: "DONE" })
                .eq("id", userTask.task_id);
            }
          } catch (e) {
            console.warn("[PrayerTasks] completed folder handling failed:", e);
          }
        }
      }

      toast({
        title: "Day Completed",
        description: `Day ${dayNumber} has been marked as completed.`,
      });

      fetchUserTasks();
    } catch (error) {
      console.error("Error completing day:", error);
      toast({
        title: "Error",
        description: "Failed to mark day as completed.",
        variant: "destructive",
      });
    } finally {
      setCompleting(null);
    }
  };

  const getTodayYmdInTimezone = (timeZone: string): string => {
    const now = new Date();
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: timeZone || "UTC",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(now);
      const y = parts.find((p) => p.type === "year")?.value;
      const mo = parts.find((p) => p.type === "month")?.value;
      const d = parts.find((p) => p.type === "day")?.value;
      if (!y || !mo || !d) return now.toISOString().slice(0, 10);
      return `${y}-${mo}-${d}`;
    } catch {
      return now.toISOString().slice(0, 10);
    }
  };

  const addDaysToYmd = (yyyyMmDd: string, daysToAdd: number): string => {
    const m = String(yyyyMmDd || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return yyyyMmDd;
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const dt = new Date(Date.UTC(y, mo, d + Math.max(0, daysToAdd)));
    return dt.toISOString().slice(0, 10);
  };

  const handleStopPrayer = async (ut: PrayerUserTask) => {
    if (!ut?.id) return;
    const ok = window.confirm(
      "Stop this prayer?\n\nThis will pause the prayer and stop reminders. Your progress will be saved.\n\nYou can restart later (restarting begins again from Day 1)."
    );
    if (!ok) return;
    try {
      setStopping(ut.id);

      // Optimistic UI update
      setUserTasks((prev) => prev.map((p) => (p.id === ut.id ? { ...p, is_active: false } : p)));

      const { error } = await sb.from("prayer_user_tasks").update({ is_active: false }).eq("id", ut.id);
      if (error) throw error;

      toast({ title: "Prayer Stopped", description: "This prayer has been stopped. You can restart it anytime." });
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to stop prayer.", variant: "destructive" });
      fetchUserTasks();
    } finally {
      setStopping(null);
    }
  };

  const handleRestartPrayer = async (ut: PrayerUserTask) => {
    if (!ut?.id) return;
    if (isPrayerCompleted(ut)) {
      toast({
        title: "Completed",
        description: "This prayer is already completed and cannot be restarted.",
      });
      return;
    }
    const ok = window.confirm(
      "Are you sure you want to restart this prayer? This will reset the progress and start again from Day 1."
    );
    if (!ok) return;

    try {
      setRestarting(ut.id);

      const duration = getDurationForUserTask(ut);
      const tz = ut.timezone || userTimezone || "UTC";
      const startDate = getTodayYmdInTimezone(tz);
      const endDate = addDaysToYmd(startDate, Math.max(1, duration) - 1);

      // Preserve history without deleting: shift existing completion rows out of the 1..duration range.
      const { data: completions, error: compErr } = await sb
        .from("prayer_daily_completions")
        .select("id, day_number")
        .eq("user_task_id", ut.id);
      if (compErr) throw compErr;

      if (Array.isArray(completions) && completions.length) {
        const offset = 10000;
        await Promise.all(
          completions.map((c: any) =>
            sb
              .from("prayer_daily_completions")
              .update({ day_number: Number(c.day_number) + offset })
              .eq("id", c.id)
          )
        );
      }

      // Reuse the SAME prayer_user_tasks record (no new row)
      const { error } = await sb
        .from("prayer_user_tasks")
        .update({ is_active: true, current_day: 1, start_date: startDate, end_date: endDate })
        .eq("id", ut.id);
      if (error) throw error;

      // Optimistic UI update (instant)
      setUserTasks((prev) =>
        prev.map((p) =>
          p.id === ut.id
            ? { ...p, is_active: true, current_day: 1, start_date: startDate, end_date: endDate, completed_days: [] }
            : p
        )
      );

      toast({ title: "Prayer Restarted", description: "This prayer has been restarted from Day 1." });
      fetchUserTasks();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to restart prayer.", variant: "destructive" });
    } finally {
      setRestarting(null);
    }
  };

  const handleSendEmail = async () => {
    try {
      if (!emailFormData.email.trim() || !emailFormData.prayer_request.trim()) {
        toast({
          title: "Error",
          description: "Please fill in all fields.",
          variant: "destructive",
        });
        return;
      }

      setSendingEmail(true);

      const { data, error } = await supabase.functions.invoke('send-prayer-request', {
        body: {
          email: emailFormData.email,
          prayer_request: emailFormData.prayer_request,
          search_term: searchTerm,
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Your prayer request has been sent. We will get back to you soon.",
      });

      setEmailDialogOpen(false);
      setEmailFormData({
        email: "",
        prayer_request: "",
      });
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "Error",
        description: "Failed to send prayer request. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleTaskClick = (task: PrayerTask) => {
    const activeInstance = userTasks.find((ut) => ut.task_id === task.id && ut.is_active);
    if (activeInstance) {
      toast({
        title: "Already Started",
        description: "You already have an active prayer for this task. Check 'My Prayers' below.",
      });
      return;
    }

    // If the user previously stopped it, allow restart. If completed, do not allow restart.
    const existingInstance = userTasks.find((ut) => ut.task_id === task.id);
    if (existingInstance) {
      if (isPrayerCompleted(existingInstance)) {
        toast({
          title: "Completed",
          description: "This prayer is already completed and cannot be restarted.",
        });
        return;
      }
      handleRestartPrayer(existingInstance);
      return;
    }

    // Default the start date to the task start date (if provided)
    setInstanceFormData((prev) => ({ ...(prev as any), start_date: task.start_date || prev.start_date } as any));
    setSelectedTask(task);
    setStartInstanceDialogOpen(true);
  };

  const handleOpenPrayer = (ut: PrayerUserTask) => {
    setActivePrayerTask(ut);
    setPrayerDialogOpen(true);
  };

  const getCurrentDay = (userTask: PrayerUserTask): number => {
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

    const startMs = parseDateToUtcMs(userTask.start_date);
    const endMs = parseDateToUtcMs(userTask.end_date);
    if (startMs === null || endMs === null) return 0;

    const now = new Date();
    const tz = userTask.timezone || "UTC";
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

    const totalDays = Math.floor((endMs - startMs) / MS_DAY) + 1;
    const day = Math.floor((todayTzMs - startMs) / MS_DAY) + 1;

    if (day < 1) return 0; // Not started yet
    if (day > totalDays) return totalDays; // Completed
    return day;
  };

  const getDurationForUserTask = (userTask: PrayerUserTask): number => {
    return userTask.task?.duration_days || userTask.task?.number_of_days || 1;
  };

  const isPrayerCompleted = (userTask: PrayerUserTask): boolean => {
    const duration = getDurationForUserTask(userTask);
    const completedDays = userTask.completed_days || [];
    return completedDays.includes(duration) || completedDays.length >= duration || userTask.current_day > duration;
  };

  const canCompleteToday = (userTask: PrayerUserTask): boolean => {
    if (!userTask.is_active) return false;
    if (isPrayerCompleted(userTask)) return false;
    const currentDay = getCurrentDay(userTask);
    if (currentDay < 1 || currentDay > getDurationForUserTask(userTask)) {
      return false;
    }
    return !(userTask.completed_days || []).includes(currentDay);
  };

  const formatDateTime = (date: string, time: string) => {
    const dateObj = new Date(`${date}T${time}`);
    return dateObj.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getYouTubeEmbedUrl = (url: string): string | null => {
    try {
      const u = new URL(url);
      const host = u.hostname.toLowerCase();
      if (host.includes("youtu.be")) {
        const id = u.pathname.replace("/", "").trim();
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      if (host.includes("youtube.com")) {
        if (u.pathname.startsWith("/embed/")) return `https://www.youtube.com${u.pathname}`;
        const id = u.searchParams.get("v");
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      return null;
    } catch {
      return null;
    }
  };

  const isDirectVideoUrl = (url: string): boolean => {
    return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'TODO': 'default',
      'DONE': 'secondary',
      'NOT DONE': 'destructive',
    };
    return (
      <Badge variant={variants[status] || 'default'}>
        {status}
      </Badge>
    );
  };

  // Get common timezones
  const commonTimezones = [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Phoenix', label: 'Arizona Time' },
    { value: 'America/Anchorage', label: 'Alaska Time' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
    { value: 'UTC', label: 'UTC' },
    { value: 'Europe/London', label: 'London (GMT)' },
    { value: 'Europe/Paris', label: 'Paris (CET)' },
    { value: 'Asia/Dubai', label: 'Dubai (GST)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEDT)' },
  ];

  const activeInProgress = userTasks.filter((ut) => ut.is_active && !isPrayerCompleted(ut));
  const completedPrayers = userTasks.filter((ut) => isPrayerCompleted(ut));
  const stoppedPrayers = userTasks.filter((ut) => !ut.is_active && !isPrayerCompleted(ut));

  return (
    <div className="min-h-screen pink-yellow-shadow pt-20">
      <div className="animate-slide-up bg-black/20 px-6 py-10 text-center md:py-12 lg:py-24">
        <div className="mx-auto w-full max-w-7xl">
          <h1 className="mb-6 font-inter font-bold uppercase text-white text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
            Prayer <span className="text-[var(--yellowcolor)]">Management</span>
          </h1>
          <p className="max-w-2xl mx-auto font-inter text-lg md:text-[20px] font-normal text-white mb-6">
            Join us in prayer for those in need
          </p>
        </div>
      </div>

      <div className="space-y-6 px-5 py-8 md:py-12 lg:py-16">
        <div className="mx-auto w-full max-w-7xl">
          {/* My Prayers */}
          {userTasks.length > 0 && (
            <Card className="border border-muted/20 p-0 rounded-lg bg-white/5 mb-6">
              <CardHeader>
                <CardTitle className="text-primary">My Prayers</CardTitle>
                <CardDescription>
                  Track your daily prayer progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {activeInProgress.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-sm font-semibold text-white/90">Active / In Progress</div>
                      {activeInProgress.map((ut) => {
                        const currentDay = getCurrentDay(ut);
                        const duration = getDurationForUserTask(ut);
                        const canComplete = canCompleteToday(ut);
                        const isCompletedToday = (ut.completed_days || []).includes(currentDay);

                        return (
                          <Card key={ut.id} className="border border-muted/20 p-4">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="font-semibold text-white">{ut.task?.name || "Unknown Prayer"}</h3>
                                  {ut.person_needs_help && (
                                    <Badge variant="outline" className="text-xs">
                                      For: {ut.person_needs_help}
                                    </Badge>
                                  )}
                                  <Badge className="bg-blue-600 text-white border-0 hover:bg-blue-700">In Progress</Badge>
                                </div>
                                <div className="text-sm text-white/70 space-y-1">
                                  <div>Day {currentDay} of {duration}</div>
                                  <div>Prayer Time: {ut.prayer_time} ({ut.timezone})</div>
                                  {currentDay < 1 && (
                                    <div className="text-xs text-white/60">
                                      Starts on: {ut.start_date} ({ut.timezone || "UTC"})
                                    </div>
                                  )}
                                  {ut.task?.link_or_video && (
                                    <a
                                      href={ut.task.link_or_video}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline flex items-center gap-1"
                                    >
                                      {ut.task.link_or_video.includes("youtube") || ut.task.link_or_video.includes("video") ? (
                                        <Video className="h-4 w-4" />
                                      ) : (
                                        <LinkIcon className="h-4 w-4" />
                                      )}
                                      View Prayer Content
                                    </a>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                                {canComplete && !isCompletedToday ? (
                                  <Button
                                    onClick={() => handleOpenPrayer(ut)}
                                    disabled={completing === ut.id}
                                    className="rounded-[8px] gap-1"
                                  >
                                    {completing === ut.id ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Completing...
                                      </>
                                    ) : (
                                      <>
                                        <PlayCircle className="mr-1 h-4 w-4" />
                                        Pray
                                      </>
                                    )}
                                  </Button>
                                ) : isCompletedToday ? (
                                  <Badge variant="secondary" className="px-4 py-2">
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Day {currentDay} Completed
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="px-4 py-2">
                                    {currentDay < 1 ? "Starts Soon" : "Future Day"}
                                  </Badge>
                                )}

                                <Button
                                  variant="outline"
                                  className="rounded-[8px] gap-1"
                                  disabled={stopping === ut.id}
                                  onClick={() => handleStopPrayer(ut)}
                                >
                                  {stopping === ut.id ? (
                                    <>
                                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                      Stopping...
                                    </>
                                  ) : (
                                    <>
                                      <StopCircle className="mr-1 h-4 w-4" />
                                      Stop Prayer
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}

                  {completedPrayers.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-sm font-semibold text-white/90">Completed (Done)</div>
                      {completedPrayers.map((ut) => {
                        const duration = getDurationForUserTask(ut);
                        return (
                          <Card key={ut.id} className="border border-muted/20 p-4">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="font-semibold text-white">{ut.task?.name || "Unknown Prayer"}</h3>
                                  <Badge className="bg-green-600 text-white">Done</Badge>
                                </div>
                                <div className="text-sm text-white/70 space-y-1">
                                  <div>Progress: {duration} / {duration}</div>
                                  <div>Prayer Time: {ut.prayer_time} ({ut.timezone})</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button variant="outline" className="rounded-[8px]" disabled>
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  Completed
                                </Button>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}

                  {stoppedPrayers.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-sm font-semibold text-white/90">Stopped</div>
                      {stoppedPrayers.map((ut) => {
                        const duration = getDurationForUserTask(ut);
                        return (
                          <Card key={ut.id} className="border border-muted/20 p-4">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="font-semibold text-white">{ut.task?.name || "Unknown Prayer"}</h3>
                                  <Badge variant="outline" className="text-white border-white/30">Stopped</Badge>
                                </div>
                                <div className="text-sm text-white/70 space-y-1">
                                  <div>Progress: {Math.min(duration, Math.max(0, ut.current_day - 1))} / {duration}</div>
                                  <div>Prayer Time: {ut.prayer_time} ({ut.timezone})</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  className="rounded-[8px]"
                                  disabled={restarting === ut.id}
                                  onClick={() => handleRestartPrayer(ut)}
                                >
                                  {restarting === ut.id ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Restarting...
                                    </>
                                  ) : (
                                    <>
                                      <RotateCcw className="mr-2 h-4 w-4" />
                                      Restart (Day 1)
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}

                  {activeInProgress.length === 0 && completedPrayers.length === 0 && stoppedPrayers.length === 0 && (
                    <div className="text-white/70 text-sm">No prayers yet.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search */}
          <Card className="border border-muted/20 p-0 rounded-lg bg-white/5">
            <CardContent className="p-5">
              <div className="flex gap-4 flex-col md:flex-row">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name (e.g., PATRICK)..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 border-0 rounded-[8px] shadow-none mt-0 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none"
                      style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
                    />
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="rounded-[8px] border-0 gap-0"
                  onClick={() => setEmailDialogOpen(true)}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Prayer Not Listed? Request One
                </Button>
              </div>
              {searchTerm && filteredTasks.length === 0 && (
                <div className="mt-4 p-0 pt-1 bg-transparent rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium font-inter text-white">No task found with name "{searchTerm}"</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Click "Prayer Not Listed? Request One" to let us know about this prayer need.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Available Tasks List */}
          <Card className="border-0 bg-transparent p-0 pt-8 md:pt-10">
            <CardHeader className="px-0 sm:px-0 pt-0 pb-0 p-0 sm:p-0">
              <CardTitle className="text-primary">Available Prayer Tasks</CardTitle>
              <CardDescription className="text-lg font-inter">
                {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} found
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-0">
              {loading ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
                </div>
              ) : filteredTasks.length === 0 && !searchTerm ? (
                <div className="text-center py-8 text-white justify-center min-h-[400px]">
                  No prayer tasks available at the moment.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTasks.map((task) => {
                    const instances = userTasks.filter((ut) => ut.task_id === task.id);
                    const hasActiveInstance = instances.some((ut) => ut.is_active && !isPrayerCompleted(ut));
                    const hasCompletedInstance = instances.some((ut) => isPrayerCompleted(ut));
                    const hasStoppedInstance = instances.some((ut) => !ut.is_active && !isPrayerCompleted(ut));
                    return (
                      <Card
                        key={task.id}
                        className={`cursor-pointer transition-colors mt-4 p-6 hover:bg-white/10`}
                        onClick={() => handleTaskClick(task)}
                      >
                        <CardContent className="p-0 sm:p-0">
                          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                            <div className="md:col-span-1">
                              <div className="font-inter text-sm text-white">{task.name}</div>
                              <div className="flex items-center flex-wrap gap-2 pt-2">
                              {getStatusBadge(task.status)}
                              {hasActiveInstance ? (
                                <Badge variant="secondary" className="mt-0">
                                  <PlayCircle className="mr-1 h-3 w-3" />
                                  Active
                                </Badge>
                              ) : hasCompletedInstance ? (
                                <Badge className="mt-2 bg-green-600 text-white">
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                  Completed
                                </Badge>
                              ) : hasStoppedInstance ? (
                                <Badge variant="outline" className="mt-2 text-white border-white/30">
                                  <StopCircle className="mr-1 h-3 w-3" />
                                  Stopped
                                </Badge>
                              ) : null}</div>
                            </div>
                            <div className="md:col-span-1">
                              {task.link_or_video ? (
                                <a
                                  href={task.link_or_video}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary hover:no-underline flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {task.link_or_video.includes('youtube') || task.link_or_video.includes('video') ? (
                                    <Video className="h-4 w-4" />
                                  ) : (
                                    <LinkIcon className="h-4 w-4" />
                                  )}
                                  View
                                </a>
                              ) : (
                                <span className="text-white/70 text-sm">-</span>
                              )}
                            </div>
                            <div className="md:col-span-1">
                              <div className="text-sm text-white">Duration</div>
                              <div className="text-white/70 text-sm pt-2">
                                {task.duration_days || task.number_of_days} days
                              </div>
                            </div>
                            <div className="md:col-span-1">
                              <div className="text-sm text-white">Start Date</div>
                              <div className="text-white/70 text-sm pt-2">
                                {new Date(task.start_date).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="md:col-span-1">
                              {task.is_shared && (
                                <Badge variant="outline" className="text-xs">
                                  Shared
                                </Badge>
                              )}
                            </div>
                            <div className="md:col-span-1">
                              {hasActiveInstance ? (
                                <Badge variant="secondary" className="w-full text-center p-2 rounded-[8px] justify-center">
                                  Already Active
                                </Badge>
                              ) : hasCompletedInstance ? (
                                <Button size="sm" variant="outline" className="w-full rounded-[8px] justify-center" disabled>
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  Completed
                                </Button>
                              ) : hasStoppedInstance ? (
                                <Button size="sm" className="w-full rounded-[8px] justify-center">
                                  Restart (Day 1)
                                </Button>
                              ) : (
                                <Button size="sm" className="w-full rounded-[8px] justify-center">
                                  Start Prayer
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />

      {/* Prayer Content Dialog */}
      <Dialog
        open={prayerDialogOpen}
        onOpenChange={(open) => {
          setPrayerDialogOpen(open);
          if (!open) setActivePrayerTask(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{activePrayerTask?.task?.name || "Prayer"}</DialogTitle>
            <DialogDescription className="font-inter text-black/50">
              {activePrayerTask?.person_needs_help
                ? `Praying for ${activePrayerTask.person_needs_help}`
                : "Prayer content"
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {(() => {
              const url = activePrayerTask?.task?.link_or_video || "";
              if (!url) {
                return (
                  <div className="text-sm text-muted-foreground">Prayer content is not available.</div>
                );
              }
              const youtubeEmbed = getYouTubeEmbedUrl(url);
              if (youtubeEmbed) {
                return (
                  <div className="aspect-video w-full overflow-hidden rounded-lg border border-muted/30">
                    <iframe
                      src={youtubeEmbed}
                      title="Prayer Video"
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                );
              }
              if (isDirectVideoUrl(url)) {
                return (
                  <video className="w-full rounded-lg" controls>
                    <source src={url} />
                    Your browser does not support the video tag.
                  </video>
                );
              }
              return (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Open Prayer Content
                </a>
              );
            })()}

            {(() => {
              if (!activePrayerTask) return null;
              const currentDay = getCurrentDay(activePrayerTask);
              const dayLabel = Math.max(1, currentDay);
              const isCompleted = (activePrayerTask.completed_days || []).includes(currentDay);
              const canComplete = canCompleteToday(activePrayerTask) && !isCompleted;

              return (
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="rounded-[8px]"
                    onClick={() => setPrayerDialogOpen(false)}
                  >
                    Close
                  </Button>
                  <Button
                    className="rounded-[8px]"
                    disabled={!canComplete || completing === activePrayerTask.id}
                    onClick={async () => {
                      await handleCompleteDay(activePrayerTask.id, currentDay);
                      setPrayerDialogOpen(false);
                      setActivePrayerTask(null);
                    }}
                  >
                    {completing === activePrayerTask.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Completing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-0 h-4 w-4" />
                        Day {dayLabel} Done
                      </>
                    )}
                  </Button>
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Start Prayer Instance Dialog */}
      <StartPrayerDialog
        open={startInstanceDialogOpen}
        onOpenChange={setStartInstanceDialogOpen}
        title="Start Prayer"
        description={
          user
            ? "Your email and phone will be auto-filled. You can edit them if needed."
            : "Please provide your information to start this prayer."
        }
        submitting={starting}
        submitLabel="Start Prayer"
        traditionalDates={
          selectedTask && (selectedTask as any).start_date && (selectedTask as any).end_date
            ? {
                start_date: String((selectedTask as any).start_date),
                end_date: String((selectedTask as any).end_date),
              }
            : undefined
        }
        form={instanceFormData as any}
        setForm={(next) => setInstanceFormData(next as any)}
        timezoneOptions={commonTimezones}
        onSubmit={handleStartInstance}
      />

      {/* Send Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Prayer Request</DialogTitle>
            <DialogDescription className="font-inter text-black/50">
              No task found with that name. Send us your prayer request and we'll add it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email-email">Your Email *</Label>
              <Input
                id="email-email"
                type="email"
                value={emailFormData.email}
                onChange={(e) => setEmailFormData({ ...emailFormData, email: e.target.value })}
                placeholder="your.email@example.com"
                className='rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none'
                style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
              />
            </div>
            <div>
              <Label htmlFor="email-prayer">Prayer Request *</Label>
              <Textarea
                id="email-prayer"
                value={emailFormData.prayer_request}
                onChange={(e) => setEmailFormData({ ...emailFormData, prayer_request: e.target.value })}
                placeholder="Please describe the prayer need..."
                rows={5}
                className='rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none'
                style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button className="border-0 rounded-[8px] hover:bg-white/80" variant="outline" onClick={() => setEmailDialogOpen(false)}>
                Cancel
              </Button>
              <Button className="border-0 rounded-[8px] hover:bg-primary/80 gap-0" onClick={handleSendEmail} disabled={sendingEmail}>
                {sendingEmail ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Request
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
