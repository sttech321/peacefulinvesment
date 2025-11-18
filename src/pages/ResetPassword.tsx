import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isValidToken, setIsValidToken] = useState(true);

  // Password strength validation
  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return {
      minLength,
      hasUpper,
      hasLower,
      hasNumber,
      hasSpecial,
      isStrong: minLength && hasUpper && hasLower && hasNumber && hasSpecial
    };
  };

  const passwordStrength = validatePassword(password);

  useEffect(() => {
    // Check if we have valid reset parameters
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const type = searchParams.get('type');

    if (!accessToken || !refreshToken || type !== 'recovery') {
      setIsValidToken(false);
      setError("Invalid or expired reset link. Please request a new password reset.");
    } else {
      // Set the session with the tokens from the URL
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidToken) {
      setError("Invalid reset link. Please request a new password reset.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!passwordStrength.isStrong) {
      setError("Please ensure your password meets all security requirements");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Success",
        description: "Your password has been reset successfully",
      });

      // Redirect to login page
      navigate("/auth");
      
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="container mx-auto px-4 max-w-md">
          <Card>
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-2xl">Invalid Reset Link</CardTitle>
              <CardDescription>
                This password reset link is invalid or has expired
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Password reset links expire after 1 hour for security reasons.
                  Please request a new password reset if you need to change your password.
                </AlertDescription>
              </Alert>
              
              <Button 
                onClick={() => navigate("/forgot-password")}
                className="w-full"
              >
                Request New Reset Link
              </Button>
              
              <Button 
                onClick={() => navigate("/auth")}
                variant="outline"
                className="w-full"
              >
                Back to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="container mx-auto px-4 max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Reset Password</CardTitle>
            <CardDescription>
              Create a new secure password for your account
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

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10"
                    placeholder="Enter your new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Password Strength Indicators */}
                {password && (
                  <div className="space-y-2 mt-3">
                    <p className="text-sm font-medium">Password Requirements:</p>
                    <div className="grid grid-cols-1 gap-1">
                      <div className={`flex items-center gap-2 text-xs ${passwordStrength.minLength ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {passwordStrength.minLength ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                        At least 8 characters
                      </div>
                      <div className={`flex items-center gap-2 text-xs ${passwordStrength.hasUpper ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {passwordStrength.hasUpper ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                        One uppercase letter
                      </div>
                      <div className={`flex items-center gap-2 text-xs ${passwordStrength.hasLower ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {passwordStrength.hasLower ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                        One lowercase letter
                      </div>
                      <div className={`flex items-center gap-2 text-xs ${passwordStrength.hasNumber ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {passwordStrength.hasNumber ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                        One number
                      </div>
                      <div className={`flex items-center gap-2 text-xs ${passwordStrength.hasSpecial ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {passwordStrength.hasSpecial ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                        One special character
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="pr-10"
                    placeholder="Confirm your new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-sm text-red-600">Passwords do not match</p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || !passwordStrength.isStrong || password !== confirmPassword}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Resetting Password...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Reset Password
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Security Tips</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Use a unique password you haven't used elsewhere</li>
                <li>• Consider using a password manager</li>
                <li>• Don't share your password with anyone</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;