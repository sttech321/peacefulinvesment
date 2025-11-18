import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type UserRole = 'admin' | 'moderator' | 'user';

export const useUserRole = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>('user');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setRole('user');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching user role:', error);
          setRole('user');
        } else {
          setRole(data?.role || 'user');
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setRole('user');
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  const hasRole = (requiredRole: UserRole): boolean => {
    const roleHierarchy: Record<UserRole, number> = {
      user: 1,
      moderator: 2,
      admin: 3,
    };

    return roleHierarchy[role] >= roleHierarchy[requiredRole];
  };

  const isAdmin = () => hasRole('admin');
  const isModerator = () => hasRole('moderator');

  return {
    role,
    loading,
    hasRole,
    isAdmin,
    isModerator,
  };
};