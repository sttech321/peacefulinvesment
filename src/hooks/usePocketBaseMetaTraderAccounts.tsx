import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { 
  pocketbase, 
  authenticateAsAdmin, 
  getUserByEmail, 
  getAccountsByUserId,
  type PocketBaseAccount,
  type PocketBaseUser
} from '@/integrations/pocketbase/client';

function usePocketBaseMetaTraderAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<PocketBaseAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  const fetchAccounts = async () => {
    if (!user?.email) {
      setError('No user email available');
      setLoading(false);
      return;
    }

    // Prevent rapid successive requests
    const now = Date.now();
    if (now - lastFetchTime < 3000) { // 3 second debounce
      console.log('Request debounced, skipping...');
      return;
    }
    setLastFetchTime(now);

    try {
      setLoading(true);
      setError(null);

      // Simple authentication without clearing auth store
      await authenticateAsAdmin();

      // Get user by email
      const pocketbaseUser = await getUserByEmail(user.email);
      
      if (!pocketbaseUser) {
        setError('no_account_linked');
        setLoading(false);
        return;
      }

      // Get accounts for the user
      const userAccounts = await getAccountsByUserId(pocketbaseUser.id);
      setAccounts(userAccounts as unknown as PocketBaseAccount[]);
      
      // If user exists but has no accounts, show a different message
      if (userAccounts.length === 0) {
        setError('no_accounts_found');
      }
    } catch (err) {
      console.error('Error fetching PocketBase accounts:', err);
      
      // Handle specific PocketBase errors
      if (err instanceof Error) {
        if (err.message.includes('auto-cancelled') || err.message.includes('cancelled')) {
          setError('Request was cancelled. Please try again.');
        } else if (err.message.includes('timeout')) {
          setError('Request timed out. Please check your connection and try again.');
        } else if (err.message.includes('Failed to authenticate')) {
          setError('Authentication failed. Please try again later.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to fetch accounts. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const doFetch = async () => {
      if (!isMounted) return;
      await fetchAccounts();
    };
    
    doFetch();
    
    return () => {
      isMounted = false;
    };
  }, [user?.email]);

  const refetch = async () => {
    // Reset error state before refetching
    setError(null);
    await fetchAccounts();
  };

  return {
    accounts,
    loading,
    error,
    refetch
  };
}

export { usePocketBaseMetaTraderAccounts };
