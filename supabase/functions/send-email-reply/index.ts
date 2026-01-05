import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Resend } from "npm:resend@3.2.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReplyRequest {
  message_id: string;
  to_email: string;
  to_name?: string;
  subject: string;
  reply_message: string;
  email_account_id: string;
  original_message?: string;
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
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Create Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify the user is authenticated
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if user is admin
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleError || !userRole || userRole.role !== "admin") {
      return new Response(
        JSON.stringify({ success: false, error: "Forbidden: Admin access required" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const replyData = (await req.json()) as ReplyRequest;

    // Validate required fields
    if (!replyData.to_email || !replyData.subject || !replyData.reply_message || !replyData.email_account_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get email account
    const { data: emailAccount, error: accountError } = await supabaseAdmin
      .from("email_accounts")
      .select("*")
      .eq("id", replyData.email_account_id)
      .single();

    if (accountError || !emailAccount) {
      return new Response(
        JSON.stringify({ success: false, error: "Email account not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get original message for thread reference
    let originalMessage = null;
    if (replyData.message_id) {
      const { data: message } = await supabaseAdmin
        .from("email_messages")
        .select("*")
        .eq("id", replyData.message_id)
        .single();
      originalMessage = message;
    }

    // Build reply email body
    let emailBody = replyData.reply_message;
    if (originalMessage && replyData.original_message) {
      emailBody += "\n\n--- Original Message ---\n";
      emailBody += `From: ${originalMessage.from_name || originalMessage.from_email}\n`;
      emailBody += `Date: ${new Date(originalMessage.date_received).toLocaleString()}\n`;
      emailBody += `Subject: ${originalMessage.subject}\n\n`;
      emailBody += replyData.original_message;
    }

    // Send email using Resend
    const { data: emailResult, error: sendError } = await resend.emails.send({
      from: emailAccount.email,
      to: replyData.to_email,
      replyTo: emailAccount.email,
      subject: replyData.subject.startsWith("Re:") ? replyData.subject : `Re: ${replyData.subject}`,
      text: emailBody,
      html: emailBody.replace(/\n/g, "<br>"),
    });

    if (sendError) {
      return new Response(
        JSON.stringify({ success: false, error: sendError.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Store sent email as a message (optional - for sent folder tracking)
    // This would require a "sent" folder or flag in the messages table
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Reply sent successfully",
        email_id: emailResult?.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-email-reply function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});

