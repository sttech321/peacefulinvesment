import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Target, TrendingUp, Award, Zap, Clock } from "lucide-react";

interface ReferralAnalyticsProps {
  referral: {
    total_referrals: number;
    total_earnings: number;
    year_to_date_earnings: number;
    status: string;
    created_at: string;
  };
  signups: Array<{
    deposit_amount?: number;
    signup_date: string;
  }>;
  payments: Array<{
    amount: number;
    payment_date: string;
  }>;
}

const ReferralAnalytics = ({ referral, signups, payments }: ReferralAnalyticsProps) => {
  // Calculate conversion rate
  const totalSignups = signups.length;
  const depositorSignups = signups.filter(s => s.deposit_amount).length;
  const conversionRate = totalSignups > 0 ? (depositorSignups / totalSignups) * 100 : 0;

  // Calculate average deposit
  const totalDepositAmount = signups.reduce((sum, s) => sum + (s.deposit_amount || 0), 0);
  const avgDeposit = depositorSignups > 0 ? totalDepositAmount / depositorSignups : 0;

  // Calculate monthly progress (target: $1000/month)
  const monthlyTarget = 1000;
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  const thisMonthEarnings = payments
    .filter(p => {
      const paymentDate = new Date(p.payment_date);
      return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
    })
    .reduce((sum, p) => sum + p.amount, 0);

  const monthlyProgress = (thisMonthEarnings / monthlyTarget) * 100;

  // Calculate days since joining
  const joinDate = new Date(referral.created_at);
  const daysSinceJoin = Math.floor((currentDate.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24));

  // Determine performance tier
  const getPerformanceTier = (earnings: number) => {
    if (earnings >= 10000) return { tier: "Diamond", color: "bg-purple-500", icon: Award };
    if (earnings >= 5000) return { tier: "Gold", color: "bg-yellow-500", icon: Target };
    if (earnings >= 1000) return { tier: "Silver", color: "bg-gray-400", icon: TrendingUp };
    return { tier: "Bronze", color: "bg-orange-500", icon: Zap };
  };

  const performance = getPerformanceTier(referral.total_earnings);
  const PerformanceIcon = performance.icon;

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Analytics
          </CardTitle>
          <CardDescription>
            Track your referral performance and earnings potential
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Performance Tier */}
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className={`w-12 h-12 ${performance.color} rounded-lg flex items-center justify-center mb-2 mx-auto`}>
                <PerformanceIcon className="h-6 w-6 text-white" />
              </div>
              <Badge variant="outline" className="mb-2">
                {performance.tier} Tier
              </Badge>
              <p className="text-xs text-muted-foreground">Performance Level</p>
            </div>

            {/* Conversion Rate */}
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {conversionRate.toFixed(1)}%
              </div>
              <p className="text-sm font-medium">Conversion Rate</p>
              <p className="text-xs text-muted-foreground">
                {depositorSignups} of {totalSignups} deposited
              </p>
            </div>

            {/* Average Deposit */}
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                ${avgDeposit.toFixed(0)}
              </div>
              <p className="text-sm font-medium">Avg. Deposit</p>
              <p className="text-xs text-muted-foreground">Per successful referral</p>
            </div>

            {/* Days Active */}
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {daysSinceJoin}
              </div>
              <p className="text-sm font-medium">Days Active</p>
              <p className="text-xs text-muted-foreground">Since joining program</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Monthly Progress
          </CardTitle>
          <CardDescription>
            Track your progress towards the monthly earning goal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">This Month's Earnings</span>
            <span className="text-lg font-bold">
              ${thisMonthEarnings.toFixed(2)} / ${monthlyTarget.toFixed(2)}
            </span>
          </div>
          
          <Progress value={Math.min(monthlyProgress, 100)} className="h-3" />
          
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{monthlyProgress.toFixed(1)}% of monthly target</span>
            {monthlyProgress >= 100 ? (
              <Badge variant="default" className="bg-green-500">
                🎉 Target Reached!
              </Badge>
            ) : (
              <span>${(monthlyTarget - thisMonthEarnings).toFixed(2)} remaining</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">
                  ${(referral.total_earnings / Math.max(daysSinceJoin, 1)).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">Avg. Daily Earnings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">
                  {(referral.total_referrals / Math.max(daysSinceJoin, 1) * 30).toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">Monthly Referral Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Award className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">
                  ${(referral.total_earnings / Math.max(referral.total_referrals, 1)).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">Earnings per Referral</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReferralAnalytics;