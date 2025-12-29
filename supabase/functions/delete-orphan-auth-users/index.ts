import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    // Create Supabase client with service role key to bypass RLS
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

    // 1️⃣ find orphaned auth users
    // Instead of using RPC function, query directly to find users without profiles
    // Get all auth users
    const { data: allAuthUsers, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authUsersError) {
      console.error("Error fetching auth users:", authUsersError);
      return new Response(
        JSON.stringify({ success: false, error: authUsersError.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get all profile user_ids
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("user_id");

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return new Response(
        JSON.stringify({ success: false, error: profilesError.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Find orphaned users (auth users without profiles)
    const profileUserIds = new Set((profiles || []).map(p => p.user_id));
    const orphanedUsers = (allAuthUsers?.users || []).filter(
      authUser => !profileUserIds.has(authUser.id)
    );

    const users = orphanedUsers.map(u => ({ id: u.id }));

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ success: true, deleted: 0, message: "No orphaned users found" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // 2️⃣ delete them
    let deletedCount = 0;
    const errors: string[] = [];

    for (const user of users) {
      try {
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
        if (deleteError) {
          console.error(`Error deleting user ${user.id}:`, deleteError);
          errors.push(`User ${user.id}: ${deleteError.message}`);
        } else {
          deletedCount++;
        }
       // console.log(`SKIPPED deletion for orphan user: ${user.id}`);
      } catch (err: any) {
        console.error(`Exception deleting user ${user.id}:`, err);
        errors.push(`User ${user.id}: ${err.message || "Unknown error"}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        deleted: deletedCount,
        total: users.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in delete-orphan-auth-users function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});

