import { useState } from 'react';
import { useEmail } from '../../hooks/useEmail';
import { EmailType, EmailRecipient } from '../../services/email/EmailTypes';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';

export default function AdminEmailTest() {
  const { sendEmail, testConnection, isSending, error } = useEmail();
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [emailType, setEmailType] = useState<EmailType>(EmailType.WELCOME);
  const [result, setResult] = useState<{ success: boolean; messageId?: string; error?: string } | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<boolean | null>(null);
  const [customVariables, setCustomVariables] = useState('');

  const handleTestConnection = async () => {
    setConnectionStatus(null);
    const status = await testConnection();
    setConnectionStatus(status);
  };

  const handleSendTestEmail = async () => {
    if (!recipientEmail) {
      setResult({ success: false, error: 'Please enter a recipient email address' });
      return;
    }

    setResult(null);
    const recipient: EmailRecipient = {
      email: recipientEmail,
      name: recipientName || undefined,
    };

    // Parse custom variables (JSON format)
    let variables: Record<string, any> = {};
    if (customVariables.trim()) {
      try {
        variables = JSON.parse(customVariables);
      } catch (e) {
        setResult({ success: false, error: 'Invalid JSON format for custom variables' });
        return;
      }
    } else {
      // Add default variables based on email type
      variables = getDefaultVariables(emailType, recipient);
    }

    const emailResult = await sendEmail({
      type: emailType,
      recipient,
      variables,
    });

    setResult(emailResult);
  };

  const getDefaultVariables = (type: EmailType, recipient: EmailRecipient): Record<string, any> => {
    const baseVars = {
      userName: recipient.name || recipient.email.split('@')[0],
      userEmail: recipient.email,
    };

    switch (type) {
      case EmailType.WELCOME:
        return {
          ...baseVars,
          dashboardLink: 'https://peacefulinvestment.com/dashboard',
        };
      case EmailType.EMAIL_VERIFICATION:
        return {
          ...baseVars,
          verificationLink: 'https://peacefulinvestment.com/verify?token=test-token-123',
        };
      case EmailType.PASSWORD_RESET:
        return {
          ...baseVars,
          resetLink: 'https://peacefulinvestment.com/reset-password?token=test-token-123',
        };
      case EmailType.SUPPORT_REQUEST:
        return {
          ...baseVars,
          ticketId: 'TKT-12345',
          subject: 'Test Support Request',
          message: 'This is a test support request message.',
          priority: 'medium',
        };
      case EmailType.REFERRAL_INVITATION:
        return {
          ...baseVars,
          inviterName: 'John Doe',
          invitationLink: 'https://peacefulinvestment.com/signup?ref=TEST123',
          bonusAmount: '$50',
        };
      default:
        return baseVars;
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Email Service Test</h1>
        <p className="text-muted-foreground">
          Test the Resend email service configuration and send test emails
        </p>
      </div>

      {/* Connection Test */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Connection Test</CardTitle>
          <CardDescription>Test if the Resend API connection is working</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button onClick={handleTestConnection} disabled={isSending} variant="outline">
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Test Connection
                </>
              )}
            </Button>
            {connectionStatus !== null && (
              <Alert className={connectionStatus ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                <div className="flex items-center gap-2">
                  {connectionStatus ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        Connection successful! Resend API is configured correctly.
                      </AlertDescription>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        Connection failed. Please check your RESEND_API_KEY in environment variables.
                      </AlertDescription>
                    </>
                  )}
                </div>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Send Test Email */}
      <Card>
        <CardHeader>
          <CardTitle>Send Test Email</CardTitle>
          <CardDescription>Send a test email to verify the email service is working</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Recipient Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="recipientEmail">Recipient Email *</Label>
              <Input
                id="recipientEmail"
                type="email"
                placeholder="test@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipientName">Recipient Name (Optional)</Label>
              <Input
                id="recipientName"
                type="text"
                placeholder="John Doe"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
              />
            </div>
          </div>

          {/* Email Type */}
          <div className="space-y-2">
            <Label htmlFor="emailType">Email Type</Label>
            <Select value={emailType} onValueChange={(value) => setEmailType(value as EmailType)}>
              <SelectTrigger id="emailType">
                <SelectValue placeholder="Select email type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EmailType.WELCOME}>Welcome Email</SelectItem>
                <SelectItem value={EmailType.EMAIL_VERIFICATION}>Email Verification</SelectItem>
                <SelectItem value={EmailType.PASSWORD_RESET}>Password Reset</SelectItem>
                <SelectItem value={EmailType.SUPPORT_REQUEST}>Support Request</SelectItem>
                <SelectItem value={EmailType.REFERRAL_INVITATION}>Referral Invitation</SelectItem>
                <SelectItem value={EmailType.CONTACT_FORM}>Contact Form</SelectItem>
                <SelectItem value={EmailType.ACCOUNT_APPROVED}>Account Approved</SelectItem>
                <SelectItem value={EmailType.ACCOUNT_REJECTED}>Account Rejected</SelectItem>
                <SelectItem value={EmailType.DEPOSIT_CONFIRMATION}>Deposit Confirmation</SelectItem>
                <SelectItem value={EmailType.WITHDRAWAL_CONFIRMATION}>Withdrawal Confirmation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Variables */}
          <div className="space-y-2">
            <Label htmlFor="customVariables">Custom Variables (JSON - Optional)</Label>
            <Textarea
              id="customVariables"
              placeholder='{"userName": "John", "verificationLink": "https://..."}'
              value={customVariables}
              onChange={(e) => setCustomVariables(e.target.value)}
              rows={4}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to use default variables. Provide JSON to override default variables.
            </p>
          </div>

          {/* Send Button */}
          <Button
            onClick={handleSendTestEmail}
            disabled={isSending || !recipientEmail}
            className="w-full"
            size="lg"
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending Email...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send Test Email
              </>
            )}
          </Button>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Result Display */}
          {result && (
            <Alert className={result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
              <div className="flex items-start gap-2">
                {result.success ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <AlertDescription className="text-green-800 font-semibold mb-1">
                        Email sent successfully!
                      </AlertDescription>
                      {result.messageId && (
                        <AlertDescription className="text-green-700 text-sm">
                          Message ID: {result.messageId}
                        </AlertDescription>
                      )}
                      <AlertDescription className="text-green-700 text-sm mt-2">
                        Check your inbox at <strong>{recipientEmail}</strong> and the Resend dashboard for delivery status.
                      </AlertDescription>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                    <AlertDescription className="text-red-800">
                      <strong>Failed to send email:</strong> {result.error}
                    </AlertDescription>
                  </>
                )}
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Testing Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <ol className="list-decimal list-inside space-y-2">
            <li>First, test the connection to verify your RESEND_API_KEY is configured correctly.</li>
            <li>Enter a valid email address where you want to receive the test email.</li>
            <li>Select the email type you want to test.</li>
            <li>Optionally provide custom variables in JSON format, or leave empty to use defaults.</li>
            <li>Click "Send Test Email" and check the result.</li>
            <li>Check your email inbox and the Resend dashboard to verify delivery.</li>
          </ol>
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="font-semibold text-blue-900 mb-2">💡 Tips:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>Make sure your sender domain is verified in Resend dashboard</li>
              <li>Check your spam folder if you don't see the email</li>
              <li>View email logs and analytics in the Resend dashboard</li>
              <li>Use the Message ID to track specific emails</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

