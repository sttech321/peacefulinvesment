import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestNotificationRequest {
  user_email: string;
  user_name: string;
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
      user_email, 
      user_name, 
      request_id, 
      request_type, 
      amount, 
      currency, 
      status, 
      admin_notes 
    }: RequestNotificationRequest = await req.json();

    console.log("Sending request notification:", { user_email, request_id, status });

    const subject = getEmailSubject(request_type, status);
    const htmlContent = getEmailContent(user_name, request_type, amount, currency, status, admin_notes, request_id);

    const emailResponse = await resend.emails.send({
      from: "Peaceful Investment <onboarding@resend.dev>",
      to: [user_email],
      subject: subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Notification sent successfully",
      emailResponse 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-request-notification function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Failed to send notification" 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function getEmailSubject(requestType: string, status: string): string {
  const type = requestType.charAt(0).toUpperCase() + requestType.slice(1);
  
  switch (status) {
    case 'pending':
      return `${type} Request Received - Under Review`;
    case 'processing':
      return `${type} Request Approved - Processing`;
    case 'completed':
      return `${type} Request Completed Successfully`;
    case 'rejected':
      return `${type} Request Requires Attention`;
    default:
      return `${type} Request Update`;
  }
}

function getEmailContent(
  userName: string, 
  requestType: string, 
  amount: number, 
  currency: string, 
  status: string, 
  adminNotes?: string,
  requestId?: string
): string {
  const statusColor = getStatusColor(status);
  const statusIcon = getStatusIcon(status);
  
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #333; font-size: 28px; margin-bottom: 10px;">Peaceful Investment</h1>
        <p style="color: #666; font-size: 14px; margin: 0;">Financial Services Platform</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="display: inline-block; padding: 12px; background: ${statusColor}; border-radius: 50%; margin-bottom: 15px;">
            ${statusIcon}
          </div>
          <h2 style="color: #333; font-size: 24px; margin: 0;">
            ${requestType.charAt(0).toUpperCase() + requestType.slice(1)} Request Update
          </h2>
        </div>
        
        <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
          Hello ${userName},
        </p>
        
        <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
          ${getStatusMessage(requestType, status)}
        </p>
        
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
              <td style="padding: 8px 0; color: ${statusColor}; font-weight: 700; text-transform: capitalize;">${status}</td>
            </tr>
          </table>
        </div>
        
        ${adminNotes ? `
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <h4 style="color: #856404; margin-top: 0; margin-bottom: 10px;">Admin Notes:</h4>
            <p style="color: #856404; margin: 0; font-style: italic;">${adminNotes}</p>
          </div>
        ` : ''}
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${req.headers.get("origin")}/requests" 
             style="background: #007bff; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            View Request Details
          </a>
        </div>
      </div>
      
      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #eee;">
        <p style="color: #888; font-size: 14px; margin: 0;">
          This is an automated notification from Peaceful Investment.
        </p>
        <p style="color: #888; font-size: 12px; margin: 10px 0 0 0;">
          If you have any questions, please contact our support team.
        </p>
      </div>
    </div>
  `;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'pending': return '#ffc107';
    case 'processing': return '#17a2b8';
    case 'completed': return '#28a745';
    case 'rejected': return '#dc3545';
    default: return '#6c757d';
  }
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'pending': return '⏱️';
    case 'processing': return '⚡';
    case 'completed': return '✅';
    case 'rejected': return '❌';
    default: return '📄';
  }
}

function getStatusMessage(requestType: string, status: string): string {
  const type = requestType.charAt(0).toUpperCase() + requestType.slice(1);
  
  switch (status) {
    case 'pending':
      return `Your ${requestType} request has been received and is currently under review by our team. We'll notify you once it has been processed.`;
    case 'processing':
      return `Great news! Your ${requestType} request has been approved and is now being processed. You should see the transaction completed within the next 1-3 business days.`;
    case 'completed':
      return `Excellent! Your ${requestType} request has been completed successfully. The transaction has been processed and you should see the changes reflected in your account.`;
    case 'rejected':
      return `Your ${requestType} request requires additional attention. Please review the admin notes below and resubmit your request with the necessary corrections.`;
    default:
      return `Your ${requestType} request status has been updated. Please check your dashboard for more details.`;
  }
}

serve(handler);