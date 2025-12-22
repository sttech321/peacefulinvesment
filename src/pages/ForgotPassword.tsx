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
      // Note: Supabase intentionally obscures whether an email exists for security reasons
      // We'll attempt to check, but Supabase often returns "Invalid login credentials" for both
      // existing and non-existing emails. So we'll be conservative and proceed with reset.
      // The resetPasswordForEmail function will handle non-existent emails gracefully.
      
      // Try to check if email exists using sign-in attempt
      // This is optional - if it fails to determine, we proceed anyway
      const { error: signInError, data: signInData } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: 'dummy_password_check_123!@#$%^&*()_+',
      }).catch(() => ({ error: null, data: null }));

      // If somehow the dummy password worked (extremely unlikely), sign out immediately
      if (signInData?.user && !signInError) {
        await supabase.auth.signOut();
      }

      // Proceed with password reset
      // Supabase's resetPasswordForEmail is designed to not reveal if email exists (for security)
      // It will send email if exists, or silently succeed if doesn't exist (to prevent email enumeration)
      const redirectUrl = `${window.location.origin}/reset-password`;
      
      // Note: To prevent emails from going to spam, configure custom SMTP in Supabase Dashboard:
      // Authentication > Settings > SMTP Settings
      // Use your Resend SMTP credentials with proper SPF/DKIM/DMARC records
      // See SUPABASE_EMAIL_SETUP.md for detailed instructions
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: redirectUrl,
      });

      if (resetError) {
        // Only show specific errors - Supabase typically succeeds even for non-existent emails
        // to prevent email enumeration attacks
        throw resetError;
      }

      setEmailSent(true);
      toast({
        title: "Reset email sent",
        description: "Check your email (including spam folder) for password reset instructions",
      });
      
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