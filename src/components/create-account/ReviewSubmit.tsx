import { FormData } from "@/pages/CreateAccount";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, User, MapPin, Briefcase, DollarSign, Shield, FileText, TrendingUp } from "lucide-react";

interface ReviewSubmitProps {
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
  errors: string[];
}

const ReviewSubmit = ({ formData }: ReviewSubmitProps) => {
  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M+`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K+`;
    return `$${amount.toLocaleString()}+`;
  };

  const getExperienceLabel = (value: string) => {
    const labels: Record<string, string> = {
      beginner: "Beginner",
      some: "Some Experience",
      experienced: "Experienced",
      expert: "Expert",
    };
    return labels[value] || value;
  };

  const getRiskToleranceLabel = (value: string) => {
    const labels: Record<string, string> = {
      conservative: "Conservative",
      moderate: "Moderate",
      aggressive: "Aggressive",
    };
    return labels[value] || value;
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Review Your Information
        </h2>
        <p className="text-muted-foreground">
          Please review all information before submitting your application.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="font-medium">{formData.firstName} {formData.lastName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date of Birth</p>
                <p className="font-medium">{formData.dateOfBirth}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Social Security Number</p>
              <p className="font-medium">***-**-{formData.socialSecurityNumber.slice(-4)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5 text-primary" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{formData.phone}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Address</p>
              <p className="font-medium">
                {formData.address}<br />
                {formData.city}, {formData.state} {formData.zipCode}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Employment Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Briefcase className="h-5 w-5 text-primary" />
              Employment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Employment Status</p>
              <p className="font-medium capitalize">{formData.employmentStatus.replace('-', ' ')}</p>
            </div>
            {formData.employer && (
              <div>
                <p className="text-sm text-muted-foreground">Employer</p>
                <p className="font-medium">{formData.employer}</p>
              </div>
            )}
            {formData.occupation && (
              <div>
                <p className="text-sm text-muted-foreground">Occupation</p>
                <p className="font-medium">{formData.occupation}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-primary" />
              Financial Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Annual Income</p>
                <p className="font-medium">{formatCurrency(formData.annualIncome)}</p>
              </div>
              {formData.netWorth > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Net Worth</p>
                  <p className="font-medium">{formatCurrency(formData.netWorth)}</p>
                </div>
              )}
              {formData.liquidNetWorth > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Liquid Net Worth</p>
                  <p className="font-medium">{formatCurrency(formData.liquidNetWorth)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Security Setup */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-primary" />
              Security Setup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <p className="text-sm text-muted-foreground">Security Questions</p>
              <p className="font-medium">{formData.securityQuestions.length} questions configured</p>
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <p className="text-sm text-muted-foreground">Uploaded Documents</p>
              {(() => {
                const totalDocs = Object.values(formData.documentsByType || {}).flat().length;
                const documentTypes = Object.entries(formData.documentsByType || {}).filter(([_, files]) => files.length > 0);
                
                return (
                  <>
                    <p className="font-medium">{totalDocs} document(s) uploaded</p>
                    {documentTypes.length > 0 && (
                      <div className="mt-4 space-y-3">
                        {documentTypes.map(([docType, files]) => (
                          <div key={docType} className="space-y-2">
                            <h4 className="text-sm font-medium capitalize">
                              {docType.replace(/_/g, ' ').replace('front', 'Front').replace('back', 'Back')}
                            </h4>
                            <div className="grid grid-cols-2 gap-2">
                              {files.map((file, index) => (
                                <div key={index} className="flex items-center space-x-3 p-3 border rounded-md bg-muted/50">
                                  {file.type.startsWith('image/') ? (
                                    <img 
                                      src={URL.createObjectURL(file)} 
                                      alt={file.name}
                                      className="w-16 h-16 object-cover rounded border"
                                    />
                                  ) : (
                                    <div className="w-16 h-16 bg-blue-100 rounded border flex items-center justify-center">
                                      <span className="text-sm font-medium">PDF</span>
                                    </div>
                                  )}
                                  <span className="text-sm truncate flex-1">{file.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        {/* Investment Profile */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              Investment Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Experience Level</p>
                <p className="font-medium">{getExperienceLabel(formData.investmentExperience)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Risk Tolerance</p>
                <p className="font-medium">{getRiskToleranceLabel(formData.riskTolerance)}</p>
              </div>
            </div>
            {formData.investmentTimeHorizon && (
              <div>
                <p className="text-sm text-muted-foreground">Time Horizon</p>
                <p className="font-medium capitalize">{formData.investmentTimeHorizon.replace('-', ' ')}-term</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Investment Goals</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {formData.investmentGoals.map((goal, index) => (
                  <Badge key={index} variant="outline">
                    {goal}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="bg-muted/20 p-4 rounded-lg">
        <h4 className="font-semibold mb-2">Next Steps</h4>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li>• Your application will be reviewed within 1-2 business days</li>
          <li>• We may contact you for additional verification if needed</li>
          <li>• Once approved, you'll receive access to your full investment dashboard</li>
          <li>• Our team will reach out to schedule your personalized consultation</li>
        </ul>
      </div>
    </div>
  );
};

export default ReviewSubmit;