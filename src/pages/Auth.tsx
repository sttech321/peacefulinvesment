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
            email: email.trim().toLowerCase(),
            fullName: fullName || undefined,
            redirectTo: redirectUrl,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMessage = result.error || "Failed to send confirmation email. Please try again.";
        setErrors({ general: errorMessage });
        toast({
          title: "Error",
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
      const errorMessage = 'Failed to send confirmation email. Please try again.';
      setErrors({ general: errorMessage });
      toast({
        title: "Error",
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

  // Capture referral code from URL and handle auth errors
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setReferralCode(refCode);
      console.log('Referral code detected in Auth:', refCode);
    }

    // Handle Supabase auth errors from URL hash
    const handleAuthError = () => {
      const hash = window.location.hash;
      if (hash.includes('error=')) {
        const urlParams = new URLSearchParams(hash.substring(1));
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        if (
          error === 'access_denied' &&
          errorDescription?.includes('expired')
        ) {
          setErrors({
            general:
              'Email confirmation link has expired. Please enter your email below and click "Resend Confirmation" to get a new link.',
          });
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

    handleAuthError();
  }, [searchParams]);

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

          // Show success message and confirmation email notice
          setEmailConfirmationSent(true);
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
                          <p>• The verification link expires in 24 hours</p>
                          <p>• Add info@peacefulinvestment.com to your contacts to avoid spam</p>
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
