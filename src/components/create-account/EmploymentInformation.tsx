import { FormData } from "@/pages/CreateAccount";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EmploymentInformationProps {
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
  errors: string[];
}

const EMPLOYMENT_STATUS_OPTIONS = [
  { value: "employed", label: "Employed Full-Time" },
  { value: "part-time", label: "Employed Part-Time" },
  { value: "self-employed", label: "Self-Employed" },
  { value: "unemployed", label: "Unemployed" },
  { value: "retired", label: "Retired" },
  { value: "student", label: "Student" },
  { value: "homemaker", label: "Homemaker" },
];

const COUNTRIES = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "UK", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "JP", label: "Japan" },
  { value: "CN", label: "China" },
  { value: "IN", label: "India" },
  { value: "BR", label: "Brazil" },
  { value: "MX", label: "Mexico" },
  { value: "SG", label: "Singapore" },
  { value: "HK", label: "Hong Kong" },
  { value: "CH", label: "Switzerland" },
  { value: "NL", label: "Netherlands" },
  { value: "SE", label: "Sweden" },
  { value: "NO", label: "Norway" },
  { value: "DK", label: "Denmark" },
  { value: "FI", label: "Finland" },
  { value: "IE", label: "Ireland" },
  { value: "OTHER", label: "Other" },
];

const BUSINESS_NATURE_OPTIONS = [
  { value: "technology", label: "Technology/Software" },
  { value: "finance", label: "Financial Services" },
  { value: "healthcare", label: "Healthcare/Medical" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "retail", label: "Retail/Commerce" },
  { value: "education", label: "Education" },
  { value: "consulting", label: "Consulting" },
  { value: "real-estate", label: "Real Estate" },
  { value: "energy", label: "Energy/Utilities" },
  { value: "telecommunications", label: "Telecommunications" },
  { value: "transportation", label: "Transportation/Logistics" },
  { value: "media", label: "Media/Entertainment" },
  { value: "government", label: "Government/Public Sector" },
  { value: "non-profit", label: "Non-Profit" },
  { value: "other", label: "Other" },
];

const EmploymentInformation = ({ formData, updateFormData, errors }: EmploymentInformationProps) => {
  const showEmployerFields = ["employed", "part-time"].includes(formData.employmentStatus);
  const showBusinessNature = formData.employmentStatus === "self-employed";
  const isOverseasEmployer = formData.employerCountry && formData.employerCountry !== "US";

  return (
    <div className="space-y-4">
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            <ul className="list-disc list-inside">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label className="text-muted-foreground" htmlFor="employmentStatus">Employment Status *</Label>
        <Select 
          value={formData.employmentStatus} 
          onValueChange={(value) => updateFormData({ employmentStatus: value })}
        >
          <SelectTrigger className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
            <SelectValue placeholder="Select your employment status" />
          </SelectTrigger>
          <SelectContent className="border-secondary-foreground bg-black/90 text-white">
            {EMPLOYMENT_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showEmployerFields && (
        <>
          <div className="space-y-2">
            <Label className="text-muted-foreground" htmlFor="employer">Employer Name *</Label>
            <Input
              id="employer"
              value={formData.employer}
              onChange={(e) => updateFormData({ employer: e.target.value })}
              placeholder="Enter your employer's name"
              className="rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground" htmlFor="employerCountry">Employer Country *</Label>
            <Select 
              value={formData.employerCountry} 
              onValueChange={(value) => updateFormData({ employerCountry: value })}
            >
              <SelectTrigger className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
                <SelectValue placeholder="Select employer's country" />
              </SelectTrigger>
              <SelectContent className="border-secondary-foreground bg-black/90 text-white">
                {COUNTRIES.map((country) => (
                  <SelectItem key={country.value} value={country.value}>
                    {country.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground" htmlFor="employerAddressLine1">Address Line 1 *</Label>
              <Input
                id="employerAddressLine1"
                value={formData.employerAddressLine1}
                onChange={(e) => updateFormData({ employerAddressLine1: e.target.value })}
                placeholder="Street address"
                className="rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground" htmlFor="employerAddressLine2">Address Line 2</Label>
              <Input
                id="employerAddressLine2"
                value={formData.employerAddressLine2}
                onChange={(e) => updateFormData({ employerAddressLine2: e.target.value })}
                placeholder="Apt, suite, etc. (optional)"
                className="rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground" htmlFor="employerCity">City *</Label>
              <Input
                id="employerCity"
                value={formData.employerCity}
                onChange={(e) => updateFormData({ employerCity: e.target.value })}
                placeholder="City"
                className="rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground" htmlFor="employerState">State/Province *</Label>
              <Input
                id="employerState"
                value={formData.employerState}
                onChange={(e) => updateFormData({ employerState: e.target.value })}
                placeholder="State or Province"
                className="rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground" htmlFor="employerZip">ZIP/Postal Code *</Label>
              <Input
                id="employerZip"
                value={formData.employerZip}
                onChange={(e) => updateFormData({ employerZip: e.target.value })}
                placeholder="ZIP or Postal Code"
                className="rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground" htmlFor="occupation">Job Title/Occupation *</Label>
            <Input
              id="occupation"
              value={formData.occupation}
              onChange={(e) => updateFormData({ occupation: e.target.value })}
              placeholder="Enter your job title or occupation"
              className="rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent"
            />
          </div>

          {isOverseasEmployer && (
            <div className="p-4 bg-white/10 border border-secondary-foreground rounded-sm">
              <p className="text-sm text-white">
                <strong className="text-red-500">Overseas Employment Notice:</strong> Additional verification may be required for international employers. 
                Please ensure all information is accurate and have supporting documentation ready.
              </p>
            </div>
          )}
        </>
      )}

      {showBusinessNature && (
        <div className="space-y-2">
          <Label className="text-muted-foreground" htmlFor="businessNature">Nature of Business *</Label>
          <Select 
            value={formData.businessNature} 
            onValueChange={(value) => updateFormData({ businessNature: value })}
          >
            <SelectTrigger className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
              <SelectValue placeholder="Select your business type" />
            </SelectTrigger>
            <SelectContent className="border-secondary-foreground bg-black/90 text-white">
              {BUSINESS_NATURE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {formData.employmentStatus === "self-employed" && (
        <div className="space-y-2">
          <Label className="text-muted-foreground" htmlFor="occupation">Business/Occupation *</Label>
          <Input
            id="occupation"
            value={formData.occupation}
            onChange={(e) => updateFormData({ occupation: e.target.value })}
            placeholder="Describe your business or occupation"
            className="rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent"
          />

          

        </div>
        
      )}

      {["retired", "unemployed"].includes(formData.employmentStatus) && (
        <div className="p-4 bg-white/10 border border-secondary-foreground rounded-sm">
          <p className="text-sm text-white">
            {formData.employmentStatus === "retired" 
              ? "As a retiree, you may have different income sources. We'll ask about your financial details in the next step."
              : "We understand you're currently between jobs. Please provide your financial information in the next step to help us serve you better."
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default EmploymentInformation;