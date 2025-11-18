import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, AlertCircle, RefreshCw, Maximize2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const TradingDashboard = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Simulate loading time for iframe
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [retryCount]);

  const handleIframeLoad = () => {
    setIsLoading(false);
    setHasError(false);
    toast({
      title: "Trading Platform Loaded",
      description: "You can now access the trading interface",
    });
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
    toast({
      title: "Loading Error",
      description: "Failed to load trading platform. Please try again.",
      variant: "destructive",
    });
  };

  const handleRetry = () => {
    setIsLoading(true);
    setHasError(false);
    setRetryCount(prev => prev + 1);
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      toast({
        title: "Fullscreen Error",
        description: "Unable to toggle fullscreen mode",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md p-6">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <div>
              <h2 className="text-xl font-semibold">Access Denied</h2>
              <p className="text-muted-foreground">Please log in to access the trading dashboard.</p>
            </div>
            <Button onClick={() => window.location.href = '/auth'}>
              Go to Login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Trading Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  Welcome back, {user.email?.split('@')[0]}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
                className="hidden md:flex"
              >
                <Maximize2 className="h-4 w-4 mr-2" />
                {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              </Button>
              
              {hasError && (
                <Button variant="outline" size="sm" onClick={handleRetry}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-40">
            <Card className="p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center mx-auto">
                <Loader2 className="h-8 w-8 text-primary-foreground animate-spin" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Loading Trading Platform</h3>
                <p className="text-muted-foreground">
                  Connecting to Peaceful Investment...
                </p>
              </div>
              <div className="flex items-center justify-center gap-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </Card>
          </div>
        )}

        {/* Error State */}
        {hasError && !isLoading && (
          <div className="container mx-auto px-4 py-8">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-3">
                  <p>
                    Unable to load the trading platform. This could be due to:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Network connectivity issues</li>
                    <li>Trading platform maintenance</li>
                    <li>Firewall or security restrictions</li>
                    <li>Browser compatibility issues</li>
                  </ul>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={handleRetry}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Again
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => window.open('https://app.peacefulinvestment.com/', '_blank')}>
                      Open in New Tab
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Trading Platform Iframe */}
        {!hasError && (
          <div className="relative">
            <iframe
              key={retryCount} // Force reload on retry
              src="https://app.peacefulinvestment.com/"
              className="w-full border-0 block"
              style={{ 
                height: isFullscreen ? '100vh' : 'calc(100vh - 80px)',
                minHeight: '600px'
              }}
              title="Peaceful Investment Trading Platform"
              allow="accelerometer; autoplay; camera; clipboard-read; clipboard-write; fullscreen; geolocation; gyroscope; magnetometer; microphone; midi; payment; picture-in-picture; publickey-credentials-get; screen-wake-lock; sync-xhr; usb; web-share; xr-spatial-tracking"
              allowFullScreen
              loading="lazy"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads allow-modals allow-orientation-lock allow-pointer-lock allow-presentation allow-top-navigation allow-top-navigation-by-user-activation"
            />
          </div>
        )}
      </div>

      {/* Quick Access Footer (Hidden in Fullscreen) */}
      {!isFullscreen && (
        <div className="fixed bottom-4 right-4 z-30">
          <Card className="p-3 bg-card/90 backdrop-blur-sm border shadow-lg">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-muted-foreground">Trading Platform Active</span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TradingDashboard;