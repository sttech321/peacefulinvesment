import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Lock, Shield, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";

const ChangePassword = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  const passwordStrength = validatePassword(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError("You must be logged in to change your password");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (!passwordStrength.isStrong) {
      setError("Please ensure your new password meets all security requirements");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // First, verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });

      if (signInError) {
        setError("Current password is incorrect");
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Success",
        description: "Your password has been updated successfully",
      });

      // Clear form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
      // Redirect to profile or dashboard
      navigate("/profile");
      
    } catch (err: any) {
      setError(err.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Please log in to change your password.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/auth">
              <Button className="w-full">Go to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pink-yellow-shadow pt-36 pb-12">
      <div className="container mx-auto px-4 max-w-md">
        <div className="bg-gradient-pink-to-yellow hover:glow-primary w-full rounded-sm border-0 p-[2px] shadow-none">
          <Card className="bg-black rounded-sm">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl text-primary">Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure
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

                {/* Current Password */}
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-sm font-medium leading-none text-muted-foreground">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}
                      placeholder="Enter your current password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-sm font-medium leading-none text-muted-foreground">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}
                      placeholder="Enter your new password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Password Strength Indicators */}
                  {newPassword && (
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

                {/* Confirm New Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium leading-none text-muted-foreground">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}
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
                  
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-sm text-red-600">Passwords do not match</p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || !passwordStrength.isStrong || newPassword !== confirmPassword}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Updating Password...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Update Password
                    </div>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link 
                  to="/profile" 
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Back to Profile
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>  
      </div>
    </div>
  );
};

export default ChangePassword;