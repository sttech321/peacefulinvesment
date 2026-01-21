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
        <h2 className="text-2xl font-bold text-white mb-2 ">
          Review Your Information
        </h2>
        <p className="text-muted-foreground">
          Please review all information before submitting your application.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Personal Information */}
        <Card className="p-0 bg-white/10 border border-secondary-foreground">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0 sm:pt-0">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="pb-2">
                <p className="text-sm text-muted-foreground pb-2">Full Name</p>
                <p className="text-sm font-normal text-white/50 h-10 px-3 p-2 rounded-sm bg-white/10 border-0 leading-[25px]">{formData.firstName} {formData.lastName}</p>
              </div>
              <div className="pb-2">
                <p className="text-sm text-muted-foreground pb-2">Date of Birth</p>
                <p className="text-sm font-normal text-white/50 h-10 px-3 p-2 rounded-sm bg-white/10 border-0 leading-[25px]">{formData.dateOfBirth}</p>
              </div>
            </div>
            <div className="pb-2">
              <p className="text-sm text-muted-foreground pb-2">Social Security Number</p>
              <p className="text-sm font-normal text-white/50 h-10 px-3 p-2 rounded-sm bg-white/10 border-0 leading-[25px]">
                {formData.socialSecurityNumber && formData.socialSecurityNumber.length >= 4 
                  ? `***-**-${formData.socialSecurityNumber.slice(-4)}` 
                  : 'Not provided'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="p-0 bg-white/10 border border-secondary-foreground">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5 text-primary" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0 sm:pt-0">
            <div className="pb-2">
              <p className="text-sm text-muted-foreground pb-2">Phone</p>
              <p className="text-sm font-normal text-white/50 h-10 px-3 p-2 rounded-sm bg-white/10 border-0 leading-[25px]">{formData.phone}</p>
            </div>
            <div className="pb-2">
              <p className="text-sm text-muted-foreground pb-2">Address</p>
              <p className="text-sm font-normal text-white/50 px-3 p-2 rounded-sm bg-white/10 border-0 leading-[25px]">
                {formData.address}<br />
                {formData.city}, {formData.state} {formData.zipCode}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Employment Information */}
        <Card className="p-0 bg-white/10 border border-secondary-foreground">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Briefcase className="h-5 w-5 text-primary" />
              Employment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0 sm:pt-0">
            <div className="pb-2">
              <p className="text-sm text-muted-foreground pb-2">Employment Status</p>
              <p className="text-sm font-normal text-white/50 h-10 px-3 p-2 rounded-sm bg-white/10 border-0 leading-[25px] capitalize">
                {formData.employmentStatus ? formData.employmentStatus.replace('-', ' ') : 'Not provided'}
              </p>
            </div>
            {formData.employer && (
              <div className="pb-2">
                <p className="text-sm text-muted-foreground pb-2">Employer</p>
                <p className="text-sm font-normal text-white/50 h-10 px-3 p-2 rounded-sm bg-white/10 border-0 leading-[25px]">{formData.employer}</p>
              </div>
            )}
            {formData.occupation && (
              <div className="pb-0">
                <p className="text-sm text-muted-foreground pb-2">Occupation</p>
                <p className="text-sm font-normal text-white/50 h-10 px-3 p-2 rounded-sm bg-white/10 border-0 leading-[25px]">{formData.occupation}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Information */}
        <Card className="p-0 bg-white/10 border border-secondary-foreground">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-primary" />
              Financial Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0 sm:pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="pb-2">
                <p className="text-sm text-muted-foreground pb-2">Annual Income</p>
                <p className="text-sm font-normal text-white/50 h-10 px-3 p-2 rounded-sm bg-white/10 border-0 leading-[25px]">{formatCurrency(formData.annualIncome)}</p>
              </div>
              {formData.netWorth > 0 && (
                <div className="pb-2">
                  <p className="text-sm text-muted-foreground pb-2">Net Worth</p>
                  <p className="text-sm font-normal text-white/50 h-10 px-3 p-2 rounded-sm bg-white/10 border-0 leading-[25px]">{formatCurrency(formData.netWorth)}</p>
                </div>
              )}
              {formData.liquidNetWorth > 0 && (
                <div className="pb-2">
                  <p className="text-sm text-muted-foreground pb-2">Liquid Net Worth</p>
                  <p className="text-sm font-normal text-white/50 h-10 px-3 p-2 rounded-sm bg-white/10 border-0 leading-[25px]">{formatCurrency(formData.liquidNetWorth)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Security Setup */}
        <Card className="p-0 bg-white/10 border border-secondary-foreground">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-primary" />
              Security Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0 sm:pt-0">
            <div className="pb-2">
              <p className="text-sm text-muted-foreground pb-2">Security Questions</p>
              <p className="text-sm font-normal text-white/50 h-10 px-3 p-2 rounded-sm bg-white/10 border-0 leading-[25px]">{formData.securityQuestions.length} questions configured</p>
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card className="p-0 bg-white/10 border border-secondary-foreground">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0 sm:pt-0">
            <div className="pb-2">
              <p className="text-sm text-white">Uploaded Documents</p>
              {(() => {
                const totalDocs = Object.values(formData.documentsByType || {}).flat().length;
                const documentTypes = Object.entries(formData.documentsByType || {}).filter(([_, files]) => files.length > 0);
                const getFileNameFromPath = (p: string) => {
                  const last = p.split("/").pop() || p;
                  return last || "Document";
                };
                
                return (
                  <>
                    <p className="font-normal text-sm text-muted-foreground pt-1">{totalDocs} document(s) uploaded</p>
                    {documentTypes.length > 0 && (
                      <div className="mt-4 grid sm:grid-cols-2 gap-4">
                        {documentTypes.map(([docType, files]) => (
                          <div key={docType} className="space-y-2">
                            <h4 className="text-sm font-medium capitalize text-muted-foreground">
                              {docType.replace(/_/g, ' ').replace('front', 'Front').replace('back', 'Back')}
                            </h4>
                            <div className="">
                              {files.filter(Boolean).map((file: any, index) => {
                                
                                // `documentsByType` now stores ONLY Supabase Storage paths (strings).
                                // Keep UI resilient for legacy shapes.
                                const isPath = typeof file === "string";
                                const fileName =
                                  (isPath ? getFileNameFromPath(file) : (file?.name || file?.fileName || "Document")) as string;
                                const ext = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() : "";
                                const fileType = (isPath ? ext : (file?.type || ext)) as string;
                                const fileUrl = !isPath && file?.url ? file.url : (!isPath && file instanceof File ? URL.createObjectURL(file) : null);
                                const isImage = Boolean(fileType) && (
                                  String(fileType).startsWith("image/") ||
                                  ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(String(fileType))
                                );
                                
                                return (
                                  <div key={index} className="flex items-center space-x-3 p-3 border-0 rounded-sm bg-white/10">
                                    {isImage && fileUrl ? (
                                      <img 
                                        src={fileUrl} 
                                        alt={fileName}
                                        className="w-12 h-12 object-cover rounded border"
                                        onError={(e) => {
                                          // Fallback if image fails to load
                                          e.currentTarget.style.display = 'none';
                                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                        }}
                                      />
                                    ) : null}
                                    {!isImage || !fileUrl ? (
                                      <div className="w-12 h-12 bg-blue-100 rounded border flex items-center justify-center">
                                        <span className="text-sm font-medium">PDF</span>
                                      </div>
                                    ) : null}
                                    <span className="text-sm truncate flex-1 text-muted-foreground">{fileName}</span>
                                  </div>
                                );
                              })}
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
        <Card className="p-0 bg-white/10 border border-secondary-foreground">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              Investment Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0 sm:pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="pb-2">
                <p className="text-sm text-muted-foreground pb-2">Experience Level</p>
                <p className="text-sm font-normal text-white/50 h-10 px-3 p-2 rounded-sm bg-white/10 border-0 leading-[25px]">{getExperienceLabel(formData.investmentExperience)}</p>
              </div>
              <div className="pb-2">
                <p className="text-sm text-muted-foreground pb-2">Risk Tolerance</p>
                <p className="text-sm font-normal text-white/50 h-10 px-3 p-2 rounded-sm bg-white/10 border-0 leading-[25px]">{getRiskToleranceLabel(formData.riskTolerance)}</p>
              </div>
            </div>
            {formData.investmentTimeHorizon && (
              <div className="pb-2">
                <p className="text-sm text-muted-foreground pb-2">Time Horizon</p>
                <p className="text-sm font-normal text-white/50 h-10 px-3 p-2 rounded-sm bg-white/10 border-0 leading-[25px] capitalize">
                  {formData.investmentTimeHorizon.replace('-', ' ')}-term
                </p>
              </div>
            )}
            <div className="pb-2">
              <p className="text-sm text-muted-foreground pb-2">Investment Goals</p>
              <div className="flex flex-wrap gap-1 mt-0">
                {formData.investmentGoals && Array.isArray(formData.investmentGoals) && formData.investmentGoals.length > 0 ? (
                  formData.investmentGoals.map((goal, index) => (
                    <Badge key={index} variant="outline" className="bg-white/10 border-0 text-xs font-normal text-white/50">
                      {goal}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">No goals specified</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator className="bg-white/20" />

      <div className="bg-white/10 p-4 border border-secondary-foreground rounded-sm">
        <h4 className="font-semibold mb-2 text-white">Next Steps</h4>
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