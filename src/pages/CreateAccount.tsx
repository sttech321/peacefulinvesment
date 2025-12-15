import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Import step components
import PersonalInformation from "@/components/create-account/PersonalInformation";
import ContactInformation from "@/components/create-account/ContactInformation";
import EmploymentInformation from "@/components/create-account/EmploymentInformation";
import FinancialStatus from "@/components/create-account/FinancialStatus";
import SecuritySetup from "@/components/create-account/SecuritySetup";
import DocumentUpload from "@/components/create-account/DocumentUpload";
import InvestmentExperience from "@/components/create-account/InvestmentExperience";
import ReviewSubmit from "@/components/create-account/ReviewSubmit";
import OverseasCompanyStep from "@/components/create-account/OverseasCompanyStep";
import LoadingScreen from "@/components/ui/loading-screen";
import Footer from "@/components/Footer";

export interface FormData {
  // Personal Information
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  socialSecurityNumber: string;

  // Contact Information
  phone: string;
  address: string;
  country: string;
  countryCode: string;
  state: string;
  stateCode: string;
  city: string;
  zipCode: string;

  // Employment Information
  employmentStatus: string;
  employer: string;
  employerCountry: string;
  employerAddressLine1: string;
  employerAddressLine2: string;
  employerCity: string;
  employerState: string;
  employerZip: string;
  businessNature: string;
  occupation: string;

  // Financial Status
  annualIncome: number;
  netWorth: number;
  liquidNetWorth: number;

  // Security Setup
  securityQuestions: Array<{ question: string; answer: string }>;

  // Document Upload
  documents: File[];
  documentsByType: Record<string, File[]>;

  // Investment Experience
  investmentExperience: string;
  riskTolerance: string;
  investmentGoals: string[];
  investmentTimeHorizon: string;

  // USA Client Requirements
  isUSAClient: boolean;
  overseasCompanyRequired: boolean;
  overseasCompanyCompleted: boolean;
  overseasCompanyId?: string;
}

const TOTAL_STEPS = 8; // Will be 9 for USA clients

const CreateAccount = () => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, updateProfile, refetchProfile } = useProfile();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    socialSecurityNumber: "",
    phone: "",
    address: "",
    country: "",
    countryCode: "",
    state: "",
    stateCode: "",
    city: "",
    zipCode: "",
    employmentStatus: "",
    employer: "",
    employerCountry: "",
    employerAddressLine1: "",
    employerAddressLine2: "",
    employerCity: "",
    employerState: "",
    employerZip: "",
    businessNature: "",
    occupation: "",
    annualIncome: 0,
    netWorth: 0,
    liquidNetWorth: 0,
    securityQuestions: [
      { question: "", answer: "" },
      { question: "", answer: "" },
    ],
    documents: [],
    documentsByType: {},
    investmentExperience: "",
    riskTolerance: "",
    investmentGoals: [],
    investmentTimeHorizon: "",
    isUSAClient: false,
    overseasCompanyRequired: false,
    overseasCompanyCompleted: false,
    overseasCompanyId: undefined,
  });

  const [stepErrors, setStepErrors] = useState<Record<number, string[]>>({});

  // Note: CreateAccount should be accessible without authentication for referral links
  // The authentication check is handled by the RouteGuard component

  // useEffect(() => {
  //   if (!profileLoading && profile?.has_completed_profile) {
  //     navigate("/dashboard");
  //   }
  // }, [profile, profileLoading, navigate]);

  // Redirect unauthenticated users to auth page with referral code
  useEffect(() => {
    if (!authLoading && !user) {
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref');
      const redirectUrl = refCode ? `/auth?ref=${refCode}` : '/auth';
      navigate(redirectUrl);
      return;
    }
  }, [user, authLoading, navigate]);

  const updateFormData = (stepData: Partial<FormData>) => {
    setFormData(prev => {
      const newData = { ...prev, ...stepData };

      // Check if this is a USA client and update accordingly
      const isUSAClient = newData.countryCode === 'US' || newData.country === 'United States';
      if (isUSAClient !== prev.isUSAClient) {
        newData.isUSAClient = isUSAClient;
        newData.overseasCompanyRequired = isUSAClient;
        newData.overseasCompanyCompleted = false;
        newData.overseasCompanyId = undefined;
      }

      return newData;
    });
  };

  const validateCurrentStep = (): boolean => {
    const errors: string[] = [];

    switch (currentStep) {
      case 1:
        if (!formData.firstName.trim()) errors.push("First name is required");
        if (!formData.lastName.trim()) errors.push("Last name is required");
        if (!formData.dateOfBirth) errors.push("Date of birth is required");
        if (!formData.socialSecurityNumber.trim()) errors.push("Social Security Number is required");
        break;
      case 2:
        if (!formData.phone.trim()) errors.push("Phone number is required");
        if (!formData.address.trim()) errors.push("Address is required");
        if (!formData.country.trim()) errors.push("Country is required");
        if (!formData.state.trim()) errors.push("State is required");
       if (!formData.city.trim()) errors.push("City is required");
        if (!formData.zipCode.trim()) errors.push("ZIP code is required");
        break;
      case 3:
        if (!formData.employmentStatus) errors.push("Employment status is required");
        if (["employed", "part-time"].includes(formData.employmentStatus)) {
          if (!formData.employer.trim()) errors.push("Employer name is required");
          if (!formData.employerCountry) errors.push("Employer country is required");
          if (!formData.employerAddressLine1.trim()) errors.push("Employer address is required");
          if (!formData.employerCity.trim()) errors.push("Employer city is required");
          if (!formData.employerState.trim()) errors.push("Employer state/province is required");
          if (!formData.employerZip.trim()) errors.push("Employer ZIP/postal code is required");
          if (!formData.occupation.trim()) errors.push("Job title/occupation is required");
        }
        if (formData.employmentStatus === "self-employed" && !formData.businessNature) {
          errors.push("Nature of business is required");
        }
        break;
      case 4:
        if (!formData.annualIncome || formData.annualIncome <= 0) errors.push("Annual income is required");
        break;
      case 5:
        if (formData.securityQuestions.some(q => !q.question || !q.answer.trim())) {
          errors.push("All security questions and answers are required");
        }
        break;
      case 6:
        // Check if at least one required document type has files
        const requiredDocumentTypes = ['drivers_license_front', 'drivers_license_back', 'passport'];
        const hasRequiredDocuments = requiredDocumentTypes.some(type =>
          formData.documentsByType[type] && formData.documentsByType[type].length > 0
        );
        if (!hasRequiredDocuments) {
          errors.push("At least one required document is required (Driver's License Front/Back or Passport)");
        }
        break;
      case 7:
        if (!formData.investmentExperience) errors.push("Investment experience is required");
        if (!formData.riskTolerance) errors.push("Risk tolerance is required");
        if (formData.investmentGoals.length === 0) errors.push("At least one investment goal is required");
        break;
      case 8:
        // Review step - no validation needed, just review
        break;
      case 9:
        // USA clients must complete overseas company registration
        if (formData.isUSAClient && !formData.overseasCompanyCompleted) {
          // errors.push("Overseas company registration is required for USA clients before trading access");
        }
        break;
    }

    setStepErrors(prev => ({ ...prev, [currentStep]: errors }));
    return errors.length === 0;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      const maxSteps = formData.isUSAClient ? 9 : 8; // USA clients have 9 steps
      if (currentStep < maxSteps) {
        setCurrentStep(prev => prev + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setIsSubmitting(true);
    setLoadingStep(0);

    try {
      // Step 1: Processing Profile Information
      setLoadingStep(1);
      await new Promise(resolve => setTimeout(resolve, 1500));

      const profileUpdates = {
        full_name: `${formData.firstName} ${formData.lastName}`,
        date_of_birth: formData.dateOfBirth,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zipCode,
        employment_status: formData.employmentStatus,
        employer: formData.employer,
        annual_income: formData.annualIncome,
        investment_experience: formData.investmentExperience,
        risk_tolerance: formData.riskTolerance,
        investment_goals: formData.investmentGoals,
        documents_uploaded:
          Object.values(formData.documentsByType || {}).flat().length > 0,
        has_completed_profile: true,
      };

      // Step 2–5: fake loading steps (unchanged)
      setLoadingStep(2);
      await new Promise(resolve => setTimeout(resolve, 2000));

      setLoadingStep(3);
      await new Promise(resolve => setTimeout(resolve, 1500));

      setLoadingStep(4);
      await new Promise(resolve => setTimeout(resolve, 1500));

      setLoadingStep(5);

      // Add USA client information to profile updates
      const finalProfileUpdates = {
        ...profileUpdates,
        is_usa_client: formData.isUSAClient,
        overseas_company_required: formData.overseasCompanyRequired,
        overseas_company_completed: formData.overseasCompanyCompleted,
        overseas_company_id: formData.overseasCompanyId,
      };

      // ✅ First update profile in DB + in-memory via useProfile
      const { error } = await updateProfile(finalProfileUpdates);

      if (error) {
        setIsSubmitting(false);
        toast({
          title: 'Error',
          description: 'Failed to save profile. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      // (Optional) extra safety – refetch AFTER update, not before
      // await refetchProfile();

      // Success delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Handle USA client redirect
      if (formData.isUSAClient) {
        toast({
          title: 'Account Created!',
          description:
            "Your account has been created. You'll now be redirected to complete your overseas company registration.",
        });
        navigate('/overseas-company');
      } else {
        toast({
          title: 'Profile Complete!',
          description:
            'Welcome to Peaceful Investment. Your account is now set up.',
        });
        navigate('/dashboard', { state: { fromOnboarding: true } });
      }
    } catch (error) {
      setIsSubmitting(false);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    }
  };


  const renderStep = () => {
    const stepProps = {
      formData,
      updateFormData,
      errors: stepErrors[currentStep] || [],
    };

    switch (currentStep) {
      case 1:
        return <PersonalInformation {...stepProps} />;
      case 2:
        return <ContactInformation {...stepProps} />;
      case 3:
        return <EmploymentInformation {...stepProps} />;
      case 4:
        return <FinancialStatus {...stepProps} />;
      case 5:
        return <SecuritySetup {...stepProps} />;
      case 6:
        return <DocumentUpload {...stepProps} />;
      case 7:
        return <InvestmentExperience {...stepProps} />;
      case 8:
        return <ReviewSubmit {...stepProps} />;
      case 9:
        return <OverseasCompanyStep {...stepProps} />;
      default:
        return null;
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pink-yellow-shadow">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show professional loading screen during submission
  if (isSubmitting) {
    return <LoadingScreen currentStep={loadingStep} />;
  }

  const maxSteps = formData.isUSAClient ? 9 : 8; // USA clients have 9 steps
  const progress = (currentStep / maxSteps) * 100;

  return (
    <div className="min-h-screen pt-20 pb-0">
      <div className="max-w-4xl mx-auto p-6 pt-10 pb-12">
        <div className="mb-8">
          <h1 className="font-inter text-2xl font-bold uppercase text-white md:text-3xl mb-2">
            Complete Your <span className="text-[var(--yellowcolor)]">Account Setup</span>
          </h1>
          <p className="text-muted-foreground">
            Step {currentStep} of {maxSteps} - Please provide the required information to activate your investment account.
            {formData.isUSAClient && currentStep === 9 && " USA clients must complete overseas company registration before trading access."}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-2 text-sm text-muted-foreground">
            <span>Progress: {Math.round(progress)}%</span>
            <span>{currentStep} / {TOTAL_STEPS} steps completed</span>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-gradient-pink-to-yellow rounded-sm p-[2px]">
        <Card className="bg-black rounded-sm border-0 p-0">
          <CardHeader>
            <CardTitle className="text-xl">
              {currentStep === 1 && "Personal Information"}
              {currentStep === 2 && "Contact Information"}
              {currentStep === 3 && "Employment Information"}
              {currentStep === 4 && "Financial Status"}
              {currentStep === 5 && "Security Setup"}
              {currentStep === 6 && "Document Upload"}
              {currentStep === 7 && "Investment Experience"}
              {currentStep === 8 && "Review & Submit"}
              {currentStep === 9 && "Overseas Company Registration"}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && "Tell us about yourself"}
              {currentStep === 2 && "How can we reach you?"}
              {currentStep === 3 && "Your employment details"}
              {currentStep === 4 && "Your financial information"}
              {currentStep === 5 && "Secure your account"}
              {currentStep === 6 && "Upload required documents"}
              {currentStep === 7 && "Your investment preferences"}
              {currentStep === 8 && "Review your information before submitting"}
              {currentStep === 9 && "Required for USA clients - Complete overseas company registration"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-0 sm:pt-0">
            {renderStep()}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-1 border-0 border-secondary-foreground">
              
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1}
                className="flex items-center rounded-sm border-0 text-white bg-gradient-pink-to-yellow p-[2px]"
              >
                <span className="bg-black flex items-center h-full px-0 pl-[10px] pr-[16px] py-2 rounded-sm gap-0 font-inter text-xs font-semibold uppercase text-white hover:bg-gradient-pink-to-yellow">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
                </span>
              </Button>
            

              {currentStep < maxSteps ? (
                <Button
                  onClick={handleNext}
                  className="flex items-center rounded-sm border-0 text-white bg-gradient-pink-to-yellow p-[2px]"
                >
                    <span className="bg-gradient-yellow-to-pink hover:bg-gradient-pink-to-yellow flex items-center h-full px-0 pl-[16px] pr-[10px] py-2 rounded-sm gap-0 font-inter text-xs font-semibold uppercase text-white">
                  Next
                  <ChevronRight className="h-4 w-4" />
                  </span>
                </Button>
                
              ) : (
                <Button
                  onClick={handleSubmit}
                  className="flex items-center rounded-sm border-0 text-white bg-gradient-pink-to-yellow p-[2px]"
                >
                  <span className="bg-gradient-yellow-to-pink hover:bg-gradient-pink-to-yellow flex items-center h-full px-0 pl-[16px] pr-[10px] py-2 rounded-sm gap-0 font-inter text-xs font-semibold uppercase text-white">
                  {formData.isUSAClient ? "Complete & Redirect to Overseas Company" : "Complete Account Setup"}
                  </span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default CreateAccount;