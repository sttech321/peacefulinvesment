import { ReactNode, useEffect, useRef } from "react";
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
  const { profile, loading: profileLoading, refetchProfile } = useProfile();
  const { requests, loading: requestsLoading, refetch: refetchOverseasCompany } = useOverseasCompany();
  const location = useLocation();
  const navigate = useNavigate();
  const lastPathRef = useRef<string>("");

  // Always allow access to these pages - check FIRST before any other logic
  const allowedPaths = [
    "/profile",
    "/create-account",
    "/overseas-company",
    "/auth",
    "/login",
    "/",
    "/blog",
    "/contact",
    "/about",
    "/downloads",
  ];

  // Check if current path is allowed - bypass ALL checks including loading
  const isAllowedPath = allowedPaths.some(path => 
    location.pathname === path || location.pathname.startsWith("/auth") || location.pathname.startsWith("/login")
  );

  // Refetch profile and overseas company requests when navigating to ensure we have latest data
  // This prevents stale data issues when profile/requests are updated on other pages (like /profile, /overseas-company)
  // IMPORTANT: This hook must be called before any conditional returns (Rules of Hooks)
  useEffect(() => {
    if (user && !profileLoading && !requestsLoading && !isAllowedPath) {
      // Refetch if path changed or on initial mount (when lastPathRef is empty)
      const shouldRefetch = lastPathRef.current === "" || lastPathRef.current !== location.pathname;
      
      if (shouldRefetch) {
        console.log('[ProfileCompletionGuard] Refetching profile and overseas company requests to ensure latest data', { 
          pathname: location.pathname,
          previousPath: lastPathRef.current || '(initial mount)'
        });
        refetchProfile();
        // Also refetch overseas company requests to ensure we have the latest status
        if (refetchOverseasCompany) {
          refetchOverseasCompany();
        }
        lastPathRef.current = location.pathname;
      }
    } else if (isAllowedPath) {
      // Reset last path when on allowed path so we refetch when leaving
      lastPathRef.current = "";
    }
  }, [user, location.pathname, profileLoading, requestsLoading, refetchProfile, refetchOverseasCompany, isAllowedPath]);

  // Watch for profile changes - monitor key fields that indicate profile completion
  // This ensures the guard reacts when profile is updated from other components
  const profileCompletionKey = profile ? JSON.stringify({
    has_completed_profile: profile.has_completed_profile,
    first_name: (profile as any)?.first_name,
    last_name: (profile as any)?.last_name,
    full_name: profile.full_name,
    date_of_birth: (profile as any)?.date_of_birth,
    ssn_last4: (profile as any)?.ssn_last4,
    updated_at: profile.updated_at
  }) : null;

  useEffect(() => {
    // This effect will trigger when profile completion-related fields change
    // The component will automatically re-render and re-evaluate completion status
    if (profile && !isAllowedPath) {
      console.log('[ProfileCompletionGuard] Profile completion data changed, re-evaluating', {
        has_completed_profile: profile.has_completed_profile,
        updated_at: profile.updated_at
      });
    }
  }, [profileCompletionKey, profile, isAllowedPath]);

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

    // Always validate steps to ensure data integrity
    // Don't blindly trust has_completed_profile flag - it might be incorrectly set
    // This matches the validation logic in Profile.tsx findNextPendingStep
    
    // Step 1: Personal Information
    // Check for first_name/last_name first, fallback to splitting full_name
    let firstName = (profile as any)?.first_name || "";
    let lastName = (profile as any)?.last_name || "";
    
    // If first_name/last_name are missing but full_name exists, split it
    if ((!firstName || !lastName) && profile.full_name) {
      const nameParts = profile.full_name.trim().split(" ");
      if (nameParts.length > 0) {
        firstName = nameParts[0] || "";
        lastName = nameParts.slice(1).join(" ") || "";
      }
    }
    
    const dateOfBirth = (profile as any)?.date_of_birth || "";
    const ssnLast4 = (profile as any)?.ssn_last4 || "";
    // Also check metadata for drivers_license_number as fallback (some profiles may have it there but not in ssn_last4)
    const metadata = (profile as any)?.metadata || {};
    const driversLicenseNumber = metadata.drivers_license_number || "";
    // Consider personal info complete if we have ssn_last4 OR drivers_license_number in metadata
    const hasIdentityDocument = ssnLast4 || driversLicenseNumber.trim();
    const hasPersonalInfo = firstName.trim() && lastName.trim() && dateOfBirth && hasIdentityDocument;

    // Step 2: Contact Information
    const hasContactInfo = profile.phone?.trim() && 
                           profile.address?.trim() && 
                           profile.country?.trim() && 
                           profile.state?.trim() && 
                           profile.city?.trim() && 
                           profile.zip_code?.trim();

    // Step 3: Employment Information
    const hasEmploymentInfo = profile.employment_status?.trim();

    // Step 4: Financial Status
    const hasFinancialInfo = profile.annual_income && profile.annual_income > 0;

    // Step 5: Security Setup
    const securityQuestions = (profile as any)?.security_questions || [];
    const hasSecurityQuestions = Array.isArray(securityQuestions) && 
                                 securityQuestions.length >= 2 &&
                                 securityQuestions.every((q: any) => q?.question?.trim() && q?.answer?.trim());

    // Step 6: Document Upload
    const documentsByType = (profile as any)?.documents_by_type || {};
    const requiredDocumentTypes = ["drivers_license_front", "drivers_license_back", "passport"];
    const hasRequiredDocuments = requiredDocumentTypes.some((type) =>
      Boolean(documentsByType[type]?.length)
    );

    // Step 7: Investment Experience
    const hasInvestmentInfo = profile.investment_experience?.trim() && 
                              profile.risk_tolerance?.trim() &&
                              Array.isArray((profile as any)?.investment_goals) &&
                              (profile as any).investment_goals.length > 0;

    // All steps must be complete (steps 1-7, step 8 is review, step 9 is checked separately)
    const allStepsComplete = hasPersonalInfo && 
                             hasContactInfo && 
                             hasEmploymentInfo && 
                             hasFinancialInfo && 
                             hasSecurityQuestions && 
                             hasRequiredDocuments && 
                             hasInvestmentInfo;

    // If flag is set but steps are incomplete, log a warning
    if (profile.has_completed_profile && !allStepsComplete) {
      console.warn('[ProfileCompletionGuard] Profile flag is set but steps are incomplete:', {
        has_completed_profile: profile.has_completed_profile,
        hasPersonalInfo,
        hasContactInfo,
        hasEmploymentInfo,
        hasFinancialInfo,
        hasSecurityQuestions,
        hasRequiredDocuments,
        hasInvestmentInfo
      });
    }

    return allStepsComplete;
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
  // A request with status 'pending', 'processing', 'name_selected', or 'completed' satisfies the requirement
  const overseasCompanySatisfied = overseasCompanyCompleted || 
    (hasSubmittedRequest && ['pending', 'processing', 'name_selected', 'completed'].includes(requestStatus || ''));

  // Debug logging
  // Helper to check personal info (matching the logic above)
  const checkPersonalInfo = (p: typeof profile) => {
    if (!p) return false;
    let firstName = (p as any)?.first_name || "";
    let lastName = (p as any)?.last_name || "";
    if ((!firstName || !lastName) && p.full_name) {
      const nameParts = p.full_name.trim().split(" ");
      if (nameParts.length > 0) {
        firstName = nameParts[0] || "";
        lastName = nameParts.slice(1).join(" ") || "";
      }
    }
    const ssnLast4 = (p as any)?.ssn_last4 || "";
    const metadata = (p as any)?.metadata || {};
    const driversLicenseNumber = metadata.drivers_license_number || "";
    const hasIdentityDocument = ssnLast4 || driversLicenseNumber.trim();
    return !!(firstName.trim() && lastName.trim() && (p as any)?.date_of_birth && hasIdentityDocument);
  };

  const profileData = profile ? {
    has_completed_profile: profile.has_completed_profile,
    hasPersonalInfo: checkPersonalInfo(profile),
    hasContactInfo: !!(profile.phone && profile.address && profile.country && profile.state && profile.city && profile.zip_code),
    hasEmploymentInfo: !!profile.employment_status,
    hasFinancialInfo: !!(profile.annual_income && profile.annual_income > 0),
    hasSecurityQuestions: Array.isArray((profile as any)?.security_questions) && (profile as any).security_questions.length >= 2,
    hasRequiredDocuments: (() => {
      const docs = (profile as any)?.documents_by_type || {};
      return ["drivers_license_front", "drivers_license_back", "passport"].some(type => Boolean(docs[type]?.length));
    })(),
    hasInvestmentInfo: !!(profile.investment_experience && profile.risk_tolerance && Array.isArray((profile as any)?.investment_goals) && (profile as any).investment_goals.length > 0)
  } : null;

  console.log('[ProfileCompletionGuard] Profile completion check:', {
    isProfileComplete,
    isUSAClient,
    overseasCompanyRequired,
    overseasCompanyCompleted,
    hasSubmittedRequest,
    requestStatus,
    overseasCompanySatisfied,
    requestsCount: requests?.length || 0,
    currentRequestId: currentRequest?.id,
    profileData,
    willGrantAccess: isProfileComplete && isUSAClient && (!overseasCompanyRequired || overseasCompanySatisfied)
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
