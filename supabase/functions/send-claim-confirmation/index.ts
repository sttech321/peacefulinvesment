import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Resend } from "npm:resend@3.2.0";

/* -------------------- CORS -------------------- */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/* -------------------- Utils -------------------- */
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

/* -------------------- Function -------------------- */
Deno.serve(async (req: Request) => {
  console.log("send-prayer-request v3.0 (sequential emails)");

  /* ---------- CORS Preflight ---------- */
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
    /* ---------- Validate API Key ---------- */
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not set");
    }

    const resend = new Resend(resendApiKey);

    /* ---------- Parse Body ---------- */
    const { email, task_name, person_needs_help, start_date, start_time } = await req.json();

    if (!email || !task_name || !person_needs_help || !start_date || !start_time) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const safeEmail = escapeHtml(email);
    const safeTaskName = escapeHtml(task_name);
    const safePersonNeedsHelp = escapeHtml(person_needs_help);
    const safeStartDate = escapeHtml(start_date);
    const safeStartTime = escapeHtml(start_time);

    /* ---------- User Confirmation Email ---------- */
   const userConfirmationHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Prayer Task Claimed Successfully</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; background-color: #f5f5f5; padding: 20px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
        <tr>
          <td align="center">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

              <!-- Header -->
              <tr>
                <td style="padding: 30px; text-align: center; background-color: #FFC61A;">
                  <h1 style="color: #333333; margin: 0; font-size: 28px;">
                    Prayer Request Confirmation
                  </h1>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 30px;">
                  <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Thank you for stepping forward in prayer. Your prayer task has been successfully claimed.
                  </p>

                  <!-- Task Details -->
                  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="color: #333333; font-size: 14px; margin: 0 0 12px 0;">
                      <strong>Prayer Task Name:</strong><br>
                      ${safeTaskName}
                    </p>

                    <p style="color: #333333; font-size: 14px; margin: 0 0 12px 0;">
                      <strong>Person in Need of Prayer:</strong><br>
                      ${safePersonNeedsHelp}
                    </p>

                    <p style="color: #333333; font-size: 14px; margin: 0 0 12px 0;">
                      <strong>Start Date:</strong><br>
                      ${safeStartDate}
                    </p>

                    <p style="color: #333333; font-size: 14px; margin: 0;">
                      <strong>Start Time:</strong><br>
                      ${safeStartTime}
                    </p>
                  </div>

                  <p style="color: #555555; font-size: 14px; line-height: 1.6;">
                    You will receive reminders and updates related to this prayer task. Please keep this information for your reference.
                  </p>

                  <p style="color: #888888; font-size: 12px; margin-top: 30px;">
                    If you have questions, contact us at <strong>${safeEmail}</strong>.<br>
                    May God bless you for your commitment.<br><br>
                    <strong>Peaceful Investment Team</strong>
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

    await resend.emails.send({
      from: "Peaceful Investment Support <support@peacefulinvestment.com>",
      to: [safeEmail],
      reply_to: "support@peacefulinvestment.com",
      subject: "Prayer Request Confirmation",
      html: userConfirmationHtml,
    });

    /* ---------- Success ---------- */
    return new Response(
      JSON.stringify({
        success: true,
        message: "Prayer request emails sent successfully",
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("send-prayer-request error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
