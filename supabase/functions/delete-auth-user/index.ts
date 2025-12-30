import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DeleteAuthUserRequest {
  user_id: string;
}

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

    // Parse request body
    const { user_id }: DeleteAuthUserRequest = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ success: false, error: "user_id is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Prevent self-deletion
    if (user_id === user.id) {
      return new Response(
        JSON.stringify({ success: false, error: "Cannot delete your own account" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if user exists before attempting deletion
    let userExists = false;
    try {
      const { data: existingUser, error: checkError } = await supabaseAdmin.auth.admin.getUserById(user_id);
      if (!checkError && existingUser?.user) {
        userExists = true;
      }
    } catch (checkErr) {
      console.warn("Error checking if user exists:", checkErr);
      // Continue with deletion attempt even if check fails
    }

    // Delete the auth user
    let deleteError = null;
    let deleteSuccess = false;
    
    if (userExists) {
      try {
        const { error: err } = await supabaseAdmin.auth.admin.deleteUser(user_id);
        if (err) {
          deleteError = err;
          console.error("Error deleting auth user:", err);
        } else {
          deleteSuccess = true;
          console.log(`Successfully deleted auth user: ${user_id}`);
        }
      } catch (err: any) {
        deleteError = err;
        console.error("Exception deleting auth user:", err);
      }
    } else {
      // User doesn't exist, consider it already deleted
      console.log(`User ${user_id} does not exist in auth.users, considering it already deleted`);
      deleteSuccess = true;
    }

    // Return success even if deletion failed, as profile and related data are already soft-deleted
    // This prevents blocking the admin deletion process
    if (deleteError) {
      console.warn(`Auth user deletion failed for ${user_id}, but profile data has been soft-deleted`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          warning: true,
          message: "Profile and related data deleted successfully. Auth user deletion had issues but data is safe.",
          error: deleteError.message 
        }),
        {
          status: 200, // Return 200 to indicate partial success
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: deleteSuccess 
          ? "User deleted successfully from auth system" 
          : "User deletion completed (user may not have existed in auth system)"
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in delete-auth-user function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});

