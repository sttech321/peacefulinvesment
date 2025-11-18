import { FormData } from "@/pages/CreateAccount";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PersonalInformationProps {
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
  errors: string[];
}

const PersonalInformation = ({ formData, updateFormData, errors }: PersonalInformationProps) => {
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => updateFormData({ firstName: e.target.value })}
            placeholder="Enter your first name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => updateFormData({ lastName: e.target.value })}
            placeholder="Enter your last name"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="dateOfBirth">Date of Birth *</Label>
        <Input
          id="dateOfBirth"
          type="date"
          value={formData.dateOfBirth}
          onChange={(e) => updateFormData({ dateOfBirth: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="socialSecurityNumber">Driver's License *</Label>
        <Input
          id="socialSecurityNumber"
          value={formData.socialSecurityNumber}
          onChange={(e) => updateFormData({ socialSecurityNumber: e.target.value })}
          placeholder="Enter your driver's license number"
          maxLength={20}
        />
        <p className="text-sm text-muted-foreground">
          This information is encrypted and used only for identity verification purposes.
        </p>
      </div>
    </div>
  );
};

export default PersonalInformation;