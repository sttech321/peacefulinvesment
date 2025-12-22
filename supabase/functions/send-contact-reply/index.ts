import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Resend } from "npm:resend@3.2.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// HTML escape function
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

interface ReplyRequest {
  to_email: string;
  to_name: string;
  subject: string;
  original_message: string;
  reply_message: string;
  original_subject?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests FIRST
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  }

  try {
    const {
      to_email,
      to_name,
      subject,
      original_message,
      reply_message,
      original_subject,
    }: ReplyRequest = await req.json();

    // Validate required fields
    if (!to_email || !to_name || !reply_message) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    // Escape user input
    const safeName = escapeHtml(to_name);
    const safeReply = escapeHtml(reply_message);
    const safeOriginal = escapeHtml(original_message || "");
    const safeSubject = escapeHtml(subject || `Re: ${original_subject || "Your Contact Request"}`);

    // Create email content
    const emailHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${safeSubject}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; background-color: #f5f5f5; padding: 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
          <tr>
            <td align="center">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <tr>
                  <td style="padding: 30px; text-align: center; background-color: #ffffff;">
                    <h1 style="color: #333333; margin: 0; font-size: 28px;">Reply to Your Contact Request</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 30px;">
                    <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                      Hello ${safeName},
                    </p>
                    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                      Thank you for contacting us. We've received your message and here's our response:
                    </p>
                    
                    ${original_message ? `
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
                      <p style="color: #333333; font-size: 14px; margin: 0 0 10px 0; font-weight: 600;">Your Original Message:</p>
                      <p style="color: #555555; font-size: 14px; margin: 0; white-space: pre-wrap;">${safeOriginal}</p>
                    </div>
                    ` : ''}
                    
                    <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
                      <p style="color: #333333; font-size: 14px; margin: 0 0 10px 0; font-weight: 600;">Our Response:</p>
                      <p style="color: #555555; font-size: 14px; margin: 0; white-space: pre-wrap;">${safeReply}</p>
                    </div>
                    
                    <p style="color: #555555; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                      If you have any further questions, please don't hesitate to contact us at <a href="mailto:support@peacefulinvestment.com">support@peacefulinvestment.com</a> or call us at +1 (772) 321-1897.
                    </p>
                    <p style="color: #888888; font-size: 12px; margin-top: 30px;">
                      Best regards,<br>
                      Peaceful Investment Support Team
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

    const emailText = `
Reply to Your Contact Request

Hello ${to_name},

Thank you for contacting us. We've received your message and here's our response:

${original_message ? `Your Original Message:\n${original_message}\n\n` : ''}Our Response:
${reply_message}

If you have any further questions, please don't hesitate to contact us at support@peacefulinvestment.com or call us at +1 (772) 321-1897.

Best regards,
Peaceful Investment Support Team
    `.trim();

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: "Peaceful Investment <info@peacefulinvestment.com>",
      to: [to_email],
      reply_to: "support@peacefulinvestment.com",
      subject: safeSubject,
      text: emailText,
      html: emailHtml,
    });

    console.log("Reply email sent successfully:", emailResponse);

    return new Response(JSON.stringify({
      success: true,
      message: "Reply sent successfully",
      emailResponse
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error sending contact reply:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Internal server error"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  }
});

