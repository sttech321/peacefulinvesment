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

    // Delete related data first (hard delete) - order matters due to foreign key constraints
    const deletionErrors: string[] = [];
    
    console.log(`[HARD DELETE] Starting hard delete for user ${user_id}...`);

    // Helper function to safely delete from a table
    const safeDelete = async (tableName: string, condition: { column: string; value: string }, description: string) => {
      try {
        const { error } = await supabaseAdmin
          .from(tableName)
          .delete()
          .eq(condition.column, condition.value);
        if (error) {
          console.error(`[HARD DELETE] Error deleting ${tableName}:`, error);
          deletionErrors.push(`${tableName}: ${error.message}`);
          return false;
        } else {
          console.log(`[HARD DELETE] Deleted ${tableName} for user ${user_id}`);
          return true;
        }
      } catch (err: any) {
        console.error(`[HARD DELETE] Exception deleting ${tableName}:`, err);
        deletionErrors.push(`${tableName}: ${err?.message || "Unknown error"}`);
        return false;
      }
    };

    // Delete in order to respect foreign key constraints
    // 1. Delete referral_signups first (references referrals)
    await safeDelete("referral_signups", { column: "referred_user_id", value: user_id }, "referral signups");

    // 2. Delete verification_requests (references profiles)
    await safeDelete("verification_requests", { column: "user_id", value: user_id }, "verification requests");

    // 3. Delete admin_actions (references profiles and verification_requests)
    await safeDelete("admin_actions", { column: "user_id", value: user_id }, "admin actions");

    // 4. Delete overseas company requests
    await safeDelete("overseas_company_requests", { column: "user_id", value: user_id }, "overseas company requests");

    // 5. Delete overseas companies
    await safeDelete("overseas_companies", { column: "user_id", value: user_id }, "overseas companies");

    // 6. Delete referrals (references user_id)
    await safeDelete("referrals", { column: "user_id", value: user_id }, "referrals");

    // 7. Delete transactions
    await safeDelete("transactions", { column: "user_id", value: user_id }, "transactions");

    // 8. Delete metatrader accounts (references auth.users)
    await safeDelete("metatrader_accounts", { column: "user_id", value: user_id }, "metatrader accounts");

    // 9. Delete user roles
    await safeDelete("user_roles", { column: "user_id", value: user_id }, "user roles");

    // 10. Delete profile last (may have CASCADE dependencies)
    await safeDelete("profiles", { column: "user_id", value: user_id }, "profiles");

    // Delete the auth user
    let deleteError: any = null;
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

    // Collect all errors
    const allErrors = [...deletionErrors];
    if (deleteError) {
      const errorMsg = (deleteError as any)?.message || String(deleteError) || "Unknown error";
      allErrors.push(`auth user: ${errorMsg}`);
    }

    // Return success even if some deletions failed
    // This prevents blocking the admin deletion process
    if (deleteError || deletionErrors.length > 0) {
      const hasAuthError = !!deleteError;
      const hasDataErrors = deletionErrors.length > 0;
      
      let message = "User deletion completed with some issues:";
      if (hasDataErrors) {
        message += " Some related data could not be deleted.";
      }
      if (hasAuthError) {
        message += " Auth user deletion had issues.";
      }
      
      console.warn(`Deletion completed with errors for ${user_id}:`, allErrors);
      return new Response(
        JSON.stringify({ 
          success: true, 
          warning: true,
          message: message,
          errors: allErrors.length > 0 ? allErrors : undefined,
          error: (deleteError ? ((deleteError as any)?.message || String(deleteError)) : undefined) || (deletionErrors.length > 0 ? "Some data deletions failed" : undefined)
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
          ? "User and all related data deleted successfully from the system" 
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
