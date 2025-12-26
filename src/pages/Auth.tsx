import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Eye, EyeOff, User, Lock, Mail, CheckCircle } from 'lucide-react';
import Footer from '@/components/Footer';
import { useToast } from '@/hooks/use-toast';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(
    searchParams.get('mode') === 'signup'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [referralCode, setReferralCode] = useState<string | null>(null);

  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [emailConfirmationSent, setEmailConfirmationSent] = useState(false);

  const handleResendConfirmation = async () => {
    if (!email) {
      setErrors({ general: 'Please enter your email address first.' });
      toast({
        title: "Email Required",
        description: "Please enter your email address first.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setErrors({});
    try {
      // Use our custom Edge Function to send verification email via Resend
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('VITE_SUPABASE_URL is not configured');
      }

      const redirectUrl = `${window.location.origin}/`;
      
      console.log('Calling Resend Edge Function:', { 
        email: email.trim().toLowerCase(), 
        supabaseUrl,
        endpoint: `${supabaseUrl}/functions/v1/send-email-verification`
      });
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/send-email-verification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            fullName: fullName || undefined,
            redirectTo: redirectUrl,
          }),
        }
      );

      console.log('Resend Edge Function response status:', response.status);

      const result = await response.json().catch(async (parseError) => {
        console.error('Failed to parse response:', parseError);
        const text = await response.text().catch(() => 'Unknown error');
        console.error('Response text:', text);
        return { success: false, error: `Failed to parse response: ${text}` };
      });
      
      console.log('Resend Edge Function result:', result);

      if (!response.ok || !result.success) {
        // Provide more specific error messages
        let errorMessage = result.error || "Failed to send confirmation email.";
        
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
        
        setErrors({ general: errorMessage });
        toast({
          title: "Email Error",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        setErrors({});
        setEmailConfirmationSent(true);
        toast({
          title: "Confirmation Email Sent",
          description: "Please check your inbox (and spam folder) for the verification email.",
        });
      }
    } catch (error) {
      console.error('Error in handleResendConfirmation:', error);
      let errorMessage = 'Failed to send confirmation email. ';
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage += 'Network error. Please check your connection and try again.';
      } else if (error instanceof Error) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Please try again or contact support.';
      }
      
      setErrors({ general: errorMessage });
      toast({
        title: "Email Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 🔹 NEW: keep isSignUp in sync with ?mode=... and reset form on change
  useEffect(() => {
    const mode = searchParams.get('mode');
    setIsSignUp(mode === 'signup');

    // reset form when mode changes
    setErrors({});
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setEmailConfirmationSent(false);
  }, [searchParams]);

  // Capture referral code from URL and handle auth errors/verification
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setReferralCode(refCode);
      console.log('Referral code detected in Auth:', refCode);
    }

    // Handle Supabase auth verification and errors from URL hash
    const handleAuthCallback = async () => {
      const hash = window.location.hash;
      
      // Check for verification tokens first
      if (hash.includes('access_token=') || hash.includes('type=')) {
        const urlParams = new URLSearchParams(hash.substring(1));
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');
        const type = urlParams.get('type');
        const error = urlParams.get('error');
        
        // If we have tokens and it's a verification, try to set the session
        if (accessToken && refreshToken && (type === 'signup' || type === 'email') && !error) {
          try {
            console.log('Processing email verification tokens...');
            const { data, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (!sessionError && data.session) {
              console.log('Email verification successful!');
              // Clean up stored email
              localStorage.removeItem('pendingVerificationEmail');
              toast({
                title: "Email Verified!",
                description: "Your email has been successfully verified. You can now sign in.",
              });
              // Clean up URL
              window.history.replaceState(
                {},
                document.title,
                window.location.pathname + window.location.search
              );
              // Navigate to home after a brief delay
              setTimeout(() => {
                navigate('/');
              }, 1500);
            } else if (sessionError) {
              console.error('Session error during verification:', sessionError);
              setErrors({
                general: sessionError.message || 'Failed to verify email. Please try again.',
              });
            }
          } catch (err) {
            console.error('Error processing verification tokens:', err);
            setErrors({
              general: 'Failed to process verification link. Please try again.',
            });
          }
        }
      }
      
      // Handle errors in URL hash
      if (hash.includes('error=')) {
        const urlParams = new URLSearchParams(hash.substring(1));
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        if (
          error === 'access_denied' &&
          (errorDescription?.includes('expired') || errorDescription?.includes('invalid'))
        ) {
          // Automatically resend verification email if link is expired
          console.log('Expired link detected, attempting to auto-resend...');
          
          // Try to extract email from URL or use stored email
          const storedEmail = localStorage.getItem('pendingVerificationEmail');
          
          if (storedEmail) {
            setEmail(storedEmail);
            setEmailConfirmationSent(false);
            // Show message that we'll resend
            setErrors({
              general:
                'Your verification link has expired. A new verification email is being sent automatically. Please check your inbox.',
            });
            // Automatically trigger resend after setting email
            setTimeout(async () => {
              try {
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                if (supabaseUrl) {
                  const redirectUrl = `${window.location.origin}/`;
                  const response = await fetch(
                    `${supabaseUrl}/functions/v1/send-email-verification`,
                    {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                      },
                      body: JSON.stringify({
                        email: storedEmail,
                        redirectTo: redirectUrl,
                      }),
                    }
                  );
                  
                  const result = await response.json().catch(() => ({ success: false }));
                  if (response.ok && result.success) {
                    setEmailConfirmationSent(true);
                    setErrors({});
                    toast({
                      title: "New Verification Email Sent",
                      description: "A new verification email has been sent to your inbox.",
                    });
                  }
                }
              } catch (err) {
                console.error('Auto-resend failed:', err);
              }
            }, 1000);
          } else {
            setErrors({
              general:
                'Email confirmation link has expired or is invalid. Please enter your email below and click "Resend Confirmation" to get a new link.',
            });
          }
          
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname + window.location.search
          );
        } else if (error) {
          setErrors({
            general: `Authentication error: ${errorDescription || error}`,
          });
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname + window.location.search
          );
        }
      }
    };

    handleAuthCallback();
  }, [searchParams, navigate, toast]);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (isSignUp) {
      if (!fullName) {
        newErrors.fullName = 'Full name is required';
      }
      if (!confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error, user: newUser } = await signUp(
          email,
          password,
          fullName
        );

        if (!error) {
          if (referralCode) {
            localStorage.setItem('pendingReferralCode', referralCode);
            console.log(
              'Referral code stored for later processing:',
              referralCode
            );
          }

          // Store email for potential auto-resend if link expires
          localStorage.setItem('pendingVerificationEmail', email.trim().toLowerCase());

          // Send verification email via Resend (Supabase email is disabled)
          // The signUp function already tries to send email, but we'll also call resend here
          // to ensure it's sent even if the signUp call didn't trigger it
          try {
            await handleResendConfirmation();
          } catch (emailError) {
            console.error('Error sending verification email:', emailError);
            // Still show success - user can resend
          }

          // Show success message
          toast({
            title: "Account Created Successfully!",
            description: "Please check your email to verify your account before signing in.",
          });

          // Don't clear email so user can resend if needed
          setPassword('');
          setConfirmPassword('');
          setFullName('');
        }
      } else {
        const { error } = await signIn(email, password);
        if (!error) {
          navigate('/');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 🔹 UPDATED: toggle mode via URL, keep ref param if present
  const switchMode = () => {
    const currentMode = searchParams.get('mode');
    const nextIsSignUp = !isSignUp;

    const params = new URLSearchParams(searchParams);
    if (nextIsSignUp) {
      params.set('mode', 'signup');
    } else {
      params.delete('mode');
    }

    const query = params.toString();
    navigate(`/auth${query ? `?${query}` : ''}`);
  };

  return (
    <div>
      <div className='pink-yellow-shadow flex min-h-screen items-center justify-center p-4 pt-32 pb-16'>
        <div className='bg-gradient-pink-to-yellow hover:glow-primary w-full max-w-md rounded-sm border-0 p-[2px] shadow-none'>
          <Card className='block rounded-sm border-0 bg-black shadow-none'>
            <CardHeader className='text-center'>
              <div className='mb-4 flex justify-center'>
                <Shield className='h-12 w-12 text-primary' />
              </div>
              <CardTitle className='font-inter text-2xl font-semibold text-white'>
                {isSignUp ? 'Create Your Account' : 'Welcome Back'}
              </CardTitle>
              <CardDescription className='text-white'>
                {isSignUp
                  ? 'Start managing your MetaTrader bots today.'
                  : 'Login to manage your bots and investments.'}
              </CardDescription>
              {referralCode && isSignUp && (
                <div className='mt-2 rounded-lg border border-green-200 bg-green-50 p-3'>
                  <p className='text-sm text-muted-foreground'>
                    <strong>Referral Code Applied:</strong> {referralCode}
                  </p>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className='space-y-4'>
                {errors.general && (
                  <div className='rounded-lg border border-red-200 bg-red-50 p-3'>
                    <p className='text-sm text-red-800'>{errors.general}</p>
                  </div>
                )}
                {isSignUp && (
                  <div className='space-y-2'>
                    <Label htmlFor='fullName' className='text-muted-foreground'>
                      Full Name
                    </Label>
                    <Input
                      id='fullName'
                      type='text'
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder='Enter your full name'
                      className={`rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent resize-none ${errors.fullName ? 'border-red-500' : ''}`}
                    />
                    {errors.fullName && (
                      <p className='text-sm text-red-500'>{errors.fullName}</p>
                    )}
                  </div>
                )}

                <div className='space-y-2'>
                  <Label htmlFor='email' className='text-muted-foreground'>
                    Email
                  </Label>
                  <Input
                    id='email'
                    type='email'
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder='Enter your email'
                    className={`rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent resize-none ${errors.email ? 'border-red-500' : ''}`}
                  />
                  {errors.email && (
                    <p className='text-sm text-red-500'>{errors.email}</p>
                  )}
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='password' className='text-muted-foreground'>
                    Password
                  </Label>
                  <div className='relative'>
                    <Input
                      id='password'
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder='Enter your password'
                      className={`rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent resize-none ${errors.password ? 'border-red-500' : ''}`}
                    />
                    <button
                      type='button'
                      onClick={() => setShowPassword(!showPassword)}
                      className='absolute right-3 top-1/2 -translate-y-1/2 transform text-muted-foreground hover:text-foreground'
                    >
                      {showPassword ? (
                        <EyeOff className='h-4 w-4' />
                      ) : (
                          <Eye className='h-4 w-4' />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className='text-sm text-red-500'>{errors.password}</p>
                  )}
                </div>

                {isSignUp && (
                  <div className='space-y-2'>
                    <Label
                      htmlFor='confirmPassword'
                      className='text-muted-foreground'
                    >
                      Confirm Password
                    </Label>
                    <div className='relative'>
                      <Input
                        id='confirmPassword'
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder='Confirm your password'
                        className={`rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent resize-none ${errors.confirmPassword ? 'border-red-500' : ''}`}
                      />
                      <button
                        type='button'
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className='absolute right-3 top-1/2 -translate-y-1/2 transform text-muted-foreground hover:text-foreground'
                      >
                        {showConfirmPassword ? (
                          <EyeOff className='h-4 w-4' />
                        ) : (
                          <Eye className='h-4 w-4' />
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className='text-sm text-red-500'>
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>
                )}

                {isSignUp && (
                  <div className='flex items-center space-x-2'>
                    <input
                      type='checkbox'
                      id='terms'
                      required
                      className='border-0'
                    />
                    <Label htmlFor='terms' className='text-sm text-white'>
                      I agree to the{' '}
                      <a href='#' className='text-primary hover:underline'>
                        Terms & Privacy Policy
                      </a>
                    </Label>
                  </div>
                )}

                <div className='pt-2'>
                  <Button
                    type='submit'
                    className='download-btn-primary w-full font-inter text-sm font-semibold uppercase'
                    disabled={isLoading}
                  >
                    {isLoading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Login'}
                  </Button>
                </div>

                {/* Show confirmation email notice after signup or when expired */}
                {(emailConfirmationSent || (errors.general && errors.general.includes('expired'))) && (
                  <div className='rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3'>
                    <div className='flex items-start space-x-2'>
                      <Mail className='h-5 w-5 text-blue-600 mt-0.5' />
                      <div className='flex-1'>
                        <p className='text-sm font-medium text-blue-900'>
                          {emailConfirmationSent ? 'Confirmation Email Sent!' : 'Email Verification Required'}
                        </p>
                        <p className='text-sm text-blue-700 mt-1'>
                          {emailConfirmationSent 
                            ? 'We\'ve sent a verification email to your inbox. Please check your email (including spam folder) and click the verification link to activate your account.'
                            : errors.general.includes('expired')
                            ? 'Your verification link has expired. Please request a new confirmation email.'
                            : 'Please verify your email address to complete your registration.'}
                        </p>
                        <div className='mt-3'>
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            onClick={handleResendConfirmation}
                            disabled={isLoading || !email}
                            className='w-full bg-white hover:bg-blue-50'
                          >
                            {isLoading ? (
                              <>
                                <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2'></div>
                                Sending...
                              </>
                            ) : (
                              <>
                                <Mail className='h-4 w-4 mr-2' />
                                Resend Confirmation Email
                              </>
                            )}
                          </Button>
                        </div>
                        <div className='mt-2 text-xs text-blue-600 space-y-1'>
                          <p>• Check your spam/junk folder if you don't see the email</p>
                          <p>• If your link expires, we'll automatically send you a new one</p>
                          <p>• Add security@peacefulinvestment.com to your contacts to avoid spam</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!isSignUp && (
                  <div className='space-y-3'>
                    <div className='flex items-center justify-center gap-4 text-sm'>
                      <Link
                        to='/forgot-password'
                        className='flex items-center gap-1 text-primary hover:underline'
                      >
                        <Lock className='h-3 w-3' />
                        Forgot Password?
                      </Link>
                      <span className='text-muted-foreground'>|</span>
                      <Link
                        to='/forgot-username'
                        className='flex items-center gap-1 text-primary hover:underline'
                      >
                        <User className='h-3 w-3' />
                        Forgot Username?
                      </Link>
                    </div>
                  </div>
                )}

                <div className='text-center'>
                  <button
                    type='button'
                    onClick={switchMode}
                    className='text-sm text-white hover:text-muted-foreground'
                  >
                    {isSignUp
                      ? 'Already have an account? Login'
                      : "Don't have an account? Sign Up"}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Auth;
