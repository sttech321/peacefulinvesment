import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface Referral {
  id: string;
  user_id: string;
  referral_code: string;
  referral_link: string;
  is_active: boolean;
  status: 'pending' | 'deposited' | 'earning' | 'completed';
  total_referrals: number;
  total_earnings: number;
  year_to_date_earnings: number;
  initial_deposit?: number;
  deposit_date?: string;
  created_at: string;
  updated_at: string;
}

interface ReferralPayment {
  id: string;
  referral_id: string;
  amount: number;
  payment_date: string;
  notes?: string;
  created_at: string;
}

interface ReferralSignup {
  id: string;
  referral_id: string;
  referred_user_id: string;
  signup_date: string;
  deposit_amount?: number;
  deposit_date?: string;
  created_at: string;
}

export const useReferrals = () => {
  const { user } = useAuth();
  const [referral, setReferral] = useState<Referral | null>(null);
  const [payments, setPayments] = useState<ReferralPayment[]>([]);
  const [signups, setSignups] = useState<ReferralSignup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's referral data
  const fetchReferralData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Get user's referral
      const { data: referralData, error: referralError } = await supabase
        .from('referrals')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (referralError && referralError.code !== 'PGRST116') {
        throw referralError;
      }

      // Set referral data (null if no referral exists)
      if (referralData) {
        // Ensure status is one of the valid types
        const referralWithStatus: Referral = {
          ...referralData,
          status: (referralData.status as Referral['status']) || 'pending'
        };
        setReferral(referralWithStatus);
      } else {
        setReferral(null);
      }

      if (referralData) {
        // Get payments for this referral
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('referral_payments')
          .select('*')
          .eq('referral_id', referralData.id)
          .order('payment_date', { ascending: false });

        if (paymentsError) throw paymentsError;
        setPayments(paymentsData || []);

        // Get signups for this referral
        const { data: signupsData, error: signupsError } = await supabase
          .from('referral_signups')
          .select('*')
          .eq('referral_id', referralData.id)
          .order('signup_date', { ascending: false });

        if (signupsError) throw signupsError;
        setSignups(signupsData || []);
      } else {
        setPayments([]);
        setSignups([]);
      }
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error",
        description: "Failed to fetch referral data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate referral link
  const generateReferralLink = async () => {
    console.log('[REFERRAL] generateReferralLink called');
    
    if (!user) {
      console.error('[REFERRAL] No user found');
      toast({
        title: "Error",
        description: "You must be logged in to generate a referral link",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get the current base URL from the browser
      // Normalize to production URL if it's a production domain
      let baseUrl = window.location.origin;
      const hostname = window.location.hostname;
      
      console.log('[REFERRAL] Current location:', {
        origin: window.location.origin,
        hostname: hostname,
        href: window.location.href
      });
      
      // Normalize production URLs to www.peacefulinvestment.com
      if (hostname === 'www.peacefulinvestment.com' || 
          hostname === 'peacefulinvestment.com' ||
          (hostname.endsWith('.peacefulinvestment.com') && !hostname.includes('ccw8gc8c4w480c8g4so44k4k'))) {
        baseUrl = 'https://www.peacefulinvestment.com';
        console.log('[REFERRAL] Detected production domain, normalizing to:', baseUrl);
      } else {
        console.log('[REFERRAL] Using original base URL:', baseUrl);
      }
      
      console.log('[REFERRAL] Calling edge function with:', {
        user_id: user.id,
        base_url: baseUrl,
        hostname: hostname
      });
      
      const { data, error } = await supabase.functions.invoke('generate-referral', {
        body: { 
          user_id: user.id,
          base_url: baseUrl // Pass the base URL explicitly
        }
      });

      console.log('[REFERRAL] Edge function response:', { data, error });

      if (error) {
        console.error('[REFERRAL] Edge function error:', error);
        throw error;
      }

      if (data.referral) {
        console.log('[REFERRAL] Referral data received:', {
          id: data.referral.id,
          referral_code: data.referral.referral_code,
          referral_link: data.referral.referral_link,
          message: data.message
        });
        
        setReferral(data.referral);
        toast({
          title: "Success",
          description: data.message || (data.message === 'Referral link updated successfully' ? "Referral link updated to production URL!" : "Referral link generated successfully!"),
        });
        
        // Refresh the data to get payments and signups
        console.log('[REFERRAL] Refreshing referral data...');
        await fetchReferralData();
        console.log('[REFERRAL] Referral data refreshed');
      }

      return data;
    } catch (err: any) {
      console.error('[REFERRAL] Error in generateReferralLink:', err);
      setError(err.message);
      toast({
        title: "Error",
        description: err.message || "Failed to generate referral link",
        variant: "destructive",
      });
    }
  };

  // Copy referral link to clipboard
  const copyReferralLink = async () => {
    if (!referral) return;

    try {
      await navigator.clipboard.writeText(referral.referral_link);
      toast({
        title: "Copied!",
        description: "Referral link copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy link to clipboard",
        variant: "destructive",
      });
    }
  };

  // Send invitation email
  const sendInvitation = async (email: string, subject: string, message: string) => {
    if (!referral) {
      toast({
        title: "Error",
        description: "No referral link found. Please generate one first.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('send-referral-invitation', {
        body: {
          referral_code: referral.referral_code,
          referral_link: referral.referral_link,
          to_email: email,
          subject,
          message,
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Invitation sent successfully!",
      });

      return data;
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to send invitation",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchReferralData();
  }, [user]);

  // Auto-update referral link if on production but link has dev URL
  useEffect(() => {
    if (!user || !referral) {
      console.log('[REFERRAL] Auto-update check skipped:', { hasUser: !!user, hasReferral: !!referral });
      return;
    }

    const hostname = window.location.hostname;
    const isProduction = hostname === 'www.peacefulinvestment.com' || 
                        hostname === 'peacefulinvestment.com' ||
                        (hostname.endsWith('.peacefulinvestment.com') && !hostname.includes('ccw8gc8c4w480c8g4so44k4k'));
    
    console.log('[REFERRAL] Auto-update check:', {
      hostname,
      isProduction,
      currentReferralLink: referral.referral_link
    });
    
    if (isProduction && referral.referral_link) {
      const isDevLink = referral.referral_link.includes('ccw8gc8c4w480c8g4so44k4k.peacefulinvestment.com');
      
      console.log('[REFERRAL] Link analysis:', {
        isDevLink,
        needsUpdate: isDevLink
      });
      
      if (isDevLink) {
        // Automatically update the referral link
        console.log('[REFERRAL] Auto-updating referral link from dev to production URL');
        generateReferralLink().catch(err => {
          console.error('[REFERRAL] Failed to auto-update referral link:', err);
        });
      } else {
        console.log('[REFERRAL] Referral link is already correct, no update needed');
      }
    } else {
      console.log('[REFERRAL] Auto-update not needed:', {
        isProduction,
        hasReferralLink: !!referral.referral_link
      });
    }
  }, [user, referral?.id, referral?.referral_link]);

  return {
    referral,
    payments,
    signups,
    loading,
    error,
    generateReferralLink,
    copyReferralLink,
    sendInvitation,
    refetch: fetchReferralData,
  };
};