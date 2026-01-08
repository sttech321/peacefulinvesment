import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Plus, Search, RefreshCw, Trash2,
  Eye, Reply, Loader2, Settings,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

/* ================= TYPES ================= */

interface EmailAccount {
  id: string;
  email: string;
  password: string;
  imap_host: string;
  imap_port: number;
  imap_secure: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  provider: string;
  sync_enabled: boolean;
  last_sync_at: string | null;
}

interface EmailReply {
  id: string;
  body: string;
  created_at: string;
}

interface EmailMessage {
  id: string;
  subject: string | null;
  from_email: string;
  body_text: string | null;
  body_html: string | null;
  date_received: string;
  is_read: boolean;
  email_account?: EmailAccount;
  replies?: EmailReply[]; // 👈 ADD THIS
}

/* ================= COMPONENT ================= */

export default function AdminEmail() {
  const { toast } = useToast();

  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | "all">("all");

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteAccount, setDeleteAccount] = useState<EmailAccount | null>(null);
  const [editingAccount, setEditingAccount] = useState<EmailAccount | null>(null);

  const [viewMessage, setViewMessage] = useState<EmailMessage | null>(null);

  /* ===== NEW: REPLY STATE ===== */
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);

  const [hasMoreByAccount, setHasMoreByAccount] = useState<Record<string, boolean>>({});
  const [pageByAccount, setPageByAccount] = useState<Record<string, number>>({});
  const PAGE_LIMIT = 20;

  const [deleteMessage, setDeleteMessage] = useState<EmailMessage | null>(null);
  const [deleting, setDeleting] = useState(false);

  const emptyAccount = {
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
  };

  const [form, setForm] = useState<any>(emptyAccount);

  /* ================= FETCH ACCOUNTS ================= */

  const fetchAccounts = async () => {
    const { data, error } = await supabase
      .from("email_accounts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setAccounts(data || []);
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (accounts.length > 0 && selectedAccount === "all") {
      setSelectedAccount(accounts[0].id);
    }
  }, [accounts]);

  useEffect(() => {
    if (accounts.length > 0) {
      handleSyncAll();
    }
  }, [accounts.length]);

  /* ================= ADD ACCOUNT ================= */

  const handleAddAccount = async () => {
    const { error } = await supabase.from("email_accounts").insert(form);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: "Email account added" });
    setAddOpen(false);
    setForm(emptyAccount);
    fetchAccounts();
  };

  /* ================= EDIT ACCOUNT ================= */

  const openEdit = (acc: EmailAccount) => {
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
  };

  const handleUpdateAccount = async () => {
    if (!editingAccount) return;

    const payload: any = { ...form };
    if (!payload.password) delete payload.password;

    const { error } = await supabase
      .from("email_accounts")
      .update(payload)
      .eq("id", editingAccount.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Updated", description: "Email account updated" });
    setEditOpen(false);
    setEditingAccount(null);
    setForm(emptyAccount);
    fetchAccounts();
  };

  /* ================= DELETE ACCOUNT ================= */

  const handleDeleteAccount = async () => {
    if (!deleteAccount) return;

    const { error } = await supabase
      .from("email_accounts")
      .delete()
      .eq("id", deleteAccount.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Deleted", description: "Email account removed" });
    setDeleteAccount(null);
    fetchAccounts();
  };

  /* ================= EMAIL SYNC ================= */

  const syncAccountEmails = async (
    accountId: string,
    page = 1
  ) => {
    try {
      setSyncing(true);
      setLoading(true);

      const res = await fetch(
        `http://localhost:3001/api/emails?email_account_id=${accountId}&page=${page}&limit=${PAGE_LIMIT}`
      );

      if (!res.ok) throw new Error("Failed to fetch emails");

      const json = await res.json();

      const mapped: EmailMessage[] = (json.data || []).map((e: any) => ({
        id: `${accountId}-${e.uid}`,
        subject: e.subject,
        from_email: e.from,
        body_text: e.text,
        body_html: e.html,
        date_received: e.date,
        is_read: e.is_read,
        email_account: accounts.find(a => a.id === accountId),
        replies: e.replies || [],
      }));

      // 🔒 HARD REPLACE FOR THIS ACCOUNT (PAGE-BASED)
      setMessages(prev => [
        ...prev.filter(m => m.email_account?.id !== accountId),
        ...mapped,
      ]);

      setPageByAccount(prev => ({
        ...prev,
        [accountId]: page,
      }));

      setHasMoreByAccount(prev => ({
        ...prev,
        [accountId]: json.pagination?.hasMore ?? false,
      }));

    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  };

  const handleSyncAll = async () => {
    setMessages([]);
    for (const acc of accounts) {
      await syncAccountEmails(acc.id, 1);
    }
  };


    /* ===== NEW: MARK AS READ ===== */
  const markAsRead = async (message: EmailMessage) => {
    if (message.is_read) return;

    try {
      await fetch("http://localhost:3001/api/emails/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email_account_id: message.email_account?.id,
          mailbox: "INBOX",
          uid: message.id.split("-").pop(),
        }),
      });

      setMessages(prev =>
        prev.map(m =>
          m.id === message.id ? { ...m, is_read: true } : m
        )
      );
    } catch {
      toast({
        title: "Error",
        description: "Failed to mark email as read",
        variant: "destructive",
      });
    }
  };

  /* ================= FILTER ================= */

  const filteredMessages = messages.filter(m => {
    const matchSearch =
      m.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.from_email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchAccount =
      selectedAccount === "all" ||
      m.email_account?.id === selectedAccount;

    return matchSearch && matchAccount;
  });

  const unreadCount = filteredMessages.filter(m => !m.is_read).length;

  /* ================= UI ================= */

  /* ================= DELETE Email ================= */
  const handleDeleteEmail = (message: EmailMessage) => {
    setDeleteMessage(message); // just open dialog
  };

  const confirmDeleteEmail = async () => {
    if (!deleteMessage) return;

    try {
      setDeleting(true);

      const uid = deleteMessage.id.split("-").pop();

      // 🔥 OPTIMISTIC UI UPDATE
      setMessages(prev =>
        prev.filter(m => m.id !== deleteMessage.id)
      );

      await fetch("http://localhost:3001/api/emails/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email_account_id: deleteMessage.email_account?.id,
          uid,
          mailbox: "INBOX",
        }),
      });

      toast({
        title: "Deleted",
        description: "Email deleted successfully",
      });

      setDeleteMessage(null);
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete email",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Email Management</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSyncAll} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing && "animate-spin"}`} />
            Sync All
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
              <Button>
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
                <Button onClick={handleAddAccount}>Add</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* TABS */}
      <Tabs defaultValue="messages">
        <TabsList>
          <TabsTrigger value="messages">
            Messages {unreadCount > 0 && <Badge className="ml-2">{unreadCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
        </TabsList>

        {/* MESSAGES */}
        <TabsContent value="messages">
          <div className="flex gap-2 mb-4">
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="All Accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts.map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="Search..."
              className="w-[300px]"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          ) : (
            <Table className="text-white">
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody key={selectedAccount}>
                {filteredMessages.map(m => (
                  <>
                    {/* MAIN EMAIL ROW */}
                    <TableRow key={m.id} className={!m.is_read ? "font-bold" : ""}>
                      <TableCell>{m.from_email}</TableCell>
                      <TableCell>{m.subject}</TableCell>
                      <TableCell>
                        {format(new Date(m.date_received), "MMM d yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setViewMessage(m);
                              markAsRead(m);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setViewMessage(m);
                              setReplyOpen(true);
                              markAsRead(m);
                            }}
                          >
                            <Reply className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteEmail(m)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* 🔽 REPLIES ROW */}
                    {m.replies && m.replies.length > 0 && (
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={4}>
                          <div className="space-y-2 pl-6 border-l border-muted">
                            {m.replies.map(reply => (
                              <div key={reply.id} className="text-sm">
                                <div className="text-xs text-muted-foreground">
                                  Reply • {format(new Date(reply.created_at), "MMM d yyyy HH:mm")}
                                </div>
                                <div className="mt-1 whitespace-pre-wrap">
                                  {reply.body}
                                </div>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                  )}
                </>
              ))}
              </TableBody>
            </Table>
          )}

          {selectedAccount !== "all" && (
            <div className="flex justify-center items-center gap-4 mt-4">
              {/* PREVIOUS */}
              <Button
                variant="outline"
                disabled={
                  syncing ||
                  (pageByAccount[selectedAccount] || 1) === 1
                }
                onClick={() =>
                  syncAccountEmails(
                    selectedAccount,
                    (pageByAccount[selectedAccount] || 1) - 1
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
                  onClick={() =>
                    syncAccountEmails(
                      selectedAccount,
                      (pageByAccount[selectedAccount] || 1) + 1
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
          <Table className="w-full text-white">
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {accounts.map(acc => (
                <TableRow key={acc.id}>
                  <TableCell>{acc.email}</TableCell>

                  <TableCell>
                    <Badge>{acc.sync_enabled ? "Active" : "Disabled"}</Badge>
                  </TableCell>

                  <TableCell className="text-right flex gap-2 justify-end">
                    {/* Per-account sync */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => syncAccountEmails(acc.id)}
                      disabled={syncing}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>

                    {/* Edit */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(acc)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>

                    {/* Delete */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteAccount(acc)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAccount}>
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteAccount} onOpenChange={() => setDeleteAccount(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Email Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this email account?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteAccount(null)}
            >
              Cancel
            </Button>

            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VIEW MESSAGE */}
      <Dialog open={!!viewMessage} onOpenChange={() => setViewMessage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{viewMessage?.subject}</DialogTitle>
            <DialogDescription>{viewMessage?.from_email}</DialogDescription>
          </DialogHeader>
          {viewMessage?.body_html
            ? <div dangerouslySetInnerHTML={{ __html: viewMessage.body_html }} />
            : <pre>{viewMessage?.body_text}</pre>}
        </DialogContent>
      </Dialog>
      
      {/* REPLY DIALOG */}
      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reply</DialogTitle>
            <DialogDescription>
              To: {viewMessage?.from_email}
            </DialogDescription>
          </DialogHeader>

          <textarea
            className="w-full min-h-[200px] p-2 rounded bg-black text-white border"
            placeholder="Write your reply..."
            value={replyBody}
            onChange={e => setReplyBody(e.target.value)}
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReplyOpen(false)}
            >
              Cancel
            </Button>

            <Button
              disabled={replyLoading}
              onClick={async () => {
                if (!viewMessage) return;

                try {
                  setReplyLoading(true);
                  const messageUid = viewMessage.id.split("-").pop();
                  await fetch("http://localhost:3001/api/emails/reply", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      email_account_id: viewMessage.email_account?.id,
                      message_uid: messageUid,            // ✅ REQUIRED
                      to_email: viewMessage.from_email,   // ✅ REQUIRED (correct key)
                      subject: viewMessage.subject,
                      body: replyBody,
                    }),
                  });

                  toast({
                    title: "Sent",
                    description: "Reply sent successfully",
                  });

                  const newReply = {
                    id: `temp-${Date.now()}`,          // temporary ID
                    body: replyBody,
                    created_at: new Date().toISOString(),
                  };

                  setMessages(prev =>
                    prev.map(m =>
                      m.id === viewMessage.id
                        ? {
                            ...m,
                            replies: [...(m.replies || []), newReply],
                          }
                        : m
                    )
                  );

                  setReplyBody("");
                  setReplyOpen(false);

                } catch {
                  toast({
                    title: "Error",
                    description: "Failed to send reply",
                    variant: "destructive",
                  });
                } finally {
                  setReplyLoading(false);
                }
              }}
            >
              {replyLoading ? "Sending..." : "Send Reply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteMessage}
        onOpenChange={() => setDeleteMessage(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Email</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this email?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteMessage(null)}
              disabled={deleting}
            >
              Cancel
            </Button>

            <Button
              variant="destructive"
              disabled={deleting}
              onClick={confirmDeleteEmail}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

/* ================= ACCOUNT FORM ================= */

function AccountForm({ form, setForm, isEdit = false }: any) {
  return (
    <div className="grid grid-cols-2 gap-4 py-4">
      <div>
        <Label>Email</Label>
        <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
      </div>

      <div>
        <Label>Password {isEdit && "(leave blank to keep)"}</Label>
        <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
      </div>

      <div>
        <Label>IMAP Host</Label>
        <Input value={form.imap_host} onChange={e => setForm({ ...form, imap_host: e.target.value })} />
      </div>

      <div>
        <Label>IMAP Port</Label>
        <Input type="number" value={form.imap_port} onChange={e => setForm({ ...form, imap_port: Number(e.target.value) })} />
      </div>

      <div>
        <Label>SMTP Host</Label>
        <Input value={form.smtp_host} onChange={e => setForm({ ...form, smtp_host: e.target.value })} />
      </div>

      <div>
        <Label>SMTP Port</Label>
        <Input type="number" value={form.smtp_port} onChange={e => setForm({ ...form, smtp_port: Number(e.target.value) })} />
      </div>

      <div>
        <Label>Provider</Label>
        <Select value={form.provider} onValueChange={v => setForm({ ...form, provider: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="custom">Custom</SelectItem>
            <SelectItem value="gmail">Gmail</SelectItem>
            <SelectItem value="outlook">Outlook</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
