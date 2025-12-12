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
    
    console.log('[usePocketBaseMetaTraderAccounts] Fetching accounts for user:', user.email);

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
      console.error('[usePocketBaseMetaTraderAccounts] Error fetching accounts:', err);
      
      // Handle specific PocketBase errors
      if (err instanceof Error) {
        const errorMessage = err.message || String(err);
        console.error('[usePocketBaseMetaTraderAccounts] Error details:', {
          message: errorMessage,
          name: err.name,
          stack: err.stack
        });
        
        if (errorMessage.includes('auto-cancelled') || errorMessage.includes('cancelled')) {
          setError('Request was cancelled. Please try again.');
        } else if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
          setError('Request timed out. Please check your connection and try again.');
        } else if (errorMessage.includes('Failed to authenticate') || errorMessage.includes('authentication')) {
          setError('Authentication failed. Please try again later.');
        } else if (errorMessage.includes('Failed to fetch')) {
          setError('Failed to connect to server. Please check your internet connection.');
        } else {
          setError(`Failed to load accounts: ${errorMessage}`);
        }
      } else {
        const errorStr = String(err);
        console.error('[usePocketBaseMetaTraderAccounts] Unknown error type:', err);
        setError(`Failed to fetch accounts: ${errorStr}`);
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
