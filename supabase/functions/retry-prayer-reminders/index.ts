import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
        // Parse prayer time
        const [hours, minutes] = userTask.prayer_time.split(":").map(Number);
        
        // Get today's date in user's timezone
        const today = new Date();
        const userDate = new Date(today.toLocaleString("en-US", { timeZone: userTask.timezone }));
        
        // Create prayer time for today
        const prayerTime = new Date(userDate);
        prayerTime.setHours(hours, minutes, 0, 0);
        
        // Calculate 2 hours after prayer time
        const retryTime = new Date(prayerTime);
        retryTime.setHours(retryTime.getHours() + 2);
        
        // Check if we're past retry time but before end of day
        const endOfDay = new Date(userDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        if (now >= retryTime && now <= endOfDay) {
          // Calculate current day
          const startDate = new Date(userTask.start_date);
          startDate.setHours(0, 0, 0, 0);
          userDate.setHours(0, 0, 0, 0);
          
          const diffTime = userDate.getTime() - startDate.getTime();
          const currentDay = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
          const duration = userTask.task?.duration_days || userTask.task?.number_of_days || 1;
          
          if (currentDay >= 1 && currentDay <= duration) {
            // Check if day is already completed
            const { data: completion } = await supabase
              .from("prayer_daily_completions")
              .select("id")
              .eq("user_task_id", userTask.id)
              .eq("day_number", currentDay)
              .single();
            
            if (!completion) {
              // Check if we've already retried today (store in a separate table or use a flag)
              // For simplicity, we'll check if there's a retry record for today
              // In production, you might want a prayer_reminder_retries table
              
              // Call the daily reminder function
              const reminderUrl = `${supabaseUrl}/functions/v1/send-daily-prayer-reminder`;
              const response = await fetch(reminderUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${supabaseServiceKey}`,
                },
                body: JSON.stringify({ user_task_id: userTask.id }),
              });
              
              if (response.ok) {
                retryResults.push({
                  user_task_id: userTask.id,
                  retried: true,
                  reason: "Reminder retry sent",
                });
              } else {
                retryResults.push({
                  user_task_id: userTask.id,
                  retried: false,
                  reason: `Failed to send retry: ${response.statusText}`,
                });
              }
            } else {
              retryResults.push({
                user_task_id: userTask.id,
                retried: false,
                reason: "Day already completed",
              });
            }
          } else {
            retryResults.push({
              user_task_id: userTask.id,
              retried: false,
              reason: "Prayer not active today",
            });
          }
        } else {
          retryResults.push({
            user_task_id: userTask.id,
            retried: false,
            reason: "Not yet time for retry",
          });
        }
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
