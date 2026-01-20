import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, RefreshCw, Settings, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { useEmailAccounts } from "@/hooks/email/useEmailAccounts";
import { useEmailMessages } from "@/hooks/email/useEmailMessages";
import type { EmailAccount, EmailMessage } from "@/pages/admin/email/types";
import { EmailToolbar } from "@/pages/admin/email/components/EmailToolbar";
import { EmailTable } from "@/pages/admin/email/components/EmailTable";
import { ReplyDialog } from "@/pages/admin/email/components/ReplyDialog";
import { ComposeEmailDialog, type ComposeFormValues } from "@/pages/admin/email/components/ComposeEmailDialog";
import { ViewEmailDialog } from "@/pages/admin/email/components/ViewEmailDialog";
import { DeleteConfirmDialog } from "@/pages/admin/email/components/DeleteConfirmDialog";
import { BulkDeleteDialog } from "@/pages/admin/email/components/BulkDeleteDialog";
import { AccountForm, type EmailAccountFormValues } from "@/pages/admin/email/components/AccountForm";

/* ================= TYPES ================= */
// moved to `src/pages/admin/email/types.ts`

/* ================= COMPONENT ================= */

export default function AdminEmail() {
  const backendUrl = import.meta.env.NODE_BACKEND_URL || 'https://m8okk0c4w8oskkk4gkgkg0kw.peacefulinvestment.com';
  // const backendUrl = import.meta.env.NODE_BACKEND_URL || 'http://localhost:3000';
  const { toast } = useToast();
  const [selectedAccount, setSelectedAccount] = useState<string | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<EmailAccount | null>(null);
  const [deleteAccount, setDeleteAccount] = useState<EmailAccount | null>(null);

  const [viewMessage, setViewMessage] = useState<EmailMessage | null>(null);

  /* ===== NEW: REPLY STATE ===== */
  const [replyState, setReplyState] = useState({ open: false, body: "", loading: false });

  const PAGE_LIMIT = 20;

  const [deleteMessage, setDeleteMessage] = useState<EmailMessage | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [expandedThreads, setExpandedThreads] = useState<Record<string, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ===== COMPOSE EMAIL STATE ===== */
  const [composeState, setComposeState] = useState<{
    open: boolean;
    loading: boolean;
    form: ComposeFormValues;
    attachments: File[];
  }>({
    open: false,
    loading: false,
    form: { to: "", subject: "", body: "" },
    attachments: [],
  });

  const resetComposeForm = useCallback(() => {
    setComposeState((prev) => ({
      ...prev,
      form: { to: "", subject: "", body: "" },
      attachments: [],
    }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleAttachmentChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setComposeState((prev) => ({ ...prev, attachments: [...prev.attachments, ...files] }));
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setComposeState((prev) => {
      const updated = prev.attachments.filter((_, i) => i !== index);
      if (updated.length === 0 && fileInputRef.current) fileInputRef.current.value = "";
      return { ...prev, attachments: updated };
    });
  }, []);

  const emptyAccount: EmailAccountFormValues = useMemo(
    () => ({
      email: "",
      password: "",
      imap_host: "",
      imap_port: 993,
      imap_secure: true,
      smtp_host: "",
      smtp_port: 587,
      smtp_secure: false,
      provider: "custom",
      sync_enabled: true,
    }),
    []
  );

  const [form, setForm] = useState<EmailAccountFormValues>(emptyAccount);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { accounts, addAccount, updateAccount, deleteAccount: deleteEmailAccount } = useEmailAccounts({ toast });

  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const {
    messages,
    loading,
    syncing,
    unreadCount,
    pageByAccount,
    hasMoreByAccount,
    syncEmails,
    markAsRead,
    deleteMessage: deleteEmailMessage,
    bulkDelete,
    sendReply,
    sendEmail,
  } = useEmailMessages({ backendUrl, pageLimit: PAGE_LIMIT, toast, accountById });

  // preserve existing behavior: when accounts first load and "all" is selected, auto-select the first account
  useEffect(() => {
    if (accounts.length > 0 && selectedAccount === "all") {
      setSelectedAccount(accounts[0].id);
    }
  }, [accounts.length]);

  // Debounced sync for BOTH account switching and search (matches the previous inline setTimeout behavior)
  const debouncedSyncKey = useDebounce(JSON.stringify([selectedAccount, searchTerm]), 400);
  useEffect(() => {
    const [accountId, search] = JSON.parse(debouncedSyncKey) as [string | "all", string];
    if (accountId === "all") return;
    syncEmails(accountId, 1, search);
  }, [debouncedSyncKey, syncEmails]);

  /* ================= SELECTION (REDUCER) ================= */
  type SelectionAction =
    | { type: "toggle"; id: string }
    | { type: "select_all"; ids: string[] }
    | { type: "clear" };

  const [selectedEmailIds, dispatchSelectedEmailIds] = useReducer((state: Set<string>, action: SelectionAction) => {
    switch (action.type) {
      case "toggle": {
        const next = new Set(state);
        next.has(action.id) ? next.delete(action.id) : next.add(action.id);
        return next;
      }
      case "select_all": {
        const next = new Set(state);
        action.ids.forEach((id) => next.add(id));
        return next;
      }
      case "clear":
        return new Set();
      default:
        return state;
    }
  }, new Set<string>());


  /* ================= VALIDATE ACCOUNT FORM ================= */
  const validateAccountForm = () => {
    const errors: Record<string, string> = {};

    if (!form.email?.trim()) {
      errors.email = "Email is required";
    } else if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      errors.email = "Invalid email format";
    }

    if (!editingAccount && !form.password?.trim()) {
      errors.password = "Password is required";
    }

    if (!form.imap_host?.trim()) {
      errors.imap_host = "IMAP host is required";
    }

    if (!form.imap_port) {
      errors.imap_port = "IMAP port is required";
    }

    if (!form.smtp_host?.trim()) {
      errors.smtp_host = "SMTP host is required";
    }

    if (!form.smtp_port) {
      errors.smtp_port = "SMTP port is required";
    }

    setFormErrors(errors);

    return Object.keys(errors).length === 0;
  };

  /* ================= ADD ACCOUNT ================= */

  const handleAddAccount = useCallback(async () => {
    if (!validateAccountForm()) {
      toast({
        title: "Validation error",
        description: "Please fill all the fields",
        variant: "destructive",
      });
      return;
    }

    const ok = await addAccount(form as any);
    if (!ok) return;

    setAddOpen(false);
    setForm(emptyAccount);
    setFormErrors({});
  }, [addAccount, emptyAccount, form, toast]);

  /* ================= EDIT ACCOUNT ================= */

  const openEdit = useCallback((acc: EmailAccount) => {
    setEditingAccount(acc);
     setForm({
      email: acc.email,
      password: "",
      imap_host: acc.imap_host,
      imap_port: acc.imap_port,
      imap_secure: acc.imap_secure,
      smtp_host: acc.smtp_host,
      smtp_port: acc.smtp_port,
      smtp_secure: acc.smtp_secure,
      provider: acc.provider,
      sync_enabled: acc.sync_enabled,
    });
    setEditOpen(true);
  }, []);

  const handleUpdateAccount = useCallback(async () => {
    if (!editingAccount) return;

    const payload: any = { ...form };
    if (!payload.password) delete payload.password;

    const ok = await updateAccount(editingAccount.id, payload);
    if (!ok) return;

    setEditOpen(false);
    setEditingAccount(null);
    setForm(emptyAccount);
  }, [editingAccount, emptyAccount, form, updateAccount]);

  /* ================= DELETE ACCOUNT ================= */

  const handleDeleteAccount = useCallback(async () => {
    if (!deleteAccount) return;

    const ok = await deleteEmailAccount(deleteAccount.id);
    if (!ok) return;
    setDeleteAccount(null);
  }, [deleteAccount, deleteEmailAccount]);

  const isAllSelected = useMemo(
    () => messages.length > 0 && messages.every((m) => selectedEmailIds.has(m.id)),
    [messages, selectedEmailIds]
  );

  const toggleSelectEmail = useCallback((id: string) => dispatchSelectedEmailIds({ type: "toggle", id }), []);

  const selectAllVisibleEmails = useCallback(
    () => dispatchSelectedEmailIds({ type: "select_all", ids: messages.map((m) => m.id) }),
    [messages]
  );

  const unselectAllEmails = useCallback(() => dispatchSelectedEmailIds({ type: "clear" }), []);

  const onToggleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) selectAllVisibleEmails();
      else unselectAllEmails();
    },
    [selectAllVisibleEmails, unselectAllEmails]
  );

  const toggleThread = useCallback((messageId: string) => {
    setExpandedThreads((prev) => ({ ...prev, [messageId]: !(prev[messageId] ?? true) }));
  }, []);

  const openMessage = useCallback(
    (m: EmailMessage) => {
      setViewMessage(m);
      markAsRead(m);
    },
    [markAsRead]
  );

  const openReply = useCallback(
    (m: EmailMessage) => {
      setViewMessage(m);
      setReplyState((prev) => ({ ...prev, open: true }));
      markAsRead(m);
    },
    [markAsRead]
  );

  const handleDeleteEmail = useCallback((m: EmailMessage) => {
    setDeleteMessage(m);
  }, []);

  const confirmDeleteEmail = useCallback(async () => {
    if (!deleteMessage) return;

    try {
      setDeleting(true);
      const ok = await deleteEmailMessage(deleteMessage);
      if (ok) setDeleteMessage(null);
    } finally {
      setDeleting(false);
    }
  }, [deleteEmailMessage, deleteMessage]);

  const confirmBulkDelete = useCallback(async () => {
    try {
      setDeleting(true);

      const emailsToDelete = messages.filter((m) => selectedEmailIds.has(m.id));
      // preserve behavior: clear selection before request completes
      dispatchSelectedEmailIds({ type: "clear" });

      await bulkDelete(emailsToDelete);
    } finally {
      setDeleting(false);
    }
  }, [bulkDelete, messages, selectedEmailIds]);

  const handleSendComposeEmail = useCallback(async () => {
    if (!composeState.form.to || !composeState.form.body) {
      toast({
        title: "Validation error",
        description: "Recipient and message are required",
        variant: "destructive",
      });
      return;
    }

    if (selectedAccount === "all") {
      toast({
        title: "Select an account",
        description: "Please select an email account to send from",
        variant: "destructive",
      });
      return;
    }

    try {
      setComposeState((prev) => ({ ...prev, loading: true }));

      const ok = await sendEmail({
        emailAccountId: selectedAccount,
        to: composeState.form.to,
        subject: composeState.form.subject,
        body: composeState.form.body,
        attachments: composeState.attachments,
      });

      if (!ok) return;

      resetComposeForm();
      setComposeState((prev) => ({ ...prev, open: false }));
    } finally {
      setComposeState((prev) => ({ ...prev, loading: false }));
    }
  }, [composeState.attachments, composeState.form, resetComposeForm, selectedAccount, sendEmail, toast]);

  const handleSendReply = useCallback(async () => {
    if (!viewMessage) return;

    try {
      setReplyState((prev) => ({ ...prev, loading: true }));
      const ok = await sendReply({ message: viewMessage, body: replyState.body });
      if (!ok) return;

      setReplyState({ open: false, body: "", loading: false });
    } finally {
      setReplyState((prev) => ({ ...prev, loading: false }));
    }
  }, [replyState.body, sendReply, viewMessage]);

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Email Management</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={syncing || selectedAccount === "all"}
            className="rounded-[8px] gap-0 border-0 shadow-none hover:bg-white/80"
            onClick={() => {
              if (selectedAccount !== "all") {
                syncEmails(selectedAccount, 1, searchTerm);
              }
            }}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing && "animate-spin"}`} />
            Refresh
          </Button>

          <Button
            className="rounded-[8px] gap-0 border-0 shadow-none hover:bg-primary/80"
            disabled={selectedAccount === "all"}
            onClick={() => setComposeState((prev) => ({ ...prev, open: true }))}
          >
            <Plus className="h-4 w-4 mr-2" />
            Compose
          </Button>

          <Dialog
              open={addOpen}
              onOpenChange={(open) => {
                setAddOpen(open);
                if (open) {
                  setForm(emptyAccount); // reset form on open
                }
              }}
            >
            <DialogTrigger asChild>
              <Button className="rounded-[8px] gap-0 border-0 shadow-none hover:bg-primary/80">
                <Plus className="h-4 w-4 mr-2" />
                Add Email Account
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Email Account</DialogTitle>
                <DialogDescription>IMAP / SMTP settings</DialogDescription>
              </DialogHeader>
              <AccountForm form={form} setForm={setForm} />
              <DialogFooter>
                <Button className="rounded-[8px;]" onClick={handleAddAccount}>Add Email</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* TABS */}
      <Tabs defaultValue="messages">
        <TabsList className="bg-white/20 grid-cols-2 p-1 mb-5 h-auto">
          <TabsTrigger value="messages" className="w-100">
            Messages {unreadCount > 0 && <Badge className="ml-2">{unreadCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="accounts" className="w-100">Accounts</TabsTrigger>
        </TabsList>

        {/* MESSAGES */}
        <TabsContent value="messages">
          <EmailToolbar
            accounts={accounts}
            selectedAccount={selectedAccount}
            onChangeSelectedAccount={setSelectedAccount}
            searchTerm={searchTerm}
            onChangeSearchTerm={setSearchTerm}
            selectedCount={selectedEmailIds.size}
            onOpenBulkDelete={() => setBulkDeleteOpen(true)}
          />

            {loading ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
                  <div className="text-white text-lg">Loading emails...</div>
                </div>
              </div>
            ) : messages.length === 0 && selectedAccount !== "all" ? (
              <div className="flex items-center justify-center min-h-[300px]">
                <div className="text-center text-white/70">
                  <div className="text-lg font-semibold mb-2">
                    No emails found
                  </div>
                  {searchTerm ? (
                    <div className="text-sm">
                      No results for “<span className="font-medium">{searchTerm}</span>”
                    </div>
                  ) : (
                    <div className="text-sm">
                      This inbox is empty
                    </div>
                  )}
                </div>
              </div>
            ) : (
            
            <EmailTable
              tableBodyKey={selectedAccount}
              messages={messages}
              isAllSelected={isAllSelected}
              isSelected={(id) => selectedEmailIds.has(id)}
              isExpanded={(id) => expandedThreads[id] ?? true}
              onToggleSelectAll={onToggleSelectAll}
              onToggleSelectEmail={toggleSelectEmail}
              onToggleThread={toggleThread}
              onOpenMessage={openMessage}
              onReply={openReply}
              onDelete={handleDeleteEmail}
            />
          )}

          {selectedAccount !== "all" && (
            <div className="flex justify-center items-center gap-4 mt-4">
              {/* PREVIOUS */}
              <Button
                variant="outline"
                className="rounded-[8px] hover:bg-white/90 border-0"
                disabled={
                  syncing ||
                  (pageByAccount[selectedAccount] || 1) === 1
                }
                onClick={() =>
                  syncEmails(
                    selectedAccount,
                    (pageByAccount[selectedAccount] || 1) - 1,
                    searchTerm
                  )
                }
              >
                Previous
              </Button>

              <span className="text-sm text-muted-foreground">
                Page {pageByAccount[selectedAccount] || 1}
              </span>

              {/* NEXT — ONLY SHOW IF MORE RECORDS EXIST */}
              {hasMoreByAccount[selectedAccount] && (
                <Button
                  variant="outline"
                  disabled={syncing}
                  className="rounded-[8px] hover:bg-white/90 border-0"
                  onClick={() =>
                    syncEmails(
                      selectedAccount,
                      (pageByAccount[selectedAccount] || 1) + 1,
                      searchTerm
                    )
                  }
                >
                  Next
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        {/* ACCOUNTS TAB */}

        
          
        <TabsContent value="accounts">
          <div className="rounded-md border border-muted/20 overflow-x-auto">
          <Table className="border-none p-0 rounded-lg bg-white/5">
            <TableHeader>
              <TableRow className="border-b border-muted/20 hover:bg-white/15 bg-white/15 text-white">
                <TableHead className="text-white">Email</TableHead>
                <TableHead className="text-white">Status</TableHead>
                <TableHead className="text-right text-white">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {accounts.map(acc => (
                <TableRow className="border-b border-muted/20 hover:bg-white/10" key={acc.id}>
                  <TableCell className="text-white">{acc.email}</TableCell>

                  <TableCell>
                    <Badge>{acc.sync_enabled ? "Active" : "Disabled"}</Badge>
                  </TableCell>

                  <TableCell className="text-right flex gap-2 justify-end">
                    {/* Per-account sync */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="bg-muted/20 hover:bg-muted/40 rounded-[8px] border-0"
                      onClick={() => syncEmails(acc.id)}
                      disabled={syncing}
                    >
                      <RefreshCw className="h-4 w-4 text-white" />
                    </Button>

                    {/* Edit */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="bg-muted/20 hover:bg-muted/40 rounded-[8px] border-0"
                      onClick={() => openEdit(acc)}
                    >
                      <Settings className="h-4 w-4 text-white" />
                    </Button>

                    {/* Delete */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="bg-red-600 hover:bg-red-700 rounded-[8px] border-0"
                      onClick={() => setDeleteAccount(acc)}
                    >
                      <Trash2 className="h-4 w-4 text-white" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </TabsContent>

      </Tabs>

      {/* EDIT ACCOUNT DIALOG */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Email Account</DialogTitle>
            <DialogDescription>
              Update IMAP / SMTP settings
            </DialogDescription>
          </DialogHeader>

          <AccountForm form={form} setForm={setForm} isEdit />

          <DialogFooter>
            <Button  className="rounded-[8px] hover:bg-muted border-0" variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button  className="rounded-[8px] bg-primary hover:bg-primary-700 border-0" onClick={handleUpdateAccount}>
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteAccount}
        onOpenChange={() => setDeleteAccount(null)}
        title="Delete Email Account"
        description={
          <>
            Are you sure you want to delete this email account? This action cannot be undone.
          </>
        }
        onCancel={() => setDeleteAccount(null)}
        onConfirm={handleDeleteAccount}
        confirmLabel="Delete"
      />

      {/* VIEW MESSAGE */}
      <ViewEmailDialog
        open={!!viewMessage}
        onOpenChange={() => setViewMessage(null)}
        message={viewMessage}
        backendUrl={backendUrl}
      />
      
      {/* REPLY DIALOG */}
      <ReplyDialog
        open={replyState.open}
        onOpenChange={(open) => setReplyState((prev) => ({ ...prev, open }))}
        toEmail={viewMessage?.from_email}
        replyBody={replyState.body}
        onChangeReplyBody={(value) => setReplyState((prev) => ({ ...prev, body: value }))}
        replyLoading={replyState.loading}
        onCancel={() => setReplyState((prev) => ({ ...prev, open: false }))}
        onSend={handleSendReply}
      />

      <DeleteConfirmDialog
        open={!!deleteMessage}
        onOpenChange={() => setDeleteMessage(null)}
        title="Delete Email"
        description={<>Are you sure you want to delete this email? This action cannot be undone.</>}
        deleting={deleting}
        onCancel={() => setDeleteMessage(null)}
        onConfirm={confirmDeleteEmail}
        confirmLabel="Delete"
      />

      <BulkDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        count={selectedEmailIds.size}
        deleting={deleting}
        onConfirm={confirmBulkDelete}
      />

      <ComposeEmailDialog
        open={composeState.open}
        onOpenChange={(open) => {
          setComposeState((prev) => ({ ...prev, open }));
          if (!open) resetComposeForm();
        }}
        composeForm={composeState.form}
        onChangeComposeForm={(next) => setComposeState((prev) => ({ ...prev, form: next }))}
        attachments={composeState.attachments}
        fileInputRef={fileInputRef}
        onAttachmentChange={handleAttachmentChange}
        onRemoveAttachment={removeAttachment}
        composeLoading={composeState.loading}
        onCancel={() => {
          resetComposeForm();
          setComposeState((prev) => ({ ...prev, open: false }));
        }}
        onSend={handleSendComposeEmail}
      />

    </div>
  );
}