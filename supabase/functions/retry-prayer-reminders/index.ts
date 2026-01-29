import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function parseYmd(dateStr: string): { y: number; mo: number; d: number } | null {
  const s = String(dateStr || "").trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (![y, mo, d].every(Number.isFinite)) return null;
  return { y, mo, d };
}

function ymdToUtcMs(ymd: { y: number; mo: number; d: number }): number {
  return Date.UTC(ymd.y, ymd.mo - 1, ymd.d);
}

function getLocalYmd(timeZone: string, at: Date): { y: number; mo: number; d: number } | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(at);
    const y = Number(parts.find((p) => p.type === "year")?.value);
    const mo = Number(parts.find((p) => p.type === "month")?.value);
    const d = Number(parts.find((p) => p.type === "day")?.value);
    if (![y, mo, d].every(Number.isFinite)) return null;
    return { y, mo, d };
  } catch {
    return null;
  }
}

function getLocalHm(timeZone: string, at: Date): { hh: number; mm: number } | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(at);
    const hh = Number(parts.find((p) => p.type === "hour")?.value);
    const mm = Number(parts.find((p) => p.type === "minute")?.value);
    if (![hh, mm].every(Number.isFinite)) return null;
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
    return { hh, mm };
  } catch {
    return null;
  }
}

function parsePrayerTimeToMinutes(prayerTime: string): number | null {
  const s = String(prayerTime || "").trim();
  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

function withinWindow(nowMins: number, startMins: number, windowMins: number): boolean {
  const w = Math.max(1, Math.floor(windowMins));
  const start = ((startMins % 1440) + 1440) % 1440;
  const end = (start + w) % 1440;
  if (w >= 1440) return true;
  if (start <= end) return nowMins >= start && nowMins < end;
  // Wrap-around window (e.g. 23:58 + 5 min)
  return nowMins >= start || nowMins < end;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: { ...corsHeaders, "Access-Control-Max-Age": "86400" },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const windowMinutes = Number((body as any)?.window_minutes ?? 5);

    // Get all active user tasks
    const { data: userTasks, error: tasksError } = await supabase
      .from("prayer_user_tasks")
      .select(`
        *,
        task:prayer_tasks(*)
      `)
      .eq("is_active", true);

    if (tasksError) {
      throw new Error(`Failed to fetch user tasks: ${tasksError.message}`);
    }

    const now = new Date();
    const retryResults: Array<{ user_task_id: string; retried: boolean; reason: string }> = [];

    for (const userTask of userTasks || []) {
      try {
        const tz = String((userTask as any)?.timezone || "UTC");
        const prayerTimeStr = String((userTask as any)?.prayer_time || "").trim();
        const baseMins = parsePrayerTimeToMinutes(prayerTimeStr);
        const nowHm = getLocalHm(tz, now) || getLocalHm("UTC", now);
        if (baseMins == null || !nowHm) {
          retryResults.push({ user_task_id: userTask.id, retried: false, reason: "Invalid prayer_time/timezone" });
          continue;
        }

        // Retry target: 2 hours after the configured prayer time, in the user's timezone.
        const retryAtMins = (baseMins + 120) % 1440;
        const nowMins = nowHm.hh * 60 + nowHm.mm;

        // Only retry in a tight window to avoid repeated invocations all day.
        if (!withinWindow(nowMins, retryAtMins, windowMinutes)) {
          retryResults.push({ user_task_id: userTask.id, retried: false, reason: "Not in retry window" });
          continue;
        }

        // Calculate current day based on start_date and today's date in user's timezone (same as daily reminder logic)
        const startYmd = parseYmd(String((userTask as any).start_date || ""));
        const todayYmd = getLocalYmd(tz, now) || getLocalYmd("UTC", now);
        if (!startYmd || !todayYmd) {
          retryResults.push({ user_task_id: userTask.id, retried: false, reason: "Invalid start_date/timezone" });
          continue;
        }
        const MS_DAY = 24 * 60 * 60 * 1000;
        const currentDay = Math.floor((ymdToUtcMs(todayYmd) - ymdToUtcMs(startYmd)) / MS_DAY) + 1;

        const duration = (userTask as any).task?.duration_days || (userTask as any).task?.number_of_days || 1;
        if (currentDay < 1 || currentDay > duration) {
          retryResults.push({ user_task_id: userTask.id, retried: false, reason: "Prayer not active today" });
          continue;
        }

        // If day is already completed, don't retry.
        const { count: completionCount } = await supabase
          .from("prayer_daily_completions")
          .select("id", { count: "exact", head: true })
          .eq("user_task_id", userTask.id)
          .eq("day_number", currentDay);

        if ((completionCount || 0) > 0) {
          retryResults.push({ user_task_id: userTask.id, retried: false, reason: "Day already completed" });
          continue;
        }

        // Call the daily reminder function with a service-role-only force flag (so it can send outside the normal time window).
        const reminderUrl = `${supabaseUrl}/functions/v1/send-daily-prayer-reminder`;
        const response = await fetch(reminderUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ user_task_id: userTask.id, force: true }),
        });

        if (!response.ok) {
          retryResults.push({ user_task_id: userTask.id, retried: false, reason: `Failed to invoke reminder: ${response.status} ${response.statusText}` });
          continue;
        }

        const payload = await response.json().catch(() => null);
        const resultRow = Array.isArray(payload?.results) ? payload.results[0] : null;
        const sent = Boolean(resultRow?.sent);
        retryResults.push({
          user_task_id: userTask.id,
          retried: sent,
          reason: sent ? "Retry sent" : String(resultRow?.reason || "Retry skipped"),
        });
      } catch (error) {
        retryResults.push({
          user_task_id: userTask.id,
          retried: false,
          reason: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: retryResults.length,
        retried: retryResults.filter(r => r.retried).length,
        results: retryResults,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("retry-prayer-reminders error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
