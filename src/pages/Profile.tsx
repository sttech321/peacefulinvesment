import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, User, Lock, Upload, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useProfile, UserProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import Footer from "@/components/Footer";

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

// Import FormData type from CreateAccount
import { FormData } from "@/pages/CreateAccount";

const TOTAL_STEPS = 8; // Base steps; USA clients will have +1
const PROFILE_STEP_KEY = "profile_current_step";
const PROFILE_FORM_DATA_KEY = "profile_form_data";

// Whitelist of allowed columns for updates in the profiles table.
// Update this list to exactly match your DB schema (snake_case).
const ALLOWED_PROFILE_COLUMNS = [
  "full_name",
  "phone",
  "address",
  "city",
  "state",
  "zip_code",
  "employment_status",
  "employer",
  "annual_income",
  "investment_experience",
  "risk_tolerance",
  "investment_goals",
  "country_code",
  "is_usa_client",
  "overseas_company_required",
  "overseas_company_completed",
  "overseas_company_id",
  "has_completed_profile",
  // add/remove columns as per your DB schema
];

const profileSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  employment_status: z.string().optional(),
  employer: z.string().optional(),
  annual_income: z.number().optional(),
  investment_experience: z.string().optional(),
  risk_tolerance: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const Profile = () => {
  const { profile, loading, updateProfile, refetchProfile } = useProfile();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [stepErrors, setStepErrors] = useState<Record<number, string[]>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showStepFlow, setShowStepFlow] = useState(true);

  // Form for completed profile view
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name || "",
      phone: profile?.phone || "",
      address: profile?.address || "",
      city: profile?.city || "",
      state: profile?.state || "",
      zip_code: profile?.zip_code || "",
      employment_status: profile?.employment_status || "",
      employer: profile?.employer || "",
      annual_income: profile?.annual_income || undefined,
      investment_experience: profile?.investment_experience || "",
      risk_tolerance: profile?.risk_tolerance || "",
    },
  });

  // Map profile data to FormData format
  const mapProfileToFormData = (profileData: typeof profile): FormData => {
    if (!profileData) {
      return getDefaultFormData();
    }

    const nameParts = (profileData.full_name || "").split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // Safely read fields (avoid @ts-ignore if possible)
    const isUSAClient = Boolean((profileData as any)?.is_usa_client);
    const countryCode = (profileData as any)?.country_code || "";
    const country = (profileData as any)?.country || "";

    return {
      firstName,
      lastName,
      dateOfBirth: "",
      socialSecurityNumber: "",
      phone: profileData.phone || "",
      address: profileData.address || "",
      country: country || "",
      countryCode: countryCode || (isUSAClient ? "US" : ""),
      state: profileData.state || "",
      stateCode: "",
      city: profileData.city || "",
      zipCode: profileData.zip_code || "",
      employmentStatus: profileData.employment_status || "",
      employer: profileData.employer || "",
      employerCountry: "",
      employerAddressLine1: "",
      employerAddressLine2: "",
      employerCity: "",
      employerState: "",
      employerZip: "",
      businessNature: "",
      occupation: "",
      annualIncome: profileData.annual_income || 0,
      netWorth: 0,
      liquidNetWorth: 0,
      securityQuestions: [
        { question: "", answer: "" },
        { question: "", answer: "" },
      ],
      documents: [],
      documentsByType: {},
      investmentExperience: profileData.investment_experience || "",
      riskTolerance: profileData.risk_tolerance || "",
      investmentGoals: (profileData as any)?.investment_goals || [],
      investmentTimeHorizon: "",
      isUSAClient: isUSAClient || countryCode === "US" || country === "United States",
      overseasCompanyRequired: (profileData as any)?.overseas_company_required || isUSAClient || false,
      overseasCompanyCompleted: (profileData as any)?.overseas_company_completed || false,
      overseasCompanyId: (profileData as any)?.overseas_company_id || undefined,
    };
  };

  const getDefaultFormData = (): FormData => ({
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

  const [formData, setFormData] = useState<FormData>(getDefaultFormData());
  const [isInitialized, setIsInitialized] = useState(false);

  // derive max steps based on isUSAClient
  const computedMaxSteps = (isUSA: boolean) => TOTAL_STEPS + (isUSA ? 1 : 0);

  // Check if profile is completed and determine which view to show
  useEffect(() => {
    if (!loading && profile) {
      const isCompleted = Boolean((profile as any)?.has_completed_profile);
      setShowStepFlow(!isCompleted);

      if (isCompleted) {
        console.log("Profile completed - Loading data:", profile);
        form.reset({
          full_name: profile.full_name || "",
          phone: profile.phone || "",
          address: profile.address || "",
          city: profile.city || "",
          state: profile.state || "",
          zip_code: profile.zip_code || "",
          employment_status: profile.employment_status || "",
          employer: profile.employer || "",
          annual_income: profile.annual_income || undefined,
          investment_experience: profile.investment_experience || "",
          risk_tolerance: profile.risk_tolerance || "",
        });
      } else {
        // Load saved step for step flow; clamp to computed max steps
        const savedStep = localStorage.getItem(PROFILE_STEP_KEY);
        if (savedStep) {
          const parsed = parseInt(savedStep, 10);
          const max = computedMaxSteps(mapProfileToFormData(profile).isUSAClient);
          if (!isNaN(parsed) && parsed >= 1 && parsed <= max) {
            console.log("Initial load - Restoring saved step:", parsed);
            setCurrentStep(parsed);
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, loading]);

  // Separate effect to update form when profile data changes (for completed profile view)
  useEffect(() => {
    if (!loading && profile && !showStepFlow && (profile as any).has_completed_profile) {
      console.log("Updating form with profile data:", profile);
      const formDataToSet = {
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        address: profile.address || "",
        city: profile.city || "",
        state: profile.state || "",
        zip_code: profile.zip_code || "",
        employment_status: profile.employment_status || "",
        employer: profile.employer || "",
        annual_income: profile.annual_income || undefined,
        investment_experience: profile.investment_experience || "",
        risk_tolerance: profile.risk_tolerance || "",
      };
      console.log("Form data to set:", formDataToSet);
      form.reset(formDataToSet);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, loading, showStepFlow]);

  // Initialize formData from profile or saved data (only once)
  const initializeFormData = (): FormData => {
    const savedData = localStorage.getItem(PROFILE_FORM_DATA_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        const profileData = mapProfileToFormData(profile);
        return {
          ...profileData,
          ...parsed,
        };
      } catch (e) {
        console.error("Error parsing saved form data:", e);
      }
    }
    return mapProfileToFormData(profile);
  };

  useEffect(() => {
    if (!loading && profile && !isInitialized) {
      const initialData = initializeFormData();
      setFormData(initialData);
      // clamp current step to allowed range after initialization
      setCurrentStep(prev => {
        const max = computedMaxSteps(initialData.isUSAClient);
        return Math.min(Math.max(1, prev), max);
      });
      setIsInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, loading, isInitialized]);

  // Auto-save form data to localStorage whenever it changes — only after initialized
  useEffect(() => {
    if (!isInitialized) return;
    if (formData && Object.keys(formData).length > 0) {
      try {
        localStorage.setItem(PROFILE_FORM_DATA_KEY, JSON.stringify(formData));
      } catch (e) {
        console.error("Could not write profile form data to localStorage", e);
      }
    }
  }, [formData, isInitialized]);

  // Save current step to localStorage whenever it changes — only after initialized
  useEffect(() => {
    if (!isInitialized || currentStep < 1) return;
    try {
      localStorage.setItem(PROFILE_STEP_KEY, currentStep.toString());
      console.log("Saved step to localStorage:", currentStep);
    } catch (e) {
      console.error("Could not save step to localStorage", e);
    }
  }, [currentStep, isInitialized]);

  const updateFormData = (stepData: Partial<FormData>) => {
    setFormData(prev => {
      const merged: FormData = { ...prev, ...stepData };

      // Normalize country checks
      const countryCodeNorm = (merged.countryCode || merged.country || "").toString().trim().toUpperCase();
      const countryNorm = (merged.country || "").toString().trim().toLowerCase();

      const isUSAClient =
        countryCodeNorm === "US" ||
        countryCodeNorm === "USA" ||
        countryNorm === "united states" ||
        merged.isUSAClient === true;

      const next: FormData = {
        ...merged,
        isUSAClient,
        overseasCompanyRequired: isUSAClient ? true : false,
        // if switching away from USA, clear overseas info
        overseasCompanyCompleted: isUSAClient ? merged.overseasCompanyCompleted : false,
        overseasCompanyId: isUSAClient ? merged.overseasCompanyId : undefined,
      };

      // Clamp currentStep if needed
      const newMax = computedMaxSteps(next.isUSAClient);
      setCurrentStep(prevStep => Math.min(prevStep, newMax));

      console.log("Updated formData - isUSAClient:", next.isUSAClient, "countryCode:", merged.countryCode, "country:", merged.country);
      return next;
    });
  };

  const validateCurrentStep = (): boolean => {
    const errors: string[] = [];
    const trimSafe = (s?: string) => (s || "").toString().trim();

    switch (currentStep) {
      case 1:
        if (!trimSafe(formData.firstName)) errors.push("First name is required");
        if (!trimSafe(formData.lastName)) errors.push("Last name is required");
        if (!formData.dateOfBirth) errors.push("Date of birth is required");
        if (!trimSafe(formData.socialSecurityNumber)) errors.push("Identity document is required");
        break;
      case 2:
        if (!trimSafe(formData.phone)) errors.push("Phone number is required");
        if (!trimSafe(formData.address)) errors.push("Address is required");
        if (!trimSafe(formData.country)) errors.push("Country is required");
        if (!trimSafe(formData.state)) errors.push("State is required");
        if (!trimSafe(formData.city)) errors.push("City is required");
        if (!trimSafe(formData.zipCode)) errors.push("ZIP code is required");
        break;
      case 3:
        if (!formData.employmentStatus) errors.push("Employment status is required");
        if (["employed", "part-time"].includes((formData.employmentStatus || "").toLowerCase())) {
          if (!trimSafe(formData.employer)) errors.push("Employer name is required");
          if (!trimSafe(formData.employerCountry)) errors.push("Employer country is required");
          if (!trimSafe(formData.employerAddressLine1)) errors.push("Employer address is required");
          if (!trimSafe(formData.employerCity)) errors.push("Employer city is required");
          if (!trimSafe(formData.employerState)) errors.push("Employer state/province is required");
          if (!trimSafe(formData.employerZip)) errors.push("Employer ZIP/postal code is required");
          if (!trimSafe(formData.occupation)) errors.push("Job title/occupation is required");
        }
        if ((formData.employmentStatus || "").toLowerCase() === "self-employed" && !trimSafe(formData.businessNature)) {
          errors.push("Nature of business is required");
        }
        break;
      case 4:
        if (!formData.annualIncome || formData.annualIncome <= 0) errors.push("Annual income is required");
        break;
      case 5:
        if (formData.securityQuestions.some(q => !q.question || !q.answer?.trim())) {
          errors.push("All security questions and answers are required");
        }
        break;
      case 6: {
        const requiredDocumentTypes = ["drivers_license_front", "drivers_license_back", "passport"];
        const hasRequiredDocuments = requiredDocumentTypes.some(type =>
          Boolean((formData.documentsByType as any)?.[type]?.length)
        );
        if (!hasRequiredDocuments) {
          errors.push("At least one required document is required (Driver's License Front/Back or Passport)");
        }
        break;
      }
      case 7:
        if (!formData.investmentExperience) errors.push("Investment experience is required");
        if (!formData.riskTolerance) errors.push("Risk tolerance is required");
        if (!Array.isArray(formData.investmentGoals) || formData.investmentGoals.length === 0) errors.push("At least one investment goal is required");
        break;
      case 8:
        // Review step - none
        break;
      case 9:
        if (formData.isUSAClient && formData.overseasCompanyRequired && !formData.overseasCompanyCompleted) {
          //errors.push("Overseas company registration must be completed for USA clients");
        }
        break;
      default:
        break;
    }

    setStepErrors(prev => ({ ...prev, [currentStep]: errors }));
    return errors.length === 0;
  };

  // Helper: sanitize payload to allowed DB columns
  const sanitizeForProfileUpdate = (payload: Record<string, any>) => {
    const sanitized: Record<string, any> = {};
    for (const key of ALLOWED_PROFILE_COLUMNS) {
      if (Object.prototype.hasOwnProperty.call(payload, key)) {
        sanitized[key] = payload[key];
      }
    }
    return sanitized;
  };

  // Helper: extract meaningful error message from common shapes
  const extractErrorMessage = (err: any): string => {
    if (!err) return "Failed to save progress. Please try again.";
    if (typeof err === "string") return err;
    if (err instanceof Error) return err.message;
    if (err.message && typeof err.message === "string") return err.message;
    if (err.detail && typeof err.detail === "string") return err.detail;
    if (err.data && typeof err.data.message === "string") return err.data.message;
    // PostgREST/Supabase: sometimes returns { code, message, details, hint }
    if (err.message && typeof err.message === "string") return err.message;
    if (err.errors && typeof err.errors === "object") {
      try {
        const first = Object.keys(err.errors)[0];
        const msg = Array.isArray(err.errors[first]) ? err.errors[first][0] : err.errors[first];
        if (msg) return msg;
      } catch (e) {
        // ignore
      }
    }
    try {
      return JSON.stringify(err);
    } catch (e) {
      return String(err);
    }
  };

  // Save progress implementation (defensive)
  const saveProgress = async (skipValidation = false) => {
    if (!skipValidation) {
      const isValid = validateCurrentStep();
      if (!isValid) {
        return false;
      }
    }

    setIsSaving(true);
    try {
      const nameParts = [formData.firstName?.trim(), formData.lastName?.trim()].filter(Boolean);
      const fullName = nameParts.length ? nameParts.join(" ") : profile?.full_name || null;

      const rawUpdates: Record<string, any> = {
        full_name: fullName,
        phone: formData.phone || null,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        zip_code: formData.zipCode || null,
        employment_status: formData.employmentStatus || null,
        employer: formData.employer || null,
        annual_income: typeof formData.annualIncome === "number" && !isNaN(formData.annualIncome) ? formData.annualIncome : null,
        investment_experience: formData.investmentExperience || null,
        risk_tolerance: formData.riskTolerance || null,
        investment_goals: Array.isArray(formData.investmentGoals) ? formData.investmentGoals : [],
        // send only country_code to DB (avoid 'country' if it doesn't exist)
        country_code: formData.countryCode || null,
        is_usa_client: !!formData.isUSAClient,
        overseas_company_required: !!formData.overseasCompanyRequired,
        overseas_company_completed: !!formData.overseasCompanyCompleted,
        overseas_company_id: formData.overseasCompanyId ?? null,
      };

      // Sanitize payload to only DB-allowed columns
      const profileUpdates = sanitizeForProfileUpdate(rawUpdates);

      console.log("Current formData:", formData);
      console.log("Saving profile updates (sanitized):", profileUpdates);

      let result;
      try {
        result = await updateProfile(profileUpdates);
      } catch (err) {
        console.error("updateProfile threw:", err);
        const msg = extractErrorMessage(err);
        toast({ title: "Error", description: msg, variant: "destructive" });
        return false;
      }

      console.log("updateProfile result:", result);

      if (result?.error) {
        console.error("Save error:", result.error);
        const errorMessage = extractErrorMessage(result.error);
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
        return false;
      }

      if (!result?.data) {
        console.warn("No data returned from updateProfile:", result);
        toast({
          title: "Warning",
          description: "Save completed but no data was returned. Please refresh the page.",
          variant: "destructive",
        });
        // still attempt refetch and local persistence
        try { await refetchProfile(); } catch (e) { console.warn("Refetch failed:", e); }
        try {
          localStorage.setItem(PROFILE_FORM_DATA_KEY, JSON.stringify(formData));
          localStorage.setItem(PROFILE_STEP_KEY, currentStep.toString());
        } catch (e) { /* ignore */ }
        return true;
      }

      console.log("Profile saved successfully:", result.data);

      try {
        await refetchProfile();
      } catch (refetchError) {
        console.warn("Error refetching profile:", refetchError);
      }

      try {
        localStorage.setItem(PROFILE_FORM_DATA_KEY, JSON.stringify(formData));
        localStorage.setItem(PROFILE_STEP_KEY, currentStep.toString());
      } catch (e) {
        console.warn("LocalStorage write failed:", e);
      }

      toast({ title: "Progress Saved", description: "Your profile information has been saved successfully." });
      return true;
    } catch (error: any) {
      console.error("Save exception:", error);
      const msg = extractErrorMessage(error);
      toast({ title: "Error", description: msg || "An unexpected error occurred while saving.", variant: "destructive" });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Save and validate (for "Next" button)
  const saveCurrentStep = async () => {
    return await saveProgress(false);
  };

  const handleNext = async () => {
    const isValid = validateCurrentStep();

    if (!isValid) {
      const errors = stepErrors[currentStep] || [];
      const errorMessage = errors.length > 0
        ? errors.slice(0, 3).join(", ") + (errors.length > 3 ? ` and ${errors.length - 3} more...` : "")
        : 'Please complete all required fields before proceeding.';

      toast({
        title: 'Validation Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return;
    }

    const saved = await saveProgress(false);
    if (saved) {
      const maxSteps = computedMaxSteps(formData.isUSAClient);
      if (currentStep < maxSteps) {
        const nextStep = currentStep + 1;
        setCurrentStep(nextStep);
        try {
          localStorage.setItem(PROFILE_STEP_KEY, nextStep.toString());
        } catch (e) { /* ignore */ }
        console.log("Moved to step:", nextStep);
      }
    } else {
      console.error("Failed to save before proceeding to next step");
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSaveAndContinue = async () => {
    await saveProgress(true);
  };

  const handleCompleteProfile = async () => {
    const saved = await saveProgress(false);
    if (saved) {
      const { error } = await updateProfile({ has_completed_profile: true });
      if (!error) {
        try { await refetchProfile(); } catch (_) { /* ignore */ }
        // Update UI immediately
        setShowStepFlow(false);
        toast({
          title: 'Profile Completed!',
          description: 'Your profile has been completed successfully.',
        });
      } else {
        const msg = extractErrorMessage(error);
        toast({ title: "Error", description: msg || "Failed to mark profile as completed.", variant: "destructive" });
      }
    }
  };

  // Form submit handler for completed profile view
  const onSubmit = async (data: ProfileFormValues) => {
    setIsUpdating(true);
    try {
      const result = await updateProfile(data);
      if (result?.error) {
        const msg = extractErrorMessage(result.error);
        toast({ title: "Error", description: msg || "Failed to update profile", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Profile updated successfully" });
        setIsEditing(false);
      }
    } catch (error) {
      const msg = extractErrorMessage(error);
      toast({ title: "Error", description: msg || "An unexpected error occurred", variant: "destructive" });
    } finally {
      setIsUpdating(false);
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

  if (loading) {
    return (
      <div className="min-h-screen pink-yellow-shadow pt-28 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Show completed profile view if profile is completed
  if (!showStepFlow && (profile as any)?.has_completed_profile) {
    return (
      <div className="min-h-screen pink-yellow-shadow pt-28">
        <div className="max-w-7xl mx-auto space-y-8 pb-20">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-primary">Profile</h1>
            <p className="text-muted-foreground mt-2">
              Manage your personal information and preferences
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3 ">
            {/* Profile Picture & Quick Info */}
            <div className="bg-gradient-pink-to-yellow hover:glow-primary w-full rounded-sm border-0 p-[2px] shadow-none">
              <Card className="bg-black rounded-sm min-h-full">
                <CardHeader>
                  <CardTitle className="text-center text-3xl">Profile <span className="text-primary">Picture</span></CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <Avatar className="h-24 w-24 mx-auto">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback>
                      <User className="h-12 w-12" />
                    </AvatarFallback>
                  </Avatar>
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Change Photo
                  </Button>
                  <div className="space-y-2 text-sm">
                    <p className="font-medium text-muted-foreground">{profile?.full_name || "No name set"}</p>
                    <p className="text-muted-foreground">
                      Status: <span className="capitalize">{profile?.status || "Unverified"}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Profile: {(profile as any)?.has_completed_profile ? "Complete" : "Incomplete"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Profile Form */}
            <div className="bg-gradient-pink-to-yellow hover:glow-primary w-full rounded-sm border-0 p-[2px] shadow-none md:col-span-2 ">
              <Card className="bg-black rounded-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Personal Information</CardTitle>
                  {!isEditing && (
                    <div className="flex gap-2">
                      <Link to="/change-password">
                        <Button variant="outline" size="sm">
                          <Lock className="h-4 w-4 mr-2" />
                          Change Password
                        </Button>
                      </Link>
                      <Button variant="outline" onClick={() => setIsEditing(true)}>
                        Edit Profile
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <Form {...form} key={profile?.id || 'profile-form'}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="full_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Full Name</FormLabel>
                              <FormControl>
                                <Input
                                  className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}
                                  {...field} disabled={!isEditing} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Phone Number</FormLabel>
                              <FormControl>
                                <Input
                                  className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}
                                  {...field} disabled={!isEditing} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Address</FormLabel>
                            <FormControl>
                              <Input
                                className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}
                                {...field} disabled={!isEditing} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid gap-4 md:grid-cols-3">
                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">City</FormLabel>
                              <FormControl>
                                <Input
                                  className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}
                                  {...field} disabled={!isEditing} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">State</FormLabel>
                              <FormControl>
                                <Input
                                  className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}
                                  {...field} disabled={!isEditing} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="zip_code"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">ZIP Code</FormLabel>
                              <FormControl>
                                <Input
                                  className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}
                                  {...field} disabled={!isEditing} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="employment_status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Employment Status</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value} disabled={!isEditing}>
                                <FormControl>
                                  <SelectTrigger className="rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400" style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
                                    <SelectValue placeholder="Select employment status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className='border-secondary-foreground bg-black/90 text-white'>
                                  <SelectItem value="employed">Employed</SelectItem>
                                  <SelectItem value="self-employed">Self-employed</SelectItem>
                                  <SelectItem value="unemployed">Unemployed</SelectItem>
                                  <SelectItem value="retired">Retired</SelectItem>
                                  <SelectItem value="student">Student</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="employer"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Employer</FormLabel>
                              <FormControl>
                                <Input
                                  className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}
                                  {...field} disabled={!isEditing} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="annual_income"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Annual Income</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                disabled={!isEditing}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="investment_experience"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Investment Experience</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value} disabled={!isEditing}>
                                <FormControl>
                                  <SelectTrigger className="rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400" style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
                                    <SelectValue placeholder="Select experience level" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className='border-secondary-foreground bg-black/90 text-white'>
                                  <SelectItem value="beginner">Beginner</SelectItem>
                                  <SelectItem value="intermediate">Intermediate</SelectItem>
                                  <SelectItem value="advanced">Advanced</SelectItem>
                                  <SelectItem value="expert">Expert</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="risk_tolerance"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Risk Tolerance</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value} disabled={!isEditing}>
                                <FormControl>
                                  <SelectTrigger className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
                                    <SelectValue placeholder="Select risk tolerance" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className='border-secondary-foreground bg-black/90 text-white'>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {isEditing && (
                        <div className="flex gap-4 pt-4">
                          <Button type="submit" disabled={isUpdating}>
                            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setIsEditing(false);
                              form.reset();
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Show step-based flow for incomplete profiles
  const maxSteps = computedMaxSteps(formData.isUSAClient);
  const progress = (currentStep / maxSteps) * 100;

  return (
    <div className="min-h-screen pink-yellow-shadow pt-20 pb-0">
      <div className="max-w-7xl mx-auto space-y-8 pb-20">
        {/* Profile Header with Avatar */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback>
                <User className="h-12 w-12" />
              </AvatarFallback>
            </Avatar>
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-primary">
              Update Your <span className="text-[var(--yellowcolor)]">Profile</span>
            </h1>
            <p className="text-muted-foreground mt-2">
              Complete your profile information step by step. Your progress is saved automatically.
            </p>
            <div className="flex justify-center gap-2 mt-4">
              <Link to="/change-password">
                <Button variant="outline" size="sm">
                  <Lock className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Step-based Profile Form */}
        <div className="max-w-4xl mx-auto p-6 pt-10 pb-12">
          <div className="mb-8">
            <h2 className="font-inter text-2xl font-bold uppercase text-white md:text-3xl mb-2">
              Step {currentStep} of {maxSteps}
              {formData.isUSAClient && currentStep === 8 && " (Step 9: Overseas Company Registration will follow)"}
              {formData.isUSAClient && currentStep === 9 && " - USA clients must complete overseas company registration"}
            </h2>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between mt-2 text-sm text-muted-foreground">
              <span>Progress: {Math.round(progress)}%</span>
              <span>{currentStep} / {maxSteps} steps completed</span>
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
                <div className="flex justify-between items-center pt-1 border-0 border-secondary-foreground">
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
                      disabled={isSaving}
                      className="flex items-center rounded-sm border-0 text-white bg-gradient-pink-to-yellow p-[2px]"
                    >
                      <span className="bg-gradient-yellow-to-pink hover:bg-gradient-pink-to-yellow flex items-center h-full px-0 pl-[16px] pr-[10px] py-2 rounded-sm gap-0 font-inter text-xs font-semibold uppercase text-white">
                        {isSaving ? "Saving..." : "Save & Next"}
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </span>
                    </Button>
                  ) : (
                    <Button
                      onClick={handleCompleteProfile}
                      disabled={isSaving}
                      className="flex items-center rounded-sm border-0 text-white bg-gradient-pink-to-yellow p-[2px]"
                    >
                      <span className="bg-gradient-yellow-to-pink hover:bg-gradient-pink-to-yellow flex items-center h-full px-0 pl-[16px] pr-[10px] py-2 rounded-sm gap-0 font-inter text-xs font-semibold uppercase text-white">
                        {isSaving ? "Saving..." : "Save & Complete"}
                      </span>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Profile;
