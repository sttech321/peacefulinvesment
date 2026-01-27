import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { Resend } from 'npm:resend@3.2.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

function envFlag(name: string, defaultValue = false): boolean {
  const raw = Deno.env.get(name);
  if (raw === undefined) return defaultValue;
  const v = raw.trim().toLowerCase();
  if (!v) return defaultValue;
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return String(text || '').replace(/[&<>"']/g, m => map[m]);
}

async function sendSMS(
  to: string,
  body: string
): Promise<{ ok: boolean; error?: string; skipped?: boolean }> {
  // Opt-in: keep logs clean unless SMS is explicitly enabled.
  if (!envFlag('TWILIO_ENABLE_SMS', false)) {
    return { ok: false, skipped: true };
  }

  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!sid || !token || !from) {
    console.warn(
      '[send-prayer-start-notification] Twilio SMS enabled but missing env (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_PHONE_NUMBER).'
    );
    return {
      ok: false,
      error: 'Twilio SMS is not configured (missing env vars).',
    };
  }

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
        },
        body: new URLSearchParams({
          From: from,
          To: to,
          Body: body,
        }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error('[send-prayer-start-notification] Twilio SMS error:', text);
      return { ok: false, error: text };
    }
    return { ok: true };
  } catch (e) {
    console.error('[send-prayer-start-notification] Twilio SMS exception:', e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function placeCall(
  to: string,
  twiml: string
): Promise<{ ok: boolean; error?: string; skipped?: boolean }> {
  // Opt-in: keep logs clean unless Voice is explicitly enabled.
  if (!envFlag('TWILIO_ENABLE_VOICE', false)) {
    return { ok: false, skipped: true };
  }

  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from =
    Deno.env.get('TWILIO_VOICE_FROM_NUMBER') ||
    Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!sid || !token || !from) {
    console.warn(
      '[send-prayer-start-notification] Twilio Voice enabled but missing env (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_VOICE_FROM_NUMBER or TWILIO_PHONE_NUMBER).'
    );
    return {
      ok: false,
      error: 'Twilio Voice is not configured (missing env vars).',
    };
  }

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
        },
        body: new URLSearchParams({
          From: from,
          To: to,
          Twiml: twiml,
        }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error(
        '[send-prayer-start-notification] Twilio Call error:',
        text
      );
      return { ok: false, error: text };
    }
    return { ok: true };
  } catch (e) {
    console.error('[send-prayer-start-notification] Twilio Call exception:', e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: { ...corsHeaders, 'Access-Control-Max-Age': '86400' },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) throw new Error('RESEND_API_KEY is not set');
    const resend = new Resend(resendApiKey);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_task_id } = await req.json();
    if (!user_task_id) {
      return new Response(
        JSON.stringify({ error: 'user_task_id is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    const { data: userTask, error } = await supabase
      .from('prayer_user_tasks')
      .select(`*, task:prayer_tasks(*)`)
      .eq('id', user_task_id)
      .single();

    if (error || !userTask) {
      throw new Error(`User task not found: ${error?.message}`);
    }

    const taskName = escapeHtml(userTask.task?.name || 'Prayer');
    const person = userTask.person_needs_help
      ? ` for ${escapeHtml(userTask.person_needs_help)}`
      : '';
    const baseUrl =
      Deno.env.get('SITE_URL') || 'https://peacefulinvestment.com';

    const prayerLink =
      typeof userTask.task?.link_or_video === 'string' &&
      userTask.task.link_or_video.trim()
        ? userTask.task.link_or_video.startsWith('/')
          ? `${baseUrl}${userTask.task.link_or_video}`
          : userTask.task.link_or_video
        : `${baseUrl}/prayer-tasks`;

    // 1) Email
    const emailHtml = `
      <!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no" />
     <title>Prayer Started</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;"> 
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%; background-color:#f3f4f6;">
      <tr>
        <td align="center" style="padding:28px 12px;">
          <!-- Outer container -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="container" style="width:600px; max-width:600px;">
            <!-- Main card wrapper -->
            <tr>
              <td style="padding:0 12px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="card" style="width:100%; border-radius:22px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.08);">
                  <!-- HERO (dark / gradient) -->
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

                  <!-- BODY (light section) -->
                  <tr>
                    <td style="background-color:#FFF; padding:26px 28px 30px 28px; font-family:Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
 
					<div style="font-size:24px;line-height:22px;color: #373737;font-weight: 700;padding-bottom:20px; text-align:left;">Prayer Started</div> 


                      <div style="text-align:left;"> 

					<p style="font-size:16px; line-height:24px; color:#6b7280;margin:0; padding:0 0 7px 0;">
                      Hello ${escapeHtml(userTask.name || "Friend")},
                    </p>
                    <p style="font-size:16px; line-height:24px; color:#6b7280;margin:0; padding:0 0 7px 0;">
                      You’ve started <strong>${taskName}</strong>${person}.
                    </p>
                    <p style="font-size:16px; line-height:24px; color:#6b7280;margin:0; padding:0 0 7px 0;">
                      We’ll send reminders to help you stay on track.
                    </p>
					 </div>
					 
                    <div style="margin:25px 0 30px 0; text-align: left;">
                      <a href="${prayerLink}" style="display: inline-block; background-color:#d7111d; color: #ffffff; text-decoration: none; font-family: Segoe UI, Roboto, Helvetica, Arial, sans-serif; font-size: 16px; line-height: 18px; font-weight: 700; padding: 14px 32px; border-radius: 9999px; text-transform: uppercase;">
                        Open Prayer
                      </a>
                    </div>
                    
					
                 <p style="margin:18px 0 0;color:#777;font-size:12px; font-family:Segoe UI, Roboto, Helvetica, Arial, sans-serif;">If you didn't request this, please contact support.</p>

                      
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
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

    await resend.emails.send({
      from: 'Peaceful Investment <support@peacefulinvestment.com>',
      to: userTask.email,
      subject: `Prayer Started — ${taskName}`,
      html: emailHtml,
    });

    // 2) SMS
    let smsSent = false;
    let smsError: string | null = null;
    if (userTask.phone_number) {
      const smsRes = await sendSMS(
        userTask.phone_number,
        `Prayer started: ${taskName}${person}\nOpen: ${prayerLink}`
      );
      smsSent = smsRes.ok;
      smsError = smsRes.ok || smsRes.skipped ? null : smsRes.error || null;
    }

    // 3) Voice call (ring phone)
    let callPlaced = false;
    let callError: string | null = null;
    if (userTask.phone_number) {
      const sayText = `Hello. This is Peaceful Investment. You have started the prayer ${taskName}. Please remember to pray daily. Goodbye.`;
      const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">${escapeHtml(sayText)}</Say></Response>`;
      const callRes = await placeCall(userTask.phone_number, twiml);
      callPlaced = callRes.ok;
      callError = callRes.ok || callRes.skipped ? null : callRes.error || null;
    }

    return new Response(
      JSON.stringify({
        success: true,
        email_sent: true,
        sms_sent: smsSent,
        sms_error: smsError,
        call_placed: callPlaced,
        call_error: callError,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (e) {
    console.error('[send-prayer-start-notification] error:', e);
    return new Response(
      JSON.stringify({
        success: false,
        error: e instanceof Error ? e.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
