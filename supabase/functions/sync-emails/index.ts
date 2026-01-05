import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  /* =======================
     CORS
  ======================= */
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    /* =======================
       AUTH
    ======================= */
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    /* =======================
       ADMIN CHECK
    ======================= */
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (role?.role !== "admin") {
      return new Response(
        JSON.stringify({ success: false, error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    /* =======================
       FETCH EMAIL ACCOUNTS
    ======================= */
    const { data: accounts, error: accountsError } = await supabase
      .from("email_accounts")
      .select("*")
      .eq("sync_enabled", true);

    if (accountsError || !accounts || accounts.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No email accounts found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    /* =======================
       CALL IMAP WORKER
    ======================= */
    const IMAP_WORKER_URL = Deno.env.get("IMAP_WORKER_URL");
    if (!IMAP_WORKER_URL) {
      return new Response(
        JSON.stringify({ success: false, error: "IMAP_WORKER_URL not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: any[] = [];

    for (const account of accounts) {
      try {
        const workerResponse = await fetch(IMAP_WORKER_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": authHeader, // ✅ PASS REAL JWT
          },
          body: JSON.stringify({
            id: account.id,
            email: account.email,
            imap_host: account.imap_host,
            imap_port: account.imap_port,
            imap_secure: account.imap_secure,
            smtp_host: account.smtp_host,
            smtp_port: account.smtp_port,
            smtp_secure: account.smtp_secure,
            username: account.email,
            password: account.password,
            provider: account.provider,
          }),
        });

        const data = await workerResponse.json();

        results.push({
          account_id: account.id,
          email: account.email,
          worker_response: data,
        });
      } catch (err: any) {
        results.push({
          account_id: account.id,
          email: account.email,
          error: err.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed_accounts: results.length,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});