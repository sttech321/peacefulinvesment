import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useSearchParams } from 'react-router-dom';
import { useToast } from './use-toast';

export function useReferralProcessor() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      processPendingReferral();
      processDirectReferral();
    }
  }, [user, searchParams]);

  const processPendingReferral = async () => {
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
        // Check if referral signup already exists
        const { data: existingSignup, error: checkError } = await supabase
          .from('referral_signups')
          .select('id')
          .eq('referral_id', referral.id)
          .eq('referred_user_id', user.id)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('Error checking existing referral signup:', checkError);
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
        localStorage.removeItem('pendingReferralCode');
      }
    } catch (error) {
      console.error('Error processing pending referral:', error);
      localStorage.removeItem('pendingReferralCode');
    }
  };

  const processDirectReferral = async () => {
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
        // Check if referral signup already exists
        const { data: existingSignup, error: checkError } = await supabase
          .from('referral_signups')
          .select('id')
          .eq('referral_id', referral.id)
          .eq('referred_user_id', user.id)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('Error checking existing referral signup:', checkError);
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
        // Clear the URL parameter
        const url = new URL(window.location.href);
        url.searchParams.delete('ref');
        window.history.replaceState({}, '', url.toString());
      }
    } catch (error) {
      console.error('Error processing direct referral:', error);
      // Clear the URL parameter
      const url = new URL(window.location.href);
      url.searchParams.delete('ref');
      window.history.replaceState({}, '', url.toString());
    }
  };

  return { processPendingReferral, processDirectReferral };
}
