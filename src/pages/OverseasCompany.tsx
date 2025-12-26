import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom"; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProfile } from "@/hooks/useProfile";

import { 
  Building2, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Upload, 
  FileText, 
  History,
  DollarSign,
  Globe
} from "lucide-react";
import { useOverseasCompany } from "@/hooks/useOverseasCompany";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const BUSINESS_TYPES = [
  "Trading Company",
  "Investment Company", 
  "Holding Company",
  "Technology Company",
  "Consulting Company",
  "Real Estate Company",
  "Import/Export Company",
  "Financial Services",
  "Other"
];

const OverseasCompany = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const { profile, updateProfile, refetchProfile } = useProfile();
  const fromProfile = searchParams.get('from') === 'profile'; 
  
  const { 
    requests, 
    companyInfo, 
    loading, 
    submitRequest, 
    uploadDocuments 
  } = useOverseasCompany();

  const [formData, setFormData] = useState({
    companyName1: "",
    companyName2: "", 
    companyName3: "",
    businessType: "",
    businessDescription: "",
    contactEmail: user?.email || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<FileList | null>(null);
  const [hasRedirected, setHasRedirected] = useState(false);
 
  const currentRequest = requests?.[0];
  const hasActiveRequest = currentRequest && currentRequest.status !== 'completed' && currentRequest.status !== 'rejected';
  
  // Check if overseas company is completed (has companyInfo or status is completed)
  const isOverseasCompanyCompleted = (companyInfo && companyInfo.length > 0) || currentRequest?.status === 'completed';
  
  // Redirect back to profile when company is completed (after admin approval)
  useEffect(() => {
    if (fromProfile && isOverseasCompanyCompleted && !hasRedirected && companyInfo && companyInfo.length > 0) {
      // Update profile to mark overseas company as completed
      updateProfile({
        overseas_company_completed: true,
        overseas_company_id: companyInfo[0]?.id,
        has_completed_profile: true // Ensure profile is marked as completed
      } as any).then(async () => {
        // Wait for profile to be refetched to ensure completed view shows
        await refetchProfile();
        setHasRedirected(true);
        toast({
          title: 'Overseas Company Completed!',
          description: 'Redirecting back to your profile...',
        });
        // Small delay for better UX, then redirect
        setTimeout(() => {
          navigate('/profile');
        }, 1500);
      }).catch(async (err) => {
        console.error('Error updating profile:', err);
        // Still refetch and redirect even if update fails
        await refetchProfile();
        setHasRedirected(true);
        setTimeout(() => {
          navigate('/profile');
        }, 1500);
      });
    }
  }, [fromProfile, isOverseasCompanyCompleted, hasRedirected, companyInfo, navigate, toast, updateProfile, refetchProfile, currentRequest]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate First Choice Company Name
    if (!formData.companyName1.trim()) {
      newErrors.companyName1 = "First choice company name is required";
    }

    // Validate Second Choice Company Name
    if (!formData.companyName2.trim()) {
      newErrors.companyName2 = "Second choice company name is required";
    }

    // Validate Third Choice Company Name
    if (!formData.companyName3.trim()) {
      newErrors.companyName3 = "Third choice company name is required";
    }

    // Validate Business Type
    if (!formData.businessType) {
      newErrors.businessType = "Business type is required";
    }

    // Validate Business Description
    if (!formData.businessDescription.trim()) {
      newErrors.businessDescription = "Business description is required";
    }

    // Validate Contact Email
    if (!formData.contactEmail.trim()) {
      newErrors.contactEmail = "Contact email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      newErrors.contactEmail = "Please enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields correctly.",
        variant: "destructive"
      });
      return;
    }

    const companyNames = [
      formData.companyName1.trim(),
      formData.companyName2.trim(),
      formData.companyName3.trim()
    ];

    try {
      await submitRequest({
        company_names: companyNames,
        business_type: formData.businessType,
        business_description: formData.businessDescription,
        contact_email: formData.contactEmail
      });

      toast({
        title: "Request Submitted",
        description: "Your overseas company request has been submitted successfully."
      });

      // Reset form
      setFormData({
        companyName1: "",
        companyName2: "",
        companyName3: "",
        businessType: "",
        businessDescription: "",
        contactEmail: user?.email || ""
      });
      setErrors({});

      // Update profile to mark overseas company as required
      if (updateProfile) {
        try {
          await updateProfile({
            overseas_company_required: true,
            has_completed_profile: true // Keep profile as completed
          } as any);
        } catch (err) {
          console.warn("Failed to update profile:", err);
        }
      }

      // If user came from profile flow, redirect back to profile after submission
      if (fromProfile) {
        toast({
          title: "Request Submitted",
          description: "Your request has been submitted. Redirecting back to profile...",
        });
        setTimeout(() => {
          navigate('/profile');
        }, 1500);
        return;
      }

      // For users coming from create-account flow
      if (user && profile && !profile.has_completed_profile) {
        navigate('/create-account');
      }


    } catch (error) {
      toast({
        title: "Submission Failed",
        description: "Failed to submit your request. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = async () => {
    if (!files || !currentRequest) return;

    try {
      await uploadDocuments(currentRequest.id, files);
      toast({
        title: "Documents Uploaded",
        description: "Your documents have been uploaded successfully."
      });
      setFiles(null);
    } catch (error) {
      toast({
        title: "Upload Failed", 
        description: "Failed to upload documents. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 mr-1" />;
      case 'processing': return <AlertCircle className="h-4 w-4 mr-1" />;
      case 'completed': return <CheckCircle className="h-4 w-4 mr-1" />;
      case 'rejected': return <AlertCircle className="h-4 w-4 mr-1" />;
      default: return <Clock className="h-4 w-4 mr-1" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20 hover:bg-yellow-500/20';
      case 'processing': return 'bg-blue-500/10 text-blue-700 border-blue-500/20 hover:bg-blue-500/20';
      case 'completed': return 'bg-green-500/10 text-green-700 border-green-500/20 hover:bg-green-500/20';
      case 'rejected': return 'bg-red-500/10 text-red-700 border-red-500/20 hover:bg-red-500/20';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
    }
  };

  return (
    <div className="min-h-screen pink-yellow-shadow pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8 pt-10">
          <h1 className="text-4xl mb-4 font-inter font-bold text-white">
            Overseas Company <span className="text-primary"> Registration </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Register your international company with full support from Peaceful Investment. 
            All fees covered with minimum $6,000 balance.
          </p>
        </div>

        {/* Service Highlights */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="text-center">
            <CardContent className="pt-6">
              <DollarSign className="h-12 w-12 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2 text-white">All Fees Covered</h3>
              <p className="text-sm text-muted-foreground">
                Complete registration with no additional costs
              </p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <Clock className="h-12 w-12 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2 text-white">6-9 Business Days</h3>
              <p className="text-sm text-muted-foreground">
                Fast processing with dedicated support
              </p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <Globe className="h-12 w-12 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2 text-white">Global Jurisdictions</h3>
              <p className="text-sm text-muted-foreground">
                Multiple offshore locations available
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="request" className="space-y-6">
          <div className="bg-gradient-pink-to-yellow mb-5 rounded-lg p-[2px] lg:mb-12">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="request">New Request</TabsTrigger>
            <TabsTrigger value="status">Current Status</TabsTrigger>
            <TabsTrigger value="company">Company Info</TabsTrigger>
           
          </TabsList>
      </div>
          {/* New Request Tab */}
          <TabsContent value="request">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Company Registration Request
                </CardTitle>
                <CardDescription>
                  Submit your company registration details. All fields are required. Provide 3 name choices in order of preference.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {hasActiveRequest && (
                  <Alert className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      You have an active request in progress. Please wait for completion before submitting a new request.
                    </AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="companyName1" className="text-sm font-medium leading-none text-muted-foreground pb-2">
                        First Choice Company Name *
                      </Label>
                      <Input
                        id="companyName1"
                        value={formData.companyName1}
                        onChange={(e) => {
                          setFormData({ ...formData, companyName1: e.target.value });
                          if (errors.companyName1) {
                            setErrors({ ...errors, companyName1: "" });
                          }
                        }}
                        placeholder="Enter your preferred company name"
                        disabled={hasActiveRequest}
                        required
                        className={`rounded-[8px] border-0 shadow-none mt-1 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent resize-none ${errors.companyName1 ? 'border-red-500 border' : ''}`}
                      />
                      {errors.companyName1 && (
                        <p className="text-sm text-red-500 mt-1">{errors.companyName1}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="companyName2" className="text-sm font-medium leading-none text-muted-foreground pb-2">
                        Second Choice Company Name *
                      </Label>
                      <Input
                        id="companyName2"
                        value={formData.companyName2}
                        onChange={(e) => {
                          setFormData({ ...formData, companyName2: e.target.value });
                          if (errors.companyName2) {
                            setErrors({ ...errors, companyName2: "" });
                          }
                        }}
                        placeholder="Enter alternative company name"
                        disabled={hasActiveRequest}
                        required
                        className={`rounded-[8px] border-0 shadow-none mt-1 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent resize-none ${errors.companyName2 ? 'border-red-500 border' : ''}`}
                      />
                      {errors.companyName2 && (
                        <p className="text-sm text-red-500 mt-1">{errors.companyName2}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="companyName3" className="text-sm font-medium leading-none text-muted-foreground pb-2">
                        Third Choice Company Name *
                      </Label>
                      <Input
                        id="companyName3"
                        value={formData.companyName3}
                        onChange={(e) => {
                          setFormData({ ...formData, companyName3: e.target.value });
                          if (errors.companyName3) {
                            setErrors({ ...errors, companyName3: "" });
                          }
                        }}
                        placeholder="Enter third choice company name"
                        disabled={hasActiveRequest}
                        required
                        className={`rounded-[8px] border-0 shadow-none mt-1 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent resize-none ${errors.companyName3 ? 'border-red-500 border' : ''}`}
                      />
                      {errors.companyName3 && (
                        <p className="text-sm text-red-500 mt-1">{errors.companyName3}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="businessType" className="text-sm font-medium leading-none text-muted-foreground pb-2">Business Type *</Label>
                      <Select 
                        value={formData.businessType} 
                        onValueChange={(value) => {
                          setFormData({ ...formData, businessType: value });
                          if (errors.businessType) {
                            setErrors({ ...errors, businessType: "" });
                          }
                        }}
                        disabled={hasActiveRequest}
                        required
                      >
                        <SelectTrigger className={`mt-1 rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400 ${errors.businessType ? 'border-red-500 border' : ''}`} style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
                          <SelectValue placeholder="Select business type" />
                        </SelectTrigger>
                        <SelectContent className='border-secondary-foreground bg-black/90 text-white'>
                          {BUSINESS_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.businessType && (
                        <p className="text-sm text-red-500 mt-1">{errors.businessType}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="businessDescription" className="text-sm font-medium leading-none text-muted-foreground pb-2">
                        Business Description *
                      </Label>
                      <Textarea
                        id="businessDescription"
                        value={formData.businessDescription}
                        onChange={(e) => {
                          setFormData({ ...formData, businessDescription: e.target.value });
                          if (errors.businessDescription) {
                            setErrors({ ...errors, businessDescription: "" });
                          }
                        }}
                        placeholder="Briefly describe your business activities"
                        disabled={hasActiveRequest}
                        required
                        className={`min-h-[100px] mt-1 rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent resize-none ${errors.businessDescription ? 'border-red-500 border' : ''}`}
                      />
                      {errors.businessDescription && (
                        <p className="text-sm text-red-500 mt-1">{errors.businessDescription}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="contactEmail" className="text-sm font-medium leading-none text-muted-foreground pb-2">Contact Email *</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        value={formData.contactEmail}
                        onChange={(e) => {
                          setFormData({ ...formData, contactEmail: e.target.value });
                          if (errors.contactEmail) {
                            setErrors({ ...errors, contactEmail: "" });
                          }
                        }}
                        placeholder="your@email.com"
                        disabled={hasActiveRequest}
                        required
                        className={`rounded-[8px] border-0 shadow-none mt-1 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent resize-none ${errors.contactEmail ? 'border-red-500 border' : ''}`}
                      />
                      {errors.contactEmail && (
                        <p className="text-sm text-red-500 mt-1">{errors.contactEmail}</p>
                      )}
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full download-btn-primary"
                    disabled={loading || hasActiveRequest}
                  >
                    {loading ? "Submitting..." : "Submit Registration Request"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Status Tab */}
          <TabsContent value="status">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Request Status
                </CardTitle>
                <CardDescription>
                  Track your overseas company registration progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentRequest ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg text-white">
                          {currentRequest.company_names[0]}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {currentRequest.jurisdiction} • {currentRequest.business_type}
                        </p>
                      </div>
                      <Badge className={getStatusColor(currentRequest.status)}>
                        {getStatusIcon(currentRequest.status)}
                        {currentRequest.status.charAt(0).toUpperCase() + currentRequest.status.slice(1)}
                      </Badge>
                    </div>

                    <div className="grid gap-4">
                      <div>
                        <Label className="text-sm font-medium text-white">Submitted</Label>
                        <p className="text-sm text-muted-foreground">
                          {new Date(currentRequest.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                      
                      {currentRequest.estimated_completion && (
                        <div>
                          <Label className="text-sm font-medium">Estimated Completion</Label>
                          <p className="text-sm text-muted-foreground">
                            {new Date(currentRequest.estimated_completion).toLocaleDateString()}
                          </p>
                        </div>
                      )}

                      {currentRequest.admin_notes && (
                        <div>
                          <Label className="text-sm font-medium">Admin Notes</Label>
                          <p className="text-sm text-muted-foreground">
                            {currentRequest.admin_notes}
                          </p>
                        </div>
                      )}

                      {currentRequest.documents_requested && currentRequest.documents_requested.length > 0 && (
                        <div>
                          <Label className="text-sm font-medium">Documents Requested</Label>
                          <ul className="text-sm text-muted-foreground list-disc list-inside">
                            {currentRequest.documents_requested.map((doc, index) => (
                              <li key={index}>{doc}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Document Upload */}
                    {currentRequest.status === 'processing' && (
                      <div className="border-t pt-6">
                        <Label className="text-sm font-medium mb-3 block">
                          Upload Additional Documents
                        </Label>
                        <div className="space-y-3">
                          <Input
                            type="file"
                            multiple
                            onChange={(e) => setFiles(e.target.files)}
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          />
                          <Button 
                            onClick={handleFileUpload}
                            disabled={!files || loading}
                            className="flex items-center gap-2"
                          >
                            <Upload className="h-4 w-4" />
                            Upload Documents
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <h3 className="font-semibold mb-2 text-white">No Active Requests</h3>
                    <p className="text-sm text-muted-foreground">
                      You don't have any active company registration requests.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Company Info Tab */}
          <TabsContent value="company">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  Registered Companies
                </CardTitle>
                <CardDescription>
                  View your successfully registered companies
                </CardDescription>
              </CardHeader>
              <CardContent>
                {companyInfo && companyInfo.length > 0 ? (
                  <div className="space-y-4">
                    {companyInfo.map((company) => (
                      <Card key={company.id} className="border-secondary-foreground border p-0">
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start">
                            <div>
                               <h3 className="font-semibold text-lg mb-1 text-white">
                                {company.company_name}
                               </h3>
                               <p className="text-sm text-muted-foreground mb-3">
                                Registration: {company.registration_number}
                               </p>
                               <div className="grid grid-cols-2 gap-4 text-sm">
                                 <div>
                                   <Label className="font-medium  text-white">Incorporation Date</Label>
                                   <p className="text-muted-foreground">
                                     {new Date(company.incorporation_date).toLocaleDateString()}
                                   </p>
                                 </div>
                                <div>
                                  <Label className="font-medium text-white">Jurisdiction</Label>
                                  <p className="text-muted-foreground">{company.jurisdiction}</p>
                                </div>
                                <div>
                                  <Label className="font-medium text-white">Status</Label>
                                  <Badge className="bg-green-500/10 text-green-700 border-green-500/20 ml-2">
                                    {company.status}
                                  </Badge>
                                </div>
                                 <div>
                                   <Label className="font-medium text-white">Contact</Label>
                                   <p className="text-muted-foreground">{company.contact_email}</p>
                                 </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <h3 className="font-semibold mb-2 text-white">No Registered Companies</h3>
                    <p className="text-sm text-muted-foreground">You don't have any registered companies yet. </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default OverseasCompany;