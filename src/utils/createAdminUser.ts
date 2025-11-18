import { supabase } from "@/integrations/supabase/client";

/**
 * Utility function to create an admin user
 * This function updates a user's role to 'admin' in the user_roles table
 * 
 * @param userEmail - The email of the user to make admin
 * @returns Promise<{ success: boolean; message: string }>
 */
export const createAdminUser = async (userEmail: string) => {
  try {
    // Get the current user's session to verify they have permission
    const { data: { user: currentUser }, error: sessionError } = await supabase.auth.getUser();
    
    if (sessionError || !currentUser) {
      return {
        success: false,
        message: "You must be logged in to create admin users"
      };
    }

    // Check if current user is already an admin
    const { data: currentUserRole, error: roleCheckError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUser.id)
      .maybeSingle();

    if (roleCheckError) {
      console.error('Error checking current user role:', roleCheckError);
      // Continue anyway - this might be the first admin user
    }

    // If current user is not admin and not the first user, deny access
    if (currentUserRole?.role !== 'admin') {
      // Check if this is the first user in the system (allow them to become admin)
      const { data: allRoles, error: allRolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (allRolesError) {
        return {
          success: false,
          message: "Failed to verify permissions. Please contact support."
        };
      }

      if (allRoles && allRoles.length > 0) {
        return {
          success: false,
          message: "Only existing admins can create new admin users"
        };
      }
    }

    // Since we can't access auth.users directly from client, we'll use a different approach
    // We'll try to find the user in profiles table and use their user_id
    // But first, let's check if the current user is trying to make themselves admin
    if (currentUser.email === userEmail) {
      // User is trying to make themselves admin
      const targetUserId = currentUser.id;
      
      // Check if user already has a role
      const { data: existingRole, error: roleCheckError2 } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (roleCheckError2) {
        return {
          success: false,
          message: `Failed to check existing role: ${roleCheckError2.message}`
        };
      }

      if (existingRole) {
        // Update existing role to admin
        const { error: updateError } = await supabase
          .from('user_roles')
          .update({ role: 'admin' })
          .eq('user_id', targetUserId);

        if (updateError) {
          return {
            success: false,
            message: `Failed to update role: ${updateError.message}`
          };
        }

        return {
          success: true,
          message: `User ${userEmail} role updated to admin successfully`
        };
      } else {
        // Create new admin role
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert({
            user_id: targetUserId,
            role: 'admin'
          });

        if (insertError) {
          return {
            success: false,
            message: `Failed to create admin role: ${insertError.message}`
          };
        }

        return {
          success: true,
          message: `User ${userEmail} made admin successfully`
        };
      }
    } else {
      // User is trying to make someone else admin
      // Since we can't access auth.users directly, we'll need to use the SQL method
      return {
        success: false,
        message: "To create admin users for other accounts, please use the SQL method below. The web interface only works for making yourself an admin."
      };
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Alternative method: Create admin user using direct SQL (for first-time setup)
 * This should be run in Supabase SQL Editor
 */
export const getAdminCreationSQL = (userEmail: string) => {
  return `
-- Run this SQL in Supabase SQL Editor to create an admin user
-- Replace '${userEmail}' with the actual email address

-- Method 1: If the user exists in auth.users
INSERT INTO user_roles (user_id, role) 
SELECT id, 'admin'::app_role 
FROM auth.users 
WHERE email = '${userEmail}'
ON CONFLICT (user_id) 
DO UPDATE SET role = 'admin'::app_role;

-- Method 2: If you know the user_id directly
-- INSERT INTO user_roles (user_id, role) 
-- VALUES ('your-user-id-here', 'admin'::app_role)
-- ON CONFLICT (user_id) 
-- DO UPDATE SET role = 'admin'::app_role;
  `;
};

/**
 * Utility function to list all users with their roles
 * 
 * @returns Promise<{ success: boolean; data?: any[]; message: string }>
 */
export const listUsersWithRoles = async () => {
  try {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*');

    if (rolesError) {
      throw new Error(`Failed to fetch roles: ${rolesError.message}`);
    }

    const usersWithRoles = profiles?.map(profile => {
      const userRole = roles?.find(role => role.user_id === profile.user_id);
      return {
        id: profile.user_id,
        email: profile.user_id, // We'll need to get email from auth.users
        full_name: profile.full_name,
        role: userRole?.role || 'user',
        created_at: profile.created_at
      };
    }) || [];

    return {
      success: true,
      data: usersWithRoles,
      message: 'Users fetched successfully'
    };
  } catch (error) {
    console.error('Error listing users with roles:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};
