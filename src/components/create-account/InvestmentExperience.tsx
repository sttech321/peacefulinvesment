import { FormData } from "@/pages/CreateAccount";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp } from "lucide-react";

interface InvestmentExperienceProps {
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
  errors: string[];
}

const EXPERIENCE_LEVELS = [
  { value: "beginner", label: "Beginner - Little to no investment experience" },
  { value: "some", label: "Some Experience - 1-3 years of investing" },
  { value: "experienced", label: "Experienced - 3-10 years of investing" },
  { value: "expert", label: "Expert - 10+ years of investing" },
];

const RISK_TOLERANCE_OPTIONS = [
  { value: "conservative", label: "Conservative - Preserve capital, low risk" },
  { value: "moderate", label: "Moderate - Balanced growth and safety" },
  { value: "aggressive", label: "Aggressive - Maximize growth, higher risk" },
];

const INVESTMENT_GOALS = [
  "Retirement Planning",
  "Wealth Building",
  "Income Generation",
  "Short-term Savings",
  "Education Funding",
  "Emergency Fund",
  "Major Purchase",
  "Legacy Planning",
];

const TIME_HORIZON_OPTIONS = [
  { value: "short", label: "Short-term (Less than 3 years)" },
  { value: "medium", label: "Medium-term (3-10 years)" },
  { value: "long", label: "Long-term (10+ years)" },
];

const InvestmentExperience = ({ formData, updateFormData, errors }: InvestmentExperienceProps) => {
  const handleGoalChange = (goal: string, checked: boolean) => {
    let newGoals = [...formData.investmentGoals];
    
    if (checked) {
      newGoals.push(goal);
    } else {
      newGoals = newGoals.filter(g => g !== goal);
    }
    
    updateFormData({ investmentGoals: newGoals });
  };

  return (
    <div className="space-y-6">
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

      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Investment Profile</h3>
      </div>

      <div className="space-y-2">
        <Label htmlFor="investmentExperience">Investment Experience *</Label>
        <Select 
          value={formData.investmentExperience} 
          onValueChange={(value) => updateFormData({ investmentExperience: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select your investment experience level" />
          </SelectTrigger>
          <SelectContent>
            {EXPERIENCE_LEVELS.map((level) => (
              <SelectItem key={level.value} value={level.value}>
                {level.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="riskTolerance">Risk Tolerance *</Label>
        <Select 
          value={formData.riskTolerance} 
          onValueChange={(value) => updateFormData({ riskTolerance: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select your risk tolerance" />
          </SelectTrigger>
          <SelectContent>
            {RISK_TOLERANCE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="investmentTimeHorizon">Investment Time Horizon</Label>
        <Select 
          value={formData.investmentTimeHorizon} 
          onValueChange={(value) => updateFormData({ investmentTimeHorizon: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select your investment time horizon" />
          </SelectTrigger>
          <SelectContent>
            {TIME_HORIZON_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <Label>Investment Goals * (Select all that apply)</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {INVESTMENT_GOALS.map((goal) => (
            <div key={goal} className="flex items-center space-x-2">
              <Checkbox
                id={goal}
                checked={formData.investmentGoals.includes(goal)}
                onCheckedChange={(checked) => handleGoalChange(goal, checked as boolean)}
              />
              <Label
                htmlFor={goal}
                className="text-sm font-normal cursor-pointer"
              >
                {goal}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Alert>
          <TrendingUp className="h-4 w-4" />
          <AlertDescription>
            <strong>Risk vs. Return:</strong> Higher risk investments have the potential for higher returns 
            but also higher potential losses.
          </AlertDescription>
        </Alert>

        <Alert>
          <TrendingUp className="h-4 w-4" />
          <AlertDescription>
            <strong>Diversification:</strong> We'll help you build a diversified portfolio based on 
            your goals and risk tolerance.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

export default InvestmentExperience;