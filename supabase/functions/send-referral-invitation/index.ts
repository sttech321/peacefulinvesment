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

  try {
    const { referral_code, referral_link, to_email, subject, message }: InvitationRequest = await req.json();

    console.log("Sending referral invitation:", { referral_code, referral_link, to_email, subject });

    // Use the actual referral link from the database
    const referralLink = referral_link || `https://ccw8gc8c4w480c8g4so44k4k.peacefulinvestment.com/auth?mode=signup&ref=${referral_code}`;

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