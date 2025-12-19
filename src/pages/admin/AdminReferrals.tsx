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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  Users, 
  Search, 
  Plus, 
  Eye, 
  Edit, 
  Trash2,
  Download,
  Calendar,
  MapPin,
  Phone,
  Mail,
  DollarSign,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  RefreshCw,
  FileText,
  ExternalLink,
  TrendingUp,
  BarChart3,
  Target,
  Award,
  Zap,
  Clock,
  Share2,
  Copy,
  Filter,
  MoreHorizontal,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Referral {
  id: string;
  user_id: string;
  referral_code: string;
  referral_link: string;
  is_active: boolean;
  status: 'pending' | 'deposited' | 'earning' | 'completed';
  total_referrals: number;
  total_earnings: number;
  year_to_date_earnings: number;
  initial_deposit?: number;
  deposit_date?: string;
  created_at: string;
  updated_at: string;
  user?: {
    email: string;
    full_name?: string;
  };
}

interface ReferralPayment {
  id: string;
  referral_id: string;
  amount: number;
  payment_date: string;
  notes?: string;
  created_at: string;
}

interface ReferralSignup {
  id: string;
  referral_id: string;
  referred_user_id: string;
  signup_date: string;
  deposit_amount?: number;
  deposit_date?: string;
  created_at: string;
  referred_user?: {
    email: string;
    full_name?: string;
  };
}

interface ReferralStats {
  totalReferrals: number;
  totalEarnings: number;
  activeReferrals: number;
  pendingReferrals: number;
  topEarner: {
    user_id: string;
    email: string;
    full_name?: string;
    total_earnings: number;
  } | null;
}

export default function AdminReferrals() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { toast } = useToast();
  
  // State for referrals
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [filteredReferrals, setFilteredReferrals] = useState<Referral[]>([]);
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [referralDetailsOpen, setReferralDetailsOpen] = useState(false);
  
  // State for payments
  const [payments, setPayments] = useState<ReferralPayment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<ReferralPayment[]>([]);
  
  // State for signups
  const [signups, setSignups] = useState<ReferralSignup[]>([]);
  const [filteredSignups, setFilteredSignups] = useState<ReferralSignup[]>([]);
  
  // Common state
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"referrals" | "payments" | "signups" | "analytics">("referrals");
  
  // Stats state
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    totalEarnings: 0,
    activeReferrals: 0,
    pendingReferrals: 0,
    topEarner: null
  });
  
  // Payment management state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [newPayment, setNewPayment] = useState({
    referral_id: "",
    amount: "",
    notes: ""
  });
  const [creatingPayment, setCreatingPayment] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (activeTab === "referrals") {
      filterReferrals();
    } else if (activeTab === "payments") {
      filterPayments();
    } else if (activeTab === "signups") {
      filterSignups();
    }
  }, [referrals, payments, signups, searchTerm, statusFilter, activeTab]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchReferrals(),
        fetchPayments(),
        fetchSignups()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch referral data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchReferrals = async () => {
    try {
      // Fetch referrals and profiles separately and join on user_id in the client
      const [{ data: referralsData, error: referralsError }, { data: profilesData, error: profilesError }] =
        await Promise.all([
          supabase
            .from('referrals')
            .select('*')
            .order('created_at', { ascending: false }),
          supabase
            .from('profiles')
            .select('*')
        ]);

      if (referralsError) {
        throw referralsError;
      }
      if (profilesError) {
        console.error('Error fetching profiles for referrals:', profilesError);
      }

      const profileMap = new Map(
        (profilesData || []).map((profile: any) => [
          profile.user_id,
          {
            full_name: profile.full_name || 'Unknown',
            // Use email column if present, otherwise fall back to user_id
            email: profile.email || profile.user_id,
          },
        ])
      );

      const referralsWithUserInfo: Referral[] =
        (referralsData || []).map((referral: any) => {
          const userInfo = profileMap.get(referral.user_id);
          return {
            ...referral,
            user: userInfo || {
              email: referral.user_id,
              full_name: 'Unknown',
            },
          } as Referral;
        });

      setReferrals(referralsWithUserInfo);
      calculateStats(referralsWithUserInfo);
    } catch (error) {
      console.error('Error fetching referrals:', error);
      setReferrals([]);
      calculateStats([]);
    }
  };

  const fetchPayments = async () => {
    try {
      const { data: paymentsData, error } = await supabase
        .from('referral_payments')
        .select(`
          *,
          referral:referrals!referral_payments_referral_id_fkey(
            user_id,
            referral_code,
            user:profiles!referrals_user_id_fkey(user_id, full_name)
          )
        `)
        .order('payment_date', { ascending: false });

      if (error) {
        console.error('Error fetching payments:', error);
        // Fallback to simple select
        const { data: simpleData, error: simpleError } = await supabase
          .from('referral_payments')
          .select('*')
          .order('payment_date', { ascending: false });

        if (simpleError) throw simpleError;
        setPayments(simpleData || []);
        return;
      }

      setPayments(paymentsData || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      setPayments([]);
    }
  };

  const fetchSignups = async () => {
    try {
      // Fetch signups and profiles separately and join on referred_user_id in the client
      const [{ data: signupsData, error: signupsError }, { data: profilesData, error: profilesError }] =
        await Promise.all([
          supabase
            .from('referral_signups')
            .select('*')
            .order('signup_date', { ascending: false }),
          supabase
            .from('profiles')
            .select('*')
        ]);

      if (signupsError) {
        throw signupsError;
      }
      if (profilesError) {
        console.error('Error fetching profiles for signups:', profilesError);
      }

      const profileMap = new Map(
        (profilesData || []).map((profile: any) => [
          profile.user_id,
          {
            full_name: profile.full_name || 'Unknown',
            email: profile.email || profile.user_id,
          },
        ])
      );

      const signupsWithUserInfo: ReferralSignup[] =
        (signupsData || []).map((signup: any) => {
          const userInfo = profileMap.get(signup.referred_user_id);
          return {
            ...signup,
            referred_user: userInfo || {
              email: signup.referred_user_id,
              full_name: 'Unknown',
            },
          } as ReferralSignup;
        });

      setSignups(signupsWithUserInfo);
    } catch (error) {
      console.error('Error fetching signups:', error);
      setSignups([]);
    }
  };

  const calculateStats = (sourceReferrals: Referral[]) => {
    try {
      // Calculate basic stats from referrals data
      const totalReferrals = sourceReferrals.length;
      const totalEarnings = sourceReferrals.reduce((sum, r) => sum + r.total_earnings, 0);
      const activeReferrals = sourceReferrals.filter(r => r.is_active).length;
      const pendingReferrals = sourceReferrals.filter(r => r.status === 'pending').length;
      
      // Find top earner (always pick one if there is at least 1 referral)
      const topEarner: Referral | null = sourceReferrals.length
        ? sourceReferrals.reduce((top, current) =>
            current.total_earnings > top.total_earnings ? current : top
          )
        : null;

      setStats({
        totalReferrals,
        totalEarnings,
        activeReferrals,
        pendingReferrals,
        topEarner: topEarner
          ? {
              user_id: topEarner.user_id,
              email: topEarner.user?.email || 'Unknown',
              full_name: topEarner.user?.full_name || 'Unknown',
              total_earnings: topEarner.total_earnings,
            }
          : null,
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
    }
  };

  const filterReferrals = () => {
    let filtered = referrals;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(referral =>
        referral.referral_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        referral.user?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        referral.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(referral => referral.status === statusFilter);
    }

    setFilteredReferrals(filtered);
  };

  const filterPayments = () => {
    let filtered = payments;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(payment =>
        payment.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.amount.toString().includes(searchTerm)
      );
    }

    setFilteredPayments(filtered);
  };

  const filterSignups = () => {
    let filtered = signups;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(signup =>
        signup.referred_user?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        signup.referred_user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredSignups(filtered);
  };

  const handleCreatePayment = async () => {
    if (!newPayment.referral_id || !newPayment.amount) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreatingPayment(true);

      const { error } = await supabase
        .from('referral_payments')
        .insert({
          referral_id: newPayment.referral_id,
          amount: parseFloat(newPayment.amount),
          notes: newPayment.notes || null,
          payment_date: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });

      // Reset form
      setNewPayment({
        referral_id: "",
        amount: "",
        notes: ""
      });
      setPaymentDialogOpen(false);

      // Refresh data
      await fetchPayments();
      await fetchReferrals();

    } catch (error) {
      console.error('Error creating payment:', error);
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive",
      });
    } finally {
      setCreatingPayment(false);
    }
  };

  const handleToggleReferralStatus = async (referral: Referral) => {
    try {
      const { error } = await supabase
        .from('referrals')
        .update({ is_active: !referral.is_active })
        .eq('id', referral.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Referral ${referral.is_active ? 'deactivated' : 'activated'} successfully`,
      });

      await fetchReferrals();

    } catch (error) {
      console.error('Error updating referral status:', error);
      toast({
        title: "Error",
        description: "Failed to update referral status",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
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
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'deposited':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Deposited</Badge>;
      case 'earning':
        return <Badge variant="default" className="bg-green-100 text-green-800">Earning</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Completed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getActiveStatusBadge = (isActive: boolean) => {
    return isActive ? 
      <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge> :
      <Badge variant="secondary" className="bg-gray-100 text-gray-800">Inactive</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2 text-white pt-5">Loading Referrals </h2>
          <p className="text-muted-foreground">Fetching referral data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Referral Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage all user referrals, payments, and analytics
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-0 rounded-[8px] hover:bg-white/80 border-0">
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAllData}
            className="gap-0 rounded-[8px] hover:bg-white/80 border-0"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border border-muted/20 p-0 rounded-lg bg-white/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Total Referrals</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{filteredReferrals.length}</div>
            <p className="text-xs text-muted-foreground">
              All referral programs
            </p>
          </CardContent>
        </Card>

        <Card className="border border-muted/20 p-0 rounded-lg bg-white/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatCurrency(stats.totalEarnings)}</div>
            <p className="text-xs text-muted-foreground">
              Commission generated
            </p>
          </CardContent>
        </Card>

        <Card className="border border-muted/20 p-0 rounded-lg bg-white/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Active Referrals</CardTitle>
            <Target className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.activeReferrals}</div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>

        <Card className="border border-muted/20 p-0 rounded-lg bg-white/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Pending Referrals</CardTitle>
            <Clock className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.pendingReferrals}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting deposits
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Performer */}
      {stats.topEarner && (
        <Card className="border border-muted/20 p-0 rounded-lg bg-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              Top Performer
            </CardTitle>
            <CardDescription>
              Highest earning referral program
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">{stats.topEarner.full_name}</p>
                <p className="text-sm text-muted-foreground">{stats.topEarner.email}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.topEarner.total_earnings)}
                </p>
                <p className="text-sm text-muted-foreground">Total earnings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 bg-muted/20 rounded-lg">
          <TabsTrigger value="referrals" className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4" />
            Referrals ({referrals.length})
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2 mb-3">
            <DollarSign className="h-4 w-4" />
            Payments ({payments.length})
          </TabsTrigger>
          <TabsTrigger value="signups" className="flex items-center gap-2 mb-3">
            <User className="h-4 w-4" />
            Signups ({signups.length})
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Referrals Tab */}
        <TabsContent value="referrals" className="space-y-6 pt-4 sm:pt-0">
          {/* Filters */}
          <Card className="border border-muted/20 p-0 mt-3 sm:mt-0 rounded-lg bg-white/5">
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>
                Search and filter referrals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-4 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search referrals..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 rounded-[8px] border-0 shadow-none mt-1 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent resize-none"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className='mt-1 rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className='border-secondary-foreground bg-black/90 text-white'>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="deposited">Deposited</SelectItem>
                    <SelectItem value="earning">Earning</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center justify-center sm:justify-start">
                  <Badge variant="outline" className="rounded-[8px] h-10 mt-1">
                    {filteredReferrals.length} referrals
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Referrals List */}
          <Card className="border border-muted/20 p-0  rounded-lg bg-white/5">
            <CardHeader>
              <CardTitle>All Referrals</CardTitle>
              <CardDescription>
                Manage user referral programs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredReferrals.length > 0 ? (
                  filteredReferrals.map((referral) => (
                    <div key={referral.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-muted/20 rounded-lg gap-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                          <Share2 className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <p className="font-medium truncate text-white">
                              {referral.user?.full_name || 'Unknown User'}
                            </p>
                            {getStatusBadge(referral.status)}
                            {getActiveStatusBadge(referral.is_active)}
                          </div>
                          <p className="text-sm text-white mb-1 truncate">
                            {referral.user?.email || 'Unknown email'}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              {referral.total_referrals} referrals
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {formatCurrency(referral.total_earnings)}
                            </span>
                            <span>Code: {referral.referral_code}</span>
                            <span>Created: {formatDate(referral.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-[8px] bg-muted/20 hover:bg-muted/40 text-white hover:text-white"
                          onClick={() => {
                            setSelectedReferral(referral);
                            setReferralDetailsOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                       <Button
                          variant="ghost"
                          size="sm"
                          className={`rounded-[8px] ${
                            referral.is_active ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
                          }`}
                          onClick={() => handleToggleReferralStatus(referral)}
                        >
                          {referral.is_active ? (
                            <XCircle className="h-4 w-4 text-white" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-white" />
                          )}
                        </Button>

                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">No referrals found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-6 pt-4 sm:pt-0">
          {/* Filters */}
          <Card className="border border-muted/20 p-0 mt-3 sm:mt-0 rounded-lg bg-white/5">
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>
                Search and filter payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-4 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search payments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                   className="pl-9 rounded-[8px] border-0 shadow-none mt-1 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent resize-none"
                  />
                </div>
                <div className="flex items-center justify-center sm:justify-start">
                  <Badge variant="outline" className="rounded-[8px] h-10 mt-1">
                    {filteredPayments.length} payments
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payments List */}
          <Card className="border border-muted/20 p-0 rounded-lg bg-white/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Commission Payments</CardTitle>
                  <CardDescription>
                    All referral commission payments
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setPaymentDialogOpen(true)}
                  className="flex items-center gap-2 rounded-[8px] border-0 hover:bg-primary/80"
                >
                  <Plus className="h-4 w-4" />
                  Record Payment
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredPayments.length > 0 ? (
                  filteredPayments.map((payment) => (
                    <div key={payment.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-muted/20 rounded-lg gap-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <DollarSign className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <p className="font-medium">
                              {formatCurrency(payment.amount)}
                            </p>
                            <Badge variant="outline" className="bg-green-100 text-green-800">
                              Commission
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            Payment Date: {formatDate(payment.payment_date)}
                          </p>
                          {payment.notes && (
                            <p className="text-sm text-muted-foreground">
                              Notes: {payment.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <DollarSign className="h-12 w-12 text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">No payments found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Signups Tab */}
        <TabsContent value="signups" className="space-y-6 pt-4 sm:pt-0">
          {/* Filters */}
          <Card className="border border-muted/20 p-0 mt-3 sm:mt-0 rounded-lg bg-white/5">
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>
                Search and filter signups
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-4 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search signups..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 rounded-[8px] border-0 shadow-none mt-1 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent resize-none"
                  />
                </div>
                <div className="flex items-center justify-center sm:justify-start">
                  <Badge variant="outline" className="rounded-[8px] h-10 mt-1">
                    {filteredSignups.length} signups
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Signups List */}
          <Card className="border border-muted/20 p-0 rounded-lg bg-white/5">
            <CardHeader>
              <CardTitle>Referral Signups</CardTitle>
              <CardDescription>
                All users who signed up via referrals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredSignups.length > 0 ? (
                  filteredSignups.map((signup) => (
                    <div key={signup.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-muted/20 rounded-lg gap-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <p className="font-medium truncate text-white">
                              {signup.referred_user?.full_name || 'Unknown User'}
                            </p>
                            <Badge variant="outline" className="bg-blue-100 text-blue-800">
                              Referred
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1 truncate">
                            {signup.referred_user?.email || 'Unknown email'}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>Signup: {formatDate(signup.signup_date)}</span>
                            {signup.deposit_amount && (
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                Deposit: {formatCurrency(signup.deposit_amount)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <User className="h-12 w-12 mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground">No signups found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6 pt-4 sm:pt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Chart */}
            <Card className="border border-muted/20 p-0 mt-3 sm:mt-0 rounded-lg bg-white/5">
              <CardHeader>
                <CardTitle>Referral Performance</CardTitle>
                <CardDescription>
                  Monthly referral activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Chart coming soon</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Referrers */}
            <Card className="border border-muted/20 p-0 rounded-lg bg-white/5">
              <CardHeader>
                <CardTitle>Top Referrers</CardTitle>
                <CardDescription>
                  Highest performing referral programs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {referrals
                    .sort((a, b) => b.total_earnings - a.total_earnings)
                    .slice(0, 5)
                    .map((referral, index) => (
                      <div key={referral.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium">{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {referral.user?.full_name || 'Unknown'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {referral.total_referrals} referrals
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-sm">
                            {formatCurrency(referral.total_earnings)}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Referral Details Dialog */}
      <Dialog open={referralDetailsOpen} onOpenChange={setReferralDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Referral Details</DialogTitle>
            <DialogDescription>
              Detailed information about the referral program
            </DialogDescription>
          </DialogHeader>
          {selectedReferral && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                  <Share2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">
                    {selectedReferral.user?.full_name || 'Unknown User'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedReferral.user?.email || 'Unknown email'}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold border-b pb-2">Referral Information</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      {getStatusBadge(selectedReferral.status)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Active:</span>
                      {getActiveStatusBadge(selectedReferral.is_active)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Referral Code:</span>
                      <span className="text-sm font-medium">{selectedReferral.referral_code}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Referrals:</span>
                      <span className="text-sm font-medium">{selectedReferral.total_referrals}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Earnings:</span>
                      <span className="text-sm font-medium">{formatCurrency(selectedReferral.total_earnings)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">YTD Earnings:</span>
                      <span className="text-sm font-medium">{formatCurrency(selectedReferral.year_to_date_earnings)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold border-b pb-2">Timeline</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Created:</span>
                      <span className="text-sm font-medium">{formatDate(selectedReferral.created_at)}</span>
                    </div>
                    {selectedReferral.deposit_date && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">First Deposit:</span>
                        <span className="text-sm font-medium">{formatDate(selectedReferral.deposit_date)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Last Updated:</span>
                      <span className="text-sm font-medium">{formatDate(selectedReferral.updated_at)}</span>
                    </div>
                  </div>

                  {selectedReferral.initial_deposit && (
                    <div className="mt-4">
                      <span className="text-sm text-muted-foreground">Initial Deposit:</span>
                      <p className="text-sm font-medium">{formatCurrency(selectedReferral.initial_deposit)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Referral Link */}
              <div className="space-y-4">
                <h3 className="font-semibold border-b pb-2">Referral Link</h3>
                <div className="flex items-center space-x-2">
                  <Input
                    value={selectedReferral.referral_link}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedReferral.referral_link);
                      toast({
                        title: "Copied!",
                        description: "Referral link copied to clipboard",
                      });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-[340px] sm:max-w-lg rounded-lg">
          <DialogHeader>
            <DialogTitle>Record Commission Payment</DialogTitle>
            <DialogDescription>
              Record a new commission payment for a referral
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="referral_id">Select Referral</Label>
              <Select 
                value={newPayment.referral_id} 
                onValueChange={(value) => setNewPayment(prev => ({ ...prev, referral_id: value }))}
              >
                <SelectTrigger className='mt-1 rounded-[8px] shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
                  <SelectValue placeholder="Choose a referral" />
                </SelectTrigger>
                <SelectContent className='border-secondary-foreground bg-black/90 text-white'>
                  {referrals.map((referral) => (
                    <SelectItem key={referral.id} value={referral.id}>
                      {referral.user?.full_name || 'Unknown'} - {referral.referral_code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="amount">Amount (USD)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={newPayment.amount}
                onChange={(e) => setNewPayment(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="Enter payment amount"
                className="mt-1 rounded-[8px] shadow-none border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none"
                 style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={newPayment.notes}
                onChange={(e) => setNewPayment(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add any notes about this payment..."
                rows={3}
                className="mt-1 rounded-[8px] shadow-none border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none resize-none"
                 style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaymentDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePayment}
              className="gap-0 mb-3 sm:mb-0"
              disabled={creatingPayment || !newPayment.referral_id || !newPayment.amount}
            >
              {creatingPayment ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <DollarSign className="h-4 w-4 mr-2" />
              )}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
