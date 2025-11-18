import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePocketBaseMetaTraderAccounts } from "@/hooks/usePocketBaseMetaTraderAccounts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, DollarSign, AlertCircle, RefreshCw, ExternalLink, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

export default function MetaTraderAccounts() {
  const { user } = useAuth();
  const { accounts, loading, error, refetch } = usePocketBaseMetaTraderAccounts();
  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState(false);

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20';
      case 'pending':
        return 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20';
      case 'inactive':
        return 'bg-red-500/10 text-red-600 hover:bg-red-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getAccountTypeColor = (type: string) => {
    return type === 'live' 
      ? 'bg-primary/10 text-primary hover:bg-primary/20'
      : 'bg-secondary/10 text-secondary-foreground hover:bg-secondary/20';
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      toast({
        title: "Accounts Refreshed",
        description: "Your MetaTrader accounts have been updated.",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Could not refresh account data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
              <p className="text-muted-foreground">Please sign in to view your MetaTrader accounts.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Loading Your Accounts</h2>
          <p className="text-muted-foreground">Fetching your MetaTrader account data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    // Special handling for no account linked error
    if (error === 'no_accounts_found') {
      return (
        <div className="min-h-screen bg-gradient-hero">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">MetaTrader Accounts</h1>
                <p className="text-muted-foreground">
                  Monitor and manage your trading accounts in real-time
                </p>
              </div>
            </div>

            <div className="text-center py-12">
              <Card className="glass-card max-w-2xl mx-auto">
                <CardContent className="pt-8 pb-8">
                  <div className="flex flex-col items-center space-y-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="h-8 w-8 text-blue-600" />
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-2xl font-semibold text-foreground">No Trading Accounts Yet</h3>
                      <p className="text-muted-foreground max-w-md">
                        Your profile is set up, but you don't have any trading accounts yet. You can create a new account or wait for account verification.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg">
                      <Link to="/overseas-company">
                        <Button className="w-full glass-card" variant="outline">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Create New Account
                        </Button>
                      </Link>
                      
                      <Button 
                        onClick={handleRefresh} 
                        variant="outline" 
                        className="w-full glass-card"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Check Again
                      </Button>
                    </div>

                    <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-sm text-green-700 dark:text-green-300">
                        <strong>Good news!</strong> Your profile is verified and ready. You can now create a new trading account through the overseas company setup.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      );
    } else if (error === 'no_account_linked') {
      return (
        <div className="min-h-screen bg-gradient-hero">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">MetaTrader Accounts</h1>
                <p className="text-muted-foreground">
                  Monitor and manage your trading accounts in real-time
                </p>
              </div>
            </div>

            <div className="text-center py-12">
              <Card className="glass-card max-w-2xl mx-auto">
                <CardContent className="pt-8 pb-8">
                  <div className="flex flex-col items-center space-y-6">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                      <Clock className="h-8 w-8 text-amber-600" />
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-2xl font-semibold text-foreground">No Trading Account Linked</h3>
                      <p className="text-muted-foreground max-w-md">
                        Your trading account hasn't been linked to your profile yet. This usually happens during the account setup process.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg">
                      <Link to="/overseas-company">
                        <Button className="w-full glass-card" variant="outline">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open Overseas Company
                        </Button>
                      </Link>
                      
                      <Button 
                        onClick={handleRefresh} 
                        variant="outline" 
                        className="w-full glass-card"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Check Again
                      </Button>
                    </div>

                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        <strong>What's happening?</strong> Your account is being verified and linked to our trading system. 
                        This process typically takes 24-48 hours after completing the overseas company setup.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      );
    }

    // Default error handling for other errors
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error Loading Accounts</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">MetaTrader Accounts</h1>
            <p className="text-muted-foreground">
              Monitor and manage your trading accounts in real-time
            </p>
          </div>
          <Button 
            onClick={handleRefresh} 
            disabled={refreshing}
            variant="outline"
            className="glass"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>

        {/* Accounts Grid */}
        {accounts.length === 0 ? (
          <div className="text-center py-12">
            <Card className="glass-card max-w-md mx-auto">
              <CardContent className="pt-6">
                <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Accounts Found</h3>
                <p className="text-muted-foreground">
                  You don't have any MetaTrader accounts set up yet. Connect your accounts to start trading.
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((account) => (
              <Card key={account.id} className="glass-card hover:scale-105 transition-all duration-300">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-semibold">
                        {account.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">ID: {account.meta_trader_id}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Badge className={getStatusColor(account.status.toLowerCase())}>
                        {account.status}
                      </Badge>
                      <Badge className="bg-secondary/10 text-secondary-foreground hover:bg-secondary/20">
                        Live
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Balance Section */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Balance
                      </p>
                      <p className="text-lg font-semibold text-emerald-600">
                        {formatCurrency(account.balance, 'USD')}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Equity
                      </p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(account.equity, 'USD')}
                      </p>
                    </div>
                  </div>

                  {/* Margin Section */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Margin Used
                      </p>
                      <p className="text-sm font-medium text-amber-600">
                        {formatCurrency(account.margin, 'USD')}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        P&L
                      </p>
                      <p className={`text-sm font-medium ${account.total_pnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatCurrency(account.total_pnl, 'USD')}
                      </p>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="pt-3 border-t border-border/20">
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>Expires: {new Date(account.expire_date).toLocaleDateString()}</span>
                      <span>
                        Updated: {new Date(account.updated).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}