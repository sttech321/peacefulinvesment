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
  Eye, Loader2, Settings,
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

interface EmailMessage {
  id: string;
  subject: string | null;
  from_email: string;
  body_text: string | null;
  body_html: string | null;
  date_received: string;
  is_read: boolean;
  email_account?: EmailAccount;
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
  const [viewMessage, setViewMessage] = useState<EmailMessage | null>(null);

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

  const syncAccountEmails = async (accountId: string) => {
    try {
      setSyncing(true);
      setLoading(true);

      const res = await fetch(
        `http://localhost:3001/api/emails?email_account_id=${accountId}`
      );

      if (!res.ok) throw new Error("Failed to fetch emails");

      const json = await res.json();

      const mapped: EmailMessage[] = (json.data || []).map((e: any) => ({
        id: e.uid.toString(),
        subject: e.subject,
        from_email: e.from,
        body_text: e.text,
        body_html: e.html,
        date_received: e.date,
        is_read: e.is_read,
        email_account: accounts.find(a => a.id === accountId),
      }));

      setMessages(prev => [...prev, ...mapped]);

    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  };

  const handleSyncAll = async () => {
    setMessages([]);
    for (const acc of accounts) {
      await syncAccountEmails(acc.id);
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
              <TableBody>
                {filteredMessages.map(m => (
                  <TableRow key={m.id} className={!m.is_read ? "font-medium" : ""}>
                    <TableCell>{m.from_email}</TableCell>
                    <TableCell>{m.subject}</TableCell>
                    <TableCell>
                      {format(new Date(m.date_received), "MMM d yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setViewMessage(m)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
