import { FormData } from "@/pages/CreateAccount";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import LocationSelector from "@/components/ui/location-selector";

interface ContactInformationProps {
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
  errors: string[];
}

const ContactInformation = ({ formData, updateFormData, errors }: ContactInformationProps) => {
  // Handle location changes from the LocationSelector
  const handleLocationChange = (location: {
    country?: string;
    countryCode?: string;
    state?: string;
    stateCode?: string;
    city?: string;
  }) => {
    updateFormData({
      country: location.country || '',
      countryCode: location.countryCode || '',
      state: location.state || '',
      stateCode: location.stateCode || '',
      city: location.city || ''
    });
  };

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
        <Label htmlFor="phone">Phone Number *</Label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => updateFormData({ phone: e.target.value })}
          placeholder="(555) 123-4567"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Street Address *</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => updateFormData({ address: e.target.value })}
          placeholder="123 Main Street"
        />
      </div>

      {/* Global Location Selector */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">Location *</Label>
        <LocationSelector
          value={{
            country: formData.country,
            state: formData.state,
            city: formData.city
          }}
          onChange={handleLocationChange}
          enableGeolocation={true}
          enableSearch={true}
          showLabels={true}
          required={true}
          layout="grid"
          showPopulation={true}
          className="mt-2"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="zipCode">ZIP/Postal Code *</Label>
          <Input
            id="zipCode"
            value={formData.zipCode}
            onChange={(e) => updateFormData({ zipCode: e.target.value })}
            placeholder="Enter ZIP/Postal code"
            maxLength={10}
          />
        </div>
      </div>
    </div>
  );
};

export default ContactInformation;