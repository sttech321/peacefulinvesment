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
    const { email, prayer_request, search_term } = await req.json();

    if (!email || !prayer_request) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const safeEmail = escapeHtml(email);
    const safePrayer = escapeHtml(prayer_request);
    const safeSearch = search_term ? escapeHtml(search_term) : "Not specified";

    /* ---------- Admin Email ---------- */
    const adminHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Prayer Request</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; background-color: #f5f5f5; padding: 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
          <tr>
            <td align="center">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <tr>
                  <td style="padding: 30px; background-color: #FFC61A;">
                    <h1 style="color: #333333; margin: 0; font-size: 28px;">New Prayer Request</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 30px;">
                    <h2 style="color: #333333; margin-top: 0;">Request Details</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee;"><strong>Email:</strong></td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee;"><a href="mailto:${safeEmail}">${safeEmail}</a></td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee;"><strong>Searched For:</strong></td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee;">${safeSearch}</td>
                      </tr>
                    </table>
                    <h3 style="color: #333333; margin-top: 30px;">Prayer Request</h3>
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 10px;">
                      <p style="color: #555555; margin: 0; white-space: pre-wrap; line-height: 1.6;">${safePrayer}</p>
                    </div>
                    <p style="color: #888888; font-size: 12px; margin-top: 30px;">
                      Submitted: ${new Date().toLocaleString()}
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
      to: ["st.tech321@gmail.com"],
      reply_to: safeEmail,
      subject: `New Prayer Request: ${safeSearch}`,
      html: adminHtml,
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
