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
    if (authLoading || profileLoading) return;

    const path = location.pathname;
    const state = location.state as { fromOnboarding?: boolean } | null;
    const fromOnboarding = state?.fromOnboarding;

    // 1️⃣ Not authenticated → protect dashboard
    if (!user) {
      if (path.startsWith("/dashboard")) {
        navigate("/auth");
      }
      return;
    }

    // From here: user is authenticated

    // 2️⃣ Authenticated but on /auth → send home
    if (path === "/auth") {
      navigate("/");
      return;
    }

    // 3️⃣ Profile incomplete → force onboarding,
    //    BUT allow a one-time pass if we *just* came from onboarding
    // if (
    //   profile &&
    //   !profile.has_completed_profile &&
    //   !fromOnboarding && // ← this is the key
    //   !["/create-account", "/overseas-company"].includes(path) &&
    //   !path.startsWith("/auth")
    // ) {
    //   navigate("/create-account");
    //   return;
    // }

    // REMOVE profile check — only block if email not confirmed
    if (user && !user.email_confirmed_at && path !== "/auth/confirm-email") {
      navigate("/auth/confirm-email");
      return;
    }



    // 4️⃣ Profile complete but still on create-account → go to dashboard
    if (
      profile &&
      profile.has_completed_profile &&
      path === "/create-account"
    ) {
      navigate("/dashboard");
      return;
    }
  }, [user, profile, authLoading, profileLoading, location.pathname, location.state, navigate]);

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
