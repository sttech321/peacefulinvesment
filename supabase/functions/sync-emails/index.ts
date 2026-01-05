import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncRequest {
  email_account_id?: string;
  sync_all?: boolean;
}

// Helper function to parse email headers
function parseHeaders(headerArray: Array<{ name: string; value: string }>): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (const header of headerArray || []) {
    parsed[header.name.toLowerCase()] = header.value;
  }
  return parsed;
}

// Extract email body from Gmail API message
function extractBody(payload: any): { text: string; html: string } {
  let text = "";
  let html = "";

  if (payload.body?.data) {
    text = atob(payload.body.data.replace(/-/g, "+").replace(/_/g, "/"));
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        text = atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/"));
      } else if (part.mimeType === "text/html" && part.body?.data) {
        html = atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/"));
      }
      // Handle nested parts
      if (part.parts) {
        const nested = extractBody(part);
        if (nested.text) text = nested.text;
        if (nested.html) html = nested.html;
      }
    }
  }

  return { text, html };
}

// Fetch emails using Gmail API
interface GmailEmail {
  message_id: string;
  subject: string;
  from: string;
  to: string;
  date: Date;
  body_text: string;
  body_html: string;
  thread_id: string;
}

async function fetchGmailEmails(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
  maxMessages: number = 100
): Promise<GmailEmail[]> {
  // Get access token from refresh token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error("   ❌ Failed to get access token:", errorText);
    throw new Error(`Failed to get access token: ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;
  console.log("   ✅ Access token obtained successfully");

  // List messages from inbox
  console.log(`   📬 Fetching message list from Gmail (max ${maxMessages})...`);
  const messagesResponse = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxMessages}&q=in:inbox`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!messagesResponse.ok) {
    const errorText = await messagesResponse.text();
    console.error("   ❌ Failed to list messages:", errorText);
    throw new Error(`Failed to list messages: ${errorText}`);
  }

  const messagesData = await messagesResponse.json();
  const messageIds = messagesData.messages?.map((m: any) => m.id) || [];
  console.log(`   ✅ Found ${messageIds.length} message(s) in inbox`);

  // Fetch full message details
  console.log(`   📥 Fetching full message details...`);
  const emails: GmailEmail[] = [];
  let fetchedCount = 0;
  for (const messageId of messageIds.slice(0, maxMessages)) {
    try {
      const messageResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!messageResponse.ok) {
        console.error(`   ⚠️ Failed to fetch message ${messageId}: ${messageResponse.status}`);
        continue;
      }
      fetchedCount++;

      const messageData = await messageResponse.json();
      const headers = parseHeaders(messageData.payload?.headers || []);
      const { text: bodyText, html: bodyHtml } = extractBody(messageData.payload || {});
      
      const dateReceived = messageData.internalDate 
        ? new Date(parseInt(messageData.internalDate))
        : new Date();

      emails.push({
        message_id: messageId,
        subject: headers.subject || "(No Subject)",
        from: headers.from || "",
        to: headers.to || "",
        date: dateReceived,
        body_text: bodyText,
        body_html: bodyHtml,
        thread_id: messageData.threadId,
      });
    } catch (error) {
      console.error(`   ⚠️ Error fetching message ${messageId}:`, error);
    }
  }

  console.log(`   ✅ Successfully fetched ${fetchedCount}/${messageIds.length} message details`);
  return emails;
}

Deno.serve(async (req: Request) => {
  console.log("📧 Email sync function called");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("✅ CORS preflight request handled");
    return new Response(null, {
      status: 200,
      headers: { ...corsHeaders, "Access-Control-Max-Age": "86400" },
    });
  }

  if (req.method !== "POST") {
    console.log("❌ Invalid method:", req.method);
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    console.log("🔐 Checking authentication...");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("❌ Missing authorization header");
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.log("❌ Authentication failed:", userError?.message);
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("✅ User authenticated:", user.id);

    const { data: userRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!userRole || userRole.role !== "admin") {
      console.log("❌ User is not admin");
      return new Response(
        JSON.stringify({ success: false, error: "Forbidden: Admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("✅ Admin access confirmed");

    const { email_account_id, sync_all } = await req.json() as SyncRequest;
    console.log("📋 Sync request:", { email_account_id, sync_all });

    let accountsQuery = supabaseAdmin
      .from("email_accounts")
      .select("*")
      .eq("sync_enabled", true);

    if (!sync_all && email_account_id) {
      console.log("🎯 Syncing specific account:", email_account_id);
      accountsQuery = accountsQuery.eq("id", email_account_id);
    } else {
      console.log("🔄 Syncing all enabled accounts");
    }

    const { data: accounts, error: accountsError } = await accountsQuery;

    if (accountsError || !accounts || accounts.length === 0) {
      console.log("❌ No email accounts found:", accountsError?.message);
      return new Response(
        JSON.stringify({ success: false, error: "No email accounts found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`📬 Found ${accounts.length} account(s) to sync:`, accounts.map(a => a.email));

    interface SyncResult {
      account_id: string;
      account_email: string;
      status: string;
      message?: string;
      error?: string;
      messages_fetched?: number;
      messages_stored?: number;
    }

    const results: SyncResult[] = [];

    for (const account of accounts) {
      try {
        console.log(`\n📧 Processing account: ${account.email}`);
        const isGmail = account.provider === "gmail" || account.email.includes("@gmail.com");
        console.log(`   Provider: ${account.provider}, Is Gmail: ${isGmail}`);
        
        if (isGmail && account.gmail_refresh_token && account.gmail_client_id && account.gmail_client_secret) {
          console.log(`   ✅ Gmail API credentials found, fetching emails...`);
          // Fetch emails using Gmail API
          try {
            const emails = await fetchGmailEmails(
              account.gmail_refresh_token,
              account.gmail_client_id,
              account.gmail_client_secret,
              100
            );
            console.log(`   📬 Fetched ${emails.length} emails from Gmail API`);

            let messagesStored = 0;
            let messagesSkipped = 0;

            // Store emails in database
            console.log(`   💾 Storing emails in database...`);
            for (const email of emails) {
              // Check if message already exists
              const { data: existing } = await supabaseAdmin
                .from("email_messages")
                .select("id")
                .eq("email_account_id", account.id)
                .eq("message_id", email.message_id)
                .maybeSingle();

              if (!existing) {
                // Parse from address (extract email from "Name <email@example.com>" format)
                const fromMatch = email.from.match(/<?([^\s<>]+@[^\s<>]+)>?/);
                const fromEmail = fromMatch ? fromMatch[1] : email.from;
                const fromName = email.from.includes("<") 
                  ? email.from.match(/^(.+?)\s*</)?.[1]?.trim() || null 
                  : null;
                
                // Parse to addresses
                const toEmails = email.to.split(",").map((addr: string) => {
                  const match = addr.match(/<?([^\s<>]+@[^\s<>]+)>?/);
                  return match ? match[1] : addr.trim();
                }).filter(Boolean);

                const { error: insertError } = await supabaseAdmin
                  .from("email_messages")
                  .insert({
                    email_account_id: account.id,
                    message_id: email.message_id,
                    thread_id: email.thread_id || null,
                    subject: email.subject,
                    from_email: fromEmail,
                    from_name: fromName,
                    to_email: toEmails,
                    body_text: email.body_text,
                    body_html: email.body_html,
                    date_received: email.date.toISOString(),
                    is_read: false,
                    is_deleted: false,
                  });

                if (!insertError) {
                  messagesStored++;
                } else {
                  console.error(`   ⚠️ Error storing message ${email.message_id}: ${insertError.message}`);
                }
              } else {
                messagesSkipped++;
              }
            }
            console.log(`   ✅ Stored ${messagesStored} new messages, skipped ${messagesSkipped} duplicates`);

            console.log(`   ✅ Account ${account.email} sync completed successfully`);
            results.push({
              account_id: account.id,
              account_email: account.email,
              status: "success",
              message: `Fetched ${emails.length} messages, stored ${messagesStored} new messages`,
              messages_fetched: emails.length,
              messages_stored: messagesStored,
            });

            // Update last_sync_at
            await supabaseAdmin
              .from("email_accounts")
              .update({ last_sync_at: new Date().toISOString() })
              .eq("id", account.id);
            console.log(`   ⏰ Updated last_sync_at timestamp`);
          } catch (gmailError: any) {
            console.error(`   ❌ Gmail API error for ${account.email}:`, gmailError.message);
            results.push({
              account_id: account.id,
              account_email: account.email,
              status: "error",
              error: `Gmail API error: ${gmailError.message}`,
              messages_stored: 0,
            });
          }
        } else if (isGmail) {
          console.log(`   ⚠️ Gmail account but credentials missing - Client ID: ${!!account.gmail_client_id}, Secret: ${!!account.gmail_client_secret}, Refresh Token: ${!!account.gmail_refresh_token}`);
          results.push({
            account_id: account.id,
            account_email: account.email,
            status: "warning",
            message: "Gmail API credentials not configured. Please add gmail_client_id, gmail_client_secret, and gmail_refresh_token to use Gmail API.",
            messages_stored: 0,
          });
        } else {
          console.log(`   ⚠️ Non-Gmail account (${account.provider}) - requires provider-specific API`);
          results.push({
            account_id: account.id,
            account_email: account.email,
            status: "warning",
            message: "Non-Gmail accounts require provider-specific APIs (Outlook Graph API, etc.) or IMAP implementation outside of Edge Functions.",
            messages_stored: 0,
          });
        }
      } catch (error: any) {
        console.error(`   ❌ Unexpected error processing ${account.email}:`, error.message);
        results.push({
          account_id: account.id,
          account_email: account.email,
          status: "error",
          error: error.message,
          messages_stored: 0,
        });
      }
    }

    const totalMessages = results.reduce((sum, r) => sum + (r.messages_stored || 0), 0);
    const successCount = results.filter(r => r.status === "success").length;
    const errorCount = results.filter(r => r.status === "error").length;
    const warningCount = results.filter(r => r.status === "warning").length;

    console.log(`\n📊 Sync Summary:`);
    console.log(`   Total accounts: ${accounts.length}`);
    console.log(`   Successful: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Warnings: ${warningCount}`);
    console.log(`   Total messages stored: ${totalMessages}`);

    const response = {
      success: successCount > 0,
      message: successCount > 0 
        ? `Sync completed: ${totalMessages} new messages fetched across ${successCount} account(s)`
        : "Sync completed with warnings. Check results for details.",
      results,
      summary: {
        total_accounts: accounts.length,
        successful: successCount,
        failed: errorCount,
        warnings: warningCount,
        total_messages: totalMessages,
      },
    };

    console.log(`✅ Sync function completed`);
    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("❌ Fatal error in sync-emails function:", error);
    console.error("Error stack:", error.stack);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
