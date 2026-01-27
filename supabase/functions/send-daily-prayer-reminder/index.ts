import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Resend } from "npm:resend@3.2.0";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function envFlag(name: string, defaultValue = false): boolean {
  const raw = Deno.env.get(name);
  if (raw === undefined) return defaultValue;
  const v = raw.trim().toLowerCase();
  if (!v) return defaultValue;
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

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
    return { hh, mm };
  } catch {
    return null;
  }
}

function parsePrayerTimeToHm(prayerTime: string): { hh: number; mm: number } | null {
  const s = String(prayerTime || "").trim();
  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return { hh, mm };
}

function isDueNow(prayerTime: string, timeZone: string, now: Date, windowMinutes = 1): boolean {
  const dueHm = parsePrayerTimeToHm(prayerTime);
  const nowHm = getLocalHm(timeZone, now);
  if (!dueHm || !nowHm) return false;
  const dueMins = dueHm.hh * 60 + dueHm.mm;
  const nowMins = nowHm.hh * 60 + nowHm.mm;
  return nowMins >= dueMins && nowMins < dueMins + Math.max(1, windowMinutes);
}

// SMS Provider - Using Twilio (configure via environment variables)
async function sendSMS(
  phoneNumber: string,
  message: string
): Promise<{ ok: boolean; error?: string; status?: number; sid?: string; skipped?: boolean }> {
  // Opt-in: keep logs clean unless SMS is explicitly enabled.
  if (!envFlag("TWILIO_ENABLE_SMS", false)) {
    return { ok: false, skipped: true };
  }

  const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    console.warn(
      "[send-daily-prayer-reminder] Twilio SMS enabled but missing env (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_PHONE_NUMBER)."
    );
    return { ok: false, error: "Twilio SMS enabled but missing required env vars." };
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
        },
        body: new URLSearchParams({
          From: twilioPhoneNumber,
          To: phoneNumber,
          Body: message,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("[send-daily-prayer-reminder] Twilio SMS error:", response.status, error);
      return { ok: false, status: response.status, error };
    }

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : null;

    // Twilio returns { sid: "SM..." , ... }
    const sid = payload && typeof payload.sid === "string" ? payload.sid : undefined;
    if (sid) {
      console.log("[send-daily-prayer-reminder] Twilio SMS queued:", sid);
    }
    return { ok: true, sid };
  } catch (error) {
    console.error("[send-daily-prayer-reminder] SMS sending exception:", error);
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

Deno.serve(async (req: Request) => {
  // MUST show up every minute when triggered by pg_cron + pg_net
  console.log("CRON HIT: send-daily-prayer-reminder", new Date().toISOString());

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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not set");
    }

    const resend = new Resend(resendApiKey);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // CRON-SAFE: request body can be {} (pg_cron + pg_net)
    const body = await req.json().catch(() => ({}));
    const windowMinutes = Number((body as any)?.window_minutes ?? 1);
    const userTaskIdFilter = String((body as any)?.user_task_id || "").trim() || null; // optional manual filter

    // Fetch ALL active prayer tasks
    let q = supabase
      .from("prayer_user_tasks")
      .select(`*, task:prayer_tasks(*)`)
      .eq("is_active", true);
    if (userTaskIdFilter) q = q.eq("id", userTaskIdFilter);

    const { data: tasks, error } = await q;
    if (error) throw error;

    if (!tasks?.length) {
      console.log("No active prayer tasks");
      return new Response(JSON.stringify({ success: true, processed: 0, sent: 0, results: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const now = new Date();
    const results: Array<{ user_task_id: string; sent: boolean; reason: string }> = [];

    for (const userTask of tasks) {
      try {
        const tz = String((userTask as any)?.timezone || "UTC");
        const prayerTime = String((userTask as any)?.prayer_time || "");

        // Only send during the configured prayer_time window (cron runs every minute).
        if (!isDueNow(prayerTime, tz, now, windowMinutes)) {
          results.push({ user_task_id: (userTask as any).id, sent: false, reason: "Not due now" });
          continue;
        }

        // Calculate current day based on start_date and today's date in user's timezone
        const startYmd = parseYmd(String((userTask as any).start_date || ""));
        const todayYmd = getLocalYmd(tz, now) || getLocalYmd("UTC", now);
        if (!startYmd || !todayYmd) {
          results.push({ user_task_id: (userTask as any).id, sent: false, reason: "Invalid start_date/timezone" });
          continue;
        }
        const MS_DAY = 24 * 60 * 60 * 1000;
        const currentDay = Math.floor((ymdToUtcMs(todayYmd) - ymdToUtcMs(startYmd)) / MS_DAY) + 1;

        const duration = (userTask as any).task?.duration_days || (userTask as any).task?.number_of_days || 1;
        if (currentDay < 1 || currentDay > duration) {
          results.push({ user_task_id: (userTask as any).id, sent: false, reason: "Prayer not active today" });
          continue;
        }

        // Skip if already completed today
        const { data: completion } = await supabase
          .from("prayer_daily_completions")
          .select("id")
          .eq("user_task_id", (userTask as any).id)
          .eq("day_number", currentDay)
          .maybeSingle();
        if (completion?.id) {
          results.push({ user_task_id: (userTask as any).id, sent: false, reason: "Day already completed" });
          continue;
        }

        // Skip if already sent today (based on last_sent_at)
        const lastSentAtRaw = (userTask as any).last_sent_at;
        if (lastSentAtRaw) {
          const lastSent = new Date(String(lastSentAtRaw));
          if (!Number.isNaN(lastSent.getTime())) {
            const lastSentYmd = getLocalYmd(tz, lastSent) || getLocalYmd("UTC", lastSent);
            if (lastSentYmd && ymdToUtcMs(lastSentYmd) === ymdToUtcMs(todayYmd)) {
              results.push({ user_task_id: (userTask as any).id, sent: false, reason: "Already sent today" });
              continue;
            }
          }
        }

        const taskName = escapeHtml((userTask as any).task?.name || "Prayer");
        const personName = (userTask as any).person_needs_help
          ? ` for ${escapeHtml((userTask as any).person_needs_help)}`
          : "";
        const baseUrl = Deno.env.get("SITE_URL") || "https://peacefulinvestment.com";

        // Build a user-friendly link to *today's* prayer.
        // - If `link_or_video` is relative, prefix SITE_URL so it works in email/SMS.
        // - If it points to a blog post, append `?day=<n>` so the link is "that day's prayer/blog".
        const rawLink: string = (userTask as any).task?.link_or_video || "#";
        const absoluteLink =
          rawLink.startsWith("/") && rawLink !== "#"
            ? `${baseUrl}${rawLink}`
            : rawLink;

        const shouldAppendDayParam = absoluteLink.includes("/blog/");
        const prayerLink =
          shouldAppendDayParam && absoluteLink !== "#"
            ? `${absoluteLink}${absoluteLink.includes("?") ? "&" : "?"}day=${currentDay}`
            : absoluteLink;

        // Email content (KEEP AS-IS)
        const emailHtml = `
      <!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no" />
     <title>Daily Prayer Reminder - Day ${currentDay}</title>
  </head>
  <body style="margin:0; padding:0; background-color:#fff;"> 
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%; background-color:#fff;">
      <tr>
        <td align="center" style="padding:28px 12px;">
          <!-- Outer container -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="container" style="width:600px; max-width:600px;">
            <!-- Main card wrapper -->
            <tr>
              <td style="padding:0 12px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="card" style="width:100%; border-radius:22px; overflow:hidden;">
                  <!-- HERO (dark / gradient) -->
                  <tr>
                    <td
                      align="center"
                      style="padding:28px; background-color:#000;"
                    >
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
                        <tr>
                          <td align="center" style="padding:0 0 16px 0;">
                            <img
                              src="https://www.peacefulinvestment.com/assets/new-logo-C1z5AvYQ.gif"
                              width="150"
                              alt="Peaceful Investment"
                              style="display:block; width:150px; max-width:100%; height:auto; border:0; outline:none; text-decoration:none;"
                            />
                          </td>
                        </tr>
                         
                      </table>
                    </td>
                  </tr>

                  <!-- BODY (light section) -->
                  <tr>
                    <td style="background-color:#f3f4f6; padding:26px 28px 30px 28px; font-family:Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
 
						<div style="font-size:24px;line-height:22px;color: #373737;font-weight: 700;padding-bottom:30px; text-align:left;">Daily Prayer Reminder</div>

						<div style="font-size:18px;line-height:22px;color: #373737;font-weight: 700;padding-bottom:10px; text-align:left;">Day ${currentDay} of ${duration}</div>


                      <div style="text-align:left;"> 

					<p style="font-size:16px; line-height:24px; color:#6b7280;margin:0; padding:0 0 7px 0;">
                      Hello ${escapeHtml((userTask as any).name)},
                    </p>
                    <p style="font-size:16px; line-height:24px; color:#6b7280;margin:0; padding:0 0 7px 0;">
                      This is your daily reminder for <strong>${taskName}</strong>${personName}.
                    </p>
                    <p style="font-size:16px; line-height:24px; color:#6b7280;margin:0; padding:0 0 7px 0;">
                      Please take a moment to pray today.
                    </p>
					 </div>
					 ${prayerLink !== "#" ? `
                    <div style="margin: 30px 0; text-align: left;">
                      <a href="${prayerLink}" style="display: inline-block; background-color:#d7111d; color: #ffffff; text-decoration: none; font-family: Segoe UI, Roboto, Helvetica, Arial, sans-serif; font-size: 16px; line-height: 18px; font-weight: 700; padding: 14px 32px; border-radius: 9999px; text-transform: uppercase;">
                        View Today's Prayer
                      </a>
                    </div>
                    ` : ""}
					
                  <p style="color: #888888; font-size: 14px; margin-top: 30px;">
                      <a href="${baseUrl}/prayer-tasks" style="color: #000000;font-weight: 600;text-decoration: underline;">View your prayer progress</a>
                    </p> 
                      
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td class="px" style="padding:16px 24px 0 24px; font-family:Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
                <div style="font-size:12px; line-height:18px; color:#6b7280; text-align:center;">
                  © <span style="color:#6b7280;">Peaceful Investment</span>. All rights reserved.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
    `;

        // Send email
        await resend.emails.send({
          from: "Peaceful Investment <support@peacefulinvestment.com>",
          to: (userTask as any).email,
          subject: `Daily Prayer Reminder - Day ${currentDay} of ${duration} - ${taskName}`,
          html: emailHtml,
        });

        // Send SMS if phone number is provided (Twilio SMS logic unchanged)
        let smsSent = false;
        let smsError: string | null = null;
        let smsSid: string | null = null;
        if ((userTask as any).phone_number) {
          const smsMessage = `Daily Prayer Reminder - Day ${currentDay} of ${duration}\n\n${taskName}${personName}\n\nView: ${prayerLink !== "#" ? prayerLink : baseUrl + "/prayer-tasks"}`;
          const smsRes = await sendSMS((userTask as any).phone_number, smsMessage);
          smsSent = smsRes.ok;
          smsSid = smsRes.ok && smsRes.sid ? smsRes.sid : null;
          smsError = smsRes.ok || smsRes.skipped ? null : (smsRes.error || null);
        }

        // Update last_sent_at AFTER successful send
        const { error: updErr } = await supabase
          .from("prayer_user_tasks")
          .update({ last_sent_at: new Date().toISOString() })
          .eq("id", (userTask as any).id);
        if (updErr) {
          console.warn("[send-daily-prayer-reminder] Failed to update last_sent_at:", updErr.message);
        }

        results.push({
          user_task_id: (userTask as any).id,
          sent: true,
          reason: smsSent ? "Email+SMS sent" : smsError ? `Email sent (SMS error: ${smsError})` : "Email sent",
        });
      } catch (e) {
        results.push({
          user_task_id: (userTask as any).id,
          sent: false,
          reason: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        sent: results.filter((r) => r.sent).length,
        results,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("send-daily-prayer-reminder error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
