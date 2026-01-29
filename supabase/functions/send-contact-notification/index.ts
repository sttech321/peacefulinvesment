import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Resend } from "npm:resend@3.2.0";
import { createClient } from "jsr:@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ROUTE = "send-contact-notification";

// HTML escape function
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

function getClientIp(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf && cf.trim()) return cf.trim();

  const xff = req.headers.get("x-forwarded-for");
  if (xff && xff.trim()) return xff.split(",")[0].trim();

  const xr = req.headers.get("x-real-ip");
  if (xr && xr.trim()) return xr.trim();

  return "unknown";
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const arr = Array.from(new Uint8Array(digest));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getEnvInt(name: string, fallback: number): number {
  const raw = Deno.env.get(name);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests FIRST
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Access-Control-Max-Age": "86400", // Cache preflight for 24 hours
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

  let parsedBody: any = null;
  let parsedContactData: any = null;
  let resolvedIdemKey: string | null = null;
  let resolvedIp: string | null = null;
  let resolvedEmailLower: string | null = null;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase =
      supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

    let contactData;
    try {
      parsedBody = await req.json();
      contactData = parsedBody?.contactData;
      parsedContactData = contactData;
    } catch (parseError) {
      return new Response(JSON.stringify({ error: "Invalid JSON in request body" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    // Validate required fields
    if (!contactData.full_name || !contactData.email || !contactData.subject || !contactData.message) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    console.log("Contact form submission received:", {
      fullName: contactData.full_name,
      email: contactData.email,
      subject: contactData.subject,
      priority: contactData.priority,
      message: contactData.message,
      contactMethod: contactData.contact_method,
      timestamp: new Date().toISOString(),
    });

    // Escape user input for security
    const safeName = escapeHtml(contactData.full_name);
    const safeEmail = contactData.email;
    const safeSubject = escapeHtml(contactData.subject);
    const safeMessage = escapeHtml(contactData.message);
    const safePhone = contactData.phone ? escapeHtml(contactData.phone) : "Not provided";
    const priority = contactData.priority || "medium";
    const contactMethod = contactData.contact_method || "email";

    // -------------------------
    // Rate limiting + idempotency (DB-backed, service-role only)
    // -------------------------
    const ip = getClientIp(req);
    const emailLower = String(contactData.email || "").trim().toLowerCase();
    resolvedIp = ip;
    resolvedEmailLower = emailLower;

    // Prefer explicit Idempotency-Key header; fallback to a stable hash with hour bucket.
    const headerKey =
      req.headers.get("idempotency-key") ||
      req.headers.get("Idempotency-Key") ||
      req.headers.get("x-idempotency-key") ||
      req.headers.get("X-Idempotency-Key");

    const now = new Date();
    const hourBucket = now.toISOString().slice(0, 13); // YYYY-MM-DDTHH
    const fallbackKey = await sha256Hex(
      `${emailLower}|${String(contactData.subject || "").trim()}|${String(contactData.message || "").trim()}|${hourBucket}`
    );

    const idemKey = String(headerKey || fallbackKey).trim() || fallbackKey;
    resolvedIdemKey = idemKey;

    // If we have DB access, enforce dedupe + limits.
    if (supabase) {
      // Idempotency fast-path
      const { data: existingKey, error: existingErr } = await (supabase as any)
        .from("edge_idempotency_keys")
        .select("key,status,created_at")
        .eq("key", idemKey)
        .maybeSingle();

      if (!existingErr && existingKey?.key) {
        return new Response(
          JSON.stringify({
            success: true,
            deduped: true,
            status: existingKey.status,
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          }
        );
      }

      const ipLimitPerHour = Math.max(1, getEnvInt("CONTACT_RATE_LIMIT_IP_PER_HOUR", 10));
      const emailLimitPerHour = Math.max(1, getEnvInt("CONTACT_RATE_LIMIT_EMAIL_PER_HOUR", 5));

      const sinceIso = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

      const [{ count: ipCount }, { count: emailCount }] = await Promise.all([
        (supabase as any)
          .from("edge_idempotency_keys")
          .select("key", { count: "exact", head: true })
          .eq("route", ROUTE)
          .eq("ip", ip)
          .gte("created_at", sinceIso),
        (supabase as any)
          .from("edge_idempotency_keys")
          .select("key", { count: "exact", head: true })
          .eq("route", ROUTE)
          .eq("email", emailLower)
          .gte("created_at", sinceIso),
      ]);

      if ((ipCount || 0) >= ipLimitPerHour || (emailCount || 0) >= emailLimitPerHour) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Too many requests. Please try again later.",
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": "3600",
              ...corsHeaders,
            },
          }
        );
      }

      // Reserve idempotency key before sending. If sending fails, we delete it so the client can retry.
      const { error: insertErr } = await (supabase as any)
        .from("edge_idempotency_keys")
        .insert([
          {
            key: idemKey,
            route: ROUTE,
            ip,
            email: emailLower,
            status: "started",
          },
        ]);

      // Handle a race where the same key is inserted concurrently.
      if (insertErr) {
        // Unique violation: treat as deduped success.
        const msg = String((insertErr as any)?.message || "");
        if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique")) {
          return new Response(JSON.stringify({ success: true, deduped: true, status: "started" }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
      }
    }

    // 1. Send notification email to admin/support team
    const adminEmailHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Contact Form Submission</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; background-color: #f5f5f5; padding: 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
          <tr>
            <td align="center">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <tr>
                  <td style="padding: 30px; background-color: #007bff;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">New Contact Form Submission</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 30px;">
                    <h2 style="color: #333333; margin-top: 0;">Contact Details</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee;"><strong>Name:</strong></td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee;">${safeName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee;"><strong>Email:</strong></td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee;"><a href="mailto:${safeEmail}">${safeEmail}</a></td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee;"><strong>Phone:</strong></td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee;">${safePhone}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee;"><strong>Subject:</strong></td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee;">${safeSubject}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee;"><strong>Priority:</strong></td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; text-transform: capitalize;">${priority}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee;"><strong>Contact Method:</strong></td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; text-transform: capitalize;">${contactMethod}</td>
                      </tr>
                    </table>
                    <h3 style="color: #333333; margin-top: 30px;">Message</h3>
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 10px;">
                      <p style="color: #555555; margin: 0; white-space: pre-wrap; line-height: 1.6;">${safeMessage}</p>
                    </div>
                    <p style="color: #888888; font-size: 12px; margin-top: 30px;">
                      Submitted: ${new Date().toLocaleString()}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const adminEmailText = `
New Contact Form Submission

Name: ${contactData.full_name}
Email: ${contactData.email}
Phone: ${safePhone}
Subject: ${contactData.subject}
Priority: ${priority}
Contact Method: ${contactMethod}

Message:
${contactData.message}

Submitted: ${new Date().toLocaleString()}
    `.trim();

    // 2. Send confirmation email to user
    const userEmailHtml = `
       <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Thank You for Contacting Us</title>
      </head>
      <body style="margin:0; padding:0; background-color:#f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center" style="padding:28px 12px;">
			
			<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="container" style="width:600px; max-width:600px;">
            <!-- Main card wrapper -->
            <tr>
              <td style="padding:0 12px;">
			  
			  
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width:100%; background-color: #ffffff; border-radius: 22px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.08);">
                <tr>
                   <td
                      align="center"
                      style="padding:28px; background-color:#000;"
                    >
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
                        <tr>
                          <td align="center" style="padding:0 0 16px 0;">
                            <img
                              src="https://www.peacefulinvestment.com/assets/new-logo-C1z5AvYQ.gif"
                              width="150"
                              alt="Peaceful Investment"
                              style="display:block; width:150px; max-width:100%; height:auto; border:0; outline:none; text-decoration:none;"
                            />
                          </td>
                        </tr>
                         
                      </table>
                    </td>
                </tr>
                <tr>
                  <td style="padding: 28px 32px 8px; text-align: center;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px; letter-spacing: 0.2px;">Welcome to Peaceful Investment!</p>
                    <h1 style="margin: 6px 0 12px; color: #111827; font-size: 24px; font-weight: 700;">Thank You for Contacting Us</h1>
                    <p style="margin: 0 auto; max-width: 460px; color: #4b5563; font-size: 15px; line-height: 1.6;">
                      We’ve received your message. Our team will get back to you within 24 hours.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 32px 8px;">
                    <p style="color: #111827; font-size: 15px; margin: 0 0 12px;">Hello ${safeName},</p>
                    <div style="background-color: #f8fafc; border: 1px solid #e5e7eb; padding: 16px; border-radius: 10px;">
                      <p style="margin: 0 0 8px; color: #111827; font-size: 13px;"><strong>Your Message</strong></p>
                      <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${safeMessage}</p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 32px 28px; text-align: center;">
                    <a
                      href="https://www.peacefulinvestment.com"
                      style="display: inline-block; background-color: #d61f26; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 26px; border-radius: 999px;"
                    >
                      VISIT WEBSITE
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 32px 28px; text-align: center; color: #9ca3af; font-size: 12px;">
                    <div style="padding:4px 0">If you have any urgent questions, contact us at</div>
                    <a href="mailto:support@peacefulinvestment.com" style="color: #9ca3af; text-decoration: underline;">support@peacefulinvestment.com</a>
                    <div style="padding:0px 0">OR</div>
					Call <a href="tel:+17723211897" style="color: #9ca3af; text-decoration: underline;">+1 (772) 321-1897</a>.
                  </td>
                </tr>
                
              </table>
			  
			  </td>
          </tr>
		  
		   <tr>
		   <td style="text-align:center; font-size:12px; color:#9ca3af; padding-top:15px">© Peaceful Investment. All rights reserved.		</td>
		  </tr>
		  
		  
        </table>
		
		
            </td>
          </tr>
		  
		 
        </table>
		 
      </body>
      </html>
    `;

    const userEmailText = `
Thank You for Contacting Us!

Hello ${contactData.full_name},

We've received your message and our team will get back to you within 24 hours.

Your Message:
${contactData.message}

Best regards,
Peaceful Investment Support Team
    `.trim();

    // Send emails using Resend
    const emailPromises = [];

    // Send to admin/support team
    emailPromises.push(
      resend.emails.send({
        from: "Peaceful Investment <info@peacefulinvestment.com>",
        to: ["support@peacefulinvestment.com"],
        reply_to: safeEmail,
        subject: `New Contact Form: ${safeSubject} [${priority.toUpperCase()}]`,
        text: adminEmailText,
        html: adminEmailHtml,
        headers: {
          'X-Priority': priority === 'high' ? '1' : priority === 'medium' ? '3' : '5',
          'X-Mailer': 'Peaceful Investment',
          'Message-ID': `<contact-${Date.now()}@peacefulinvestment.com>`,
        },
        tags: [
          { name: 'category', value: 'contact' },
          { name: 'type', value: 'form_submission' },
          { name: 'priority', value: priority },
        ],
      })
    );

    // Send confirmation to user
    emailPromises.push(
      resend.emails.send({
        from: "Peaceful Investment <info@peacefulinvestment.com>",
        to: [safeEmail],
        reply_to: "support@peacefulinvestment.com",
        subject: "Thank You for Contacting Peaceful Investment",
        text: userEmailText,
        html: userEmailHtml,
        headers: {
          'List-Unsubscribe': '<https://www.peacefulinvestment.com/unsubscribe>',
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          'X-Mailer': 'Peaceful Investment',
          'X-Priority': '3',
          'Message-ID': `<contact-confirmation-${Date.now()}@peacefulinvestment.com>`,
        },
        tags: [
          { name: 'category', value: 'contact' },
          { name: 'type', value: 'confirmation' },
        ],
      })
    );

    // Wait for both emails to be sent
    const results = await Promise.allSettled(emailPromises) as Array<PromiseSettledResult<any>>;
    
    const adminResult = results[0];
    const userResult = results[1];

    // Log results
    console.log("Email sending results:", {
      admin: adminResult.status === 'fulfilled' ? 'sent' : 'failed',
      user: userResult.status === 'fulfilled' ? 'sent' : 'failed',
    });

    // Mark idempotency key as sent (best-effort)
    try {
      if (supabase) {
        if (resolvedIdemKey) {
          await (supabase as any)
            .from("edge_idempotency_keys")
            .update({ status: "sent" })
            .eq("key", resolvedIdemKey);
        }
      }
    } catch {
      // best-effort only
    }

    // Return success even if one email fails (non-critical)
    return new Response(JSON.stringify({ 
      success: true, 
      message: "Contact notification sent successfully",
      emails: {
        admin: adminResult.status === 'fulfilled',
        user: userResult.status === 'fulfilled',
      }
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error) {
    console.error("Error processing contact notification:", error);

    // If we reserved an idempotency key but failed to send, delete it so clients can retry.
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
      const supabase =
        supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;
      if (supabase) {
        if (resolvedIdemKey) {
          await (supabase as any)
            .from("edge_idempotency_keys")
            .delete()
            .eq("key", resolvedIdemKey)
            .eq("route", ROUTE);
        }
      }
    } catch {
      // best-effort only
    }
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Internal server error"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  }
});
