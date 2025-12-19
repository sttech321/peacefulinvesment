import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any; data?: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any; user?: User | null }>;
  signOut: () => Promise<{ error: any | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;

    // 1) Initial load: check existing session from storage
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);

      console.log('[Auth] init session:', data.session);
    };

    init();

    // 2) Listen to auth changes (sign in / sign out / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        console.log('[Auth] onAuthStateChange:', event, session);

        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    // 1) Pre-check in profiles table by email BEFORE attempting sign-in
    try {
      const preCheckResult = await (supabase as any)
        .from('profiles')
        .select('status, is_active')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      const preProfile = preCheckResult.data as any;
      const preProfileError = preCheckResult.error;

      if (!preProfileError && preProfile) {
        const status = (preProfile as any).status as string | null;
        const isActive = (preProfile as any).is_active as boolean | null | undefined;

        if (status === 'blocked' || isActive === false) {
          toast({
            title: 'Account Disabled',
            description:
              'Your account is currently blocked or inactive. Please contact support for assistance.',
            variant: 'destructive',
          });

          return { error: new Error('ACCOUNT_BLOCKED'), data: null };
        }
      }
    } catch (preCheckError) {
      console.warn('[Auth] Pre-check for blocked/inactive account failed, proceeding to sign-in:', preCheckError);
      // We deliberately fall through to sign-in if the pre-check fails (e.g. RLS)
    }

    // 2) Perform actual sign-in
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: 'Sign In Error',
        description: error.message,
        variant: 'destructive',
      });
      return { error, data };
    }

    // 3) Post-check by user_id as a safety net (in case email->profile mapping changes)
    try {
      const userId = data.user?.id;

      if (userId) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('status, is_active')
          .eq('user_id', userId)
          .maybeSingle();

        if (!profileError && profile) {
          const status = (profile as any).status as string | null;
          const isActive = (profile as any).is_active as boolean | null | undefined;

          if (status === 'blocked' || isActive === false) {
            await supabase.auth.signOut();

            toast({
              title: 'Account Disabled',
              description:
                'Your account is currently blocked or inactive. Please contact support for assistance.',
              variant: 'destructive',
            });

            return { error: new Error('ACCOUNT_BLOCKED'), data: null };
          }
        }
      }

      toast({
        title: 'Welcome back!',
        description: 'You have successfully signed in.',
      });

      return { error: null, data };
    } catch (checkError: any) {
      console.error('[Auth] Error checking profile status during sign-in:', checkError);

      toast({
        title: 'Signed in',
        description: 'You have successfully signed in.',
      });

      return { error: null, data };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      toast({
        title: 'Sign Up Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Check your email',
        description: 'We sent you a confirmation link to complete your registration.',
      });
    }

    return { error, user: data.user };
  };

  const signOut = async () => {
    console.log('[Auth] signOut called');

    const { error } = await supabase.auth.signOut();

    // If there's an error *other than* "Auth session missing!", show it
    if (error && error.message !== 'Auth session missing!') {
      console.error('[Auth] signOut error:', error);
      toast({
        title: 'Sign Out Error',
        description: error.message,
        variant: 'destructive',
      });

      return { error };
    }

    // Force-clear local state
    setUser(null);
    setSession(null);

    console.log('[Auth] signOut -> session cleared');

    toast({
      title: 'Signed out',
      description: 'You have been successfully signed out.',
    });

    // If you have a router, redirect here:
    // router.push('/login');

    return { error: null };
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
