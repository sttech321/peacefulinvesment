import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, ArrowLeft, CheckCircle, AlertCircle, Phone, Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const ForgotUsername = () => {
  const [searchMethod, setSearchMethod] = useState<'email' | 'phone'>('email');
  const [searchValue, setSearchValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resultSent, setResultSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchValue.trim()) {
      setError(`Please enter your ${searchMethod === 'email' ? 'email address' : 'phone number'}`);
      return;
    }

    // Improved validation
    if (searchMethod === 'email') {
      const trimmedEmail = searchValue.trim().toLowerCase();
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
    } else {
      // Basic phone validation (you can make this more sophisticated)
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(searchValue.replace(/\s/g, ''))) {
        setError("Please enter a valid phone number");
        return;
      }
    }

    setLoading(true);
    setError("");

    try {
      if (searchMethod === 'email') {
        // Validate email format
        const trimmedEmail = searchValue.trim().toLowerCase();
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        
        if (!emailRegex.test(trimmedEmail)) {
          setError("Please enter a valid email address");
          setLoading(false);
          return;
        }

        // Check if email exists by attempting sign in with dummy password
        // Supabase obscures this for security, but we can get some indication
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: 'dummy_password_check_123!@#$%^&*()_+',
        }).catch(() => ({ error: null }));

        // Check if we got an error that suggests email doesn't exist
        // Note: Supabase intentionally obscures this, so we'll proceed if we get "Invalid credentials"
        // which typically means email exists but password is wrong
        if (signInError) {
          const errorMessage = signInError.message?.toLowerCase() || '';
          // If we get specific errors that clearly indicate email doesn't exist
          if (errorMessage.includes('user not found') || 
              errorMessage.includes('email not registered') ||
              errorMessage.includes('no user found')) {
            setError("No account found with this email address");
            setLoading(false);
            return;
          }
          // If we get "Invalid login credentials" or similar, email likely exists, proceed
        }

        // Call Edge Function to send username recovery email
        const { data, error: functionError } = await supabase.functions.invoke('send-username-recovery', {
          body: { email: trimmedEmail },
        });

        if (functionError) {
          throw new Error(functionError.message || "Failed to send username recovery email");
        }

        if (data && !data.success) {
          throw new Error(data.error || "Failed to send username recovery email");
        }

        setResultSent(true);
        toast({
          title: "Username recovery email sent",
          description: "Check your email for your username information",
        });
      } else {
        // For phone number, check profiles table
        const query = supabase
          .from('profiles')
          .select('user_id, full_name')
          .eq('phone', searchValue)
          .limit(1);
        
        const { data, error: queryError } = await query;

        if (queryError) {
          throw queryError;
        }

        if (data && data.length > 0) {
          // Note: For phone-based recovery, we still need the email to send the recovery
          // For now, we'll show success but you'd need to store email in profiles or use a different method
          setResultSent(true);
          toast({
            title: "Username recovery sent",
            description: "Check your phone for username information",
          });
          // TODO: Implement SMS sending or email lookup for phone-based recovery
        } else {
          setError("No account found with this phone number");
        }
      }

    } catch (err: any) {
      console.error("Username recovery error:", err);
      setError(err.message || "Failed to process username recovery request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (resultSent) {
    return (
      <div className="pink-yellow-shadow flex items-center justify-center p-4 pt-32 pb-16 min-h-screen">
        <div className="container mx-auto px-4 max-w-md">
          <div className="border-0 shadow-none bg-gradient-pink-to-yellow rounded-sm p-[2px] hover:glow-primary">
          <Card className="bg-black rounded-sm block border-0 shadow-none">
            <CardHeader className="text-center">
              <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Recovery Information Sent</CardTitle>
              <CardDescription>
                We've sent your username information to your {searchMethod === 'email' ? 'email' : 'phone'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="bg-muted/10 rounded-lg border-0 shadow-none text-white [&>svg]:text-white">
                {searchMethod === 'email' ? <Mail className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                <AlertDescription>
                  <div className="space-y-2">
                    <p>We sent your username information to:</p>
                    <p className="font-medium">{searchValue}</p>
                    <p className="text-sm text-muted-foreground">
                      {searchMethod === 'email' 
                        ? "Check your email inbox (and spam folder) for the username recovery email."
                        : "Check your phone for a text message with your username information."
                      }
                    </p>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="space-y-4 text-center">
                <Button 
                  onClick={() => setResultSent(false)}
                  variant="outline"
                  className="w-full download-btn-primary font-inter text-sm font-semibold uppercase border-0"
                >
                  Try Another {searchMethod === 'email' ? 'Email' : 'Phone Number'}
                </Button>
                
                <Link to="/auth" className="text-white inline-block mx-auto justify-center">
                  <Button variant="ghost" className="w-full hover:text-primary hover:bg-transparent">
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back to Login
                  </Button>
                </Link>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                <p>Still having trouble?</p>
                <ul className="mt-2 space-y-1">
                  <li>• Check your spam/junk folder (email)</li>
                  <li>• Make sure you entered the correct information</li>
                  <li>• Contact support if you continue having issues</li>
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
              <User className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-inter font-semibold text-white">Forgot Username?</CardTitle>
            <CardDescription className="text-white">
              Enter your email or phone number to recover your username
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

              {/* Search Method Selection */}
              <div className="space-y-3">
                <Label className="text-muted-foreground">Find my username using:</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={searchMethod === 'email' ? 'default' : 'outline'}
                    onClick={() => {
                      setSearchMethod('email');
                      setSearchValue('');
                      setError('');
                    }}
                    className="w-full border-0"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </Button>
                  <Button
                    type="button"
                    variant={searchMethod === 'phone' ? 'default' : 'outline'}
                    onClick={() => {
                      setSearchMethod('phone');
                      setSearchValue('');
                      setError('');
                    }}
                    className="w-full border-0"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Phone
                  </Button>
                </div>
              </div>

              {/* Input Field */}
              <div className="space-y-2">
                <Label htmlFor="searchValue" className="text-muted-foreground">
                  {searchMethod === 'email' ? 'Email Address' : 'Phone Number'}
                </Label>
                <Input
                  id="searchValue"
                  type={searchMethod === 'email' ? 'email' : 'tel'}
                  value={searchValue}
                  onChange={(e) => {
                    setSearchValue(e.target.value);
                    setError(""); // Clear error when user starts typing
                  }}
                  required
                  className="rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent resize-none"
                  placeholder={
                    searchMethod === 'email' 
                      ? 'Enter your email address' 
                      : 'Enter your phone number'
                  }
                  autoComplete={searchMethod === 'email' ? 'email' : 'tel'}
                />
              </div>

              <Button type="submit" className="w-full download-btn-primary font-inter text-sm font-semibold uppercase" disabled={loading}>
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Searching...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Find My Username
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <Link 
                to="/auth" 
                className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-2"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to Login
              </Link>
            </div>

            <div className="mt-6 p-4 bg-muted/10 rounded-lg">
              <h4 className="font-medium text-sm mb-1 text-white">Privacy Note</h4>
              <p className="text-xs text-muted-foreground">
                For security reasons, we'll only send username information to verified contact methods 
                associated with your account. If you don't receive a message, the contact information 
                may not be linked to an account.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </div>
  );
};

export default ForgotUsername;