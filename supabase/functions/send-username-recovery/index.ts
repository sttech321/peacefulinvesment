import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Resend } from "npm:resend@3.2.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface UsernameRecoveryRequest {
  email: string;
}

// HTML escape function to prevent XSS
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

const handler = async (req: Request): Promise<Response> => {
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
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const { email }: UsernameRecoveryRequest = await req.json();

    // Validate required fields
    if (!email) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Email is required" 
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmedEmail = email.trim().toLowerCase();
    
    if (!emailRegex.test(trimmedEmail)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid email format" 
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Sending username recovery email to:", trimmedEmail);

    // The username in Supabase Auth is the email address
    const username = trimmedEmail;
    const safeEmail = escapeHtml(trimmedEmail);

    // Create email content
    const emailHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Username - Peaceful Investment</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; background-color: #f5f5f5; padding: 20px; margin: 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
          <tr>
            <td align="center" style="padding: 20px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 30px; text-align: center; background-color: #ffffff; border-bottom: 1px solid #eeeeee;">
                    <h1 style="color: #333333; margin: 0; font-size: 28px; font-weight: 600;">Your Username</h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 30px;">
                    <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                      Hello,
                    </p>
                    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                      We received a request to recover your username for your Peaceful Investment account.
                    </p>
                    
                    <div style="background-color: #f8f9fa; border-left: 4px solid #007bff; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                      <p style="color: #333333; font-size: 14px; margin: 0 0 10px 0; font-weight: 600;">Your Username:</p>
                      <p style="color: #007bff; font-size: 18px; margin: 0; font-weight: 700; word-break: break-all;">${safeEmail}</p>
                    </div>
                    
                    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">
                      You can use this email address as your username to sign in to your account.
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="https://www.peacefulinvestment.com/auth" 
                         style="background-color: #007bff; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">
                        Sign In Now
                      </a>
                    </div>
                    
                    <div style="border-top: 1px solid #eeeeee; padding-top: 20px; margin-top: 30px;">
                      <p style="color: #888888; font-size: 14px; margin: 0 0 10px 0;">
                        <strong>Security Notice:</strong> If you didn't request this username recovery, please ignore this email. Your account remains secure.
                      </p>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 30px; background-color: #f8f9fa; border-top: 1px solid #eeeeee; text-align: center;">
                    <p style="color: #aaaaaa; font-size: 12px; margin: 0 0 8px 0; line-height: 1.5;">
                      Need help? Contact our support team at <a href="mailto:support@peacefulinvestment.com" style="color: #007bff; text-decoration: none;">support@peacefulinvestment.com</a>
                    </p>
                    <p style="color: #aaaaaa; font-size: 12px; margin: 0; line-height: 1.5;">
                      © ${new Date().getFullYear()} Peaceful Investment. All rights reserved.
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
Your Username - Peaceful Investment

Hello,

We received a request to recover your username for your Peaceful Investment account.

Your Username: ${username}

You can use this email address as your username to sign in to your account.

Sign in here: https://www.peacefulinvestment.com/auth

Security Notice: If you didn't request this username recovery, please ignore this email. Your account remains secure.

Need help? Contact our support team at support@peacefulinvestment.com

© ${new Date().getFullYear()} Peaceful Investment. All rights reserved.
    `.trim();

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: "Peaceful Investment <info@peacefulinvestment.com>",
      to: [trimmedEmail],
      reply_to: "support@peacefulinvestment.com",
      subject: "Your Username - Peaceful Investment",
      text: emailText,
      html: emailHtml,
      headers: {
        'List-Unsubscribe': '<https://www.peacefulinvestment.com/unsubscribe>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'X-Mailer': 'Peaceful Investment',
        'X-Priority': '3',
        'Message-ID': `<username-recovery-${Date.now()}@peacefulinvestment.com>`,
      },
      tags: [
        { name: 'category', value: 'account' },
        { name: 'type', value: 'username_recovery' },
      ],
    });

    console.log("Username recovery email sent:", emailResponse);

    if (emailResponse.error) {
      console.error("Resend email error:", emailResponse.error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: emailResponse.error.message || "Failed to send email via Resend" 
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Username recovery email sent successfully",
      emailResponse 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-username-recovery function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Failed to send username recovery email" 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

Deno.serve(handler);

