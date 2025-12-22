import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Resend } from "npm:resend@3.2.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AdminNotificationRequest {
  to_email: string;
  request_id: string;
  request_type: 'deposit' | 'withdrawal';
  amount: number;
  currency: string;
  status: string;
  admin_notes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      to_email,
      request_id, 
      request_type, 
      amount, 
      currency, 
      status, 
      admin_notes 
    }: AdminNotificationRequest = await req.json();

    if (!to_email) {
      return new Response(
        JSON.stringify({ success: false, error: "to_email is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Sending admin notification:", { to_email, request_id, status });

    const subject = `Admin Alert: ${request_type.charAt(0).toUpperCase() + request_type.slice(1)} Request ${status === 'processing' ? 'Approved' : 'Declined'}`;
    const htmlContent = getEmailContent(request_type, amount, currency, status, admin_notes, request_id);
    const plainTextContent = generatePlainTextContent(request_type, amount, currency, status, admin_notes, request_id);

    // Use verified domain email - ensure peacefulinvestment.com is verified in Resend
    const emailResponse = await resend.emails.send({
      from: "Peaceful Investment <support@peacefulinvestment.com>",
      to: [to_email],
      reply_to: "admin@peacefulinvestment.com",
      subject: subject,
      html: htmlContent,
      text: plainTextContent,
      headers: {
        'X-Mailer': 'Peaceful Investment',
        'X-Priority': '1', // High priority for admin notifications
        'Message-ID': `<admin-${request_id}-${Date.now()}@peacefulinvestment.com>`,
      },
      tags: [
        { name: 'category', value: 'admin' },
        { name: 'type', value: request_type },
        { name: 'status', value: status },
      ],
    });

    console.log("Admin notification email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Admin notification sent successfully",
      emailResponse 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-admin-request-notification function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Failed to send admin notification" 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function getEmailContent(
  requestType: string, 
  amount: number, 
  currency: string, 
  status: string, 
  adminNotes?: string,
  requestId?: string
): string {
  const statusColor = status === 'processing' ? '#28a745' : '#dc3545';
  const statusText = status === 'processing' ? 'Approved' : 'Declined';
  const statusIcon = status === 'processing' ? '✅' : '❌';
  
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #333; font-size: 28px; margin-bottom: 10px;">Peaceful Investment</h1>
        <p style="color: #666; font-size: 14px; margin: 0;">Admin Notification</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="display: inline-block; padding: 12px; background: ${statusColor}; border-radius: 50%; margin-bottom: 15px; font-size: 24px;">
            ${statusIcon}
          </div>
          <h2 style="color: #333; font-size: 24px; margin: 0;">
            ${requestType.charAt(0).toUpperCase() + requestType.slice(1)} Request ${statusText}
          </h2>
        </div>
        
        <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; border-left: 4px solid ${statusColor};">
          <h3 style="color: #333; font-size: 18px; margin-top: 0; margin-bottom: 15px;">Request Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: 600;">Request ID:</td>
              <td style="padding: 8px 0; color: #333;">${requestId?.slice(0, 8)}...</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: 600;">Type:</td>
              <td style="padding: 8px 0; color: #333;">${requestType.charAt(0).toUpperCase() + requestType.slice(1)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: 600;">Amount:</td>
              <td style="padding: 8px 0; color: #333; font-weight: 700;">${amount.toLocaleString()} ${currency}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: 600;">Status:</td>
              <td style="padding: 8px 0; color: ${statusColor}; font-weight: 700;">${statusText}</td>
            </tr>
          </table>
        </div>
        
        ${adminNotes ? `
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <h4 style="color: #856404; margin-top: 0; margin-bottom: 10px;">Admin Notes:</h4>
            <p style="color: #856404; margin: 0; font-style: italic;">${adminNotes}</p>
          </div>
        ` : ''}
      </div>
      
      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #eee;">
        <p style="color: #888; font-size: 14px; margin: 0;">
          This is an automated notification from Peaceful Investment Admin System.
        </p>
      </div>
    </div>
  `;
}

function generatePlainTextContent(
  requestType: string,
  amount: number,
  currency: string,
  status: string,
  adminNotes?: string,
  requestId?: string
): string {
  const statusText = status === 'processing' ? 'Approved' : 'Declined';
  const type = requestType.charAt(0).toUpperCase() + requestType.slice(1);
  
  return `
Peaceful Investment
Admin Notification

${type} Request ${statusText}

Request Details:
- Request ID: ${requestId?.slice(0, 8)}...
- Type: ${type}
- Amount: ${amount.toLocaleString()} ${currency}
- Status: ${statusText}

${adminNotes ? `Admin Notes: ${adminNotes}\n\n` : ''}
---
This is an automated notification from Peaceful Investment Admin System.
© ${new Date().getFullYear()} Peaceful Investment. All rights reserved.
  `.trim();
}

Deno.serve(handler);

