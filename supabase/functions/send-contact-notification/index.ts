import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Resend } from "npm:resend@3.2.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

  try {
    let contactData;
    try {
      contactData = (await req.json()).contactData;
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
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; background-color: #f5f5f5; padding: 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
          <tr>
            <td align="center">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <tr>
                  <td style="padding: 30px; text-align: center; background-color: #ffffff;">
                    <h1 style="color: #333333; margin: 0; font-size: 28px;">Thank You for Contacting Us!</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 30px;">
                    <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                      Hello ${safeName},
                    </p>
                    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                      We've received your message and our team will get back to you within 24 hours.
                    </p>
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                      <p style="color: #333333; font-size: 14px; margin: 0 0 10px 0;"><strong>Your Message:</strong></p>
                      <p style="color: #555555; font-size: 14px; margin: 0; white-space: pre-wrap;">${safeMessage}</p>
                    </div>
                    <p style="color: #555555; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                      If you have any urgent questions, please contact us at <a href="mailto:support@peacefulinvestment.com">support@peacefulinvestment.com</a> or call us at +1 (772) 321-1897.
                    </p>
                    <p style="color: #888888; font-size: 12px; margin-top: 30px;">
                      Best regards,<br>
                      Peaceful Investment Support Team
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

    const userEmailText = `
Thank You for Contacting Us!

Hello ${contactData.full_name},

We've received your message and our team will get back to you within 24 hours.

Your Message:
${contactData.message}

If you have any urgent questions, please contact us at support@peacefulinvestment.com or call us at +1 (772) 321-1897.

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
