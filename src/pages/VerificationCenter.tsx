import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useVerification } from '@/hooks/useVerification';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentUpload } from '@/components/verification/DocumentUpload';
import { VerificationHistory } from '@/components/verification/VerificationHistory';
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertCircle, 
  Upload,
  Shield,
  FileText,
  Users
} from 'lucide-react';
import Footer from '@/components/Footer';

const statusConfig = {
  unverified: {
    icon: AlertCircle,
    color: 'bg-gray-500',
    text: 'Unverified',
    description: 'Your account is not yet verified. Upload documents to begin verification.'
  },
  pending_verification: {
    icon: Clock,
    color: 'bg-yellow-500',
    text: 'Pending Review',
    description: 'Your documents are being reviewed by our team.'
  },
  verified: {
    icon: CheckCircle,
    color: 'bg-green-500',
    text: 'Verified',
    description: 'Your account is fully verified. You have access to all features.'
  },
  rejected: {
    icon: XCircle,
    color: 'bg-red-500',
    text: 'Rejected',
    description: 'Your verification was rejected. Please review feedback and resubmit.'
  },
  blocked: {
    icon: XCircle,
    color: 'bg-red-700',
    text: 'Blocked',
    description: 'Your account has been blocked. Contact support for assistance.'
  }
};

const getVerificationProgress = (status: string) => {
  const progressMap = {
    unverified: 0,
    pending_verification: 50,
    verified: 100,
    rejected: 25,
    blocked: 0
  };
  return progressMap[status as keyof typeof progressMap] || 0;
};

const VerificationCenter: React.FC = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { verificationRequests, submitVerification, loading } = useVerification();
  const [activeTab, setActiveTab] = useState('status');

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const userStatus = profile.status || 'unverified';
  const config = statusConfig[userStatus as keyof typeof statusConfig];
  const progress = getVerificationProgress(userStatus);
  const StatusIcon = config.icon;

  const latestRequest = verificationRequests?.[0];
  const canUpload = ['unverified', 'rejected'].includes(userStatus);

  const handleDocumentSubmit = async (documents: File[]) => {
    try {
      await submitVerification(documents);
      setActiveTab('history');
    } catch (error) {
      console.error('Failed to submit verification:', error);
    }
  };

  return (
    <div className="min-h-screen pink-yellow-shadow pt-28 pb-12">
      <div className="container mx-auto px-4 py-8 max-w-4xl pb-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-white ">Verification Center</h1>
          <p className="text-muted-foreground">
            Manage your account verification and access all platform features
          </p>
        </div>

        {/* Status Overview Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-primary" />
              Account Verification Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 mt-4 sm:mt-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${config.color}`}>
                  <StatusIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <Badge variant={userStatus === 'verified' ? 'default' : 'secondary'}>
                    {config.text}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">
                    {config.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className='text-white'>Verification Progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {latestRequest?.reason && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Admin Feedback:</strong> {latestRequest.reason}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Verification Features */}
        {userStatus !== 'verified' && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Users className="h-6 w-6 text-primary" />
                Unlock Full Access
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Complete verification to access these features:
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm">Trading Tools</span>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm">Company Creation</span>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm">Referral Program</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="status" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {canUpload ? 'Upload Documents' : 'Status'}
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="mt-6">
            {canUpload ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Upload className="h-6 w-6 text-primary" />
                    Upload Verification Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DocumentUpload onSubmit={handleDocumentSubmit} loading={loading} />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Current Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <StatusIcon className={`h-16 w-16 mx-auto mb-4 ${
                      userStatus === 'verified' ? 'text-green-500' : 
                      userStatus === 'pending_verification' ? 'text-yellow-500' : 'text-red-500'
                    }`} />
                    <h3 className="text-lg font-semibold mb-2 text-white">{config.text}</h3>
                    <p className="text-muted-foreground">{config.description}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Clock className="h-6 w-6 text-primary" />
                  Verification History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <VerificationHistory requests={verificationRequests || []} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default VerificationCenter;