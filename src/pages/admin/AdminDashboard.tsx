import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  Activity, 
  MessageSquare,
  Plus,
  Eye,
  Settings,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Share2
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { 
  authenticateAsAdmin, 
  getUserByEmail, 
  getAccountsByUserId,
  pocketbase,
  type PocketBaseAccount 
} from "@/integrations/pocketbase/client";
import { supabase } from "@/integrations/supabase/client";

interface DashboardStats {
  totalUsers: number;
  activeAccounts: number;
  totalPortfolioValue: number;
  recentRegistrations: number;
  pendingContactRequests: number;
  systemHealth: 'healthy' | 'warning' | 'error';
}

interface RecentActivity {
  id: string;
  type: 'user_registration' | 'account_created' | 'contact_request' | 'trading_activity';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeAccounts: 0,
    totalPortfolioValue: 0,
    recentRegistrations: 0,
    pendingContactRequests: 0,
    systemHealth: 'healthy'
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.email) return;

      try {
        setLoading(true);

        // Authenticate as admin
        await authenticateAsAdmin();

        // Fetch Supabase data
        const usersResponse = await supabase.from('profiles').select('*');

        // Fetch PocketBase data
        const accountsResponse = await pocketbase.collection('accounts').getList(1, 1000);
        const allAccounts = accountsResponse.items;

        // Calculate stats
        const totalUsers = usersResponse.data?.length || 0;
        const activeAccounts = allAccounts.filter(acc => acc.status === 'ACTIVE').length || 0;
        const totalPortfolioValue = allAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;
        const recentRegistrations = usersResponse.data?.filter(u => {
          const createdDate = new Date(u.created_at);
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          return createdDate > weekAgo;
        }).length || 0;
        const pendingContactRequests = 0; // TODO: Implement contact requests from PocketBase

        setStats({
          totalUsers,
          activeAccounts,
          totalPortfolioValue,
          recentRegistrations,
          pendingContactRequests,
          systemHealth: 'healthy'
        });

        // Generate recent activity
        const activity: RecentActivity[] = [];
        
        // Add recent user registrations
        const recentUsers = usersResponse.data?.slice(0, 3) || [];
        recentUsers.forEach(user => {
          activity.push({
            id: user.id,
            type: 'user_registration',
            title: 'New User Registration',
            description: `${user.full_name || 'New user'} joined the platform`,
            timestamp: user.created_at,
            status: 'completed'
          });
        });

        // Add recent contact requests (placeholder for now)
        // TODO: Implement contact requests from PocketBase

        setRecentActivity(activity.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ));

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.email]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registration':
        return <Users className="h-4 w-4 text-primary" />;
      case 'account_created':
        return <CreditCard className="h-4 w-4 text-green-500" />;
      case 'contact_request':
        return <MessageSquare className="h-4 w-4 text-orange-500" />;
      case 'trading_activity':
        return <Activity className="h-4 w-4 text-purple-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <h2 className="text-xl font-semibold mb-2 text-white pt-5">Loading Dashboard</h2>
          <p className="text-muted-foreground">Fetching system data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="block sm:flex items-center justify-between">
        <div className="mb-2 sm:mb-0">
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            System overview and key metrics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge 
            variant={stats.systemHealth === 'healthy' ? 'default' : 'destructive'}
            className="flex items-center space-x-1 py-2 rounded-[8px]"
          >
            {stats.systemHealth === 'healthy' ? (
              <CheckCircle className="h-3 w-3 mr-1" />
            ) : (
              <AlertCircle className="h-3 w-3 mr-1" />
            )}
            <span>System {stats.systemHealth}</span>
          </Badge>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Total Users</CardTitle>
            <Users className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.recentRegistrations} this week
            </p>
          </CardContent>
        </Card>

        <Card className="">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Active Accounts</CardTitle>
            <CreditCard className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.activeAccounts}</div>
            <p className="text-xs text-muted-foreground">
              Trading accounts
            </p>
          </CardContent>
        </Card>

        <Card className="">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium text-white">Portfolio Value</CardTitle>
            <DollarSign className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatCurrency(stats.totalPortfolioValue)}</div>
            <p className="text-xs text-muted-foreground">
              Total across all accounts
            </p>
          </CardContent>
        </Card>

        <Card className="">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium text-white">Pending Requests</CardTitle>
            <MessageSquare className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.pendingContactRequests}</div>
            <p className="text-xs text-muted-foreground">
              Contact requests
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest system events and user actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3 p-3 bg-muted/20 rounded-lg">
                      <div className="flex-shrink-0 mt-1 text-primary">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-white">{activity.title}</p>
                          {activity.status && getStatusBadge(activity.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{activity.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No recent activity</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <Card className="">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common administrative tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full justify-start" variant="outline">
                <Link to="/admin/users" className="bg-muted/20 border-none text-white hover:bg-white/30 hover:text-white">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Users
                </Link>
              </Button>
              
              <Button asChild className="w-full justify-start" variant="outline">
                <Link to="/admin/accounts" className="bg-muted/20 border-none text-white hover:bg-white/30 hover:text-white">
                  <CreditCard className="h-4 w-4 mr-2" />
                  View Accounts
                </Link>
              </Button>
              
              <Button asChild className="w-full justify-start" variant="outline">
                <Link to="/admin/referrals" className="bg-muted/20 border-none text-white hover:bg-white/30 hover:text-white">
                  <Share2 className="h-4 w-4 mr-2 hover:text-white" />
                  Manage Referrals
                </Link>
              </Button>
              
              <Button asChild className="w-full justify-start" variant="outline">
                <Link to="/admin/contact-requests" className="bg-muted/20 border-none text-white hover:bg-white/30 hover:text-white">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Contact Requests
                </Link>
              </Button>
              
              <Button asChild className="w-full justify-start" variant="outline">
                <Link to="/admin/analytics" className="bg-muted/20 border-none text-white hover:bg-white/30 hover:text-white">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Analytics
                </Link>
              </Button>
              
              <Button asChild className="w-full justify-start" variant="outline">
                <Link to="/admin/settings" className="bg-muted/20 border-none text-white hover:bg-white/30 hover:text-white">
                  <Settings className="h-4 w-4 mr-2 hover:text-white" />
                  System Settings
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
