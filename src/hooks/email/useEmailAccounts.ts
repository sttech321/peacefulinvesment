import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { EmailAccount } from "@/pages/admin/email/types";

type ToastFn = (args: {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}) => void;

export function useEmailAccounts({ toast }: { toast: ToastFn }) {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);

  const fetchAccounts = useCallback(async () => {
    const { data, error } = await supabase
      .from("email_accounts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setAccounts(data || []);
  }, [toast]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const addAccount = useCallback(
    async (payload: Omit<EmailAccount, "id" | "last_sync_at">) => {
      const { error } = await supabase.from("email_accounts").insert(payload);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return false;
      }

      toast({ title: "Success", description: "Email account added" });
      await fetchAccounts();
      return true;
    },
    [fetchAccounts, toast]
  );

  const updateAccount = useCallback(
    async (accountId: string, payload: Partial<EmailAccount>) => {
      const { error } = await supabase.from("email_accounts").update(payload).eq("id", accountId);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return false;
      }

      toast({ title: "Updated", description: "Email account updated" });
      await fetchAccounts();
      return true;
    },
    [fetchAccounts, toast]
  );

  const deleteAccount = useCallback(
    async (accountId: string) => {
      const { error } = await supabase.from("email_accounts").delete().eq("id", accountId);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return false;
      }

      toast({ title: "Deleted", description: "Email account removed" });
      await fetchAccounts();
      return true;
    },
    [fetchAccounts, toast]
  );

  return {
    accounts,
    fetchAccounts,
    addAccount,
    updateAccount,
    deleteAccount,
  };
}

