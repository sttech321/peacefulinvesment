import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, TrendingUp, Activity, DollarSign, BarChart3, ExternalLink, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { 
  authenticateAsAdmin, 
  getUserByEmail, 
  getAccountsByUserId,
  type PocketBaseAccount 
} from "@/integrations/pocketbase/client";
import Footer from "@/components/Footer";

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<PocketBaseAccount[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Fetch PocketBase data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.email) {
        setDashboardLoading(false);
        return;
      }

      try {
        setDashboardLoading(true);
        setError(null);

        // Authenticate as admin
        await authenticateAsAdmin();

                 // Get user by email
         const pocketbaseUser = await getUserByEmail(user.email);
         if (!pocketbaseUser) {
           // User not found in PocketBase, but don't show error
           // Just set empty accounts array and continue
           setAccounts([]);
           setDashboardLoading(false);
           return;
         }

        // Get accounts for the user
        const userAccounts = await getAccountsByUserId(pocketbaseUser.id);
        setAccounts(userAccounts as unknown as PocketBaseAccount[]);
             } catch (err) {
         console.error('Error fetching dashboard data:', err);
         // Only set error for actual network/auth failures, not for missing data
         if (err instanceof Error) {
           if (err.message.includes('Failed to authenticate') || 
               err.message.includes('network') ||
               err.message.includes('timeout')) {
             setError(err.message);
           } else {
             // For other errors, just set empty accounts and continue
             setAccounts([]);
           }
         } else {
           setAccounts([]);
         }
       } finally {
         setDashboardLoading(false);
       }
    };

    fetchDashboardData();
  }, [user?.email]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Helper functions to calculate dashboard statistics
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const calculateDashboardStats = () => {
    if (accounts.length === 0) {
      return {
        totalBalance: 0,
        totalEquity: 0,
        totalPnl: 0,
        activeAccounts: 0,
        totalMargin: 0
      };
    }

    const stats = accounts.reduce((acc, account) => {
      acc.totalBalance += account.balance || 0;
      acc.totalEquity += account.equity || 0;
      acc.totalPnl += account.total_pnl || 0;
      acc.totalMargin += account.margin || 0;
      if (account.status === 'ACTIVE') {
        acc.activeAccounts += 1;
      }
      return acc;
    }, {
      totalBalance: 0,
      totalEquity: 0,
      totalPnl: 0,
      activeAccounts: 0,
      totalMargin: 0
    });

    return stats;
  };

  const dashboardStats = calculateDashboardStats();

     const stats = [
     {
       title: "Total Balance",
       value: formatCurrency(dashboardStats.totalBalance),
       description: "Portfolio value",
       icon: DollarSign,
       trend: accounts.length > 0 ? "Active" : "No accounts linked"
     },
     {
       title: "Active Accounts",
       value: dashboardStats.activeAccounts.toString(),
       description: "Trading accounts",
       icon: Activity,
       trend: accounts.length > 0 ? `${dashboardStats.activeAccounts}/${accounts.length}` : "Create account"
     },
     {
       title: "Total P&L",
       value: formatCurrency(dashboardStats.totalPnl),
       description: "Profit/Loss",
       icon: TrendingUp,
       trend: accounts.length > 0 ? (dashboardStats.totalPnl >= 0 ? "Positive" : "Negative") : "No data"
     },
     {
       title: "Total Equity",
       value: formatCurrency(dashboardStats.totalEquity),
       description: "Current equity",
       icon: Shield,
       trend: accounts.length > 0 ? formatCurrency(dashboardStats.totalMargin) : "No accounts"
     }
   ];

  // Show loading state while fetching data
  if (dashboardLoading) {
    return (
      <div className="min-h-screen bg-black pt-16">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2 text-white">Loading Dashboard Data</h2>
              <p className="text-muted-foreground">Fetching your trading account information...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if data fetching failed
  if (error) {
    return (
      <div className="min-h-screen bg-background pt-16">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Error Loading Dashboard</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => window.location.reload()} variant="outline">
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pink-yellow-shadow pt-24">
      <div className="max-w-7xl mx-auto p-4 pb-16">
        <div className="mb-8">
          <h1 className="text-3xl text-white  font-bold text-foreground">
            Welcome back, {user.email}
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitor your trading accounts and performance
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <div className="bg-gradient-pink-to-yellow border-0 p-[2px] block rounded-sm">
            <Card key={stat.title} className="bg-black rounded-sm p-0 shadow-none">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 rounded-tl-sm rounded-tr-sm w-full bg-black">
                <CardTitle className="text-2xl font-medium text-white font-bebas-neue">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-[var(--yellowcolor)] " />
              </CardHeader>
              <CardContent className="w-full bg-black rounded-bl-sm rounded-br-sm">
                <div className="text-2xl font-bold text-[var(--yellowcolor)] mb-3 pb-0">{stat.value}</div>
                <p className="text-xs text-muted-foreground font-open-sans">
                  {stat.description}
                </p>
                <div className="text-sm text-primary mt-1 text-white font-open-sans">
                  {stat.trend} from last month
                </div>
              </CardContent>
            </Card>
            </div>
          ))}
        </div>

        {/* Trading Platform Access */}
        <div className="mb-8 border-0 shadow-none bg-gradient-pink-to-yellow rounded-sm p-[2px]">
          <Card className="bg-black rounded-sm p-0 shadow-none">
            <CardHeader className="bg-black  rounded-tl-sm rounded-tr-sm">
              <div className="block sm:flex items-center justify-between">
                <div className="items-start mb-5 sm-mb-0 flex sm:items-center gap-3">
                  <div className="w-[80px] sm:w-12 h-12 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-white font-inter">Professional Trading Platform</CardTitle>
                    <CardDescription className="text-base font-open-sans">
                      Access advanced charts, real-time data, and professional trading tools
                    </CardDescription>
                  </div>
                </div>
                <Link to="/trading">
                  <Button size="lg" className="gap-2 opacity-100">
                    Launch Trading Platform
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="bg-black rounded-bl-sm rounded-br-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link to="/meta-trader-accounts">
                  <div className="flex items-center gap-3 p-3 bg-background/90 rounded-lg hover:bg-white transition-colors cursor-pointer">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium font-inter">Account Overview</p>
                      <p className="text-sm text-[#22262a] font-open-sans">View all trading accounts</p>
                    </div>
                  </div>
                </Link>
                <Link to="/trading">
                  <div className="flex items-center gap-3 p-3 bg-background/90 rounded-lg hover:bg-white transition-colors cursor-pointer">
                    <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <Activity className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium font-inter">Live Trading</p>
                      <p className="text-sm text-[#22262a] font-open-sans">Execute trades instantly</p>
                    </div>
                  </div>
                </Link>
                <Link to="/overseas-company">
                  <div className="flex items-center gap-3 p-3 bg-background/90 rounded-lg hover:bg-white transition-colors cursor-pointer">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium font-inter">Create Account</p>
                      <p className="text-sm text-[#22262a] font-open-sans">Set up new trading account</p>
                    </div>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Account Management */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 ">
          <div className="border-0 shadow-none bg-gradient-pink-to-yellow rounded-sm p-[2px]">
            <div className="bg-black rounded-sm h-full rounded-sm p-6">
              <div className="card-heading mb-4">
                <h3 className="text-white font-inter text-xl">Trading Accounts</h3>
                <p className="font-open-sans text-white">
                  Your MetaTrader account overview
                </p>
              </div>
              <div className="card-content">
                <div className="space-y-4">
                  {accounts.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Activity className="h-8 w-8 text-muted-foreground text-white" />
                      </div>
                      <p className="text-muted-foreground font-open-sans">No trading accounts found</p>
                      <Link to="/overseas-company">
                        <Button variant="outline" className="mt-4">
                          Create Account
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    accounts.map((account) => (
                      <div key={account.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                        <div>
                          <p className="font-medium text-white">{account.name}</p>
                          <p className="text-sm text-muted-foreground">
                            ID: {account.meta_trader_id} • {account.status}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${account.total_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(account.total_pnl)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(account.equity)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>  
          </div>

          <div className="border-0 shadow-none bg-gradient-pink-to-yellow rounded-sm p-[2px]">
            <div className="bg-black p-6 rounded-sm">
              <div className="card-heading mb-4">
                <h4 className="font-inter text-white text-xl">Account Summary</h4>
                <p className="font-open-sans text-white">
                  Overview of your trading performance
                </p>
              </div>
              <div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted/20 rounded-lg">
                      <p className="text-sm text-white font-open-sans">Total Accounts</p>
                      <p className="text-2xl font-bold font-open-sans text-white">{accounts.length}</p>
                    </div>
                    <div className="p-3 bg-muted/20 rounded-lg">
                      <p className="text-sm text-muted-foreground font-open-sans text-white">Active Accounts</p>
                      <p className="text-2xl font-bold text-green-600 font-open-san">{dashboardStats.activeAccounts}</p>
                    </div>
                  </div>
                  
                  {accounts.length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground mb-2 font-open-sans">
                        No trading accounts linked to your profile
                      </p>
                      <Link to="/overseas-company">
                        <Button variant="outline" className="font-open-sans" size="sm">
                          Create Your First Account
                        </Button>
                      </Link>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                      <div>
                        <p className="font-medium font-inter text-white">Total Balance</p>
                        <p className="text-sm text-muted-foreground font-open-sans">All accounts</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium font-open-sans text-white">{formatCurrency(dashboardStats.totalBalance)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                      <div>
                        <p className="font-medium font-inter text-white">Total P&L</p>
                        <p className="text-sm text-muted-foreground font-open-sans">Profit/Loss</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${dashboardStats.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(dashboardStats.totalPnl)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                      <div>
                        <p className="font-medium font-inter text-white">Margin Used</p>
                        <p className="text-sm text-muted-foreground font-open-sans">Total margin</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium font-open-sans text-white">{formatCurrency(dashboardStats.totalMargin)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Dashboard;