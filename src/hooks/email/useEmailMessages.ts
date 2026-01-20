import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EmailAccount, EmailMessage, EmailReply } from "@/pages/admin/email/types";

type ToastFn = (args: {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}) => void;

type SyncResponse = {
  data?: Array<{
    uid: string | number;
    subject: string | null;
    from: string;
    text: string | null;
    html: string | null;
    date: string;
    is_read: boolean;
    attachments?: EmailMessage["attachments"];
    replies?: EmailMessage["replies"];
  }>;
  pagination?: {
    hasMore?: boolean;
  };
};

export function useEmailMessages({
  backendUrl,
  pageLimit,
  toast,
  accountById,
}: {
  backendUrl: string;
  pageLimit: number;
  toast: ToastFn;
  accountById: Map<string, EmailAccount>;
}) {
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [hasMoreByAccount, setHasMoreByAccount] = useState<Record<string, boolean>>({});
  const [pageByAccount, setPageByAccount] = useState<Record<string, number>>({});

  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const accountByIdRef = useRef(accountById);

  useEffect(() => {
    accountByIdRef.current = accountById;
  }, [accountById]);

  const syncEmails = useCallback(
    async (accountId: string, page = 1, search = "") => {
      const requestId = ++requestIdRef.current;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        setSyncing(true);
        setLoading(true);

        const res = await fetch(
          `${backendUrl}/api/emails?email_account_id=${accountId}&page=${page}&limit=${pageLimit}&search=${encodeURIComponent(search)}`,
          { signal: controller.signal }
        );

        if (!res.ok) throw new Error("Failed to fetch emails");

        const json = (await res.json()) as SyncResponse;

        // ❌ Ignore stale responses
        if (requestId !== requestIdRef.current) return;

        const mapped: EmailMessage[] = (json.data || []).map((e) => ({
          id: `${accountId}-${e.uid}`,
          subject: e.subject,
          from_email: e.from,
          body_text: e.text,
          body_html: e.html,
          date_received: e.date,
          is_read: e.is_read,
          email_account: accountByIdRef.current.get(accountId),
          attachments: e.attachments || [],
          replies: e.replies || [],
        }));

        // ✅ SORT HERE — newest first (Gmail-safe)
        mapped.sort((a, b) => new Date(b.date_received).getTime() - new Date(a.date_received).getTime());

        // 🔒 HARD REPLACE FOR THIS ACCOUNT (PAGE-BASED)
        setMessages(mapped);

        setPageByAccount((prev) => ({ ...prev, [accountId]: page }));
        setHasMoreByAccount((prev) => ({ ...prev, [accountId]: json.pagination?.hasMore ?? false }));
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        // ❌ Ignore errors from stale requests
        if (requestId !== requestIdRef.current) return;
        toast({ title: "Error", description: e?.message, variant: "destructive" });
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setSyncing(false);
          abortControllerRef.current = null;
        }
      }
    },
    [backendUrl, pageLimit, toast]
  );

  const unreadCount = useMemo(() => messages.filter((m) => !m.is_read).length, [messages]);

  const markAsRead = useCallback(
    async (message: EmailMessage) => {
      if (message.is_read) return;

      try {
        await fetch(backendUrl + "/api/emails/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email_account_id: message.email_account?.id,
            mailbox: "INBOX",
            uid: message.id.split("-").pop(),
          }),
        });

        setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, is_read: true } : m)));
      } catch {
        toast({
          title: "Error",
          description: "Failed to mark email as read",
          variant: "destructive",
        });
      }
    },
    [backendUrl, toast]
  );

  const deleteMessage = useCallback(
    async (message: EmailMessage) => {
      const uid = message.id.split("-").pop();

      try {
        // 🔥 OPTIMISTIC UI UPDATE
        setMessages((prev) => prev.filter((m) => m.id !== message.id));

        await fetch(backendUrl + "/api/emails/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email_account_id: message.email_account?.id,
            uid,
            mailbox: "INBOX",
          }),
        });

        toast({
          title: "Deleted",
          description: "Email deleted successfully",
        });

        return true;
      } catch {
        toast({
          title: "Error",
          description: "Failed to delete email",
          variant: "destructive",
        });
        return false;
      }
    },
    [backendUrl, toast]
  );

  const bulkDelete = useCallback(
    async (messagesToDelete: EmailMessage[]) => {
      try {
        // Optimistic UI update
        const idsToDelete = new Set(messagesToDelete.map((m) => m.id));
        setMessages((prev) => prev.filter((m) => !idsToDelete.has(m.id)));

        await Promise.all(
          messagesToDelete.map((m) => {
            const uid = m.id.split("-").pop();
            return fetch(backendUrl + "/api/emails/delete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email_account_id: m.email_account?.id,
                uid,
                mailbox: "INBOX",
              }),
            });
          })
        );

        toast({
          title: "Deleted",
          description: "Selected emails deleted successfully",
        });

        return true;
      } catch {
        toast({
          title: "Error",
          description: "Failed to delete selected emails",
          variant: "destructive",
        });
        return false;
      }
    },
    [backendUrl, toast]
  );

  const sendReply = useCallback(
    async ({
      message,
      body,
    }: {
      message: EmailMessage;
      body: string;
    }) => {
      const messageUid = message.id.split("-").pop();

      try {
        await fetch(backendUrl + "/api/emails/reply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email_account_id: message.email_account?.id,
            message_uid: messageUid, // ✅ REQUIRED
            to_email: message.from_email, // ✅ REQUIRED (correct key)
            subject: message.subject,
            body,
          }),
        });

        toast({
          title: "Sent",
          description: "Reply sent successfully",
        });

        const newReply: EmailReply = {
          id: `temp-${Date.now()}`,
          body,
          created_at: new Date().toISOString(),
        };

        setMessages((prev) =>
          prev.map((m) => (m.id === message.id ? { ...m, replies: [...(m.replies || []), newReply] } : m))
        );

        return true;
      } catch {
        toast({
          title: "Error",
          description: "Failed to send reply",
          variant: "destructive",
        });
        return false;
      }
    },
    [backendUrl, toast]
  );

  const sendEmail = useCallback(
    async ({
      emailAccountId,
      to,
      subject,
      body,
      attachments,
    }: {
      emailAccountId: string;
      to: string;
      subject: string;
      body: string;
      attachments: File[];
    }) => {
      const formData = new FormData();
      formData.append("email_account_id", emailAccountId);
      formData.append("to_email", to);
      formData.append("subject", subject);
      formData.append("body", body);
      attachments.forEach((file) => formData.append("attachments", file));

      try {
        await fetch(backendUrl + "/api/emails/send", {
          method: "POST",
          body: formData, // ❗ no Content-Type
        });

        toast({
          title: "Sent",
          description: "Email sent successfully",
        });

        return true;
      } catch {
        toast({
          title: "Error",
          description: "Failed to send email",
          variant: "destructive",
        });
        return false;
      }
    },
    [backendUrl, toast]
  );

  return {
    messages,
    loading,
    syncing,
    unreadCount,
    pageByAccount,
    hasMoreByAccount,
    syncEmails,
    markAsRead,
    deleteMessage,
    bulkDelete,
    sendReply,
    sendEmail,
  };
}

