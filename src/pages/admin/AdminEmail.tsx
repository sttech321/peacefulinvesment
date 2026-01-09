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
import { Textarea } from "@/components/ui/textarea";

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
  const backendUrl = import.meta.env.NODE_BACKEND_URL || 'https://m8okk0c4w8oskkk4gkgkg0kw.peacefulinvestment.com';
  console.log('Backend URL:', backendUrl);
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

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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

  const handleAddAccount = async () => {
    if (!validateAccountForm()) {
      toast({
        title: "Validation error",
        description: "Please fill all the fields",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("email_accounts")
      .insert(form);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Success", description: "Email account added" });
    setAddOpen(false);
    setForm(emptyAccount);
    setFormErrors({});
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
        `${backendUrl}/api/emails?email_account_id=${accountId}&page=${page}&limit=${PAGE_LIMIT}`
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

      // ✅ SORT HERE — newest first (Gmail-safe)
      mapped.sort(
        (a, b) =>
          new Date(b.date_received).getTime() -
          new Date(a.date_received).getTime()
      );

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
      await fetch(backendUrl + "/api/emails/read", {
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

      await fetch(backendUrl + "/api/emails/delete", {
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
          <Button variant="outline" onClick={handleSyncAll} disabled={syncing} className="rounded-[8px] gap-0">
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
              <Button className="rounded-[8px] gap-0">
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
          <div className="flex gap-2 mb-4">
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger className="w-100 min-w-96 max-w-lg rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400 h-10" style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
                <SelectValue placeholder="All Accounts" />
              </SelectTrigger>
              <SelectContent className="border-secondary-foreground bg-black/90 text-white">
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
              className='w-100 min-w-96 max-w-lg rounded-[8px] shadow-none mt-0 focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 h-10 border-0' style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-white text-lg">Loading emails...</div>
        </div>
      </div>
          ) : (
            
            <div className="rounded-md border border-muted/20 overflow-x-auto">
            <Table className="border-none p-0 rounded-lg bg-white/5">
              <TableHeader>
                <TableRow className="border-b border-muted/20 hover:bg-white/15 bg-white/15 text-white">
                  <TableHead className="text-white">From</TableHead>
                  <TableHead className="text-white">Subject</TableHead>
                  <TableHead className="text-white">Date</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody key={selectedAccount}>
                {filteredMessages.map(m => (
                  <>
                    {/* MAIN EMAIL ROW */}
                    <TableRow className={`border-b border-muted/20 hover:bg-white/10 ${!m.is_read ? "font-bold bg-white/15" : ""}`} key={m.id}>
                      <TableCell className="text-white">{m.from_email}</TableCell>
                      <TableCell className="text-white">{m.subject}</TableCell>
                      <TableCell className="text-white whitespace-nowrap">
                        {format(new Date(m.date_received), "MMM d yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="bg-muted/20 hover:bg-muted/40 rounded-[8px] border-0"
                            onClick={() => {
                              setViewMessage(m);
                              markAsRead(m);
                            }}
                          >
                            <Eye className="h-4 w-4 text-white " />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="bg-muted/20 hover:bg-muted/40 rounded-[8px] border-0"
                            onClick={() => {
                              setViewMessage(m);
                              setReplyOpen(true);
                              markAsRead(m);
                            }}
                          >
                            <Reply className="h-4 w-4 text-white " />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                             className="bg-red-600 hover:bg-red-700 rounded-[8px] border-0"
                            onClick={() => handleDeleteEmail(m)}
                          >
                            <Trash2 className="h-4 w-4 text-white" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* 🔽 REPLIES ROW */}
                    {m.replies && m.replies.length > 0 && (
                      <TableRow className="border-b border-muted/20 bg-muted/20 hover:bg-muted/10 ">
                        <TableCell colSpan={4}>
                          <div className="space-y-0 px-5">
                            {m.replies.map(reply => (
                              <div key={reply.id} className="text-sm py-2 border-b border-muted/20 last:border-0 last:pb-0 first:pt-0">
                                <div className="text-xs text-white font-semibold font-inter">
                                  Reply • {format(new Date(reply.created_at), "MMM d yyyy HH:mm")}
                                </div>
                                <div className="mt-1 text-muted-foreground whitespace-pre-wrap">
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
</div>
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
                  className="rounded-[8px] hover:bg-white/90 border-0"
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
                      onClick={() => syncAccountEmails(acc.id)}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteAccount} onOpenChange={() => setDeleteAccount(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Email Account</DialogTitle>
            <DialogDescription className="pt-4 text-black">
              Are you sure you want to delete this email account?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-[8px] hover:bg-muted border-0"
              onClick={() => setDeleteAccount(null)}
            >
              Cancel
            </Button>

            <Button
              variant="destructive"
              className="rounded-[8px]"
              onClick={handleDeleteAccount}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VIEW MESSAGE */}
      <Dialog open={!!viewMessage} onOpenChange={() => setViewMessage(null)}>
        <DialogContent className="max-w-4xl p-0 gap-0">
          <DialogHeader className="p-4">
            <DialogTitle>{viewMessage?.subject}</DialogTitle>
            <DialogDescription className=" text-black/80 font-inter">{viewMessage?.from_email}</DialogDescription>
          </DialogHeader>
          <div className="px-4 mb-4 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
          {viewMessage?.body_html
            ? <div dangerouslySetInnerHTML={{ __html: viewMessage.body_html }} />
            : <pre>{viewMessage?.body_text}</pre>}
            </div>
        </DialogContent>
      </Dialog>
      
      {/* REPLY DIALOG */}
      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reply</DialogTitle>
            <DialogDescription className="pt-2 text-gray-600 font-inter">
              To: {viewMessage?.from_email}
            </DialogDescription>
          </DialogHeader>
 
          <Textarea
            className="rounded-[8px] shadow-none mt-1 boder-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none resize-none" 
            style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
            placeholder="Write your reply..."
             rows={6}
            value={replyBody}
            onChange={e => setReplyBody(e.target.value)}
          />

          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-[8px] hover:bg-muted/20 border-0"
              onClick={() => setReplyOpen(false)}
            >
              Cancel
            </Button>

            <Button
            className="rounded-[8px] border-0 hover:bg-primary/80 bg-primary"
              disabled={replyLoading}
              onClick={async () => {
                if (!viewMessage) return;

                try {
                  setReplyLoading(true);
                  const messageUid = viewMessage.id.split("-").pop();
                  await fetch(backendUrl + "/api/emails/reply", {
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
            <DialogDescription className="pt-4 text-black">
              Are you sure you want to delete this email?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-[8px] hover:bg-muted/10 border-0"
              onClick={() => setDeleteMessage(null)}
              disabled={deleting}
            >
              Cancel
            </Button>

            <Button
              variant="destructive"
              className="rounded-[8px]"
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
    <div className="grid grid-cols-2 gap-4 pt-4">
      <div>
        <Label>Email</Label>
        <Input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className='rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none' style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties } />
      </div>

      <div>
        <Label>Password {isEdit && "(leave blank to keep)"}</Label>
        <Input required type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className='rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none' style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties } />
      </div>

      <div>
        <Label>IMAP Host</Label>
        <Input required value={form.imap_host} onChange={e => setForm({ ...form, imap_host: e.target.value })} className='rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none' style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties } />
      </div>

      <div>
        <Label>IMAP Port</Label>
        <Input required type="number" value={form.imap_port} onChange={e => setForm({ ...form, imap_port: Number(e.target.value) })} className='rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none' style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties } />
      </div>

      <div>
        <Label>SMTP Host</Label>
        <Input required value={form.smtp_host} onChange={e => setForm({ ...form, smtp_host: e.target.value })} 
        className='rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none' style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties } />
      </div>

      <div>
        <Label>SMTP Port</Label>
        <Input required type="number" value={form.smtp_port} onChange={e => setForm({ ...form, smtp_port: Number(e.target.value) })}  className='rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none' style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties } />
      </div>

      <div>
        <Label>Provider</Label>
        <Select required value={form.provider} onValueChange={v => setForm({ ...form, provider: v })}>
          <SelectTrigger className="rounded-[8px] border-muted-foreground/60 hover:border-muted-foreground shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400 h-[36px]" style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
            <SelectValue />
            </SelectTrigger>
          <SelectContent className="border-secondary-foreground bg-black/90 text-white">
            <SelectItem value="custom">Custom</SelectItem>
            <SelectItem value="gmail">Gmail</SelectItem>
            <SelectItem value="outlook">Outlook</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
