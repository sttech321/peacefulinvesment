// Deno Edge Function - uses Deno-specific imports
// Linter errors for Deno/Resend imports are expected in TypeScript
// Version: 2.0 - Fixed getUserByEmail error (removed non-existent method)
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

interface EmailVerificationRequest {
  email: string;
  fullName?: string;
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
  console.log("send-email-verification function v2.0 - getUserByEmail removed");
  
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
    // Validate Authorization header (even though JWT verification is disabled, we check for ANON_KEY)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Authorization header is required" 
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

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

    const { email, fullName, redirectTo }: EmailVerificationRequest = await req.json();

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

    // Generate verification link using Supabase Admin API
    const baseUrl = redirectTo || Deno.env.get("APP_BASE_URL") || "https://peacefulinvestment.com";
    // Redirect to home page after verification - the auth state change will handle navigation
    const redirectUrl = `${baseUrl}/`;

    // Verify admin client is properly initialized
    if (!supabaseAdmin || !supabaseAdmin.auth || !supabaseAdmin.auth.admin) {
      console.error("Supabase admin client not properly initialized");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Server configuration error. Please contact support." 
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Verify generateLink method exists
    if (typeof supabaseAdmin.auth.admin.generateLink !== 'function') {
      console.error("generateLink method not available on admin client");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Server configuration error. Please contact support." 
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Try to generate link - start with 'signup' type for new users
    // If user already exists, we'll catch the error and try 'email' type
    let userData: any = null;
    let userError: any = null;
    
    console.log(`Attempting to generate signup link for email: ${trimmedEmail}`);
    
    try {
      const signupLinkResult = await supabaseAdmin.auth.admin.generateLink({
        type: 'signup',
        email: trimmedEmail,
        options: {
          redirectTo: redirectUrl,
        },
      });
      
      userData = signupLinkResult.data;
      userError = signupLinkResult.error;
    } catch (err: any) {
      console.error("Error calling generateLink (signup):", err);
      userError = err;
    }

    // If signup type failed (likely because user already exists), try email type
    if (userError || !userData) {
      console.log('Signup link generation failed, trying email type as fallback...', userError?.message);
      
      try {
        const emailLinkResult = await supabaseAdmin.auth.admin.generateLink({
          type: 'email',
          email: trimmedEmail,
          options: {
            redirectTo: redirectUrl,
          },
        });
        
        if (!emailLinkResult.error && emailLinkResult.data) {
          userData = emailLinkResult.data;
          userError = null;
          console.log('Successfully generated email verification link');
        } else {
          // Keep the original error if email type also fails
          userError = emailLinkResult.error || userError;
        }
      } catch (err: any) {
        console.error("Error calling generateLink (email):", err);
        userError = err || userError;
      }
    }

    if (userError || !userData) {
      console.error("Error generating verification link:", userError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: userError?.message || "Failed to generate verification link. Please try again or contact support." 
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const verificationLink = userData.properties.action_link;

    // Use EMAIL_TEMPLATES structure - matching src/templates/email/EmailTemplates.ts
    const BASE_EMAIL_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{subject}}</title>
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
        .content .greeting {
            color: #4b5563;
            font-size: 18px;
            margin-bottom: 24px;
            font-weight: 500;
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
        .button:hover {
            transform: translateY(-3px);
            box-shadow: 0 12px 32px rgba(255, 215, 0, 0.5);
        }
        .button:active {
            transform: translateY(-1px);
        }
        .info-box {
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            border-left: 5px solid #3b82f6;
            padding: 24px;
            margin: 32px 0;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
        }
        .info-box p {
            margin: 0;
            color: #1e40af;
            font-size: 15px;
            font-weight: 500;
            line-height: 1.6;
        }
        .info-box strong {
            color: #1e3a8a;
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
        .steps-box {
            background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
            padding: 32px;
            border-radius: 16px;
            margin: 40px 0;
            border: 1px solid #e5e7eb;
        }
        .steps-box h3 {
            color: #1f2937;
            font-size: 20px;
            font-weight: 700;
            margin: 0 0 20px 0;
            letter-spacing: -0.2px;
        }
        .steps-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .steps-list li {
            color: #4b5563;
            font-size: 15px;
            margin-bottom: 16px;
            padding-left: 32px;
            position: relative;
            line-height: 1.6;
        }
        .steps-list li::before {
            content: '✓';
            position: absolute;
            left: 0;
            top: 0;
            width: 24px;
            height: 24px;
            background: linear-gradient(135deg, #FFD700 0%, #E6C200 100%);
            color: #1f2937;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 12px;
            box-shadow: 0 2px 8px rgba(255, 215, 0, 0.3);
        }
        .steps-list li:last-child {
            margin-bottom: 0;
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
            .content .greeting {
                font-size: 16px;
            }
            .button {
                padding: 16px 36px;
                font-size: 16px;
                width: 100%;
                max-width: 280px;
            }
            .steps-box {
                padding: 24px;
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
                    <div class="header-icon">🔐</div>
                    <h1>Peaceful Investment</h1>
                </div>
            </div>
            <div class="content">
                {{content}}
            </div>
            <div class="footer">
                <p>
                    This email was sent by <strong>Peaceful Investment</strong>
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
                    You are receiving this email because you have an account with Peaceful Investment.<br>
                    <a href="https://peacefulinvestment.com/unsubscribe" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a>
                </p>
            </div>
        </div>
    </div>
</body>
</html>
`;

    // Email content matching EMAIL_TEMPLATES[EmailType.EMAIL_VERIFICATION]
    const emailContent = `
        <h2>Welcome to Peaceful Investment!</h2>
        <p class="greeting">Thank you for creating your account${fullName ? `, ${escapeHtml(fullName)}` : ''}!</p>
        <p>We're excited to have you join our community of smart investors. To complete your registration and start your investment journey, please verify your email address by clicking the button below.</p>
        
        <div class="button-container">
          <a href="${verificationLink}" class="button">Verify Email Address</a>
        </div>
        
        <div class="info-box">
          <p><strong>💡 Important:</strong> If this link expires, you can request a new verification email from the sign-in page.</p>
        </div>
        
        <div class="link-box">
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <a href="${verificationLink}">${verificationLink}</a>
        </div>
        
        <div class="steps-box">
          <h3>What's next after verification?</h3>
          <ul class="steps-list">
            <li>Complete your profile setup</li>
            <li>Explore investment opportunities</li>
            <li>Set up your trading preferences</li>
            <li>Start your investment journey</li>
          </ul>
        </div>
        
        <div class="divider"></div>
        
        <p style="color: #6b7280; font-size: 15px; margin-top: 32px;"><strong>Didn't create an account?</strong></p>
        <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">If you didn't create an account with Peaceful Investment, please ignore this email. No account will be created without email verification.</p>
    `;

    // Render template (matching renderTemplate function from BaseTemplate.ts)
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
      subject: 'Verify Your Email Address',
      content: emailContent,
    });

    // Generate plain text version (strip HTML from content)
    // Matching ResendService.stripHtml() method
    function stripHtml(html: string): string {
      let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
      text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
      text = text.replace(/<h[1-6][^>]*>/gi, '\n\n');
      text = text.replace(/<\/h[1-6]>/gi, '\n');
      text = text.replace(/<p[^>]*>/gi, '\n\n');
      text = text.replace(/<\/p>/gi, '');
      text = text.replace(/<br\s*\/?>/gi, '\n');
      text = text.replace(/<li[^>]*>/gi, '\n• ');
      text = text.replace(/<\/li>/gi, '');
      text = text.replace(/<ul[^>]*>/gi, '\n');
      text = text.replace(/<\/ul>/gi, '\n');
      text = text.replace(/<ol[^>]*>/gi, '\n');
      text = text.replace(/<\/ol>/gi, '\n');
      text = text.replace(/<div[^>]*>/gi, '\n');
      text = text.replace(/<\/div>/gi, '');
      text = text.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi, '$2 ($1)');
      text = text.replace(/<strong[^>]*>/gi, '**');
      text = text.replace(/<\/strong>/gi, '**');
      text = text.replace(/<em[^>]*>/gi, '*');
      text = text.replace(/<\/em>/gi, '*');
      text = text.replace(/<b[^>]*>/gi, '**');
      text = text.replace(/<\/b>/gi, '**');
      text = text.replace(/<i[^>]*>/gi, '*');
      text = text.replace(/<\/i>/gi, '*');
      text = text.replace(/<[^>]*>/g, '');
      text = text.replace(/&nbsp;/g, ' ');
      text = text.replace(/&amp;/g, '&');
      text = text.replace(/&lt;/g, '<');
      text = text.replace(/&gt;/g, '>');
      text = text.replace(/&quot;/g, '"');
      text = text.replace(/&#039;/g, "'");
      text = text.replace(/&apos;/g, "'");
      text = text.replace(/\n\s*\n\s*\n+/g, '\n\n');
      text = text.replace(/[ \t]+/g, ' ');
      text = text.replace(/^\s+|\s+$/gm, '');
      return text.trim();
    }

    // Generate plain text from the content (matching EMAIL_TEMPLATES structure)
    const emailText = stripHtml(emailContent);

    // Send email using Resend
    // Using EMAIL_TEMPLATES structure - matching EmailType.EMAIL_VERIFICATION
    // Headers optimized to avoid spam filters (matching ResendService best practices)
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const messageId = `<email_verification.${timestamp}.${randomId}@peacefulinvestment.com>`;
    
    const emailResponse = await resend.emails.send({
      from: "Peaceful Investment Security <security@peacefulinvestment.com>",
      to: [trimmedEmail],
      reply_to: "support@peacefulinvestment.com", // Always set reply-to for better deliverability
      subject: "Verify Your Email Address - Peaceful Investment", // Matching EMAIL_TEMPLATES subject
      text: emailText, // Always include text version for better deliverability
      html: emailHtml,
      headers: {
        // RFC 5322 compliant Message-ID for better deliverability
        'Message-ID': messageId,
        // Entity reference for tracking
        'X-Entity-Ref-ID': `email_verification-${timestamp}`,
        // Transactional email headers (DO NOT use 'Precedence: bulk' - that's for marketing)
        'Auto-Submitted': 'auto-generated', // Marks as transactional, not marketing
        'X-Auto-Response-Suppress': 'All', // Prevents auto-replies
        // DO NOT include List-Unsubscribe for transactional emails (triggers spam filters)
        // DO NOT use X-Priority (can trigger spam filters)
      },
      tags: [
        { name: 'email-type', value: 'email_verification' },
      ],
    });

    if (emailResponse.error) {
      console.error("Resend error:", emailResponse.error);
      
      // Provide more specific error messages
      let errorMessage = "Failed to send email";
      if (emailResponse.error.message) {
        errorMessage = emailResponse.error.message;
        
        // Check for common Resend errors
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

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Verification email sent successfully",
        messageId: emailResponse.data?.id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Error in send-email-verification:", error);
    
    let errorMessage = "Unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Provide more context for common errors
      if (error.message.includes("fetch") || error.message.includes("network")) {
        errorMessage = "Network error while sending email. Please try again.";
      } else if (error.message.includes("JSON")) {
        errorMessage = "Invalid request data. Please check the request format.";
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        type: error instanceof Error ? error.constructor.name : "Unknown"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

Deno.serve(handler);

