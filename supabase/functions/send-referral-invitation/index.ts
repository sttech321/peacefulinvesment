import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface InvitationRequest {
  referral_code: string;
  referral_link: string;
  to_email: string;
  subject: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    let requestData: InvitationRequest;
    try {
      requestData = await req.json();
    } catch (parseError) {
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { referral_code, referral_link, to_email, subject, message } = requestData;

    // Validate required fields
    if (!referral_code || !to_email) {
      return new Response(JSON.stringify({ error: 'referral_code and to_email are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    console.log("Sending referral invitation:", { referral_code, referral_link, to_email, subject });

    // Get base URL dynamically from environment variable or request origin
    const getBaseUrl = (): string => {
      // Try environment variable first (set in Supabase Edge Functions secrets)
      const envBaseUrl = Deno.env.get('APP_BASE_URL');
      if (envBaseUrl) {
        return envBaseUrl;
      }
      
      // Try to get from request origin to detect environment
      const origin = req.headers.get('Origin') || req.headers.get('Referer');
      if (origin) {
        try {
          const url = new URL(origin);
          const hostname = url.hostname;
          
          // Check if it's the dev server
          if (hostname.includes('ccw8gc8c4w480c8g4so44k4k.peacefulinvestment.com')) {
            return 'https://ccw8gc8c4w480c8g4so44k4k.peacefulinvestment.com';
          }
          
          // Check if it's production
          if (hostname.includes('www.peacefulinvestment.com') || hostname === 'peacefulinvestment.com') {
            return 'https://www.peacefulinvestment.com';
          }
          
          // For other origins (like localhost), use the origin directly
          return url.origin;
        } catch {
          // Invalid URL, continue to fallback
        }
      }
      
      // Fallback to production URL (live server)
      return 'https://www.peacefulinvestment.com';
    };
    
    // Use the actual referral link from the database, or generate one dynamically
    const baseUrl = getBaseUrl().replace(/\/$/, ''); // Remove trailing slash if present
    const referralLink = referral_link || `${baseUrl}/auth?mode=signup&ref=${referral_code}`;

    // Using verified domain email - domain must be verified in Resend
    const emailResponse = await resend.emails.send({
      from: "Peaceful Investment <noreply@peacefulinvestment.com>",
      to: [to_email],
      subject: subject || "You've been invited to join our platform!",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; font-size: 24px; margin-bottom: 20px;">You're Invited!</h1>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="color: #555; font-size: 16px; line-height: 1.5; margin: 0;">
              ${message || "You've been invited to join our platform. Click the link below to get started!"}
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${referralLink}" 
               style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              Join Now
            </a>
          </div>
          
          <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
            <p style="color: #888; font-size: 14px; margin: 0;">
              Or copy and paste this link in your browser:
            </p>
            <p style="color: #007bff; font-size: 14px; word-break: break-all; margin: 10px 0 0 0;">
              ${referralLink}
            </p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #aaa; font-size: 12px; margin: 0;">
              This invitation was sent using referral code: ${referral_code}
            </p>
          </div>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Invitation sent successfully",
      emailResponse 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-referral-invitation function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Failed to send invitation" 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);