import { FormData } from "@/pages/CreateAccount";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FinancialStatusProps {
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
  errors: string[];
}

const INCOME_RANGES = [
  { value: 25000, label: "Under $25,000" },
  { value: 50000, label: "$25,000 - $50,000" },
  { value: 75000, label: "$50,000 - $75,000" },
  { value: 100000, label: "$75,000 - $100,000" },
  { value: 150000, label: "$100,000 - $150,000" },
  { value: 250000, label: "$150,000 - $250,000" },
  { value: 500000, label: "$250,000 - $500,000" },
  { value: 1000000, label: "Over $500,000" },
];

const NET_WORTH_RANGES = [
  { value: 50000, label: "Under $50,000" },
  { value: 100000, label: "$50,000 - $100,000" },
  { value: 250000, label: "$100,000 - $250,000" },
  { value: 500000, label: "$250,000 - $500,000" },
  { value: 1000000, label: "$500,000 - $1,000,000" },
  { value: 2000000, label: "$1,000,000 - $2,000,000" },
  { value: 5000000, label: "Over $2,000,000" },
];

const FinancialStatus = ({ formData, updateFormData, errors }: FinancialStatusProps) => {
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
        <Label htmlFor="annualIncome">Annual Income *</Label>
        <Select 
          value={formData.annualIncome.toString()} 
          onValueChange={(value) => updateFormData({ annualIncome: parseInt(value) })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select your annual income range" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            {INCOME_RANGES.map((range) => (
              <SelectItem key={range.value} value={range.value.toString()}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Include all sources of income (salary, bonuses, investments, etc.)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="netWorth">Net Worth</Label>
        <Select 
          value={formData.netWorth.toString()} 
          onValueChange={(value) => updateFormData({ netWorth: parseInt(value) })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select your net worth range" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            {NET_WORTH_RANGES.map((range) => (
              <SelectItem key={range.value} value={range.value.toString()}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Total assets minus total liabilities
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="liquidNetWorth">Liquid Net Worth</Label>
        <Select 
          value={formData.liquidNetWorth.toString()} 
          onValueChange={(value) => updateFormData({ liquidNetWorth: parseInt(value) })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select your liquid net worth range" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            {NET_WORTH_RANGES.map((range) => (
              <SelectItem key={range.value} value={range.value.toString()}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Cash and easily convertible assets (excluding real estate and retirement accounts)
        </p>
      </div>

      <div className="p-4 bg-muted/20 rounded-lg">
        <h4 className="font-medium mb-2">Why do we need this information?</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• To ensure we recommend suitable investment products</li>
          <li>• To comply with regulatory requirements (KYC/AML)</li>
          <li>• To help you set appropriate investment goals</li>
          <li>• To provide personalized financial advice</li>
        </ul>
      </div>
    </div>
  );
};

export default FinancialStatus;