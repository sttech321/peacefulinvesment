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

interface DeletionRequest {
  user_email: string;
  user_name?: string;
  deletion_reason?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
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
    // Validate Resend API key
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY environment variable is not set");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Email service configuration error" 
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const {
      user_email,
      user_name,
      deletion_reason,
    }: DeletionRequest = await req.json();

    // Validate required fields
    if (!user_email) {
      return new Response(JSON.stringify({ error: "Missing required fields: user_email" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    // Escape user input for security
    const safeName = escapeHtml(user_name || "Valued User");
    const safeEmail = escapeHtml(user_email);
    const safeReason = deletion_reason ? escapeHtml(deletion_reason) : "";

    // Create email content
    const emailHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Deletion Notice</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; background-color: #f5f5f5; padding: 0; margin: 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Account Deletion Notice</h1>
                  </td>
                </tr>
                
                <!-- Main Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                      Dear ${safeName},
                    </p>
                    
                    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                      We are writing to inform you that your account with Peaceful Investment has been permanently deleted from our system.
                    </p>
                    
                    <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; border-radius: 4px; margin: 25px 0;">
                      <p style="color: #856404; font-size: 15px; line-height: 1.6; margin: 0; font-weight: 600;">
                        ⚠️ Important: You will no longer be able to access your account or any associated services.
                      </p>
                    </div>
                    
                    ${safeReason ? `
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #6c757d;">
                      <p style="color: #333333; font-size: 14px; margin: 0 0 10px 0; font-weight: 600;">Reason for Deletion:</p>
                      <p style="color: #555555; font-size: 14px; margin: 0; line-height: 1.6;">${safeReason}</p>
                    </div>
                    ` : ''}
                    
                    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                      This action is irreversible. All your personal data, account information, and associated records have been permanently removed from our database in accordance with our data retention policies.
                    </p>
                    
                    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">
                      If you believe this deletion was made in error, or if you have any questions or concerns, please contact our support team immediately.
                    </p>
                    
                    
                    <p style="color: #888888; font-size: 12px; margin-top: 30px; line-height: 1.6;">
                      Best regards,<br>
                      <strong>Peaceful Investment Support Team</strong>
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 30px; background-color: #f8f9fa; text-align: center; border-top: 1px solid #e0e0e0;">
                    <p style="color: #888888; font-size: 12px; margin: 0; line-height: 1.6;">
                      This is an automated notification. Please do not reply to this email.
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
Account Deletion Notice

Dear ${user_name || "Valued User"},

We are writing to inform you that your account with Peaceful Investment has been permanently deleted from our system.

⚠️ Important: You will no longer be able to access your account or any associated services.

${deletion_reason ? `Reason for Deletion:\n${deletion_reason}\n\n` : ''}This action is irreversible. All your personal data, account information, and associated records have been permanently removed from our database in accordance with our data retention policies.

If you believe this deletion was made in error, or if you have any questions or concerns, please contact our support team.

Best regards,
Peaceful Investment Support Team

---
This is an automated notification. Please do not reply to this email.
    `.trim();

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: "Peaceful Investment Support <support@peacefulinvestment.com>",
      to: [user_email],
      reply_to: "support@peacefulinvestment.com",
      subject: "Account Deletion Notice - Peaceful Investment",
      text: emailText,
      html: emailHtml,
      headers: {
        'List-Unsubscribe': '<https://www.peacefulinvestment.com/unsubscribe>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'X-Mailer': 'Peaceful Investment',
        'X-Priority': '1',
        'Message-ID': `<account-deletion-${Date.now()}@peacefulinvestment.com>`,
      },
      tags: [
        { name: 'category', value: 'account' },
        { name: 'type', value: 'deletion' },
      ],
    });

    console.log("Account deletion email sent successfully:", emailResponse);

    return new Response(JSON.stringify({
      success: true,
      message: "Account deletion email sent successfully",
      emailResponse
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error sending account deletion email:", error);
    return new Response(JSON.stringify({
      success: false,
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

