import { useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useSearchParams } from 'react-router-dom';
import { useToast } from './use-toast';

export function useReferralProcessor() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const processPendingReferral = useCallback(async () => {
    const pendingReferralCode = localStorage.getItem('pendingReferralCode');
    if (!pendingReferralCode || !user) return;

    try {
      console.log('Processing pending referral code:', pendingReferralCode);
      
      // Find the referral by code
      const { data: referral, error: referralError } = await supabase
        .from('referrals')
        .select('id, user_id')
        .eq('referral_code', pendingReferralCode)
        .single();

      if (referral && !referralError) {
        // Prevent self-referral
        if (referral.user_id === user.id) {
          console.log('Cannot refer yourself');
          localStorage.removeItem('pendingReferralCode');
          return;
        }

        // Check if referral signup already exists
        const { data: existingSignup, error: checkError } = await supabase
          .from('referral_signups')
          .select('id')
          .eq('referral_id', referral.id)
          .eq('referred_user_id', user.id)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('Error checking existing referral signup:', checkError);
          toast({
            title: "Error",
            description: "Failed to check referral status. Please try again.",
            variant: "destructive",
          });
          return;
        }

        if (!existingSignup) {
          // Create referral signup record
          const { error: signupError } = await supabase
            .from('referral_signups')
            .insert({
              referral_id: referral.id,
              referred_user_id: user.id,
              signup_date: new Date().toISOString(),
            });

          if (signupError) {
            console.error('Error creating referral signup:', signupError);
            toast({
              title: "Error",
              description: signupError.message || "Failed to record referral signup.",
              variant: "destructive",
            });
          } else {
            console.log('Referral signup recorded successfully');
            toast({
              title: "Referral Applied!",
              description: "You've been successfully referred to our platform.",
            });
            // Clear the pending referral code
            localStorage.removeItem('pendingReferralCode');
          }
        } else {
          console.log('Referral signup already exists');
          localStorage.removeItem('pendingReferralCode');
        }
      } else {
        console.error('Referral not found or error:', referralError);
        toast({
          title: "Invalid Referral Code",
          description: "The referral code you used is not valid.",
          variant: "destructive",
        });
        localStorage.removeItem('pendingReferralCode');
      }
    } catch (error: any) {
      console.error('Error processing pending referral:', error);
      toast({
        title: "Error",
        description: error.message || "An error occurred processing your referral.",
        variant: "destructive",
      });
      localStorage.removeItem('pendingReferralCode');
    }
  }, [user, toast]);

  const processDirectReferral = useCallback(async () => {
    const refCode = searchParams.get('ref');
    if (!refCode || !user) return;

    try {
      console.log('Processing direct referral code from URL:', refCode);
      
      // Find the referral by code
      const { data: referral, error: referralError } = await supabase
        .from('referrals')
        .select('id, user_id')
        .eq('referral_code', refCode)
        .single();

      if (referral && !referralError) {
        // Prevent self-referral
        if (referral.user_id === user.id) {
          console.log('Cannot refer yourself');
          const url = new URL(window.location.href);
          url.searchParams.delete('ref');
          window.history.replaceState({}, '', url.toString());
          return;
        }

        // Check if referral signup already exists
        const { data: existingSignup, error: checkError } = await supabase
          .from('referral_signups')
          .select('id')
          .eq('referral_id', referral.id)
          .eq('referred_user_id', user.id)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('Error checking existing referral signup:', checkError);
          toast({
            title: "Error",
            description: "Failed to check referral status. Please try again.",
            variant: "destructive",
          });
          return;
        }

        if (!existingSignup) {
          // Create referral signup record
          const { error: signupError } = await supabase
            .from('referral_signups')
            .insert({
              referral_id: referral.id,
              referred_user_id: user.id,
              signup_date: new Date().toISOString(),
            });

          if (signupError) {
            console.error('Error creating referral signup:', signupError);
            toast({
              title: "Error",
              description: signupError.message || "Failed to record referral signup.",
              variant: "destructive",
            });
          } else {
            console.log('Direct referral signup recorded successfully');
            toast({
              title: "Referral Applied!",
              description: "You've been successfully referred to our platform.",
            });
            // Clear the URL parameter
            const url = new URL(window.location.href);
            url.searchParams.delete('ref');
            window.history.replaceState({}, '', url.toString());
          }
        } else {
          console.log('Direct referral signup already exists');
          // Clear the URL parameter
          const url = new URL(window.location.href);
          url.searchParams.delete('ref');
          window.history.replaceState({}, '', url.toString());
        }
      } else {
        console.error('Direct referral not found or error:', referralError);
        toast({
          title: "Invalid Referral Code",
          description: "The referral code in the URL is not valid.",
          variant: "destructive",
        });
        // Clear the URL parameter
        const url = new URL(window.location.href);
        url.searchParams.delete('ref');
        window.history.replaceState({}, '', url.toString());
      }
    } catch (error: any) {
      console.error('Error processing direct referral:', error);
      toast({
        title: "Error",
        description: error.message || "An error occurred processing your referral.",
        variant: "destructive",
      });
      // Clear the URL parameter
      const url = new URL(window.location.href);
      url.searchParams.delete('ref');
      window.history.replaceState({}, '', url.toString());
    }
  }, [user, searchParams, toast]);

  useEffect(() => {
    if (user) {
      // Add a small delay to ensure user is fully authenticated
      const timer = setTimeout(() => {
        processPendingReferral();
        processDirectReferral();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [user, processPendingReferral, processDirectReferral]);

  return { processPendingReferral, processDirectReferral };
}
