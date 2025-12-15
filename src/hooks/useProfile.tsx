import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  state_code?: string | null;
  zip_code: string | null;
  employment_status: string | null;
  employer: string | null;
  employer_country?: string | null;
  annual_income: number | null;
  investment_experience: string | null;
  risk_tolerance: string | null;
  investment_goals: string[] | null;
  documents_uploaded: boolean;
  has_completed_profile: boolean;
  status: string | null;
  created_at: string;
  updated_at: string;
  overseas_company_required?: boolean;
  overseas_company_completed?: boolean;
  overseas_company_id?: string | null;
  is_usa_client?: boolean;
  [key: string]: any; // Allow additional fields from database
}

function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      console.log('[useProfile] Fetching profile for user ID:', user.id, 'Email:', user.email);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      console.log('[useProfile] Profile fetched:', data);
      setProfile(data);
    } catch (error) {
      console.error('[useProfile] Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: new Error('Not authenticated') };

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
      return { data };
    } catch (error) {
      return { error };
    }
  };

  return {
    profile,
    loading,
    updateProfile,
    refetchProfile: fetchProfile,
  };
}

export { useProfile };