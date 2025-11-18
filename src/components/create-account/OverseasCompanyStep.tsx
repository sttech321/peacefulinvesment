import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Globe, 
  Clock, 
  DollarSign, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  Info
} from 'lucide-react';
import { FormData } from '@/pages/CreateAccount';
import { useNavigate } from 'react-router-dom';

interface OverseasCompanyStepProps {
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
  errors: string[];
}

const OverseasCompanyStep: React.FC<OverseasCompanyStepProps> = ({
  formData,
  updateFormData,
  errors
}) => {
  const navigate = useNavigate();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleRedirectToOverseasCompany = async () => {
    setIsRedirecting(true);
    
    // Add a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Navigate to overseas company page
    navigate('/overseas-company');
  };

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* USA Client Notice */}
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          <strong>USA Client Requirement:</strong> As a USA client, you are required to set up an overseas company 
          before you can begin trading. This is a regulatory requirement for USA residents.
        </AlertDescription>
      </Alert>

      {/* Service Highlights */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card className="text-center border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
          <CardContent className="pt-4">
            <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
            <h3 className="font-semibold text-green-800 dark:text-green-200 text-sm">All Fees Covered</h3>
            <p className="text-xs text-green-700 dark:text-green-300">
              Complete registration with no additional costs
            </p>
          </CardContent>
        </Card>
        
        <Card className="text-center border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <CardContent className="pt-4">
            <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
            <h3 className="font-semibold text-blue-800 dark:text-blue-200 text-sm">6-9 Business Days</h3>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Fast processing with dedicated support
            </p>
          </CardContent>
        </Card>
        
        <Card className="text-center border-purple-200 bg-purple-50 dark:bg-purple-950 dark:border-purple-800">
          <CardContent className="pt-4">
            <Globe className="h-8 w-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
            <h3 className="font-semibold text-purple-800 dark:text-purple-200 text-sm">Global Jurisdictions</h3>
            <p className="text-xs text-purple-700 dark:text-purple-300">
              Multiple offshore locations available
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Action Card */}
      <Card className="border-2 border-dashed border-primary/30">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-xl">
            <Building2 className="h-6 w-6 text-primary" />
            Overseas Company Registration Required
          </CardTitle>
          <CardDescription className="text-base">
            Complete your overseas company registration to proceed with your investment account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Requirements List */}
          <div className="space-y-3">
            <h4 className="font-semibold text-foreground">What you'll need to provide:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>3 company name choices (in order of preference)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>Preferred jurisdiction (BVI, Cayman Islands, etc.)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>Business type and description</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>Contact information</span>
              </li>
            </ul>
          </div>

          {/* Status Badge */}
          <div className="flex justify-center">
            <Badge variant="outline" className="px-4 py-2 text-sm">
              <Clock className="h-4 w-4 mr-2" />
              Required for USA Clients
            </Badge>
          </div>

          {/* Action Button */}
          <div className="text-center">
            <Button 
              onClick={handleRedirectToOverseasCompany}
              disabled={isRedirecting}
              size="lg"
              className="w-full max-w-md download-btn-primary"
            >
              {isRedirecting ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Redirecting...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Start Company Registration
                </>
              )}
            </Button>
          </div>

          {/* Additional Info */}
          <div className="text-center text-xs text-muted-foreground">
            <p>
              You'll be redirected to the overseas company registration page where you can complete the process.
              Once your company is registered, you can return here to finish your account setup.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <h4 className="font-semibold">Need Help?</h4>
              <p className="text-sm text-muted-foreground">
                Our support team is available to help you with the overseas company registration process. 
                Contact us at <strong>support@peacefulinvestment.com</strong> if you have any questions.
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• All registration fees are covered with a minimum $6,000 account balance</li>
                <li>• Processing typically takes 6-9 business days</li>
                <li>• You'll receive updates on your registration progress</li>
                <li>• No additional costs or hidden fees</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OverseasCompanyStep;

