import { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useOverseasCompany } from "@/hooks/useOverseasCompany";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, User, Building2, ArrowRight, Loader2 } from "lucide-react";

interface ProfileCompletionGuardProps {
  children: ReactNode;
}

const ProfileCompletionGuard = ({ children }: ProfileCompletionGuardProps) => {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { requests, loading: requestsLoading } = useOverseasCompany();
  const location = useLocation();
  const navigate = useNavigate();

  // Always allow access to these pages - check FIRST before any other logic
  const allowedPaths = [
    "/profile",
    "/create-account",
    "/overseas-company",
    "/auth",
    "/",
    "/blog",
    "/contact",
    "/about",
    "/downloads",
  ];

  // Check if current path is allowed - bypass ALL checks including loading
  const isAllowedPath = allowedPaths.some(path => 
    location.pathname === path || location.pathname.startsWith("/auth")
  );

  // If on allowed path, show children immediately (no profile checks, no loading checks)
  if (isAllowedPath) {
    return <>{children}</>;
  }

  // If user is not authenticated, let RouteGuard handle it
  // Only check profile completion for authenticated users
  if (!user) {
    return <>{children}</>;
  }

  // Show loading state
  if (profileLoading || requestsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pink-yellow-shadow">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if profile is effectively complete
  const isProfileEffectivelyComplete = () => {
    if (!profile) return false;

    // Check the flag first
    if (profile.has_completed_profile) return true;

    // Check if essential fields are filled (indicates profile was filled)
    const essentialFieldsCount = [
      profile.full_name,
      profile.phone,
      profile.address,
      profile.city,
      profile.state,
      profile.zip_code
    ].filter(Boolean).length;

    // If they have at least 3 essential fields, consider profile filled
    const hasEssentialFields = essentialFieldsCount >= 3;
    
    // Also check if all critical fields are present (more comprehensive check)
    const hasAllCriticalFields = 
      profile.full_name &&
      profile.phone &&
      profile.address &&
      profile.city &&
      profile.state &&
      profile.zip_code &&
      profile.employment_status &&
      profile.annual_income &&
      profile.investment_experience &&
      profile.risk_tolerance;

    // Consider complete if they have all critical fields OR essential fields
    return hasAllCriticalFields || hasEssentialFields;
  };

  const isProfileComplete = isProfileEffectivelyComplete();
  const isUSAClient = profile?.is_usa_client || false;
  const overseasCompanyRequired = profile?.overseas_company_required || false;
  const overseasCompanyCompleted = profile?.overseas_company_completed || false;

  // For non-USA users: Once profile is complete, grant immediate access
  if (isProfileComplete && !isUSAClient) {
    return <>{children}</>;
  }

  // Check if user has submitted an overseas company request
  const currentRequest = requests?.[0];
  const hasSubmittedRequest = currentRequest !== undefined;
  const requestStatus = currentRequest?.status;

  // Determine if overseas company requirement is satisfied
  const overseasCompanySatisfied = overseasCompanyCompleted || 
    (hasSubmittedRequest && ['pending', 'processing', 'name_selected', 'completed'].includes(requestStatus || ''));

  // Debug logging
  console.log('[ProfileCompletionGuard] Profile completion check:', {
    isProfileComplete,
    isUSAClient,
    overseasCompanyRequired,
    overseasCompanyCompleted,
    hasSubmittedRequest,
    requestStatus,
    overseasCompanySatisfied,
    requestsCount: requests?.length || 0
  });

  // For USA users: Once profile is complete AND overseas company requirement is satisfied, grant immediate access
  if (isProfileComplete && isUSAClient && (!overseasCompanyRequired || overseasCompanySatisfied)) {
    return <>{children}</>;
  }

  // If profile is not complete, show guard
  if (!isProfileComplete) {
    return (
      <div className="min-h-[calc(100vh-80px)] pink-yellow-shadow pt-8 pb-12 mt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="bg-black border border-muted/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <CardTitle className="text-white text-2xl">Complete Your Profile First</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    You need to complete your profile to access this page
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  To access dashboard features and other pages, please complete your profile setup first.
                </p>
                
                <div className="bg-muted/10 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-white font-medium">Profile Information</p>
                      <p className="text-sm text-muted-foreground">
                        Complete your personal details, contact information, and preferences
                      </p>
                    </div>
                  </div>
                  
                  {isUSAClient && (
                    <div className="flex items-start gap-3">
                      <Building2 className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-white font-medium">Overseas Company Registration</p>
                        <p className="text-sm text-muted-foreground">
                          Required for USA clients. You'll be guided to this after completing your profile.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => navigate("/profile")}
                  className="bg-gradient-yellow-to-pink hover:bg-gradient-pink-to-yellow rounded-[8px] border-0 flex-1"
                >
                  Complete Profile
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button
                  onClick={() => navigate("/")}
                  variant="outline"
                  className="rounded-[8px] border-0 flex-1"
                >
                  Go to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // If USA client and overseas company is required but not satisfied
  if (isUSAClient && overseasCompanyRequired && !overseasCompanySatisfied) {
    return (
      <div className="min-h-[calc(100vh-80px)] pink-yellow-shadow pt-8 pb-12 mt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="bg-black border border-muted/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <CardTitle className="text-white text-2xl">Overseas Company Registration Required</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    USA clients must complete overseas company registration
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  As a USA client, you need to register an overseas company before accessing dashboard features.
                </p>
                
                <div className="bg-muted/10 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="text-white font-medium">Profile Completed</p>
                      <p className="text-sm text-muted-foreground">
                        Your profile has been successfully completed
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="text-white font-medium">Overseas Company Registration Pending</p>
                      <p className="text-sm text-muted-foreground">
                        Please complete the overseas company registration process to continue
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => navigate("/overseas-company")}
                  className="bg-gradient-yellow-to-pink hover:bg-gradient-pink-to-yellow rounded-[8px] border-0 flex-1"
                >
                  Register Overseas Company
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button
                  onClick={() => navigate("/profile")}
                  variant="outline"
                  className="rounded-[8px] border-0 flex-1"
                >
                  View Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // All requirements met, show children
  return <>{children}</>;
};

export default ProfileCompletionGuard;
