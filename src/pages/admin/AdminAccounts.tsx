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
  CreditCard, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2,
  Plus,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Activity,
  Loader2,
  User,
  BarChart3,
  CheckCircle,
  XCircle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { 
  authenticateAsAdmin, 
  pocketbase,
  type PocketBaseAccount 
} from "@/integrations/pocketbase/client";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AccountWithUser extends Omit<PocketBaseAccount, 'user'> {
  user: string; // Keep the original user ID
  userInfo?: {
    email: string;
    name?: string;
  };
}

interface SupabaseUser {
  user_id: string;
  email?: string;
  full_name?: string;
  status: string;
}

export default function AdminAccounts() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<AccountWithUser[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<AccountWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedAccount, setSelectedAccount] = useState<AccountWithUser | null>(null);
  const [accountDetailsOpen, setAccountDetailsOpen] = useState(false);
  
  // Add Account Dialog State
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [supabaseUsers, setSupabaseUsers] = useState<SupabaseUser[]>([]);
  const [selectedUserEmail, setSelectedUserEmail] = useState("");
  const [newAccount, setNewAccount] = useState({
    name: "",
    meta_trader_id: "",
    balance: 0,
    status: "ACTIVE"
  });
  const [creatingAccount, setCreatingAccount] = useState(false);

  useEffect(() => {
    fetchAccounts();
    fetchSupabaseUsers();
  }, []);

  useEffect(() => {
    filterAccounts();
  }, [accounts, searchTerm, statusFilter]);

  const fetchSupabaseUsers = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('status', 'verified')
        .order('full_name');

      if (error) throw error;

      const users: SupabaseUser[] = profiles?.map(profile => ({
        user_id: profile.user_id,
        email: profile.user_id, // Using user_id as email since we can't access auth.users
        full_name: profile.full_name || 'Unknown',
        status: 'verified'
      })) || [];

      setSupabaseUsers(users);
    } catch (error) {
      console.error('Error fetching Supabase users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    }
  };

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      
      // Authenticate as admin
      await authenticateAsAdmin();

      // Fetch all accounts from PocketBase
      const accountsResponse = await pocketbase.collection('accounts').getList(1, 1000, {
        sort: '-created',
        expand: 'user'
      });

      // Fetch all users from PocketBase to get email addresses
      const usersResponse = await pocketbase.collection('users').getList(1, 1000);

      // Combine account data with user information
      const accountsWithUsers: AccountWithUser[] = accountsResponse.items.map(account => {
        const user = usersResponse.items.find(user => user.id === account.user);
        return {
          id: account.id,
          name: account.name,
          meta_trader_id: account.meta_trader_id,
          balance: account.balance,
          equity: account.equity,
          margin: account.margin,
          total_pnl: account.total_pnl,
          status: account.status,
          user: account.user,
          created: account.created,
          updated: account.updated,
          expire_date: account.expire_date,
          symbols: account.symbols,
          collaborators: account.collaborators,
          config: account.config,
          userInfo: {
            email: user?.email || 'Unknown',
            name: user?.name || 'Unknown'
          }
        };
      });

      setAccounts(accountsWithUsers);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch accounts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAccounts = () => {
    let filtered = accounts;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(account =>
        account.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.userInfo?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.meta_trader_id?.toString().includes(searchTerm)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(account => account.status === statusFilter);
    }

    setFilteredAccounts(filtered);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getPnlColor = (pnl: number) => {
    return pnl >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getPnlIcon = (pnl: number) => {
    return pnl >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;
  };

  const calculateTotalValue = () => {
    return accounts.reduce((sum, account) => sum + (account.balance || 0), 0);
  };

  const calculateTotalPnl = () => {
    return accounts.reduce((sum, account) => sum + (account.total_pnl || 0), 0);
  };

  const getActiveAccountsCount = () => {
    return accounts.filter(account => account.status === 'ACTIVE').length;
  };

  const handleCreateAccount = async () => {
    if (!selectedUserEmail || !newAccount.name || !newAccount.meta_trader_id) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreatingAccount(true);

      // Find user ID from email
      const selectedUser = supabaseUsers.find(user => user.email === selectedUserEmail);
      if (!selectedUser) {
        throw new Error('Selected user not found');
      }

      // Authenticate as admin
      await authenticateAsAdmin();

      // First, check if user exists in PocketBase, if not create them
      let pocketbaseUser;
      try {
        const existingUser = await pocketbase.collection('users').getFirstListItem(`email = "${selectedUserEmail}"`);
        pocketbaseUser = existingUser;
      } catch (error) {
        // User doesn't exist in PocketBase, create them
        const userData = {
          email: selectedUserEmail,
          name: selectedUser.full_name || selectedUserEmail,
          active: true,
          verified: true
        };
        pocketbaseUser = await pocketbase.collection('users').create(userData);
      }

      // Create account in PocketBase
      const accountData = {
        name: newAccount.name,
        meta_trader_id: newAccount.meta_trader_id,
        balance: newAccount.balance,
        equity: newAccount.balance, // Initially same as balance
        margin: 0,
        total_pnl: 0,
        status: newAccount.status,
        user: pocketbaseUser.id,
        symbols: [],
        collaborators: [],
        config: {}
      };

      const createdAccount = await pocketbase.collection('accounts').create(accountData);

      toast({
        title: "Success",
        description: "Account created successfully",
      });

      // Reset form and close dialog
      setNewAccount({
        name: "",
        meta_trader_id: "",
        balance: 0,
        status: "ACTIVE"
      });
      setSelectedUserEmail("");
      setAddAccountOpen(false);

      // Refresh accounts list
      await fetchAccounts();

    } catch (error) {
      console.error('Error creating account:', error);
      toast({
        title: "Error",
        description: "Failed to create account",
        variant: "destructive",
      });
    } finally {
      setCreatingAccount(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2 text-white pt-5">Loading Accounts</h2>
          <p className="text-muted-foreground">Fetching trading accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="block sm:flex items items-center justify-between">
        <div className="mb-4 sm:mb-0">
          <h1 className="text-3xl font-bold text-white">Trading Accounts</h1>
          <p className="text-muted-foreground mt-2">
            Manage MetaTrader trading accounts
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" className="gap-0 rounded-[8px] hover:bg-white/80 border-0">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={addAccountOpen} onOpenChange={setAddAccountOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-0 rounded-[8px] hover:bg-primary/80 border-0">
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[340px] rounded-md sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Trading Account</DialogTitle>
                <DialogDescription>
                  Create a new MetaTrader trading account for a user
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="user">Select User *</Label>
                  <Select value={selectedUserEmail} onValueChange={setSelectedUserEmail}>
                    <SelectTrigger className='rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400' style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }>
                      <SelectValue placeholder="Choose a user" />
                    </SelectTrigger>
                    <SelectContent className='border-secondary-foreground bg-black/90 text-white'>
                      {supabaseUsers.map((user) => (
                        <SelectItem key={user.user_id} value={user.email}>
                          {user.email} {user.full_name && `(${user.full_name})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="name">Account Name *</Label>
                  <Input
                    id="name"
                    placeholder="Enter account name"
                    value={newAccount.name}
                    className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none"
                    style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
                    onChange={(e) => setNewAccount(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="meta_trader_id">MetaTrader ID *</Label>
                  <Input
                    id="meta_trader_id"
                    placeholder="Enter MetaTrader account ID"
                    value={newAccount.meta_trader_id}
                   className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none"
                    style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
                    onChange={(e) => setNewAccount(prev => ({ ...prev, meta_trader_id: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="balance">Initial Balance</Label>
                  <Input
                    id="balance"
                    type="number"
                    placeholder="Enter initial balance"
                    value={newAccount.balance}
                     className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none"
                    style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
                    onChange={(e) => setNewAccount(prev => ({ ...prev, balance: parseFloat(e.target.value) || 0 }))}
                  />
                </div>

                <div>
                  <Label htmlFor="status">Account Status</Label>
                  <Select 
                    value={newAccount.status} 
                    onValueChange={(value) => setNewAccount(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className='mt-1 rounded-[8px] shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className='border-secondary-foreground bg-black/90 text-white'>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                      <SelectItem value="SUSPENDED">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  className="rounded-[8px] border-0 hover:bg-muted/20"
                  onClick={() => setAddAccountOpen(false)}
                  disabled={creatingAccount}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateAccount}
                   className="mb-3 sm:mb-0 rounded-[8px] hover:bg-primary/80"
                  disabled={creatingAccount || !selectedUserEmail || !newAccount.name || !newAccount.meta_trader_id}
                >
                  {creatingAccount ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-1" />
                  )}
                  Create Account
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border border-muted/20 p-0 rounded-lg bg-white/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Total Accounts</CardTitle>
            <CreditCard className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{accounts.length}</div>
            <p className="text-sm text-muted-foreground">
              {getActiveAccountsCount()} active
            </p>
          </CardContent>
        </Card>

        <Card className="border border-muted/20 p-0 rounded-lg bg-white/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Total Value</CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold  text-white">{formatCurrency(calculateTotalValue())}</div>
            <p className="text-sm text-muted-foreground">
              Portfolio value
            </p>
          </CardContent>
        </Card>

        <Card className="border border-muted/20 p-0 rounded-lg bg-white/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Total P&L</CardTitle>
            <BarChart3 className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold  text-white ${getPnlColor(calculateTotalPnl())}`}>
              {formatCurrency(calculateTotalPnl())}
            </div>
            <p className="text-sm text-muted-foreground">
              Profit/Loss
            </p>
          </CardContent>
        </Card>

        <Card className="border border-muted/20 p-0 rounded-lg bg-white/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Active Users</CardTitle>
            <User className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold  text-white">
              {new Set(accounts.map(acc => acc.userInfo?.email)).size}
            </div>
            <p className="text-sm text-muted-foreground">
              With accounts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border border-muted/20 p-0 rounded-lg bg-white/5">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Search and filter trading accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-4 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search accounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 rounded-[8px] border-0 shadow-none mt-1 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent resize-none"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className='mt-1 rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className='border-secondary-foreground bg-black/90 text-white'>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="py-2 px-4 rounded-[8px] h-[36px]">
                {filteredAccounts.length} accounts
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accounts List */}
      <Card className="border border-muted/20 p-0 rounded-lg bg-white/5">
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
          <CardDescription>
            All MetaTrader trading accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredAccounts.length > 0 ? (
              filteredAccounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-medium">{account.name || `Account ${account.meta_trader_id}`}</p>
                        {getStatusBadge(account.status || 'unknown')}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {account.userInfo?.email || 'Unknown user'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ID: {account.meta_trader_id} • Created: {formatDate(account.created)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(account.balance || 0)}</p>
                      <div className={`flex items-center space-x-1 text-sm ${getPnlColor(account.total_pnl || 0)}`}>
                        {getPnlIcon(account.total_pnl || 0)}
                        <span>{formatCurrency(account.total_pnl || 0)}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedAccount(account);
                        setAccountDetailsOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">No accounts found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

             {/* Account Details Dialog */}
       <Dialog open={accountDetailsOpen} onOpenChange={setAccountDetailsOpen}>
         <DialogContent className="max-w-md">
           <DialogHeader>
             <DialogTitle>Account Details</DialogTitle>
             <DialogDescription>
               View detailed information about this trading account.
             </DialogDescription>
           </DialogHeader>
          {selectedAccount && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{selectedAccount.name || `Account ${selectedAccount.meta_trader_id}`}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedAccount.userInfo?.email || 'Unknown user'}
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Account ID:</span>
                  <span className="text-sm font-medium">{selectedAccount.meta_trader_id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  {getStatusBadge(selectedAccount.status || 'unknown')}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Balance:</span>
                  <span className="text-sm font-medium">{formatCurrency(selectedAccount.balance || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Equity:</span>
                  <span className="text-sm font-medium">{formatCurrency(selectedAccount.equity || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">P&L:</span>
                  <div className={`flex items-center space-x-1 text-sm font-medium ${getPnlColor(selectedAccount.total_pnl || 0)}`}>
                    {getPnlIcon(selectedAccount.total_pnl || 0)}
                    <span>{formatCurrency(selectedAccount.total_pnl || 0)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Margin:</span>
                  <span className="text-sm font-medium">{formatCurrency(selectedAccount.margin || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Created:</span>
                  <span className="text-sm">{formatDate(selectedAccount.created)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Updated:</span>
                  <span className="text-sm">{formatDate(selectedAccount.updated)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Account
                </Button>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
