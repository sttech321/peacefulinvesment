import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Request {
  id: string;
  user_id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  currency: string;
  payment_method: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  description?: string;
  admin_notes?: string;
  calculated_fee?: number;
  net_amount?: number;
  fee_breakdown?: any;
  created_at: string;
  updated_at: string;
}

function useRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRequests();
    } else {
      setRequests([]);
      setLoading(false);
    }
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data || []) as Request[]);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const createRequest = async (requestData: {
    type: 'deposit' | 'withdrawal';
    amount: number;
    currency: string;
    payment_method: string;
    description?: string;
  }) => {
    if (!user) return { error: new Error('Not authenticated') };

    try {
      const { data, error } = await supabase
        .from('requests')
        .insert({
          ...requestData,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Refresh requests list
      await fetchRequests();
      
      return { data };
    } catch (error) {
      return { error };
    }
  };

  return {
    requests,
    loading,
    createRequest,
    refetchRequests: fetchRequests,
  };
}

export { useRequests };