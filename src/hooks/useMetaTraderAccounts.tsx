import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface MetaTraderAccount {
  id: string;
  user_id: string;
  login: string;
  server: string;
  balance: number;
  equity: number;
  margin: number;
  free_margin: number;
  currency: string;
  status: 'active' | 'inactive' | 'pending';
  account_type: 'demo' | 'live';
  leverage: number;
  last_updated: string;
  created_at: string;
  updated_at: string;
}

function useMetaTraderAccounts() {
  const [accounts, setAccounts] = useState<MetaTraderAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchAccounts = async () => {
    if (!user) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('metatrader_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setAccounts((data || []) as MetaTraderAccount[]);
    } catch (err) {
      console.error('Error fetching MetaTrader accounts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch accounts');
    } finally {
      setLoading(false);
    }
  };

  const refetch = async () => {
    setLoading(true);
    await fetchAccounts();
  };

  const createAccount = async (accountData: Omit<MetaTraderAccount, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const { data, error } = await supabase
        .from('metatrader_accounts')
        .insert([
          {
            ...accountData,
            user_id: user.id,
          }
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Refresh the accounts list
      await fetchAccounts();
      return data;
    } catch (err) {
      console.error('Error creating MetaTrader account:', err);
      throw err;
    }
  };

  const updateAccount = async (id: string, updates: Partial<MetaTraderAccount>) => {
    try {
      const { data, error } = await supabase
        .from('metatrader_accounts')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user?.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Refresh the accounts list
      await fetchAccounts();
      return data;
    } catch (err) {
      console.error('Error updating MetaTrader account:', err);
      throw err;
    }
  };

  const deleteAccount = async (id: string) => {
    try {
      const { error } = await supabase
        .from('metatrader_accounts')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) {
        throw error;
      }

      // Refresh the accounts list
      await fetchAccounts();
    } catch (err) {
      console.error('Error deleting MetaTrader account:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [user]);

  // Set up real-time subscription for account updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('metatrader-accounts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'metatrader_accounts',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('MetaTrader account change received:', payload);
          fetchAccounts(); // Refresh accounts when changes occur
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    accounts,
    loading,
    error,
    refetch,
    createAccount,
    updateAccount,
    deleteAccount,
  };
}

export { useMetaTraderAccounts };