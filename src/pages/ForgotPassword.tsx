import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    // Improved email format validation
    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    // Additional validation: check for common invalid patterns
    if (trimmedEmail.includes('..') || trimmedEmail.startsWith('.') || trimmedEmail.endsWith('.')) {
      setError("Please enter a valid email address");
      return;
    }

    // Check domain part is valid
    const domainPart = trimmedEmail.split('@')[1];
    if (!domainPart || domainPart.length < 4 || !domainPart.includes('.')) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Use our custom Edge Function to send password reset email via Resend
      // This avoids spam filters and provides better deliverability
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('VITE_SUPABASE_URL is not configured');
      }

      const redirectUrl = `${window.location.origin}/reset-password`;
      
      console.log('Calling password reset Edge Function:', { 
        email: trimmedEmail, 
        supabaseUrl,
        endpoint: `${supabaseUrl}/functions/v1/send-password-reset`
      });
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/send-password-reset`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          },
          body: JSON.stringify({
            email: trimmedEmail,
            redirectTo: redirectUrl,
          }),
        }
      );

      console.log('Password reset Edge Function response status:', response.status);

      const result = await response.json().catch(async (parseError) => {
        console.error('Failed to parse response:', parseError);
        const text = await response.text().catch(() => 'Unknown error');
        console.error('Response text:', text);
        return { success: false, error: `Failed to parse response: ${text}` };
      });
      
      console.log('Password reset Edge Function result:', result);

      if (!response.ok || !result.success) {
        // Provide more specific error messages
        let errorMessage = result.error || "Failed to send password reset email.";
        
        // Check for specific error types
        if (response.status === 404) {
          errorMessage = "Email service not found. Please contact support.";
        } else if (response.status === 500) {
          if (result.error?.includes("RESEND_API_KEY")) {
            errorMessage = "Email service configuration error. Please contact support.";
          } else if (result.error?.includes("Supabase configuration")) {
            errorMessage = "Email service configuration error. Please contact support.";
          } else {
            errorMessage = result.error || "Email service error. Please try again or contact support.";
          }
        } else if (response.status === 401) {
          errorMessage = "Authentication error. Please refresh the page and try again.";
        }
        
        setError(errorMessage);
        toast({
          title: "Email Error",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        setError("");
        setEmailSent(true);
        toast({
          title: "Reset email sent",
          description: "If an account exists with this email, a password reset link has been sent. Please check your inbox.",
        });
      }
      
    } catch (err: any) {
      // Handle errors - but note that Supabase resetPasswordForEmail typically succeeds
      // even for non-existent emails to prevent email enumeration
      setError(err.message || "Failed to send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="pink-yellow-shadow flex items-center justify-center p-4 pt-32 pb-16 min-h-screen">
      <div className="container mx-auto px-4 max-w-md">
         <div className="border-0 shadow-none bg-gradient-pink-to-yellow rounded-sm p-[2px] hover:glow-primary">
        <Card className="bg-black rounded-sm block border-0 shadow-none">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-white">Check Your Email</CardTitle>
              <CardDescription>
                We've sent password reset instructions to your email address
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="bg-muted/10 rounded-lg border-0 shadow-none text-white [&>svg]:text-white">
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p>We sent a password reset link to:</p>
                    <p className="font-medium">{email}</p>
                    <p className="text-sm text-muted-foreground">
                      Click the link in the email to reset your password. The link will expire in 1 hour.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="space-y-4 text-center">
                <Button 
                  onClick={() => setEmailSent(false)}
                  variant="outline"
                  className="w-full download-btn-primary font-inter text-sm font-semibold uppercase border-0"
                >
                  Send Another Email
                </Button>
                
                <Link to="/auth" className="text-sm text-white hover:text-primary inline-flex items-center gap-2">
                  <Button variant="ghost" className="w-full hover:text-primary hover:bg-transparent">
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back to Login
                  </Button>
                </Link>

                

              </div>

              <div className="text-center text-sm text-muted-foreground">
                <p className="text-white">Didn't receive the email?</p>
                <ul className="mt-2 space-y-1 text-left">
                  <li>• Check your <strong>spam/junk folder</strong> - our emails sometimes end up there</li>
                  <li>• If found in spam, mark it as <strong>"Not Spam"</strong> to help future emails</li>
                  <li>• Make sure the email address is correct</li>
                  <li>• Wait a few minutes and try again</li>
                  <li>• Add <strong>info@peacefulinvestment.com</strong> to your contacts</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    );
  }

  return (

    
    <div className="pink-yellow-shadow flex items-center justify-center p-4 pt-32 pb-16 min-h-screen">
      <div className="container mx-auto px-4 max-w-md">
         <div className="border-0 shadow-none bg-gradient-pink-to-yellow rounded-sm p-[2px] hover:glow-primary">
        <Card className="bg-black rounded-sm block border-0 shadow-none">
          <CardHeader className="text-center">
            <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-inter font-semibold text-white">Forgot Password?</CardTitle>
            <CardDescription className="text-white">
              Enter your email address and we'll send you a link to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-muted-foreground">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(""); // Clear error when user starts typing
                  }}
                  required
                  placeholder="Enter your email address"
                  autoComplete="email"
                  className="rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent resize-none"
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white text-black"></div>
                    Sending Reset Email...
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-black font-inter text-sm font-semibold uppercase">
                    <Mail className="h-4 w-4" />
                    Send Reset Email
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <Link 
                to="/auth" 
                className="text-sm text-white hover:text-primary inline-flex items-center gap-2"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to Login
              </Link>
            </div>

            <div className="mt-6 p-4 bg-muted/10 rounded-lg">
              <h4 className="font-medium text-sm mb-1 text-white">Security Note</h4>
              <p className="text-xs text-muted-foreground">
                For your security, password reset links expire after 1 hour. 
                If you don't receive an email, check your spam folder or contact support.
              </p>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;