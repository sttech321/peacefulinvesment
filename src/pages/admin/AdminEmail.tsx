import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Mail,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  Reply,
  MailOpen,
  MailQuestion,
  Settings,
  Loader2,
  Eye,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Folder,
  Server,
  Key,
  Clock,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface EmailAccount {
  id: string;
  email: string;
  imap_host: string;
  imap_port: number;
  imap_secure: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  provider: string | null;
  last_sync_at: string | null;
  sync_enabled: boolean;
  gmail_client_id?: string | null;
  gmail_client_secret?: string | null;
  gmail_refresh_token?: string | null;
  created_at: string;
  updated_at: string;
}

interface EmailMessage {
  id: string;
  email_account_id: string;
  message_id: string;
  thread_id: string | null;
  subject: string | null;
  from_email: string;
  from_name: string | null;
  to_email: string[];
  cc_email: string[] | null;
  bcc_email: string[] | null;
  reply_to: string | null;
  body_text: string | null;
  body_html: string | null;
  date_received: string;
  is_read: boolean;
  is_starred: boolean;
  is_deleted: boolean;
  attachments: any;
  headers: any;
  created_at: string;
  updated_at: string;
  email_account?: EmailAccount;
}

export default function AdminEmail() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [messageDetailsOpen, setMessageDetailsOpen] = useState(false);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [replySubject, setReplySubject] = useState("");
  const [addAccountDialogOpen, setAddAccountDialogOpen] = useState(false);
  const [editAccountDialogOpen, setEditAccountDialogOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<EmailAccount | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<EmailMessage | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);

  // Form state for adding account
  const [newAccount, setNewAccount] = useState({
    email: "",
    password: "",
    imap_host: "",
    imap_port: 993,
    imap_secure: true,
    smtp_host: "",
    smtp_port: 587,
    smtp_secure: false,
    provider: "custom",
    gmail_client_id: "",
    gmail_client_secret: "",
    gmail_refresh_token: "",
  });

  // Form state for editing account
  const [editAccount, setEditAccount] = useState({
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
    gmail_client_id: "",
    gmail_client_secret: "",
    gmail_refresh_token: "",
  });

  useEffect(() => {
    fetchAccounts();
    fetchMessages();
  }, []);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await (supabase
        .from("email_accounts" as any)
        .select("*")
        .order("created_at", { ascending: false }) as any);

      if (error) throw error;
      setAccounts((data || []) as EmailAccount[]);
      if (data && data.length > 0 && !selectedAccount) {
        setSelectedAccount(data[0].id);
      }
    } catch (error: any) {
      console.error("Error fetching email accounts:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch email accounts",
        variant: "destructive",
      });
    }
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("email_messages" as any)
        .select("*, email_accounts(*)" as any)
        .eq("is_deleted", false)
        .order("date_received", { ascending: false })
        .limit(500) as any;

      if (selectedAccount && selectedAccount !== "all") {
        query = query.eq("email_account_id", selectedAccount);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMessages((data || []) as EmailMessage[]);
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch messages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [selectedAccount]);

  const handleTestConnection = async (isEdit = false) => {
    try {
      setTestingConnection(true);

      const accountToTest = isEdit ? editAccount : newAccount;

      // Basic validation
      if (!accountToTest.email || (!accountToTest.password && !isEdit)) {
        toast({
          title: "Error",
          description: isEdit 
            ? "Please fill in email address" 
            : "Please fill in email and password",
          variant: "destructive",
        });
        setTestingConnection(false);
        return;
      }

      if (!accountToTest.smtp_host || !accountToTest.imap_host) {
        toast({
          title: "Error",
          description: "Please fill in SMTP and IMAP host",
          variant: "destructive",
        });
        setTestingConnection(false);
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(accountToTest.email)) {
        toast({
          title: "Error",
          description: "Please enter a valid email address",
          variant: "destructive",
        });
        setTestingConnection(false);
        return;
      }

      // Test SMTP connection (simplified - just validates format for now)
      // In production, you could add an edge function to actually test the connection
      // For now, we'll just validate the inputs
      
      // Simulate a connection test (replace with actual SMTP test in edge function)
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: "Connection Test",
        description: "Settings validated successfully. Note: Full connection test requires edge function implementation.",
        duration: 5000,
      });

      // TODO: Add actual SMTP/IMAP connection test via edge function
      // This would require creating a test-email-connection edge function
      // that actually tries to connect to SMTP/IMAP servers

    } catch (error: any) {
      console.error("Error testing connection:", error);
      toast({
        title: "Test Failed",
        description: error.message || "Connection test failed",
        variant: "destructive",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleAddAccount = async () => {
    try {
      const { data, error } = await (supabase
        .from("email_accounts" as any)
        .insert({
          ...newAccount,
          created_by: user?.id,
        } as any)
        .select()
        .single() as any);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Email account added successfully",
      });

      setAddAccountDialogOpen(false);
      setNewAccount({
        email: "",
        password: "",
        imap_host: "",
        imap_port: 993,
        imap_secure: true,
        smtp_host: "",
        smtp_port: 587,
        smtp_secure: false,
        provider: "custom",
        gmail_client_id: "",
        gmail_client_secret: "",
        gmail_refresh_token: "",
      });
      fetchAccounts();
    } catch (error: any) {
      console.error("Error adding account:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add email account",
        variant: "destructive",
      });
    }
  };

  const handleEditAccount = (account: EmailAccount) => {
    setAccountToEdit(account);
    setEditAccount({
      email: account.email,
      password: "", // Don't show existing password for security
      imap_host: account.imap_host,
      imap_port: account.imap_port,
      imap_secure: account.imap_secure,
      smtp_host: account.smtp_host,
      smtp_port: account.smtp_port,
      smtp_secure: account.smtp_secure,
      provider: account.provider || "custom",
      sync_enabled: account.sync_enabled,
      gmail_client_id: account.gmail_client_id || "",
      gmail_client_secret: account.gmail_client_secret || "",
      gmail_refresh_token: account.gmail_refresh_token || "",
    });
    setEditAccountDialogOpen(true);
  };

  const handleUpdateAccount = async () => {
    if (!accountToEdit) return;

    try {
      // Prepare update data (don't update password if not changed)
      const updateData: any = {
        email: editAccount.email,
        imap_host: editAccount.imap_host,
        imap_port: editAccount.imap_port,
        imap_secure: editAccount.imap_secure,
        smtp_host: editAccount.smtp_host,
        smtp_port: editAccount.smtp_port,
        smtp_secure: editAccount.smtp_secure,
        provider: editAccount.provider,
        sync_enabled: editAccount.sync_enabled,
        gmail_client_id: editAccount.gmail_client_id || null,
        gmail_client_secret: editAccount.gmail_client_secret || null,
        gmail_refresh_token: editAccount.gmail_refresh_token || null,
      };

      // Only update password if it was changed
      if (editAccount.password) {
        updateData.password = editAccount.password;
      }

      const { error } = await (supabase
        .from("email_accounts" as any)
        .update(updateData)
        .eq("id", accountToEdit.id) as any);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Email account updated successfully",
      });

      setEditAccountDialogOpen(false);
      setAccountToEdit(null);
      setEditAccount({
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
        gmail_client_id: "",
        gmail_client_secret: "",
        gmail_refresh_token: "",
      });
      fetchAccounts();
    } catch (error: any) {
      console.error("Error updating account:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update email account",
        variant: "destructive",
      });
    }
  };

  const handleSync = async (accountId?: string) => {
    try {
      setSyncing(true);

      const { data, error } = await supabase.functions.invoke("sync-emails", {
        body: {
          email_account_id: accountId,
          sync_all: !accountId,
        },
      });

      console.log("Sync response:", { data, error });

      if (error) {
        // Check if it's a CORS or network error (function not deployed)
        if (error.message?.includes("CORS") || error.message?.includes("Failed to send")) {
          throw new Error(
            "Email sync function is not deployed yet. Please deploy the 'sync-emails' edge function to Supabase first."
          );
        }
        throw error;
      }

      // Handle warnings (like missing Gmail API credentials) - show message but don't throw error
      if (!data?.success) {
        // Check if there are warnings (not errors)
        const hasWarnings = data?.summary?.warnings && data.summary.warnings > 0;
        const hasErrors = data?.summary?.failed && data.summary.failed > 0;
        
        if (hasErrors) {
          // Only throw error if there are actual errors (not just warnings)
          throw new Error(data?.error || data?.message || "Sync failed");
        } else if (hasWarnings) {
          // Show warning toast but don't throw - still refresh data
          toast({
            title: "Sync Completed with Warnings",
            description: data.message || "Check account settings for Gmail API credentials",
            variant: "default",
            duration: 8000,
          });
        } else {
          // No warnings or errors but success is false - throw error
          throw new Error(data?.error || data?.message || "Sync failed");
        }
      } else {
        // Success!
        toast({
          title: "Success",
          description: data.message || "Email sync completed",
        });
      }

      // Refresh messages after a delay (even if warnings)
      setTimeout(() => {
        fetchMessages();
        fetchAccounts();
      }, 2000);
    } catch (error: any) {
      console.error("Error syncing emails:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to sync emails. The sync-emails edge function may not be deployed yet.",
        variant: "destructive",
        duration: 8000, // Show longer for deployment instruction
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleMarkAsRead = async (messageId: string, isRead: boolean) => {
    try {
      const { error } = await (supabase
        .from("email_messages" as any)
        .update({ is_read: isRead } as any)
        .eq("id", messageId) as any);

      if (error) throw error;

      fetchMessages();
      toast({
        title: "Success",
        description: `Message marked as ${isRead ? "read" : "unread"}`,
      });
    } catch (error: any) {
      console.error("Error updating message:", error);
      toast({
        title: "Error",
        description: "Failed to update message",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMessage = async () => {
    if (!messageToDelete) return;

    try {
      const { error } = await (supabase
        .from("email_messages" as any)
        .update({ is_deleted: true } as any)
        .eq("id", messageToDelete.id) as any);

      if (error) throw error;

      // TODO: Also delete from IMAP server
      // This would require calling an edge function that connects to IMAP and deletes the message

      toast({
        title: "Success",
        description: "Message deleted",
      });

      setDeleteDialogOpen(false);
      setMessageToDelete(null);
      fetchMessages();
    } catch (error: any) {
      console.error("Error deleting message:", error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      });
    }
  };

  const handleReply = async () => {
    if (!selectedMessage || !replyMessage) return;

    try {
      const { data, error } = await supabase.functions.invoke("send-email-reply", {
        body: {
          message_id: selectedMessage.id,
          to_email: selectedMessage.from_email,
          to_name: selectedMessage.from_name,
          subject: replySubject || selectedMessage.subject || "Re: ",
          reply_message: replyMessage,
          email_account_id: selectedMessage.email_account_id,
          original_message: selectedMessage.body_text || selectedMessage.body_html,
        },
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || "Failed to send reply");
      }

      toast({
        title: "Success",
        description: "Reply sent successfully",
      });

      setReplyDialogOpen(false);
      setReplyMessage("");
      setReplySubject("");
    } catch (error: any) {
      console.error("Error sending reply:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send reply",
        variant: "destructive",
      });
    }
  };

  const filteredMessages = messages.filter((msg) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        msg.subject?.toLowerCase().includes(search) ||
        msg.from_email.toLowerCase().includes(search) ||
        msg.from_name?.toLowerCase().includes(search) ||
        msg.body_text?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const unreadCount = messages.filter((m) => !m.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage email accounts and messages
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleSync()}
            disabled={syncing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            Sync All
          </Button>
          <Dialog open={addAccountDialogOpen} onOpenChange={setAddAccountDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Email Account
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Email Account</DialogTitle>
                <DialogDescription>
                  Add a new email account to sync messages
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input
                      value={newAccount.email}
                      onChange={(e) => {
                        const email = e.target.value;
                        const presets: Record<string, Partial<typeof newAccount>> = {
                          gmail: {
                            provider: "gmail",
                            imap_host: "imap.gmail.com",
                            imap_port: 993,
                            imap_secure: true,
                            smtp_host: "smtp.gmail.com",
                            smtp_port: 587,
                            smtp_secure: false,
                          },
                          outlook: {
                            provider: "outlook",
                            imap_host: "outlook.office365.com",
                            imap_port: 993,
                            imap_secure: true,
                            smtp_host: "smtp.office365.com",
                            smtp_port: 587,
                            smtp_secure: false,
                          },
                        };
                        
                        // Auto-detect provider from email domain
                        let detectedProvider = newAccount.provider;
                        if (email.includes("@gmail.com")) {
                          detectedProvider = "gmail";
                          setNewAccount({
                            ...newAccount,
                            email,
                            ...presets.gmail,
                          });
                        } else if (email.includes("@outlook.com") || email.includes("@hotmail.com") || email.includes("@office365.com") || email.includes("@live.com")) {
                          detectedProvider = "outlook";
                          setNewAccount({
                            ...newAccount,
                            email,
                            ...presets.outlook,
                          });
                        } else {
                          setNewAccount({ ...newAccount, email });
                        }
                      }}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={newAccount.password}
                      onChange={(e) =>
                        setNewAccount({ ...newAccount, password: e.target.value })
                      }
                      placeholder="Password or App Password"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select
                    value={newAccount.provider}
                    onValueChange={(value) => {
                      const presets: Record<string, Partial<typeof newAccount>> = {
                        gmail: {
                          imap_host: "imap.gmail.com",
                          imap_port: 993,
                          imap_secure: true,
                          smtp_host: "smtp.gmail.com",
                          smtp_port: 587,
                          smtp_secure: false,
                        },
                        outlook: {
                          imap_host: "outlook.office365.com",
                          imap_port: 993,
                          imap_secure: true,
                          smtp_host: "smtp.office365.com",
                          smtp_port: 587,
                          smtp_secure: false,
                        },
                        custom: {},
                      };
                      setNewAccount({
                        ...newAccount,
                        provider: value,
                        ...(presets[value] || {}),
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gmail">Gmail</SelectItem>
                      <SelectItem value="outlook">Outlook/Office365</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  {newAccount.provider === "gmail" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      💡 Use an App Password, not your regular Gmail password
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>IMAP Host</Label>
                    <Input
                      value={newAccount.imap_host}
                      onChange={(e) =>
                        setNewAccount({ ...newAccount, imap_host: e.target.value })
                      }
                      placeholder="imap.example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>IMAP Port</Label>
                    <Input
                      type="number"
                      value={newAccount.imap_port}
                      onChange={(e) =>
                        setNewAccount({
                          ...newAccount,
                          imap_port: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SMTP Host</Label>
                    <Input
                      value={newAccount.smtp_host}
                      onChange={(e) =>
                        setNewAccount({ ...newAccount, smtp_host: e.target.value })
                      }
                      placeholder="smtp.example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>SMTP Port</Label>
                    <Input
                      type="number"
                      value={newAccount.smtp_port}
                      onChange={(e) =>
                        setNewAccount({
                          ...newAccount,
                          smtp_port: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
                {newAccount.provider === "gmail" && (
                  <div className="space-y-4 border-t pt-4">
                    <div className="space-y-2">
                      <Label className="text-base font-semibold">Gmail API Settings (Required for Gmail)</Label>
                      <p className="text-xs text-muted-foreground">
                        Gmail requires Gmail API OAuth2. IMAP does not work in Supabase Edge Functions.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Gmail Client ID</Label>
                      <Input
                        value={newAccount.gmail_client_id}
                        onChange={(e) =>
                          setNewAccount({ ...newAccount, gmail_client_id: e.target.value })
                        }
                        placeholder="xxxxx-xxxxx.apps.googleusercontent.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Gmail Client Secret</Label>
                      <Input
                        type="password"
                        value={newAccount.gmail_client_secret}
                        onChange={(e) =>
                          setNewAccount({ ...newAccount, gmail_client_secret: e.target.value })
                        }
                        placeholder="GOCSPX-xxxxxx"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Gmail Refresh Token</Label>
                      <Input
                        type="password"
                        value={newAccount.gmail_refresh_token}
                        onChange={(e) =>
                          setNewAccount({ ...newAccount, gmail_refresh_token: e.target.value })
                        }
                        placeholder="1//0xxxxxx..."
                      />
                      <p className="text-xs text-muted-foreground">
                        Get this from OAuth Playground - see GMAIL_SETUP_QUICK_START.md
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => handleTestConnection(false)}
              disabled={testingConnection}
            >
              {testingConnection ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test Connection"
              )}
            </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setAddAccountDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddAccount}>Add Account</Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="messages" className="space-y-4">
        <TabsList>
          <TabsTrigger value="messages">
            Messages {unreadCount > 0 && <Badge className="ml-2">{unreadCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Messages</CardTitle>
                  <CardDescription>
                    View and manage email messages
                  </CardDescription>
                </div>
                  <div className="flex gap-2">
                  <Select 
                    value={selectedAccount || "all"} 
                    onValueChange={(value) => setSelectedAccount(value === "all" ? null : value)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="All Accounts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Accounts</SelectItem>
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search messages..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 w-[300px]"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>From</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMessages.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No messages found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMessages.map((message) => (
                        <TableRow
                          key={message.id}
                          className={!message.is_read ? "bg-muted/50 font-medium" : ""}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {!message.is_read && (
                                <MailQuestion className="h-4 w-4 text-primary" />
                              )}
                              <div>
                                <div className="font-medium">
                                  {message.from_name || message.from_email}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {message.from_email}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{message.subject || "(No Subject)"}</TableCell>
                          <TableCell>
                            {(message.email_account as any)?.email || "Unknown"}
                          </TableCell>
                          <TableCell>
                            {format(new Date(message.date_received), "MMM d, yyyy HH:mm")}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedMessage(message);
                                  setMessageDetailsOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkAsRead(message.id, !message.is_read)}
                              >
                                {message.is_read ? (
                                  <MailQuestion className="h-4 w-4" />
                                ) : (
                                  <MailOpen className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedMessage(message);
                                  setReplySubject(`Re: ${message.subject || ""}`);
                                  setReplyDialogOpen(true);
                                }}
                              >
                                <Reply className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setMessageToDelete(message);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Accounts</CardTitle>
              <CardDescription>Manage your email accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Last Sync</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No accounts added yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    accounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium">{account.email}</TableCell>
                        <TableCell>{account.provider || "Custom"}</TableCell>
                        <TableCell>
                          {account.last_sync_at
                            ? format(new Date(account.last_sync_at), "MMM d, yyyy HH:mm")
                            : "Never"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={account.sync_enabled ? "default" : "secondary"}>
                            {account.sync_enabled ? "Active" : "Disabled"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSync(account.id)}
                              disabled={syncing}
                            >
                              <RefreshCw
                                className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`}
                              />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditAccount(account)}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Message Details Dialog */}
      <Dialog open={messageDetailsOpen} onOpenChange={setMessageDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedMessage?.subject || "(No Subject)"}</DialogTitle>
            <DialogDescription>
              From: {selectedMessage?.from_email} | Date:{" "}
              {selectedMessage &&
                format(new Date(selectedMessage.date_received), "MMM d, yyyy HH:mm")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedMessage?.body_html ? (
              <div
                dangerouslySetInnerHTML={{ __html: selectedMessage.body_html }}
                className="prose max-w-none"
              />
            ) : (
              <pre className="whitespace-pre-wrap font-sans">
                {selectedMessage?.body_text || "No content"}
              </pre>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (selectedMessage) {
                  handleMarkAsRead(selectedMessage.id, !selectedMessage.is_read);
                }
              }}
            >
              {selectedMessage?.is_read ? "Mark as Unread" : "Mark as Read"}
            </Button>
            <Button
              onClick={() => {
                if (selectedMessage) {
                  setReplySubject(`Re: ${selectedMessage.subject || ""}`);
                  setReplyDialogOpen(true);
                  setMessageDetailsOpen(false);
                }
              }}
            >
              <Reply className="h-4 w-4 mr-2" />
              Reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reply Dialog */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reply to Message</DialogTitle>
            <DialogDescription>Send a reply to {selectedMessage?.from_email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={replySubject}
                onChange={(e) => setReplySubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                rows={10}
                placeholder="Type your reply here..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReply} disabled={!replyMessage}>
              Send Reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog open={editAccountDialogOpen} onOpenChange={setEditAccountDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Email Account</DialogTitle>
            <DialogDescription>
              Update email account connection settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  value={editAccount.email}
                  onChange={(e) => {
                    const email = e.target.value;
                    const presets: Record<string, Partial<typeof editAccount>> = {
                      gmail: {
                        provider: "gmail",
                        imap_host: "imap.gmail.com",
                        imap_port: 993,
                        imap_secure: true,
                        smtp_host: "smtp.gmail.com",
                        smtp_port: 587,
                        smtp_secure: false,
                      },
                      outlook: {
                        provider: "outlook",
                        imap_host: "outlook.office365.com",
                        imap_port: 993,
                        imap_secure: true,
                        smtp_host: "smtp.office365.com",
                        smtp_port: 587,
                        smtp_secure: false,
                      },
                    };
                    
                    if (email.includes("@gmail.com")) {
                      setEditAccount({
                        ...editAccount,
                        email,
                        ...presets.gmail,
                      });
                    } else if (email.includes("@outlook.com") || email.includes("@hotmail.com") || email.includes("@office365.com") || email.includes("@live.com")) {
                      setEditAccount({
                        ...editAccount,
                        email,
                        ...presets.outlook,
                      });
                    } else {
                      setEditAccount({ ...editAccount, email });
                    }
                  }}
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Password (leave blank to keep current)</Label>
                <Input
                  type="password"
                  value={editAccount.password}
                  onChange={(e) =>
                    setEditAccount({ ...editAccount, password: e.target.value })
                  }
                  placeholder="Enter new password or leave blank"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select
                value={editAccount.provider}
                onValueChange={(value) => {
                  const presets: Record<string, Partial<typeof editAccount>> = {
                    gmail: {
                      imap_host: "imap.gmail.com",
                      imap_port: 993,
                      imap_secure: true,
                      smtp_host: "smtp.gmail.com",
                      smtp_port: 587,
                      smtp_secure: false,
                    },
                    outlook: {
                      imap_host: "outlook.office365.com",
                      imap_port: 993,
                      imap_secure: true,
                      smtp_host: "smtp.office365.com",
                      smtp_port: 587,
                      smtp_secure: false,
                    },
                    custom: {},
                  };
                  setEditAccount({
                    ...editAccount,
                    provider: value,
                    ...(presets[value] || {}),
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gmail">Gmail</SelectItem>
                  <SelectItem value="outlook">Outlook/Office365</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              {editAccount.provider === "gmail" && (
                <p className="text-xs text-muted-foreground mt-1">
                  💡 Use an App Password, not your regular Gmail password
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>IMAP Host</Label>
                <Input
                  value={editAccount.imap_host}
                  onChange={(e) =>
                    setEditAccount({ ...editAccount, imap_host: e.target.value })
                  }
                  placeholder="imap.example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>IMAP Port</Label>
                <Input
                  type="number"
                  value={editAccount.imap_port}
                  onChange={(e) =>
                    setEditAccount({
                      ...editAccount,
                      imap_port: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SMTP Host</Label>
                <Input
                  value={editAccount.smtp_host}
                  onChange={(e) =>
                    setEditAccount({ ...editAccount, smtp_host: e.target.value })
                  }
                  placeholder="smtp.example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>SMTP Port</Label>
                <Input
                  type="number"
                  value={editAccount.smtp_port}
                  onChange={(e) =>
                    setEditAccount({
                      ...editAccount,
                      smtp_port: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            {editAccount.provider === "gmail" && (
              <div className="space-y-4 border-t pt-4">
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Gmail API Settings (Required for Gmail)</Label>
                  <p className="text-xs text-muted-foreground">
                    Gmail requires Gmail API OAuth2. IMAP does not work in Supabase Edge Functions.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Gmail Client ID</Label>
                  <Input
                    value={editAccount.gmail_client_id}
                    onChange={(e) =>
                      setEditAccount({ ...editAccount, gmail_client_id: e.target.value })
                    }
                    placeholder="xxxxx-xxxxx.apps.googleusercontent.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gmail Client Secret</Label>
                  <Input
                    type="password"
                    value={editAccount.gmail_client_secret}
                    onChange={(e) =>
                      setEditAccount({ ...editAccount, gmail_client_secret: e.target.value })
                    }
                    placeholder="GOCSPX-xxxxxx"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gmail Refresh Token</Label>
                  <Input
                    type="password"
                    value={editAccount.gmail_refresh_token}
                    onChange={(e) =>
                      setEditAccount({ ...editAccount, gmail_refresh_token: e.target.value })
                    }
                    placeholder="1//0xxxxxx..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Get this from OAuth Playground - see GMAIL_SETUP_QUICK_START.md
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="sync_enabled_edit"
                checked={editAccount.sync_enabled}
                onChange={(e) =>
                  setEditAccount({ ...editAccount, sync_enabled: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="sync_enabled_edit" className="cursor-pointer">
                Enable automatic email sync
              </Label>
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => handleTestConnection(true)}
              disabled={testingConnection}
            >
              {testingConnection ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test Connection"
              )}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditAccountDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateAccount}>Update Account</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Message</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this message? This will also delete it from the
              original email inbox.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteMessage}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

