import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// HTML escape function to prevent XSS and improve deliverability
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

    // Validate email format and domain on server side to prevent bounces
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmedEmail = to_email.trim().toLowerCase();
    
    if (!emailRegex.test(trimmedEmail)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Check for obviously invalid domains to reduce bounce rate
    const domain = trimmedEmail.split('@')[1];
    const invalidDomains = ['test.com', 'example.com', 'invalid.com', 'test.test', 'sd.sd', 'gsg.dfgdf', 'sd.com'];
    const suspiciousPatterns = /^(.)\1+\.(.)\2+$/; // Patterns like "aa.bb" or "sd.sd"
    
    if (invalidDomains.includes(domain) || suspiciousPatterns.test(domain) || domain.length < 4) {
      return new Response(JSON.stringify({ 
        error: 'Invalid email domain. Please use a valid email address with a real domain.' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    console.log("Sending referral invitation:", { referral_code, referral_link, to_email, subject });

    // HARDCODED: Always use production URL for referral links in emails
    const productionBaseUrl = 'https://www.peacefulinvestment.com';
    
    // Use the referral_link from database if it exists and is valid, otherwise generate one
    let referralLink = referral_link;
    
    // If referral_link is provided, use it (it should already be production URL from database)
    // But ensure it's production URL, not dev URL
    if (referralLink && referralLink.includes('ccw8gc8c4w480c8g4so44k4k.peacefulinvestment.com')) {
      // Replace dev URL with production URL
      referralLink = referralLink.replace(
        'https://ccw8gc8c4w480c8g4so44k4k.peacefulinvestment.com',
        productionBaseUrl
      );
      console.log("Replaced dev URL with production URL in email:", referralLink);
    } else if (!referralLink) {
      // Generate referral link if not provided
      referralLink = `${productionBaseUrl}/auth?mode=signup&ref=${referral_code}`;
      console.log("Generated referral link for email:", referralLink);
    }
    
    console.log("Final referral link for email:", referralLink);

    // Escape user input to prevent XSS and improve deliverability
    // Use less promotional default message to avoid spam filters
    const defaultMessage = "Hi! I wanted to share an investment platform I've been using. I thought you might find it interesting. Check it out when you have a moment!";
    const safeMessage = escapeHtml(message || defaultMessage);
    const safeSubject = escapeHtml(subject || "Invitation to Peaceful Investment");
    
    // Create plain text version for better deliverability
    const plainTextMessage = message || defaultMessage;
    const plainText = `
Hello,

${plainTextMessage}

If you're interested, you can sign up using the link below. There's no obligation, and I thought you might find it useful.

Visit Platform: ${referralLink}

If you have any questions, feel free to reach out. Otherwise, no worries if it's not for you!

This invitation was sent using referral code: ${referral_code}

---
Peaceful Investment
    `.trim();

    // Using verified domain email - domain must be verified in Resend
    // Changed from noreply to info for better deliverability (noreply addresses are often flagged)
    // IMPORTANT: Ensure peacefulinvestment.com domain is verified in Resend dashboard with SPF, DKIM, and DMARC records
    const emailResponse = await resend.emails.send({
      from: "Peaceful Investment <info@peacefulinvestment.com>",
      to: [to_email],
      reply_to: "support@peacefulinvestment.com",
      subject: subject || "Invitation to Peaceful Investment",
      text: plainText,
      // Add message stream for better deliverability (if configured in Resend)
      // message_stream: 'transactional', // Uncomment if you have streams configured
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <title>${safeSubject}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; background-color: #f5f5f5;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 20px;">
            <tr>
              <td align="center">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 30px 30px 20px 30px; text-align: center; background-color: #ffffff;">
                      <h1 style="color: #333333; font-size: 28px; font-weight: 600; margin: 0; line-height: 1.2;">You're Invited!</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 0 30px 30px 30px;">
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                        Hello,
                      </p>
                      
                      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0; white-space: pre-wrap;">
                          ${safeMessage}
                        </p>
                      </div>
                      
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                        If you're interested, you can sign up using the link below. There's no obligation, and I thought you might find it useful.
                      </p>
                      
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${referralLink}" 
                           style="background-color: #007bff; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 16px;">
                          Visit Platform
                        </a>
                      </div>
                      
                      <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0;">
                        If you have any questions, feel free to reach out. Otherwise, no worries if it's not for you!
                      </p>
                      
                      <div style="border-top: 1px solid #eeeeee; padding-top: 20px; margin-top: 30px;">
                        <p style="color: #888888; font-size: 14px; margin: 0 0 10px 0;">
                          Or copy and paste this link in your browser:
                        </p>
                        <p style="color: #007bff; font-size: 14px; word-break: break-all; margin: 0; line-height: 1.5;">
                          ${referralLink}
                        </p>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px 30px; background-color: #f8f9fa; border-top: 1px solid #eeeeee; text-align: center;">
                      <p style="color: #aaaaaa; font-size: 12px; margin: 0 0 8px 0; line-height: 1.5;">
                        This invitation was sent using referral code: <strong>${referral_code}</strong>
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
      `,
      headers: {
        'X-Entity-Ref-ID': referral_code,
        'List-Unsubscribe': '<https://www.peacefulinvestment.com/unsubscribe>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'X-Mailer': 'Peaceful Investment',
        'X-Priority': '3', // Normal priority
        'Message-ID': `<${referral_code}-${Date.now()}@peacefulinvestment.com>`,
      },
      tags: [
        { name: 'category', value: 'referral' },
        { name: 'type', value: 'invitation' },
      ],
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