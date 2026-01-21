import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Resend } from "npm:resend@3.2.0";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// SMS Provider - Using Twilio (configure via environment variables)
async function sendSMS(phoneNumber: string, message: string): Promise<boolean> {
  const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    console.warn("Twilio credentials not configured. SMS will not be sent.");
    return false;
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
      console.error("Twilio SMS error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("SMS sending error:", error);
    return false;
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

    const { user_task_id } = await req.json();

    if (!user_task_id) {
      return new Response(
        JSON.stringify({ error: "user_task_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch user task with task details
    const { data: userTask, error: taskError } = await supabase
      .from("prayer_user_tasks")
      .select(`
        *,
        task:prayer_tasks(*)
      `)
      .eq("id", user_task_id)
      .eq("is_active", true)
      .single();

    if (taskError || !userTask) {
      throw new Error(`User task not found: ${taskError?.message}`);
    }

    // Calculate current day
    const startDate = new Date(userTask.start_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - startDate.getTime();
    const currentDay = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const duration = userTask.task?.duration_days || userTask.task?.number_of_days || 1;

    if (currentDay < 1 || currentDay > duration) {
      return new Response(
        JSON.stringify({ error: "Prayer is not active today" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if already completed today
    const { data: completion } = await supabase
      .from("prayer_daily_completions")
      .select("id")
      .eq("user_task_id", user_task_id)
      .eq("day_number", currentDay)
      .single();

    if (completion) {
      return new Response(
        JSON.stringify({ message: "Day already completed, reminder not sent" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const taskName = escapeHtml(userTask.task?.name || "Prayer");
    const personName = userTask.person_needs_help
      ? ` for ${escapeHtml(userTask.person_needs_help)}`
      : "";
    const baseUrl = Deno.env.get("SITE_URL") || "https://peacefulinvestment.com";

    // Build a user-friendly link to *today's* prayer.
    // - If `link_or_video` is relative, prefix SITE_URL so it works in email/SMS.
    // - If it points to a blog post, append `?day=<n>` so the link is "that day's prayer/blog".
    const rawLink: string = userTask.task?.link_or_video || "#";
    const absoluteLink =
      rawLink.startsWith("/") && rawLink !== "#"
        ? `${baseUrl}${rawLink}`
        : rawLink;

    const shouldAppendDayParam = absoluteLink.includes("/blog/");
    const prayerLink =
      shouldAppendDayParam && absoluteLink !== "#"
        ? `${absoluteLink}${absoluteLink.includes("?") ? "&" : "?"}day=${currentDay}`
        : absoluteLink;

    // Email content
    const emailHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Daily Prayer Reminder - Day ${currentDay}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; background-color: #f5f5f5; padding: 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
          <tr>
            <td align="center">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <tr>
                  <td style="padding: 30px; background-color: #FFC61A;">
                    <h1 style="color: #333333; margin: 0; font-size: 28px;">Daily Prayer Reminder</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 30px;">
                    <h2 style="color: #333333; margin-top: 0;">Day ${currentDay} of ${duration}</h2>
                    <p style="color: #555555; font-size: 16px; line-height: 1.6;">
                      Hello ${escapeHtml(userTask.name)},
                    </p>
                    <p style="color: #555555; font-size: 16px; line-height: 1.6;">
                      This is your daily reminder for <strong>${taskName}</strong>${personName}.
                    </p>
                    <p style="color: #555555; font-size: 16px; line-height: 1.6;">
                      Please take a moment to pray today.
                    </p>
                    ${prayerLink !== "#" ? `
                    <div style="margin: 30px 0; text-align: center;">
                      <a href="${prayerLink}" style="display: inline-block; padding: 12px 24px; background-color: #FFC61A; color: #333333; text-decoration: none; border-radius: 6px; font-weight: bold;">
                        View Today's Prayer
                      </a>
                    </div>
                    ` : ""}
                    <p style="color: #888888; font-size: 14px; margin-top: 30px;">
                      <a href="${baseUrl}/prayer-tasks" style="color: #888888;">View your prayer progress</a>
                    </p>
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
      to: userTask.email,
      subject: `Daily Prayer Reminder - Day ${currentDay} of ${duration} - ${taskName}`,
      html: emailHtml,
    });

    // Send SMS if phone number is provided
    let smsSent = false;
    if (userTask.phone_number) {
      const smsMessage = `Daily Prayer Reminder - Day ${currentDay} of ${duration}\n\n${taskName}${personName}\n\nView: ${prayerLink !== "#" ? prayerLink : baseUrl + "/prayer-tasks"}`;
      smsSent = await sendSMS(userTask.phone_number, smsMessage);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Reminder sent",
        email_sent: true,
        sms_sent: smsSent,
        day: currentDay,
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
