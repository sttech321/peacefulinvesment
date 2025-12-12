// Profile.tsx
import React, { useState, useEffect, useRef } from "react";
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
import { useAuth } from "@/hooks/useAuth";
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
const getProfileStepKey = (userId: string) => `profile_current_step_${userId}`;
const getProfileFormDataKey = (userId: string) => `profile_form_data_${userId}`;

/* ADDED: Expanded allowed columns list to include all fields we persist to profiles table.
   Ensure these columns exist in your DB schema. */
// >>> ADDED
const ALLOWED_PROFILE_COLUMNS = [
  "full_name",
  "first_name",
  "last_name",
  "date_of_birth",
  "ssn_last4",
  "ssn_encrypted",
  "avatar_url",
  "phone",
  "address",
  "city",
  "state",
  "state_code",
  "zip_code",
  "country",
  "country_code",
  "employment_status",
  "employer",
  "employer_country",
  "employer_address_line1",
  "employer_address_line2",
  "employer_city",
  "employer_state",
  "employer_zip",
  "occupation",
  "business_nature",
  "annual_income",
  "net_worth",
  "liquid_net_worth",
  "investment_experience",
  "risk_tolerance",
  "investment_goals",
  "investment_time_horizon",
  "documents",
  "documents_by_type",
  "security_questions",
  "documents_uploaded",
  "status",
  "role",
  "is_usa_client",
  "overseas_company_required",
  "overseas_company_completed",
  "overseas_company_id",
  "has_completed_profile",
  "email",
  "metadata",
];

/* Basic zod schema used in completed-profile editing form */
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

/* ------------------------------
   Helper functions (ADDED)
   ------------------------------ */

// >>> ADDED: safe SSN last4 extractor — do NOT store full SSN on client
const extractSSNLast4 = (ssnRaw?: string): string | null => {
  if (!ssnRaw) return null;
  const digits = (ssnRaw || "").replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : null;
};

// >>> ADDED: Build snake_case payload from FormData
const buildProfilePayload = (form: FormData, profile?: UserProfile | null) => {
  const nameParts = [form.firstName?.trim(), form.lastName?.trim()].filter(Boolean);
  const fullName = nameParts.length ? nameParts.join(" ") : profile?.full_name || null;

  const payload: Record<string, any> = {
    // identity
    first_name: form.firstName || null,
    last_name: form.lastName || null,
    full_name: fullName,
    date_of_birth: form.dateOfBirth || null,
    ssn_last4: extractSSNLast4(form.socialSecurityNumber),

    // contact
    phone: form.phone || null,
    address: form.address || null,
    city: form.city || null,
    state: form.state || null,
    state_code: form.stateCode || null,
    zip_code: form.zipCode || null,
    country: form.country || null,
    country_code: form.countryCode || null,

    // employment
    employment_status: form.employmentStatus || null,
    employer: form.employer || null,
    employer_country: form.employerCountry || null,
    employer_address_line1: form.employerAddressLine1 || null,
    employer_address_line2: form.employerAddressLine2 || null,
    employer_city: form.employerCity || null,
    employer_state: form.employerState || null,
    employer_zip: form.employerZip || null,
    occupation: form.occupation || null,
    business_nature: form.businessNature || null,

    // finances
    annual_income:
      typeof form.annualIncome === "number" && !isNaN(form.annualIncome) ? form.annualIncome : null,
    net_worth: typeof form.netWorth === "number" ? form.netWorth : null,
    liquid_net_worth: typeof form.liquidNetWorth === "number" ? form.liquidNetWorth : null,

    // investing
    investment_experience: form.investmentExperience || null,
    investment_time_horizon: form.investmentTimeHorizon || null,
    risk_tolerance: form.riskTolerance || null,
    investment_goals: Array.isArray(form.investmentGoals) ? form.investmentGoals : [],

    // documents & security questions stored in JSONB
    documents: Array.isArray(form.documents) ? form.documents : [],
    documents_by_type: form.documentsByType || {},
    security_questions: Array.isArray(form.securityQuestions)
      ? form.securityQuestions.map((q) => ({
          question: q.question || null,
          // DO NOT send plaintext answers to DB — mask for safety, server should handle verification
          answer_masked: q.answer ? "***MASKED***" : null,
        }))
      : [],

    // flags
    documents_uploaded: Object.values(form.documentsByType || {}).flat().length > 0,
    is_usa_client: !!form.isUSAClient,
    overseas_company_required: !!form.overseasCompanyRequired,
    overseas_company_completed: !!form.overseasCompanyCompleted,
    overseas_company_id: form.overseasCompanyId || null,

    // avatar + metadata (if present on form)
    avatar_url: (form as any).avatar_url || null,
    metadata: (form as any).metadata || null,

    has_completed_profile: !!(form as any).hasCompletedProfile || false,
  };

  return payload;
};

// >>> ADDED: sanitize payload to only DB-allowed columns
const sanitizeForProfileUpdate = (payload: Record<string, any>) => {
  const sanitized: Record<string, any> = {};
  for (const key of ALLOWED_PROFILE_COLUMNS) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      sanitized[key] = payload[key];
    }
  }
  return sanitized;
};

// >>> ADDED: extract meaningful error messages
const extractErrorMessage = (err: any): string => {
  if (!err) return "Failed to save progress. Please try again.";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (err.message && typeof err.message === "string") return err.message;
  if (err.detail && typeof err.detail === "string") return err.detail;
  if (err.data && typeof err.data.message === "string") return err.data.message;
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

/* ------------------------------
   Component starts here
   ------------------------------ */
const Profile = () => {
  const { profile, loading, updateProfile, refetchProfile } = useProfile();
  const { user } = useAuth();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [stepErrors, setStepErrors] = useState<Record<number, string[]>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showStepFlow, setShowStepFlow] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRefStepFlow = useRef<HTMLInputElement>(null);

  // >>> ADDED: prevents repeated restoring of saved step
  const restoredRef = useRef(false);

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

    const isUSAClient = Boolean((profileData as any)?.is_usa_client);
    const countryCode = (profileData as any)?.country_code || "";
    const country = (profileData as any)?.country || "";

    return {
      firstName,
      lastName,
      dateOfBirth: (profileData as any)?.date_of_birth || "",
      socialSecurityNumber: "", // never hydrate full SSN
      phone: profileData.phone || "",
      address: profileData.address || "",
      country: country || "",
      countryCode: countryCode || (isUSAClient ? "US" : ""),
      state: profileData.state || "",
      stateCode: profileData.state_code || "",
      city: profileData.city || "",
      zipCode: profileData.zip_code || "",
      employmentStatus: profileData.employment_status || "",
      employer: profileData.employer || "",
      employerCountry: profileData.employer_country || "",
      employerAddressLine1: (profileData as any)?.employer_address_line1 || "",
      employerAddressLine2: (profileData as any)?.employer_address_line2 || "",
      employerCity: (profileData as any)?.employer_city || "",
      employerState: (profileData as any)?.employer_state || "",
      employerZip: (profileData as any)?.employer_zip || "",
      businessNature: (profileData as any)?.business_nature || "",
      occupation: (profileData as any)?.occupation || "",
      annualIncome: profileData.annual_income || 0,
      netWorth: (profileData as any)?.net_worth || 0,
      liquidNetWorth: (profileData as any)?.liquid_net_worth || 0,
      securityQuestions:
        (profileData as any)?.security_questions?.map((q: any) => ({ question: q.question || "", answer: "" })) ||
        [
          { question: "", answer: "" },
          { question: "", answer: "" },
        ],
      documents: (profileData as any)?.documents || [],
      documentsByType: (profileData as any)?.documents_by_type || {},
      investmentExperience: profileData.investment_experience || "",
      riskTolerance: profileData.risk_tolerance || "",
      investmentGoals: (profileData as any)?.investment_goals || [],
      investmentTimeHorizon: (profileData as any)?.investment_time_horizon || "",
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

  // Save in-flight guard to avoid overlapping saves (ADDED)
  const saveInFlightRef = useRef(false);

  // Autosave refs (ADDED)
  const AUTO_SAVE_DELAY_MS = 1200;
  const autosaveTimerRef = useRef<number | null>(null);
  const isFirstAutosaveRef = useRef(true);

  // Check if profile is completed and determine which view to show
  useEffect(() => {
    if (!loading && profile) {
      const isCompleted = Boolean((profile as any)?.has_completed_profile);
      setShowStepFlow(!isCompleted);

      if (isCompleted) {
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
        if (user?.id && !restoredRef.current && currentStep === 1) {
          const savedStep = localStorage.getItem(getProfileStepKey(user.id));
          if (savedStep) {
            const parsed = parseInt(savedStep, 10);
            const max = computedMaxSteps(mapProfileToFormData(profile).isUSAClient);
            if (!isNaN(parsed) && parsed >= 1 && parsed <= max) {
              console.log("Restoring saved step (one-time):", parsed);
              setCurrentStep(parsed);
            }
          }
          restoredRef.current = true;
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, loading]);

  // Update completed-profile form when profile changes
  useEffect(() => {
    if (!loading && profile && !showStepFlow && (profile as any).has_completed_profile) {
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
        investment_goals: profile.investment_goals || [],
      };
      form.reset(formDataToSet);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, loading, showStepFlow]);

  // Initialize formData from profile or saved data (only once)
  const initializeFormData = (): FormData => {
    if (!user?.id) return mapProfileToFormData(profile);

    const savedData = localStorage.getItem(getProfileFormDataKey(user.id));
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

  // Reset initialization when user changes
  useEffect(() => {
    if (user?.id) {
      setIsInitialized(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!loading && profile && !isInitialized && user?.id) {
      const initialData = initializeFormData();
      setFormData(initialData);
      // clamp current step to allowed range after initialization
      setCurrentStep((prev) => {
        const max = computedMaxSteps(initialData.isUSAClient);
        return Math.min(Math.max(1, prev), max);
      });
      setIsInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, loading, isInitialized, user?.id]);

  // Auto-save form data to localStorage whenever it changes — only after initialized
  useEffect(() => {
    if (!isInitialized || !user?.id) return;
    if (formData && Object.keys(formData).length > 0) {
      try {
        localStorage.setItem(getProfileFormDataKey(user.id), JSON.stringify(formData));
      } catch (e) {
        console.error("Could not write profile form data to localStorage", e);
      }
    }
  }, [formData, isInitialized, user?.id]);

  // Save current step to localStorage whenever it changes — only after initialized
  useEffect(() => {
    if (!isInitialized || currentStep < 1 || !user?.id) return;
    try {
      localStorage.setItem(getProfileStepKey(user.id), currentStep.toString());
    } catch (e) {
      console.error("Could not save step to localStorage:", e);
    }
  }, [currentStep, isInitialized, user?.id]);

  /* ADDED: Debounced autosave whenever formData changes (skip validation) */
  useEffect(() => {
    if (!isInitialized || !user?.id) return;

    // skip initial autosave on first mount
    if (isFirstAutosaveRef.current) {
      isFirstAutosaveRef.current = false;
      return;
    }

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = window.setTimeout(async () => {
      try {
        // lightweight autosave: skip validation (don't block user)
        // >>> CHANGED: autosave should be silent (no toast)
        await saveProgress(true, { showToast: false });
      } catch (e) {
        console.warn("Autosave failed:", e);
      }
    }, AUTO_SAVE_DELAY_MS);

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, currentStep, isInitialized, user?.id]);

  const updateFormData = (stepData: Partial<FormData>) => {
    setFormData((prev) => {
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
      setCurrentStep((prevStep) => Math.min(prevStep, newMax));

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
        if (formData.securityQuestions.some((q) => !q.question || !q.answer?.trim())) {
          errors.push("All security questions and answers are required");
        }
        break;
      case 6: {
        const requiredDocumentTypes = ["drivers_license_front", "drivers_license_back", "passport"];
        const hasRequiredDocuments = requiredDocumentTypes.some((type) =>
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
          // optional enforcement
        }
        break;
      default:
        break;
    }

    setStepErrors((prev) => ({ ...prev, [currentStep]: errors }));
    return errors.length === 0;
  };

  /* ADDED: saveProgress now accepts options to suppress toast for autosave */
  // >>> CHANGED: new signature with options { showToast?: boolean }
  const saveProgress = async (skipValidation = false, options?: { showToast?: boolean }) => {
    const showToast = options?.showToast ?? true; // default true for manual saves

    if (!skipValidation) {
      const isValid = validateCurrentStep();
      if (!isValid) {
        return false;
      }
    }

    // Avoid overlapping saves
    if (saveInFlightRef.current) {
      console.warn("Save already in flight — skipping concurrent save");
      return true;
    }

    saveInFlightRef.current = true;
    setIsSaving(true);

    try {
      const rawPayload = buildProfilePayload(formData, profile);
      const profileUpdates = sanitizeForProfileUpdate(rawPayload);

      console.log("Saving profile updates (sanitized):", profileUpdates);

      // nothing to persist? still persist local draft and return true
      if (Object.keys(profileUpdates).length === 0) {
        if (user?.id) {
          try {
            localStorage.setItem(getProfileFormDataKey(user.id), JSON.stringify(formData));
            localStorage.setItem(getProfileStepKey(user.id), currentStep.toString());
          } catch (e) {
            console.warn("LocalStorage write failed:", e);
          }
        }
        return true;
      }

      let result;
      try {
        result = await updateProfile(profileUpdates);
      } catch (err) {
        console.error("updateProfile threw:", err);
        const msg = extractErrorMessage(err);
        if (showToast) toast({ title: "Error", description: msg, variant: "destructive" });
        return false;
      }

      if (result?.error) {
        console.error("Save error:", result.error);
        const errorMessage = extractErrorMessage(result.error);
        if (showToast) toast({ title: "Error", description: errorMessage, variant: "destructive" });
        return false;
      }

      try {
        await refetchProfile();
      } catch (refetchError) {
        console.warn("Error refetching profile:", refetchError);
      }

      if (user?.id) {
        try {
          localStorage.setItem(getProfileFormDataKey(user.id), JSON.stringify(formData));
          localStorage.setItem(getProfileStepKey(user.id), currentStep.toString());
        } catch (e) {
          console.warn("LocalStorage write failed:", e);
        }
      }

      // >>> CHANGED: only show success toast when showToast === true
      if (showToast) {
        toast({ title: "Progress Saved", description: "Your profile information has been saved successfully." });
      }

      return true;
    } catch (error: any) {
      console.error("Save exception:", error);
      const msg = extractErrorMessage(error);
      if (showToast) toast({ title: "Error", description: msg || "An unexpected error occurred while saving.", variant: "destructive" });
      return false;
    } finally {
      setIsSaving(false);
      saveInFlightRef.current = false;
    }
  };

  // Save and validate (for "Next" button)
  const saveCurrentStep = async () => {
    return await saveProgress(false);
  };

  /* ADDED/CHANGED: handleBack now attempts a non-blocking silent save before going back */
  const handleBack = async () => {
    console.log("handleBack called — currentStep:", currentStep);

    // silent non-blocking save (no toast)
    try {
      const saved = await saveProgress(true, { showToast: false });
      console.log("saveProgress returned:", saved);
    } catch (e) {
      console.warn("saveProgress threw on back:", e);
    }

    setCurrentStep((prev) => {
      const next = Math.max(1, prev - 1);
      console.log(`Navigating back from ${prev} to ${next}`);
      return next;
    });
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

    const saved = await saveProgress(false); // manual save -> toast on success
    if (saved) {
      const maxSteps = computedMaxSteps(formData.isUSAClient);
      if (currentStep < maxSteps) {
        const nextStep = currentStep + 1;
        setCurrentStep(nextStep);
      }
    } else {
      console.error("Failed to save before proceeding to next step");
    }
  };

  const handleSaveAndContinue = async () => {
    await saveProgress(true, { showToast: true }); // manual request -> show toast
  };

  const handleCompleteProfile = async () => {
    const saved = await saveProgress(false);
    if (saved) {
      const { error } = await updateProfile({ has_completed_profile: true });
      if (!error) {
        try { await refetchProfile(); } catch (_) { /* ignore */ }
        if (user?.id) {
          try {
            localStorage.removeItem(getProfileFormDataKey(user.id));
            localStorage.removeItem(getProfileStepKey(user.id));
          } catch (e) {
            console.warn("Could not clear localStorage after completion", e);
          }
        }
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

  // Handle avatar image upload (unchanged)
  const handleAvatarUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingAvatar(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64String = reader.result as string;
          const result = await updateProfile({ avatar_url: base64String });

          if (result?.error) {
            const msg = extractErrorMessage(result.error);
            toast({
              title: "Upload Failed",
              description: msg || "Failed to upload avatar",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Success",
              description: "Profile picture updated successfully",
            });
            await refetchProfile();
          }
        } catch (error) {
          const msg = extractErrorMessage(error);
          toast({
            title: "Upload Failed",
            description: msg || "An error occurred while uploading",
            variant: "destructive",
          });
        } finally {
          setUploadingAvatar(false);
        }
      };

      reader.onerror = () => {
        toast({
          title: "Upload Failed",
          description: "Failed to read image file",
          variant: "destructive",
        });
        setUploadingAvatar(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      const msg = extractErrorMessage(error);
      toast({
        title: "Upload Failed",
        description: msg || "An unexpected error occurred",
        variant: "destructive",
      });
      setUploadingAvatar(false);
    }
  };

  // Handle file input change
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleAvatarUpload(file);
    }
    event.target.value = '';
  };

  // Trigger file input click
  const triggerFileInput = (ref: React.RefObject<HTMLInputElement>) => {
    ref.current?.click();
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

  // renderStep gets saveProgress passed so child step components can call it if desired
  const renderStep = () => {
    const stepProps = {
      formData,
      updateFormData,
      errors: stepErrors[currentStep] || [],
      saveProgress, // steps can trigger manual or silent saves
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
            <p className="text-muted-foreground mt-2">Manage your personal information and preferences</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3 ">
            {/* Profile Picture & Quick Info */}
            <div className="bg-gradient-pink-to-yellow hover:glow-primary w-full rounded-sm border-0 p-[2px] shadow-none">
              <Card className="bg-black rounded-sm min-h-full">
                <CardHeader>
                  <CardTitle className="text-center text-3xl">
                    Profile <span className="text-primary">Picture</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <Avatar className="h-24 w-24 mx-auto">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback>
                      <User className="h-12 w-12" />
                    </AvatarFallback>
                  </Avatar>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-[8px] border-0 hover:bg-white/80"
                    onClick={() => triggerFileInput(fileInputRef)}
                    disabled={uploadingAvatar}
                  >
                    {uploadingAvatar ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-1" />
                        Change Photo
                      </>
                    )}
                  </Button>
                  <div className="space-y-2 text-sm">
                    <p className="font-medium text-muted-foreground">{profile?.full_name || "No name set"}</p>
                    <p className="text-muted-foreground">
                      Status: <span className="capitalize">{profile?.status || "Unverified"}</span>
                    </p>
                    <p className="text-muted-foreground">Profile: {(profile as any)?.has_completed_profile ? "Complete" : "Incomplete"}</p>
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
                        <Button variant="outline" size="sm" className="rounded-[8px] border-0 hover:bg-white/80 h-10">
                          <Lock className="h-4 w-4 mr-1" />
                          Change Password
                        </Button>
                      </Link>
                      <Button variant="outline" className="rounded-[8px] border-0 hover:bg-white/80 h-10" onClick={() => setIsEditing(true)}>
                        Edit Profile
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <Form {...form} key={profile?.id || "profile-form"}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="full_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium leading-none text-muted-foreground">Full Name</FormLabel>
                              <FormControl>
                                <Input
                                  className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400'
                                  style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}
                                  {...field}
                                  disabled={!isEditing}
                                />
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
                              <FormLabel className="text-sm font-medium leading-none text-muted-foreground">Phone Number</FormLabel>
                              <FormControl>
                                <Input
                                  className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400'
                                  style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}
                                  {...field}
                                  disabled={!isEditing}
                                />
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
                            <FormLabel className="text-sm font-medium leading-none text-muted-foreground">Address</FormLabel>
                            <FormControl>
                              <Input
                                className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400'
                                style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}
                                {...field}
                                disabled={!isEditing}
                              />
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
                              <FormLabel className="text-sm font-medium leading-none text-muted-foreground">City</FormLabel>
                              <FormControl>
                                <Input
                                  className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400'
                                  style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}
                                  {...field}
                                  disabled={!isEditing}
                                />
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
                              <FormLabel className="text-sm font-medium leading-none text-muted-foreground">State</FormLabel>
                              <FormControl>
                                <Input
                                  className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400'
                                  style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}
                                  {...field}
                                  disabled={!isEditing}
                                />
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
                              <FormLabel className="text-sm font-medium leading-none text-muted-foreground">ZIP Code</FormLabel>
                              <FormControl>
                                <Input
                                  className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400'
                                  style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}
                                  {...field}
                                  disabled={!isEditing}
                                />
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
                              <FormLabel className="text-sm font-medium leading-none text-muted-foreground">Employment Status</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value} disabled={!isEditing}>
                                <FormControl>
                                  <SelectTrigger className="rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400" style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
                                    <SelectValue placeholder="Select employment status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="border-secondary-foreground bg-black/90 text-white">
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
                              <FormLabel className="text-sm font-medium leading-none text-muted-foreground">Employer</FormLabel>
                              <FormControl>
                                <Input
                                  className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400'
                                  style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}
                                  {...field}
                                  disabled={!isEditing}
                                />
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
                            <FormLabel className="text-sm font-medium leading-none text-muted-foreground">Annual Income</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400'
                                style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}
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
                              <FormLabel className="text-sm font-medium leading-none text-muted-foreground">Investment Experience</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value} disabled={!isEditing}>
                                <FormControl>
                                  <SelectTrigger className="rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400" style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
                                    <SelectValue placeholder="Select experience level" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="border-secondary-foreground bg-black/90 text-white">
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
                              <FormLabel className="text-sm font-medium leading-none text-muted-foreground">Risk Tolerance</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value} disabled={!isEditing}>
                                <FormControl>
                                  <SelectTrigger className="rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400" style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
                                    <SelectValue placeholder="Select risk tolerance" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="border-secondary-foreground bg-black/90 text-white">
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
                          <Button type="submit" className="rounded-[8px] border-0 hover:bg-primary/80" disabled={isUpdating}>
                            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-[8px] border-0 hover:bg-white/80"
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
            <p className="text-muted-foreground mt-2">Complete your profile information step by step. Your progress is saved automatically.</p>
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
            {/* ADDED: small saving indicator */}
            <div className="text-sm text-muted-foreground">{isSaving ? "Saving…" : "All changes saved locally"}</div>
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
