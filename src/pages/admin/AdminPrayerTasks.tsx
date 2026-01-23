import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

type PrayerTask = {
  id: string;
  name: string;
  number_of_days: number;
  duration_days?: number;
  is_shared: boolean;
  link_or_video?: string | null;
  folder_id?: string | null;
  start_date?: string;
  start_time?: string;
  status?: "TODO" | "DONE" | string;
};

type PrayerFolder = {
  id: string;
  name: string;
  parent_id: string | null;
};

type PrayerUserTask = {
  id: string;
  task_id: string;
  user_id: string | null;
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
  task?: PrayerTask;
};

type UserProfileLite = {
  user_id: string;
  full_name: string | null;
  email?: string | null;
};

function daysBetweenInclusive(startDate: string, endDate: string) {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const diff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diff + 1;
}

export default function AdminPrayerTasks() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userTasks, setUserTasks] = useState<PrayerUserTask[]>([]);
  const [profilesByUserId, setProfilesByUserId] = useState<Map<string, UserProfileLite>>(new Map());
  const syncRef = useRef(false);

  // Prayer task templates (admin creates these; users join instances)
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templates, setTemplates] = useState<PrayerTask[]>([]);
  const [templateSearch, setTemplateSearch] = useState("");
  const [folders, setFolders] = useState<PrayerFolder[]>([]);

  const folderMap = useMemo(() => {
    const map = new Map<string, string>();
    folders.forEach((f) => map.set(String(f.id), String(f.name)));
    return map;
  }, [folders]);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    link_or_video: "",
    folder_id: "none",
    number_of_days: 1,
    start_date: new Date().toISOString().split("T")[0],
    start_time: "06:00",
    is_shared: true,
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    link_or_video: "",
    folder_id: "none",
    number_of_days: 1,
    start_date: new Date().toISOString().split("T")[0],
    start_time: "06:00",
    is_shared: true,
  });

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingUserTaskId, setDeletingUserTaskId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "TODO" | "DONE">("all");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "shared" | "private">("all");
  const [activeOnly, setActiveOnly] = useState(false);
  const [startStatusFilter, setStartStatusFilter] = useState<"all" | "upcoming" | "in_progress" | "done" | "overdue">("all");

  const fetchTracking = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("prayer_user_tasks" as any)
        .select(
          `
          *,
          task:prayer_tasks(*)
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      // Supabase nested select typing can be overly strict here; cast through unknown.
      const rows = (data || []) as unknown as PrayerUserTask[];

      // --- Completion sync (admin-safe, no deletes) ---
      // Ensures completed instances are marked inactive and (for non-shared tasks) moved into the user's Completed Prayers folder.
      if (!syncRef.current) {
        syncRef.current = true;
        try {
          const ensureCompletedFolderId = async (userId: string): Promise<string | null> => {
            const { data: existing, error: exErr } = await (supabase as any)
              .from("prayer_folders")
              .select("id")
              .eq("created_by", userId)
              .eq("name", "Completed Prayers")
              .maybeSingle();
            if (exErr) throw exErr;
            if (existing?.id) return String(existing.id);

            const { data: created, error: crErr } = await (supabase as any)
              .from("prayer_folders")
              .insert([{ name: "Completed Prayers", created_by: userId, parent_id: null }])
              .select("id")
              .single();
            if (crErr) throw crErr;
            return created?.id ? String(created.id) : null;
          };

          for (const ut of rows) {
            const duration =
              (ut.task as any)?.duration_days ||
              (ut.task as any)?.number_of_days ||
              daysBetweenInclusive(ut.start_date, ut.end_date);

            // Completion rule:
            // - final day completed (current_day >= duration), OR
            // - current_day exceeds duration
            const isCompleted = Number(ut.current_day) >= Number(duration);
            if (!isCompleted) continue;

            // Mark inactive (per-user instance only)
            if (ut.is_active) {
              await (supabase as any).from("prayer_user_tasks").update({ is_active: false }).eq("id", ut.id);
            }

            // Shared prayer safety: never mutate shared prayer task template
            if (ut.task?.is_shared) continue;
            if (!ut.user_id) continue;

            const completedFolderId = await ensureCompletedFolderId(ut.user_id);
            if (!completedFolderId) continue;

            const currentFolderId = ut.task?.folder_id ? String(ut.task.folder_id) : null;
            const currentStatus = String((ut.task as any)?.status || "");
            if (currentFolderId !== completedFolderId || currentStatus !== "DONE") {
              await (supabase as any)
                .from("prayer_tasks")
                .update({ folder_id: completedFolderId, status: "DONE" })
                .eq("id", ut.task_id);
            }
          }
        } catch (e) {
          console.warn("[AdminPrayerTasks] completion sync failed:", e);
        } finally {
          syncRef.current = false;
        }
      }

      setUserTasks(rows);

      const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean))) as string[];
      if (userIds.length) {
        const { data: profilesData } = await supabase
          .from("profiles" as any)
          .select("user_id, full_name, email")
          .in("user_id", userIds);

        const map = new Map<string, UserProfileLite>();
        (profilesData || []).forEach((p: any) => map.set(p.user_id, p));
        setProfilesByUserId(map);
      } else {
        setProfilesByUserId(new Map());
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Failed to load prayer tracking.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchTemplates = useCallback(async () => {
    try {
      setTemplatesLoading(true);
      const [{ data: tasksData, error: tasksError }, { data: foldersData, error: foldersError }] = await Promise.all([
        (supabase as any).from("prayer_tasks").select("*").order("created_at", { ascending: false }),
        (supabase as any).from("prayer_folders").select("id,name,parent_id").order("name", { ascending: true }),
      ]);
      if (tasksError) throw tasksError;
      if (foldersError) throw foldersError;
      setTemplates((tasksData || []) as PrayerTask[]);
      setFolders((foldersData || []) as PrayerFolder[]);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Failed to load prayer tasks.",
        variant: "destructive",
      });
    } finally {
      setTemplatesLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTracking();
    fetchTemplates();

    // Real-time updates (read-only)
    const ch = supabase
      .channel("admin-prayer-user-tasks-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "prayer_user_tasks" },
        () => fetchTracking()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [fetchTracking, fetchTemplates]);

  const folderOptions = useMemo(() => {
    // Build a flattened tree so nested folders are easy to pick
    const map = new Map<string, PrayerFolder & { children: PrayerFolder[] }>();
    folders.forEach((f) => map.set(f.id, { ...(f as any), children: [] }));
    map.forEach((node) => {
      if (node.parent_id && map.has(node.parent_id)) {
        map.get(node.parent_id)!.children.push(node);
      }
    });
    const roots = Array.from(map.values()).filter((n) => !n.parent_id || !map.has(n.parent_id));
    const sortByName = (a: PrayerFolder, b: PrayerFolder) => a.name.localeCompare(b.name);
    roots.sort(sortByName);

    const out: Array<{ id: string; label: string; depth: number }> = [];
    const visit = (n: any, depth: number) => {
      out.push({ id: n.id, label: n.name, depth });
      (n.children || []).sort(sortByName).forEach((c: any) => visit(c, depth + 1));
    };
    roots.forEach((r) => visit(r, 0));
    return out;
  }, [folders]);

  const filteredTemplates = useMemo(() => {
    const q = templateSearch.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) => (t.name || "").toLowerCase().includes(q));
  }, [templateSearch, templates]);

  const openCreate = useCallback(() => {
    setCreateForm({
      name: "",
      link_or_video: "",
      folder_id: "none",
      number_of_days: 1,
      start_date: new Date().toISOString().split("T")[0],
      start_time: "06:00",
      is_shared: true,
    });
    setCreateOpen(true);
  }, []);

  const openEdit = useCallback((t: PrayerTask) => {
    const days = (t.duration_days || t.number_of_days || 1) as number;
    setEditId(t.id);
    setEditForm({
      name: t.name || "",
      link_or_video: t.link_or_video || "",
      folder_id: t.folder_id ? String(t.folder_id) : "none",
      number_of_days: days,
      start_date: (t.start_date as any) || new Date().toISOString().split("T")[0],
      start_time: (t.start_time as any) || "06:00",
      is_shared: Boolean(t.is_shared),
    });
    setEditOpen(true);
  }, []);

  const submitCreate = useCallback(async () => {
    if (!createForm.name.trim()) {
      toast({ title: "Missing Name", description: "Task Name is required.", variant: "destructive" });
      return;
    }
    if (!createForm.number_of_days || createForm.number_of_days < 1) {
      toast({ title: "Invalid Duration", description: "Number of Days must be at least 1.", variant: "destructive" });
      return;
    }

    try {
      setCreating(true);
      const payload: any = {
        name: createForm.name.trim(),
        link_or_video: createForm.link_or_video.trim() || null,
        folder_id: createForm.folder_id !== "none" ? createForm.folder_id : null,
        number_of_days: createForm.number_of_days,
        duration_days: createForm.number_of_days, // keep compatibility with older UI
        start_date: createForm.start_date,
        start_time: createForm.start_time,
        status: "TODO",
        is_shared: Boolean(createForm.is_shared),
        created_by: user?.id ?? null,
      };

      const { error } = await (supabase as any).from("prayer_tasks").insert([payload]);
      if (error) throw error;

      toast({ title: "Created", description: "Prayer task created successfully." });
      setCreateOpen(false);
      await fetchTemplates();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to create prayer task.", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }, [createForm, fetchTemplates, toast, user?.id]);

  const submitEdit = useCallback(async () => {
    if (!editId) return;
    if (!editForm.name.trim()) {
      toast({ title: "Missing Name", description: "Task Name is required.", variant: "destructive" });
      return;
    }
    if (!editForm.number_of_days || editForm.number_of_days < 1) {
      toast({ title: "Invalid Duration", description: "Number of Days must be at least 1.", variant: "destructive" });
      return;
    }

    try {
      setEditing(true);
      const payload: any = {
        name: editForm.name.trim(),
        link_or_video: editForm.link_or_video.trim() || null,
        folder_id: editForm.folder_id !== "none" ? editForm.folder_id : null,
        number_of_days: editForm.number_of_days,
        duration_days: editForm.number_of_days, // keep compatibility with older UI
        start_date: editForm.start_date,
        start_time: editForm.start_time,
        is_shared: Boolean(editForm.is_shared),
      };

      const { error } = await (supabase as any).from("prayer_tasks").update(payload).eq("id", editId);
      if (error) throw error;

      toast({ title: "Updated", description: "Prayer task updated successfully." });
      setEditOpen(false);
      setEditId(null);
      await fetchTemplates();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to update prayer task.", variant: "destructive" });
    } finally {
      setEditing(false);
    }
  }, [editForm, editId, fetchTemplates, toast]);

  const deleteTemplate = useCallback(
    async (t: PrayerTask) => {
      const ok = window.confirm(`Delete prayer task "${t.name}"?\n\nThis cannot be undone.`);
      if (!ok) return;

      try {
        setDeletingId(t.id);
        const { error } = await (supabase as any).from("prayer_tasks").delete().eq("id", t.id);
        if (error) throw error;

        toast({ title: "Deleted", description: "Prayer task deleted successfully." });
        await fetchTemplates();
      } catch (e: any) {
        toast({ title: "Error", description: e?.message || "Failed to delete prayer task.", variant: "destructive" });
      } finally {
        setDeletingId(null);
      }
    },
    [fetchTemplates, toast]
  );

  const deleteCompletedUserTask = useCallback(
    async (utId: string) => {
      const ok = window.confirm(`Delete this completed prayer record?\n\nThis cannot be undone.`);
      if (!ok) return;

      try {
        setDeletingUserTaskId(utId);
        const { error } = await (supabase as any).from("prayer_user_tasks").delete().eq("id", utId);
        if (error) throw error;

        toast({ title: "Deleted", description: "Completed prayer record deleted successfully." });
        await fetchTracking();
      } catch (e: any) {
        toast({ title: "Error", description: e?.message || "Failed to delete completed prayer record.", variant: "destructive" });
      } finally {
        setDeletingUserTaskId(null);
      }
    },
    [fetchTracking, toast]
  );

  const rows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const today = new Date().toISOString().slice(0, 10);
    return userTasks
      .map((ut) => {
        const duration =
          (ut.task as any)?.duration_days ||
          (ut.task as any)?.number_of_days ||
          daysBetweenInclusive(ut.start_date, ut.end_date);

        // Completion rule: completed when current_day reaches/exceeds duration (not based on end_date passing).
        const isDone = Number(ut.current_day) >= Number(duration);
        const status: "TODO" | "DONE" = isDone ? "DONE" : "TODO";
        const visibility: "shared" | "private" = ut.task?.is_shared ? "shared" : "private";

        const isUpcoming = ut.start_date > today;
        const isOverdue = !isDone && today > ut.end_date;
        const isInProgress = !isUpcoming && !isDone && !isOverdue;
        const startStatus: "upcoming" | "in_progress" | "done" | "overdue" = isUpcoming
          ? "upcoming"
          : isDone
            ? "done"
            : isOverdue
              ? "overdue"
              : "in_progress";

        const profile = ut.user_id ? profilesByUserId.get(ut.user_id) : undefined;
        const displayName = profile?.full_name || ut.name || ut.email;
        const displayEmail = profile?.email || ut.email;
        const displayPhone = ut.phone_number || "-";

        const daysRemaining = Math.max(0, duration - ut.current_day);

        const folderId = ut.task?.folder_id ? String(ut.task.folder_id) : "";
        const folderName = folderId && folderMap.has(folderId) ? folderMap.get(folderId) : "—";

        return {
          ut,
          duration,
          status,
          visibility,
          startStatus,
          daysRemaining,
          displayName,
          displayEmail,
          displayPhone,
          folderName,
        };
      })
      .filter(({ ut, status, visibility, startStatus, displayName, displayEmail, displayPhone }) => {
        if (statusFilter !== "all" && status !== statusFilter) return false;
        if (visibilityFilter !== "all" && visibility !== visibilityFilter) return false;
        if (activeOnly && !ut.is_active) return false;
        if (startStatusFilter !== "all" && startStatus !== startStatusFilter) return false;
        if (!q) return true;

        const taskName = ut.task?.name || "";
        const person = ut.person_needs_help || "";
        return (
          taskName.toLowerCase().includes(q) ||
          person.toLowerCase().includes(q) ||
          displayName.toLowerCase().includes(q) ||
          (displayEmail || "").toLowerCase().includes(q) ||
          (displayPhone || "").toLowerCase().includes(q)
        );
      });
  }, [activeOnly, folderMap, profilesByUserId, searchTerm, startStatusFilter, statusFilter, userTasks, visibilityFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Prayer Tracking</h1>
          <p className="text-muted-foreground mt-1">Read-only tracking of who joined which prayer and their progress</p>
        </div>
        <Button className="rounded-[8px]" onClick={openCreate}>
          Create Prayer Task
        </Button>
      </div>

      <Card className="border border-muted/20 p-0 rounded-lg bg-white/5">
        <CardHeader>
          <CardTitle>Prayer Task Templates</CardTitle>
          <CardDescription>Create and manage the prayer tasks that users can join from the Catholic section</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-4 flex-wrap items-center">
            <div className="flex-1 min-w-[260px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  className="pl-10 border-0 rounded-[8px] shadow-none mt-0 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
                />
              </div>
            </div>
          </div>

          {templatesLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <span className="ml-3 text-muted-foreground">Loading...</span>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No prayer tasks found.</div>
          ) : (
            <div className="rounded-md border border-muted/20 overflow-x-auto mt-4">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-muted/20 bg-white/15 text-white">
                    <th className="text-left px-4 py-3">Task</th>
                    <th className="text-left px-4 py-3">Duration</th>
                    <th className="text-left px-4 py-3">Link</th>
                    <th className="text-left px-4 py-3">Visibility</th>
                    <th className="text-left px-4 py-3">ID (for mapping)</th>
                    <th className="text-right px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTemplates.map((t) => (
                    <tr key={t.id} className="border-b border-muted/20 hover:bg-white/10 text-white">
                      <td className="px-4 py-3">{t.name}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{t.duration_days || t.number_of_days} days</td>
                      <td className="px-4 py-3">
                        {t.link_or_video ? (
                          <a className="text-primary hover:underline" href={t.link_or_video} target="_blank" rel="noreferrer">
                            Open
                          </a>
                        ) : (
                          <span className="text-white/60">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {t.is_shared ? (
                          <Badge className="bg-green-600 text-white">Shared</Badge>
                        ) : (
                          <Badge variant="outline" className="text-white border-white/30">
                            Private
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <code className="text-xs text-white/80">{t.id}</code>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 px-2 rounded-[8px] border-white/30 text-white bg-transparent hover:bg-white/10"
                            onClick={() => openEdit(t)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 px-2 rounded-[8px] border-red-500/50 text-red-200 bg-transparent hover:bg-red-500/10"
                            disabled={deletingId === t.id}
                            onClick={() => deleteTemplate(t)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-muted/20 p-0 rounded-lg bg-white/5">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search by prayer name, user, or “Person who needs help”</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[260px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-0 rounded-[8px] shadow-none mt-0 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger
                className="rounded-[8px] border-0 border-muted-foreground/60 hover:border-muted-foreground shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400 h-[40px] w-[200px]"
                style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}
              >
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="border-secondary-foreground bg-black/90 text-white">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="TODO">TODO</SelectItem>
                <SelectItem value="DONE">DONE</SelectItem>
              </SelectContent>
            </Select>

            <Select value={visibilityFilter} onValueChange={(v: any) => setVisibilityFilter(v)}>
              <SelectTrigger
                className="rounded-[8px] border-0 border-muted-foreground/60 hover:border-muted-foreground shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400 h-[40px] w-[200px]"
                style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}
              >
                <SelectValue placeholder="Filter by visibility" />
              </SelectTrigger>
              <SelectContent className="border-secondary-foreground bg-black/90 text-white">
                <SelectItem value="all">All Visibility</SelectItem>
                <SelectItem value="shared">Shared</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>

            <Select value={startStatusFilter} onValueChange={(v: any) => setStartStatusFilter(v)}>
              <SelectTrigger
                className="rounded-[8px] border-0 border-muted-foreground/60 hover:border-muted-foreground shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400 h-[40px] w-[220px]"
                style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}
              >
                <SelectValue placeholder="Filter by start status" />
              </SelectTrigger>
              <SelectContent className="border-secondary-foreground bg-black/90 text-white">
                <SelectItem value="all">All Start Status</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 h-[40px] px-2">
              <Checkbox checked={activeOnly} onCheckedChange={(v) => setActiveOnly(Boolean(v))} />
              <span className="text-sm text-white">Active only</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-muted/20 p-0 rounded-lg bg-white/5">
        <CardHeader>
          <CardTitle>Joined Prayers</CardTitle>
          <CardDescription>{rows.length} record{rows.length !== 1 ? "s" : ""}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <span className="ml-3 text-muted-foreground">Loading...</span>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No joined prayers found.</div>
          ) : (
            <div className="rounded-md border border-muted/20 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-muted/20 bg-white/15 text-white">
                    <th className="text-left px-4 py-3">User</th>
                    <th className="text-left px-4 py-3">Prayer</th>
                    <th className="text-left px-4 py-3">Folder</th>
                    <th className="text-left px-4 py-3">Person Needs Help</th>
                    <th className="text-left px-4 py-3">Joined</th>
                    <th className="text-left px-4 py-3">Progress</th>
                    <th className="text-left px-4 py-3">Start Status</th>
                    <th className="text-left px-4 py-3">Active</th>
                    <th className="text-left px-4 py-3">Start</th>
                    <th className="text-left px-4 py-3">End</th>
                    <th className="text-left px-4 py-3">Time</th>
                    <th className="text-left px-4 py-3">Visibility</th>
                    <th className="text-left px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ ut, duration, startStatus, daysRemaining, visibility, displayName, displayEmail, displayPhone, folderName }) => (
                    <tr key={ut.id} className="border-b border-muted/20 hover:bg-white/10 text-white">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium">{displayName}</div>
                        <div className="text-xs text-white/60">{displayEmail}</div>
                        <div className="text-xs text-white/60">{displayPhone}</div>
                      </td>
                      <td className="px-4 py-3">{ut.task?.name || "-"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{folderName || "—"}</td>
                      <td className="px-4 py-3">{ut.person_needs_help || "-"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {(ut.created_at || "").replace("T", " ").slice(0, 16) || "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          {ut.current_day} / {duration}
                        </div>
                        <div className="text-xs text-white/60">{daysRemaining} day{daysRemaining !== 1 ? "s" : ""} left</div>
                      </td>
                      <td className="px-4 py-3">
                        {startStatus === "done" ? (
                          <Badge className="bg-green-600 text-white">Done</Badge>
                        ) : startStatus === "overdue" ? (
                          <Badge className="bg-red-600 text-white">Overdue</Badge>
                        ) : startStatus === "upcoming" ? (
                          <Badge variant="secondary" className="bg-white/10 text-white">
                            Upcoming
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-600 text-white">In Progress</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {ut.is_active ? (
                          <Badge className="bg-green-600 text-white">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="text-white border-white/30">
                            Inactive
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{ut.start_date}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{ut.end_date}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {ut.prayer_time} <span className="text-white/60">({ut.timezone})</span>
                      </td>
                      <td className="px-4 py-3">
                        {visibility === "shared" ? (
                          <Badge className="bg-green-600 text-white">Shared</Badge>
                        ) : (
                          <Badge variant="outline" className="text-white border-white/30">
                            Private
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-black/60">
                        {startStatus === "done" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-[8px]"
                            disabled={deletingUserTaskId === ut.id}
                            onClick={() => deleteCompletedUserTask(ut.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {deletingUserTaskId === ut.id ? "Deleting..." : "Delete"}
                          </Button>
                        ) : (
                          <span className="text-xs text-black/60">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Prayer Task</DialogTitle>
            <DialogDescription>Add a new prayer task that users can claim</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Task Name *</Label>
              <Input
                value={createForm.name}
                onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Peaceful Investment"
              />
            </div>

            <div>
              <Label>Link or Video</Label>
              <Input
                value={createForm.link_or_video}
                onChange={(e) => setCreateForm((p) => ({ ...p, link_or_video: e.target.value }))}
                placeholder="/blog/<slug>  (recommended for blog prayers)"
              />
            </div>

            <div>
              <Label>Folder</Label>
              <Select value={createForm.folder_id} onValueChange={(v) => setCreateForm((p) => ({ ...p, folder_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent className="border-secondary-foreground bg-black/90 text-white">
                  <SelectItem value="none">Unassigned</SelectItem>
                  {folderOptions.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      <span style={{ marginLeft: f.depth * 12 }}>{f.depth > 0 ? "— " : ""}{f.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Number of Days *</Label>
              <Input
                type="number"
                min={1}
                value={createForm.number_of_days}
                onChange={(e) => setCreateForm((p) => ({ ...p, number_of_days: Number(e.target.value) || 1 }))}
              />
            </div>

            <div>
              <Label>Start Date *</Label>
              <Input
                type="date"
                value={createForm.start_date}
                onChange={(e) => setCreateForm((p) => ({ ...p, start_date: e.target.value }))}
              />
            </div>

            <div>
              <Label>Start Time *</Label>
              <Input
                type="time"
                value={createForm.start_time}
                onChange={(e) => setCreateForm((p) => ({ ...p, start_time: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={createForm.is_shared}
                onCheckedChange={(v) => setCreateForm((p) => ({ ...p, is_shared: Boolean(v) }))}
              />
              <span className="text-sm text-black">Make this prayer task shared (others can see and join)</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitCreate} disabled={creating}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Prayer Task</DialogTitle>
            <DialogDescription>Update an existing prayer task template</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Task Name *</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Peaceful Investment"
              />
            </div>

            <div>
              <Label>Link or Video</Label>
              <Input
                value={editForm.link_or_video}
                onChange={(e) => setEditForm((p) => ({ ...p, link_or_video: e.target.value }))}
                placeholder="/blog/<slug>  (recommended for blog prayers)"
              />
            </div>

            <div>
              <Label>Folder</Label>
              <Select value={editForm.folder_id} onValueChange={(v) => setEditForm((p) => ({ ...p, folder_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent className="border-secondary-foreground bg-black/90 text-white">
                  <SelectItem value="none">Unassigned</SelectItem>
                  {folderOptions.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      <span style={{ marginLeft: f.depth * 12 }}>{f.depth > 0 ? "— " : ""}{f.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Number of Days *</Label>
              <Input
                type="number"
                min={1}
                value={editForm.number_of_days}
                onChange={(e) => setEditForm((p) => ({ ...p, number_of_days: Number(e.target.value) || 1 }))}
              />
            </div>

            <div>
              <Label>Start Date *</Label>
              <Input
                type="date"
                value={editForm.start_date}
                onChange={(e) => setEditForm((p) => ({ ...p, start_date: e.target.value }))}
              />
            </div>

            <div>
              <Label>Start Time *</Label>
              <Input
                type="time"
                value={editForm.start_time}
                onChange={(e) => setEditForm((p) => ({ ...p, start_time: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox checked={editForm.is_shared} onCheckedChange={(v) => setEditForm((p) => ({ ...p, is_shared: Boolean(v) }))} />
              <span className="text-sm text-black">Make this prayer task shared (others can see and join)</span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditOpen(false);
                setEditId(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={submitEdit} disabled={editing || !editId}>
              {editing ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

