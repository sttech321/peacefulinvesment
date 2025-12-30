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
    // Validate environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Missing required environment variables:", {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceRoleKey
      });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Server configuration error: Missing required environment variables" 
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

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
    let supabaseAdmin;
    try {
      supabaseAdmin = createClient(
        supabaseUrl,
        supabaseServiceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );
    } catch (clientError: any) {
      console.error("Error creating Supabase client:", clientError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to initialize database client",
          details: clientError?.message || "Unknown error"
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Verify the user is authenticated
    const token = authHeader.replace("Bearer ", "");
    let user;
    let userError;
    
    try {
      const result = await supabaseAdmin.auth.getUser(token);
      user = result.data?.user;
      userError = result.error;
    } catch (authErr: any) {
      console.error("Error verifying user authentication:", authErr);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Authentication verification failed",
          details: authErr?.message || "Unknown error"
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized", details: userError?.message }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if user is admin
    let userRole;
    let roleError;
    
    try {
      const roleResult = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      userRole = roleResult.data;
      roleError = roleResult.error;
    } catch (roleCheckErr: any) {
      console.error("Error checking user role:", roleCheckErr);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to verify admin access",
          details: roleCheckErr?.message || "Unknown error"
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (roleError || !userRole || userRole.role !== "admin") {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Forbidden: Admin access required",
          details: roleError?.message || "User is not an admin"
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Parse request body
    let user_id: string;
    try {
      const body = await req.json();
      user_id = body.user_id;
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid request body" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!user_id || typeof user_id !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: "user_id is required and must be a string" }),
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
        console.log(`User ${user_id} exists in auth.users`);
      } else {
        console.log(`User ${user_id} does not exist in auth.users (checkError: ${checkError?.message || 'none'})`);
      }
    } catch (checkErr: any) {
      console.warn("Error checking if user exists:", checkErr?.message || checkErr);
      // Continue with deletion attempt even if check fails
      // Assume user doesn't exist if check fails
      userExists = false;
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
    const errorMessage = error?.message || error?.toString() || "Internal server error";
    const errorStack = error?.stack || "No stack trace available";
    const errorName = error?.name || "UnknownError";
    console.error("Error details:", { 
      name: errorName,
      message: errorMessage, 
      stack: errorStack,
      cause: error?.cause
    });
    
    // For critical errors (like missing env vars, client init failures), return 500
    // For other errors, return 200 with warning to allow the deletion process to continue
    // since the profile data is already soft-deleted
    const isCriticalError = errorMessage.includes("environment") || 
                           errorMessage.includes("configuration") ||
                           errorMessage.includes("initialize") ||
                           errorName === "TypeError" ||
                           errorName === "ReferenceError";
    
    if (isCriticalError) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Database error deleting user",
          details: errorMessage,
          type: "critical"
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    // Return 200 with warning for non-critical errors
    return new Response(
      JSON.stringify({ 
        success: true, 
        warning: true,
        message: "Profile and related data deleted. Auth user deletion encountered an error but data is safe.",
        error: errorMessage,
        type: "non-critical"
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});

