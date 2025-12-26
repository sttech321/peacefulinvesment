// Deno Edge Function - uses Deno-specific imports
// Linter errors for Deno/Resend imports are expected in TypeScript
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
    const redirectUrl = `${baseUrl}/auth?mode=signup`;

    // Generate email verification token/link
    // We'll use Supabase's admin API to generate the verification link
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: trimmedEmail,
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (userError || !userData) {
      console.error("Error generating verification link:", userError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: userError?.message || "Failed to generate verification link" 
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
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            background-color: #f9fafb;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #FFD700 0%, #E6C200 100%);
            padding: 30px 20px;
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
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            animation: shimmer 3s ease-in-out infinite;
        }
        @keyframes shimmer {
            0%, 100% { transform: translateX(-100%) translateY(-100%) rotate(30deg); }
            50% { transform: translateX(100%) translateY(100%) rotate(30deg); }
        }
        .header h1 {
            color: #1f2937;
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        .content {
            padding: 40px 30px;
        }
        .content h2 {
            color: #1f2937;
            font-size: 24px;
            margin-bottom: 20px;
            font-weight: 600;
        }
        .content p {
            color: #6b7280;
            font-size: 16px;
            margin-bottom: 20px;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #FFD700 0%, #E6C200 100%);
            color: #1f2937;
            padding: 16px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
            box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
            transition: all 0.3s ease;
        }
        .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(255, 215, 0, 0.4);
        }
        .footer {
            background-color: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        .footer p {
            color: #9ca3af;
            font-size: 14px;
            margin: 0;
        }
        .footer a {
            color: #FFD700;
            text-decoration: none;
        }
        .divider {
            height: 1px;
            background: linear-gradient(90deg, transparent, #e5e7eb, transparent);
            margin: 30px 0;
        }
        .info-box {
            background-color: #f3f4f6;
            border-left: 4px solid #FFD700;
            padding: 20px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
        }
        .info-box p {
            margin: 0;
            color: #374151;
        }
        @media (max-width: 600px) {
            .container {
                margin: 10px;
                border-radius: 8px;
            }
            .header, .content, .footer {
                padding: 20px;
            }
            .header h1 {
                font-size: 24px;
            }
            .content h2 {
                font-size: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Peaceful Investment</h1>
        </div>
        <div class="content">
            {{content}}
        </div>
        <div class="footer">
            <p>
                This email was sent by <strong>Peaceful Investment</strong><br>
                If you have any questions, please contact us at 
                <a href="mailto:support@peacefulinvestment.com">support@peacefulinvestment.com</a>
            </p>
            <p style="margin-top: 15px; font-size: 12px; color: #9ca3af;">
                © ${new Date().getFullYear()} Peaceful Investment. All rights reserved.<br>
                <a href="https://peacefulinvestment.com" style="color: #9ca3af; text-decoration: none;">peacefulinvestment.com</a> | 
                <a href="https://peacefulinvestment.com/privacy" style="color: #9ca3af; text-decoration: none;">Privacy Policy</a> | 
                <a href="https://peacefulinvestment.com/contact" style="color: #9ca3af; text-decoration: none;">Contact Us</a>
            </p>
            <p style="margin-top: 10px; font-size: 11px; color: #9ca3af; line-height: 1.6;">
                You are receiving this email because you have an account with Peaceful Investment or requested this information.<br>
                <a href="https://peacefulinvestment.com/unsubscribe" style="color: #9ca3af; text-decoration: underline;">Manage email preferences</a> or 
                <a href="https://peacefulinvestment.com/unsubscribe" style="color: #9ca3af; text-decoration: underline;">unsubscribe</a> from marketing emails
            </p>
        </div>
    </div>
</body>
</html>
`;

    // Email content matching EMAIL_TEMPLATES[EmailType.EMAIL_VERIFICATION]
    const emailContent = `
        <h2>Welcome to Peaceful Investment!</h2>
        <p>Thank you for creating your account${fullName ? `, ${escapeHtml(fullName)}` : ''}. We're excited to have you join our community of smart investors.</p>
        
        <p>To complete your registration and start your investment journey, please verify your email address by clicking the button below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" class="button">Verify Email Address</a>
        </div>
        
        <div class="info-box" style="background-color: #eff6ff; border-left-color: #2563eb;">
          <p style="color: #1e40af;"><strong>Important:</strong> This verification link will expire in 24 hours. If you don't verify your email, your account will remain inactive.</p>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #2563eb; font-size: 14px;">${verificationLink}</p>
        
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin: 30px 0;">
          <p style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">What's next after verification?</p>
          <ul style="color: #4b5563; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
            <li>Complete your profile setup</li>
            <li>Explore investment opportunities</li>
            <li>Set up your trading preferences</li>
            <li>Start your investment journey</li>
          </ul>
        </div>
        
        <div class="divider"></div>
        
        <p style="color: #6b7280; font-size: 14px;"><strong>Didn't create an account?</strong></p>
        <p style="color: #6b7280; font-size: 14px;">If you didn't create an account with Peaceful Investment, please ignore this email. No account will be created without email verification.</p>
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
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: emailResponse.error.message || "Failed to send email" 
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
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

Deno.serve(handler);

