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

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests FIRST
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Access-Control-Max-Age": "86400", // Cache preflight for 24 hours
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
    let requestData;
    try {
      requestData = await req.json();
    } catch (parseError) {
      return new Response(JSON.stringify({ error: "Invalid JSON in request body" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    // Validate required fields
    if (!requestData.email || !requestData.prayer_request) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    console.log("Prayer request received:", {
      email: requestData.email,
      search_term: requestData.search_term,
      timestamp: new Date().toISOString(),
    });

    // Escape user input for security
    const safeEmail = requestData.email;
    const safePrayerRequest = escapeHtml(requestData.prayer_request);
    const safeSearchTerm = requestData.search_term ? escapeHtml(requestData.search_term) : "Not specified";

    // Send notification email to admin
    const adminEmailHtml = `
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
                  <td style="padding: 30px; background-color: #007bff;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">New Prayer Request</h1>
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
                        <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee;">${safeSearchTerm}</td>
                      </tr>
                    </table>
                    <h3 style="color: #333333; margin-top: 30px;">Prayer Request</h3>
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 10px;">
                      <p style="color: #555555; margin: 0; white-space: pre-wrap; line-height: 1.6;">${safePrayerRequest}</p>
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

    const adminEmailText = `
New Prayer Request

Email: ${requestData.email}
Searched For: ${safeSearchTerm}

Prayer Request:
${requestData.prayer_request}

Submitted: ${new Date().toLocaleString()}
    `.trim();

    // Send confirmation email to user
    const userEmailHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Prayer Request Received</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; background-color: #f5f5f5; padding: 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
          <tr>
            <td align="center">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <tr>
                  <td style="padding: 30px; text-align: center; background-color: #ffffff;">
                    <h1 style="color: #333333; margin: 0; font-size: 28px;">Prayer Request Received</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 30px;">
                    <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                      Thank you for your prayer request.
                    </p>
                    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                      We have received your request and will add it to our prayer list. Our community will join you in prayer.
                    </p>
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                      <p style="color: #333333; font-size: 14px; margin: 0 0 10px 0;"><strong>Your Prayer Request:</strong></p>
                      <p style="color: #555555; font-size: 14px; margin: 0; white-space: pre-wrap;">${safePrayerRequest}</p>
                    </div>
                    <p style="color: #888888; font-size: 12px; margin-top: 30px;">
                      May God bless you and answer your prayers.<br>
                      Peaceful Investment Prayer Team
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

    const userEmailText = `
Prayer Request Received

Thank you for your prayer request.

We have received your request and will add it to our prayer list. Our community will join you in prayer.

Your Prayer Request:
${requestData.prayer_request}

May God bless you and answer your prayers.
Peaceful Investment Prayer Team
    `.trim();

    // Send emails using Resend
    const emailPromises = [];

    // Send to admin/support team
    emailPromises.push(
      resend.emails.send({
        from: "Peaceful Investment <info@peacefulinvestment.com>",
        to: ["support@peacefulinvestment.com"],
        reply_to: safeEmail,
        subject: `New Prayer Request: ${safeSearchTerm}`,
        text: adminEmailText,
        html: adminEmailHtml,
        headers: {
          'X-Priority': '1',
          'X-Mailer': 'Peaceful Investment',
          'Message-ID': `<prayer-request-${Date.now()}@peacefulinvestment.com>`,
        },
        tags: [
          { name: 'category', value: 'prayer' },
          { name: 'type', value: 'prayer_request' },
        ],
      })
    );

    // Send confirmation to user
    emailPromises.push(
      resend.emails.send({
        from: "Peaceful Investment <info@peacefulinvestment.com>",
        to: [safeEmail],
        reply_to: "support@peacefulinvestment.com",
        subject: "Prayer Request Received - Peaceful Investment",
        text: userEmailText,
        html: userEmailHtml,
        headers: {
          'List-Unsubscribe': '<https://www.peacefulinvestment.com/unsubscribe>',
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          'X-Mailer': 'Peaceful Investment',
          'X-Priority': '3',
          'Message-ID': `<prayer-confirmation-${Date.now()}@peacefulinvestment.com>`,
        },
        tags: [
          { name: 'category', value: 'prayer' },
          { name: 'type', value: 'confirmation' },
        ],
      })
    );

    // Wait for both emails to be sent
    const results = await Promise.allSettled(emailPromises) as Array<PromiseSettledResult<any>>;
    
    const adminResult = results[0];
    const userResult = results[1];

    // Log results
    console.log("Email sending results:", {
      admin: adminResult.status === 'fulfilled' ? 'sent' : 'failed',
      user: userResult.status === 'fulfilled' ? 'sent' : 'failed',
    });

    // Return success even if one email fails (non-critical)
    return new Response(JSON.stringify({ 
      success: true, 
      message: "Prayer request sent successfully",
      emails: {
        admin: adminResult.status === 'fulfilled',
        user: userResult.status === 'fulfilled',
      }
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error) {
    console.error("Error processing prayer request:", error);
    
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
