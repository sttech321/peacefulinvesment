import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2 } from "lucide-react";

interface AdminRouteGuardProps {
  children: ReactNode;
}

export default function AdminRouteGuard({ children }: AdminRouteGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for both auth and role loading to complete
    if (!authLoading && !roleLoading) {
      // If not authenticated, redirect to auth
      if (!user) {
        navigate("/auth");
        return;
      }

      // If not admin, redirect to dashboard
      if (!isAdmin()) {
        navigate("/dashboard");
        return;
      }
    }
  }, [user, authLoading, roleLoading, isAdmin, navigate]);

  // Show loading while checking permissions
  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2 text-white pt-5">Verifying Access</h2>
          <p className="text-muted-foreground">Checking admin permissions...</p>
        </div>
      </div>
    );
  }

  // If not authenticated or not admin, don't render children
  if (!user || !isAdmin()) {
    return null;
  }

  // User is authenticated and is admin, render children
  return <>{children}</>;
}
