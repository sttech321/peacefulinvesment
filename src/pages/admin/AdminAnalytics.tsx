import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Users,
  CreditCard,
  DollarSign,
  Activity,
  Download,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { exportToExcel, exportToPDF, formatDataForExport } from "@/utils/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { SelectValue } from "@radix-ui/react-select";

interface AnalyticsData {
  userGrowth: any[];
  accountPerformance: any[];
  revenueData: any[];
  userDistribution: any[];
  monthlyStats: any[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    userGrowth: [],
    accountPerformance: [],
    revenueData: [],
    userDistribution: [],
    monthlyStats: [],
  });
  const [timeRange, setTimeRange] = useState("30d");
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      // Fetch user growth data
      const { data: profiles } = await supabase
        .from('profiles')
        .select('created_at')
        .order('created_at', { ascending: true });

      // Fetch account data
      const { data: accounts } = await supabase
        .from('user_roles')
        .select('created_at, role');

      // Generate mock data for demonstration
      const userGrowth = generateUserGrowthData(profiles || []);
      const accountPerformance = generateAccountPerformanceData();
      const revenueData = generateRevenueData();
      const userDistribution = generateUserDistributionData(accounts || []);
      const monthlyStats = generateMonthlyStats();

      setAnalyticsData({
        userGrowth,
        accountPerformance,
        revenueData,
        userDistribution,
        monthlyStats,
      });
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateUserGrowthData = (profiles: any[]) => {
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const usersOnDate = profiles.filter(p => 
        p.created_at.startsWith(dateStr)
      ).length;
      
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        users: usersOnDate,
        cumulative: data.length > 0 ? data[data.length - 1].cumulative + usersOnDate : usersOnDate,
      });
    }
    
    return data;
  };

  const generateAccountPerformanceData = () => {
    return [
      { month: 'Jan', active: 45, inactive: 12, pending: 8 },
      { month: 'Feb', active: 52, inactive: 15, pending: 6 },
      { month: 'Mar', active: 48, inactive: 18, pending: 10 },
      { month: 'Apr', active: 61, inactive: 14, pending: 5 },
      { month: 'May', active: 55, inactive: 20, pending: 7 },
      { month: 'Jun', active: 67, inactive: 16, pending: 9 },
    ];
  };

  const generateRevenueData = () => {
    return [
      { month: 'Jan', revenue: 12500, expenses: 8000, profit: 4500 },
      { month: 'Feb', revenue: 14200, expenses: 8500, profit: 5700 },
      { month: 'Mar', revenue: 11800, expenses: 7800, profit: 4000 },
      { month: 'Apr', revenue: 15600, expenses: 9200, profit: 6400 },
      { month: 'May', revenue: 13800, expenses: 8700, profit: 5100 },
      { month: 'Jun', revenue: 17200, expenses: 9500, profit: 7700 },
    ];
  };

  const generateUserDistributionData = (accounts: any[]) => {
    const adminCount = accounts.filter(a => a.role === 'admin').length;
    const userCount = accounts.filter(a => a.role === 'user').length;
    const moderatorCount = accounts.filter(a => a.role === 'moderator').length;
    
    return [
      { name: 'Users', value: userCount, color: COLORS[0] },
      { name: 'Admins', value: adminCount, color: COLORS[1] },
      { name: 'Moderators', value: moderatorCount, color: COLORS[2] },
    ];
  };

  const generateMonthlyStats = () => {
    return [
      { metric: 'New Users', value: 156, change: '+12%', trend: 'up' },
      { metric: 'Active Accounts', value: 89, change: '+8%', trend: 'up' },
      { metric: 'Revenue', value: '$45,200', change: '+15%', trend: 'up' },
      { metric: 'Support Tickets', value: 23, change: '-5%', trend: 'down' },
    ];
  };

  const handleExport = async (type: 'excel' | 'pdf', dataType: string) => {
    try {
      let data: any[] = [];
      let filename = '';
      let title = '';

      switch (dataType) {
        case 'users':
          data = analyticsData.userGrowth;
          filename = 'user_analytics';
          title = 'User Analytics Report';
          break;
        case 'accounts':
          data = analyticsData.accountPerformance;
          filename = 'account_analytics';
          title = 'Account Performance Report';
          break;
        case 'revenue':
          data = analyticsData.revenueData;
          filename = 'revenue_analytics';
          title = 'Revenue Analytics Report';
          break;
      }

      if (type === 'excel') {
        const result = exportToExcel(data, filename, dataType);
        if (result.success) {
          toast({
            title: "Success",
            description: "Excel file exported successfully",
          });
        }
      } else {
        const result = await exportToPDF(data, filename, title);
        if (result.success) {
          toast({
            title: "Success",
            description: "PDF file exported successfully",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export data",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div> 
          <h2 className="text-xl font-semibold mb-2 text-white pt-5">Loading analytics</h2>
          <p className="text-muted-foreground">Fetching analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into your platform's performance
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select
  value={timeRange}
  onValueChange={(value) => setTimeRange(value)}
>
  <SelectTrigger 
    className="w-32 h-[36px] rounded-[8PX] border shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
    style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}
  >
    <SelectValue placeholder="Select range" />
  </SelectTrigger>

  <SelectContent className="border-secondary-foreground bg-black/90 text-white">
    <SelectItem value="7d">Last 7 days</SelectItem>
    <SelectItem value="30d">Last 30 days</SelectItem>
    <SelectItem value="90d">Last 90 days</SelectItem>
  </SelectContent>
</Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {analyticsData.monthlyStats.map((stat, index) => (
          <Card key={index} className="border-muted/20  bg-white/5 border rounded-lg p-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">{stat.metric}</CardTitle>
              {stat.trend === 'up' ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <p className={`text-sm ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {stat.change} from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <Tabs defaultValue="overview" className="space-y-6 ">
        <TabsList className="mb-10 grid grid-cols-4 bg-muted/10 rounded-lg p-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">User Analytics</TabsTrigger>
          <TabsTrigger value="accounts">Account Performance</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Growth Chart */}
            <Card className="border-muted/20  bg-white/5 border rounded-lg p-4">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>User Growth</span>
                  <div className="flex space-x-2 gap-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('excel', 'users')}
                      className="text-black gap-0 rounded-[8px] border-0 hover:bg-white/80"
                    >
                      <Download className="h-4 w-4 mr-2 text-black" />
                      Excel
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('pdf', 'users')}
                      className="text-black gap-0 rounded-[8px] border-0 hover:bg-white/80"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>User registration trends over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analyticsData.userGrowth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="cumulative"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* User Distribution */}
            <Card className="border-muted/20  bg-white/5 border rounded-lg p-4">
              <CardHeader>
                <CardTitle>User Distribution</CardTitle>
                <CardDescription>Breakdown by user roles</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analyticsData.userDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analyticsData.userDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card className="border-muted/20  bg-white/5 border rounded-lg p-4">
            <CardHeader>
              <CardTitle>User Growth Analytics</CardTitle>
              <CardDescription>Detailed user registration and activity metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={analyticsData.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="#8884d8"
                    strokeWidth={2}
                    name="New Users"
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulative"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    name="Total Users"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-6">
          <Card className="border-muted/20  bg-white/5 border rounded-lg p-4">
            <CardHeader>
              <CardTitle>Account Performance</CardTitle>
              <CardDescription>Account status and performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analyticsData.accountPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="active" fill="#8884d8" name="Active" />
                  <Bar dataKey="inactive" fill="#ffc658" name="Inactive" />
                  <Bar dataKey="pending" fill="#ff7300" name="Pending" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <Card className="border-muted/20  bg-white/5 border rounded-lg p-4">
            <CardHeader>
              <CardTitle>Revenue Analytics</CardTitle>
              <CardDescription>Financial performance and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={analyticsData.revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stackId="1"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.6}
                    name="Revenue"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stackId="1"
                    stroke="#ffc658"
                    fill="#ffc658"
                    fillOpacity={0.6}
                    name="Expenses"
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    stackId="1"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                    fillOpacity={0.6}
                    name="Profit"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
