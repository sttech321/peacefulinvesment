// Deno Edge Function - uses Deno-specific imports
// Linter errors for Deno/Resend imports are expected in TypeScript
// Version: 1.0 - Custom password reset email via Resend to avoid spam
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Resend } from "npm:resend@3.2.0";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Validate required environment variables
const resendApiKey = Deno.env.get("RESEND_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!resendApiKey) {
  console.error("ERROR: RESEND_API_KEY environment variable is not set");
}

if (!supabaseUrl) {
  console.error("ERROR: SUPABASE_URL environment variable is not set");
}

if (!supabaseServiceRoleKey) {
  console.error("ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is not set");
}

const resend = new Resend(resendApiKey);

const supabaseAdmin = createClient(
  supabaseUrl ?? "",
  supabaseServiceRoleKey ?? ""
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface PasswordResetRequest {
  email: string;
  redirectTo?: string;
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
  // Log function version for debugging
  console.log("send-password-reset function v1.0 - Custom Resend email");
  
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
    // Password reset is a public endpoint - accept either Authorization or apikey header
    // This allows unauthenticated users to request password reset
    const authHeader = req.headers.get('Authorization');
    const apikeyHeader = req.headers.get('apikey');
    
    // Accept either Authorization Bearer token or apikey header
    // This is needed because Supabase validates JWT before our code runs
    // With verify_jwt = false, we should accept apikey for public access
    if (!authHeader && !apikeyHeader) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Authorization or apikey header is required" 
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Note: We accept ANON_KEY for password reset (public endpoint)
    // No need to verify user JWT since users requesting password reset aren't authenticated
    // The verify_jwt = false in config.toml should disable JWT validation at platform level

    // Check environment variables
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "RESEND_API_KEY is not configured. Please add it in Supabase Edge Function secrets." 
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Supabase configuration is missing. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Edge Function secrets." 
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { email, redirectTo }: PasswordResetRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: "Email is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Generate password reset link using Supabase Admin API
    // redirectTo should be the full URL including path (e.g., https://peacefulinvestment.com/reset-password)
    // If not provided, construct it from base URL
    let resetUrl: string;
    if (redirectTo) {
      // Use redirectTo directly - it should already be the full URL with path
      resetUrl = redirectTo;
    } else {
      // Use default base URL and append /reset-password
      const baseUrl = Deno.env.get("APP_BASE_URL") || "https://peacefulinvestment.com";
      resetUrl = `${baseUrl}/reset-password`;
    }
    
    console.log(`Password reset URL: ${resetUrl}`);

    console.log(`Generating password reset link for email: ${trimmedEmail}`);

    // Generate password recovery link
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: trimmedEmail,
      options: {
        redirectTo: resetUrl,
      },
    });

    if (linkError || !linkData) {
      console.error("Error generating password reset link:", linkError);
      // Don't reveal if email exists - return success anyway for security
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "If an account exists with this email, a password reset link has been sent." 
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const resetLink = linkData.properties.action_link;

    // Use the same improved email template design as verification email
    const BASE_EMAIL_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
            line-height: 1.6;
            color: #1f2937;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            background-color: #f9fafb;
            margin: 0;
            padding: 20px;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        .email-wrapper {
            max-width: 600px;
            margin: 0 auto;
        }
        .container {
            background-color: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
        }
        .header {
            background: linear-gradient(135deg, #FFD700 0%, #E6C200 50%, #FFD700 100%);
            background-size: 200% 200%;
            padding: 40px 30px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        .header::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%);
            animation: shimmer 4s ease-in-out infinite;
        }
        @keyframes shimmer {
            0%, 100% { transform: translateX(-100%) translateY(-100%) rotate(30deg); }
            50% { transform: translateX(100%) translateY(100%) rotate(30deg); }
        }
        .header-content {
            position: relative;
            z-index: 1;
        }
        .header-icon {
            width: 64px;
            height: 64px;
            margin: 0 auto 20px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            backdrop-filter: blur(10px);
        }
        .header h1 {
            color: #1f2937;
            margin: 0;
            font-size: 32px;
            font-weight: 700;
            letter-spacing: -0.5px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .content {
            padding: 50px 40px;
        }
        .content h2 {
            color: #1f2937;
            font-size: 28px;
            margin-bottom: 16px;
            font-weight: 700;
            letter-spacing: -0.3px;
        }
        .content p {
            color: #6b7280;
            font-size: 16px;
            margin-bottom: 20px;
            line-height: 1.7;
        }
        .button-container {
            text-align: center;
            margin: 40px 0;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #FFD700 0%, #E6C200 100%);
            color: #1f2937;
            padding: 18px 48px;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 700;
            font-size: 18px;
            letter-spacing: 0.3px;
            box-shadow: 0 8px 24px rgba(255, 215, 0, 0.4);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
        }
        .button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
            transition: left 0.5s;
        }
        .button:hover::before {
            left: 100%;
        }
        .info-box {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-left: 5px solid #f59e0b;
            padding: 24px;
            margin: 32px 0;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(245, 158, 11, 0.1);
        }
        .info-box p {
            margin: 0;
            color: #92400e;
            font-size: 15px;
            font-weight: 500;
            line-height: 1.6;
        }
        .info-box strong {
            color: #78350f;
            font-weight: 700;
        }
        .link-box {
            background-color: #f9fafb;
            border: 2px dashed #e5e7eb;
            padding: 20px;
            margin: 24px 0;
            border-radius: 12px;
            word-break: break-all;
        }
        .link-box p {
            color: #6b7280;
            font-size: 13px;
            margin-bottom: 8px;
            font-weight: 500;
        }
        .link-box a {
            color: #2563eb;
            font-size: 13px;
            text-decoration: none;
            word-break: break-all;
        }
        .link-box a:hover {
            text-decoration: underline;
        }
        .divider {
            height: 2px;
            background: linear-gradient(90deg, transparent, #e5e7eb, transparent);
            margin: 40px 0;
            border-radius: 2px;
        }
        .footer {
            background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
            padding: 40px 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        .footer p {
            color: #9ca3af;
            font-size: 13px;
            margin: 0 0 12px 0;
            line-height: 1.6;
        }
        .footer strong {
            color: #6b7280;
        }
        .footer-links {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
        }
        .footer-links a {
            color: #9ca3af;
            text-decoration: none;
            font-size: 12px;
            margin: 0 8px;
            transition: color 0.2s;
        }
        .footer-links a:hover {
            color: #FFD700;
        }
        .footer-links span {
            color: #d1d5db;
            margin: 0 4px;
        }
        @media (max-width: 600px) {
            body {
                padding: 10px;
            }
            .container {
                border-radius: 12px;
            }
            .header {
                padding: 30px 20px;
            }
            .header h1 {
                font-size: 26px;
            }
            .header-icon {
                width: 56px;
                height: 56px;
                font-size: 28px;
            }
            .content {
                padding: 35px 25px;
            }
            .content h2 {
                font-size: 24px;
            }
            .button {
                padding: 16px 36px;
                font-size: 16px;
                width: 100%;
                max-width: 280px;
            }
            .footer {
                padding: 30px 20px;
            }
        }
    </style>
</head>
<body>
    <div class="email-wrapper">
        <div class="container">
            <div class="header">
                <div class="header-content">
                    <div class="header-icon">🔒</div>
                    <h1>Peaceful Investment</h1>
                </div>
            </div>
            <div class="content">
                {{content}}
            </div>
            <div class="footer">
                <p>
                    This email was sent by <strong>Peaceful Investment Security</strong>
                </p>
                <p style="margin-top: 12px;">
                    © ${new Date().getFullYear()} Peaceful Investment. All rights reserved.
                </p>
                <div class="footer-links">
                    <a href="https://peacefulinvestment.com">Website</a>
                    <span>•</span>
                    <a href="https://peacefulinvestment.com/privacy">Privacy</a>
                    <span>•</span>
                    <a href="https://peacefulinvestment.com/contact">Contact</a>
                </div>
                <p style="margin-top: 20px; font-size: 11px; color: #d1d5db;">
                    You are receiving this email because a password reset was requested for your account.<br>
                    If you didn't request this, please ignore this email.
                </p>
            </div>
        </div>
    </div>
</body>
</html>
`;

    // Email content
    const emailContent = `
        <h2>Reset Your Password</h2>
        <p>We received a request to reset your password for your Peaceful Investment account. If you made this request, click the button below to reset your password.</p>
        
        <div class="button-container">
          <a href="${resetLink}" class="button">Reset Password</a>
        </div>
        
        <div class="info-box">
          <p><strong>🔐 Security Notice:</strong> This link will expire in 1 hour for your security. If you didn't request this reset, please ignore this email and consider changing your password if you're concerned about account security.</p>
        </div>
        
        <div class="link-box">
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <a href="${resetLink}">${resetLink}</a>
        </div>
        
        <div class="divider"></div>
        
        <p style="color: #6b7280; font-size: 15px; margin-top: 32px;"><strong>Didn't request a password reset?</strong></p>
        <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
    `;

    // Render template
    function renderTemplate(template: string, variables: Record<string, string>): string {
      let rendered = template;
      Object.keys(variables).forEach(key => {
        const placeholder = `{{${key}}}`;
        rendered = rendered.replace(new RegExp(placeholder, 'g'), variables[key]);
      });
      return rendered;
    }

    // Generate HTML email using template
    const emailHtml = renderTemplate(BASE_EMAIL_TEMPLATE, {
      subject: 'Reset Your Password',
      content: emailContent,
    });

    // Generate plain text version
    function stripHtml(html: string): string {
      let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
      text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
      text = text.replace(/<h[1-6][^>]*>/gi, '\n\n');
      text = text.replace(/<\/h[1-6]>/gi, '\n');
      text = text.replace(/<p[^>]*>/gi, '\n\n');
      text = text.replace(/<\/p>/gi, '');
      text = text.replace(/<br\s*\/?>/gi, '\n');
      text = text.replace(/<div[^>]*>/gi, '\n');
      text = text.replace(/<\/div>/gi, '');
      text = text.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi, '$2 ($1)');
      text = text.replace(/<strong[^>]*>/gi, '**');
      text = text.replace(/<\/strong>/gi, '**');
      text = text.replace(/<[^>]*>/g, '');
      text = text.replace(/&nbsp;/g, ' ');
      text = text.replace(/&amp;/g, '&');
      text = text.replace(/&lt;/g, '<');
      text = text.replace(/&gt;/g, '>');
      text = text.replace(/&quot;/g, '"');
      text = text.replace(/&#039;/g, "'");
      text = text.replace(/\n\s*\n\s*\n+/g, '\n\n');
      text = text.replace(/[ \t]+/g, ' ');
      text = text.replace(/^\s+|\s+$/gm, '');
      return text.trim();
    }

    const emailText = stripHtml(emailContent);

    // Send email using Resend with spam-prevention headers
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const messageId = `<password_reset.${timestamp}.${randomId}@peacefulinvestment.com>`;
    
    const emailResponse = await resend.emails.send({
      from: "Peaceful Investment Security <security@peacefulinvestment.com>",
      to: [trimmedEmail],
      reply_to: "support@peacefulinvestment.com",
      subject: "Reset Your Password - Peaceful Investment",
      text: emailText,
      html: emailHtml,
      headers: {
        // RFC 5322 compliant Message-ID
        'Message-ID': messageId,
        // Entity reference for tracking
        'X-Entity-Ref-ID': `password_reset-${timestamp}`,
        // Transactional email headers (NOT marketing)
        'Auto-Submitted': 'auto-generated',
        'X-Auto-Response-Suppress': 'All',
        // DO NOT use Precedence: bulk (that's for marketing emails)
        // DO NOT include List-Unsubscribe (triggers spam filters for transactional)
        'X-Mailer': 'Peaceful Investment',
      },
      tags: [
        { name: 'email-type', value: 'password_reset' },
        { name: 'category', value: 'security' },
      ],
    });

    if (emailResponse.error) {
      console.error("Resend error:", emailResponse.error);
      
      let errorMessage = "Failed to send email";
      if (emailResponse.error.message) {
        errorMessage = emailResponse.error.message;
        
        if (emailResponse.error.message.includes("API key")) {
          errorMessage = "Email service configuration error. Please check RESEND_API_KEY.";
        } else if (emailResponse.error.message.includes("domain") || emailResponse.error.message.includes("sender")) {
          errorMessage = "Email sender domain not verified. Please verify your domain in Resend.";
        } else if (emailResponse.error.message.includes("rate limit")) {
          errorMessage = "Email rate limit exceeded. Please try again later.";
        }
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage,
          details: emailResponse.error
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Always return success to prevent email enumeration
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "If an account exists with this email, a password reset link has been sent.",
        messageId: emailResponse.data?.id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Error in send-password-reset:", error);
    
    let errorMessage = "Unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (error.message.includes("fetch") || error.message.includes("network")) {
        errorMessage = "Network error while sending email. Please try again.";
      } else if (error.message.includes("JSON")) {
        errorMessage = "Invalid request data. Please check the request format.";
      }
    }
    
    // Always return success to prevent email enumeration
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "If an account exists with this email, a password reset link has been sent."
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

Deno.serve(handler);

