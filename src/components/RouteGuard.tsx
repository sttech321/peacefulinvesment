import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

interface RouteGuardProps {
  children: React.ReactNode;
}

const RouteGuard = ({ children }: RouteGuardProps) => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Don't do anything while loading
    if (authLoading || profileLoading) return;

    // If not authenticated and trying to access protected routes
    if (!user && location.pathname.startsWith('/dashboard')) {
      navigate('/auth');
      return;
    }

    // If authenticated but trying to access auth page
    if (user && location.pathname === '/auth') {
      navigate('/');
      return;
    }

    // If authenticated and profile not complete, redirect to onboarding (but allow create-account access)
    if (
    user &&
    profile &&
    !profile.has_completed_profile &&
    !['/create-account', '/overseas-company'].includes(location.pathname) &&
    !location.pathname.startsWith('/auth')
  ) {
    navigate('/create-account');
    return;
  }

    // If authenticated with complete profile but on create-account page
    if (user && profile && profile.has_completed_profile && location.pathname === '/create-account') {
      navigate('/dashboard');
      return;
    }

    // If trying to access dashboard without completing profile
    if (user && profile && !profile.has_completed_profile && location.pathname.startsWith('/dashboard')) {
      navigate('/create-account');
      return;
    }
  }, [user, profile, authLoading, profileLoading, location.pathname, navigate]);

  // Show loading while checking authentication and profile
  if (authLoading || (user && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center pink-yellow-shadow">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
};

export default RouteGuard;