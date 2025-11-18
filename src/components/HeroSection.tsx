import { Button } from "@/components/ui/button";
import { Download, Apple, Monitor, Smartphone, Bot, TrendingUp } from "lucide-react";
import tradingHeroBg from "@/assets/trading-hero-bg.jpg";
import dashboardMockup from "@/assets/dashboard-mockup.jpg";

const HeroSection = () => {
  const detectOS = () => {
    const userAgent = window.navigator.userAgent;
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    return 'Windows';
  };

  const handleDownload = (os: string) => {
    // TODO: Implement actual download logic
    // This will trigger the appropriate download based on OS detection
    window.open(`/downloads/${os.toLowerCase()}`, '_blank');
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-hero">
      {/* Professional Hero Background */}
      <div className="absolute inset-0">
        {/* Base gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent-50 via-primary-50 to-accent-100" />
        
        {/* Animated geometric patterns */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-20 w-64 h-64 bg-primary-200 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent-200 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary-100 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>
        
        {/* Floating geometric shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Animated circles */}
          <div className="absolute top-1/4 left-1/4 w-20 h-20 bg-primary-400/20 rounded-full animate-bounce" style={{ animationDuration: '3s', animationDelay: '0s' }} />
          <div className="absolute top-3/4 right-1/4 w-16 h-16 bg-accent-400/20 rounded-full animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }} />
          <div className="absolute top-1/2 right-1/3 w-12 h-12 bg-primary-300/30 rounded-full animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '2s' }} />
          
          {/* Floating trading icons */}
          <div className="absolute top-20 right-20 text-primary-400/30 text-5xl animate-float hover-glow" style={{ animationDelay: '0.5s' }}>$</div>
          <div className="absolute bottom-20 left-20 text-accent-400/30 text-4xl animate-float hover-glow" style={{ animationDelay: '1.5s' }}>₿</div>
          <div className="absolute top-1/3 right-1/3 text-primary-300/25 text-3xl animate-float hover-glow" style={{ animationDelay: '2.5s' }}>📈</div>
        </div>
        
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-left lg:text-left">
            {/* Enhanced Bot Icon */}
            <div className="mb-8 animate-slide-up">
              <div className="w-20 h-20 mx-auto lg:mx-0 mb-6 bg-primary-gradient rounded-3xl flex items-center justify-center shadow-gold hover-lift">
                <Bot className="w-10 h-10 text-white" />
              </div>
            </div>

            {/* Enhanced Main Headline */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-neutral-900 mb-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              Control Your <span className="text-primary-gradient">Investment Bots</span> from Anywhere
            </h1>

            {/* Enhanced Subtitle */}
            <p className="text-xl md:text-2xl text-neutral-700 mb-8 max-w-2xl animate-slide-up" style={{ animationDelay: '0.4s' }}>
              Peaceful Investment - Easily manage strategies, monitor trades, and optimize performance with professional-grade tools.
            </p>

            {/* Enhanced Download Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-start animate-slide-up" style={{ animationDelay: '0.6s' }}>
              <Button 
                variant="gradient"
                size="lg"
                className="group hover-lift"
                onClick={() => handleDownload('Windows')}
              >
                <Monitor className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
                Download for Windows
              </Button>
              
              <Button 
                variant="accent"
                size="lg"
                className="group hover-lift"
                onClick={() => handleDownload('macOS')}
              >
                <Apple className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
                Download for macOS
              </Button>
              
              <Button 
                variant="outline"
                size="lg"
                className="group hover-lift border-primary/30 hover:border-primary"
                onClick={() => handleDownload('Linux')}
              >
                <Smartphone className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
                Download for Linux
              </Button>
            </div>

            {/* Enhanced Auto-detect Note */}
            <div className="mt-6 animate-fade-in" style={{ animationDelay: '0.8s' }}>
              <div className="inline-flex items-center gap-3 px-4 py-2 bg-primary-100/50 rounded-full border border-primary-200/50">
                <TrendingUp className="w-4 h-4 text-primary-600" />
                <span className="text-sm text-neutral-700">
                  Detected OS: <span className="font-semibold text-primary-700">{detectOS()}</span> • Works with MT4 & MT5
                </span>
              </div>
            </div>
          </div>

          {/* Enhanced Right Content - Dashboard Preview */}
          <div className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <div className="relative">
              <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover-lift border border-white/20">
                <img 
                  src={dashboardMockup} 
                  alt="Peaceful Investment Dashboard" 
                  className="w-full h-auto rounded-xl shadow-lg"
                />
              </div>
              
              {/* Enhanced Floating metrics */}
              <div className="absolute -top-6 -right-6 bg-success text-success-foreground p-4 rounded-xl shadow-lg animate-float hover-glow">
                <div className="text-sm font-bold">+1,247 USD</div>
                <div className="text-xs opacity-90">Today's Profit</div>
              </div>
              
              <div className="absolute -bottom-6 -left-6 bg-primary text-primary-foreground p-4 rounded-xl shadow-lg animate-float hover-glow" style={{ animationDelay: '1s' }}>
                <div className="text-sm font-bold">94.2%</div>
                <div className="text-xs opacity-90">Win Rate</div>
              </div>
              
              <div className="absolute top-1/2 -right-8 bg-accent text-accent-foreground p-3 rounded-lg shadow-lg animate-float hover-glow" style={{ animationDelay: '0.5s' }}>
                <div className="text-xs font-bold">Live</div>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mt-1"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Row */}
        <div className="flex flex-col sm:flex-row gap-8 justify-center items-center mt-20 animate-fade-in" style={{ animationDelay: '1s' }}>
          <div className="text-center bg-white/10 backdrop-blur-sm p-6 rounded-xl hover-lift border border-white/20">
            <div className="text-3xl font-bold text-primary-700">50K+</div>
            <div className="text-neutral-600">Active Traders</div>
          </div>
          <div className="text-center bg-white/10 backdrop-blur-sm p-6 rounded-xl hover-lift border border-white/20">
            <div className="text-3xl font-bold text-success-700">$2.8B+</div>
            <div className="text-neutral-600">Volume Managed</div>
          </div>
          <div className="text-center bg-white/10 backdrop-blur-sm p-6 rounded-xl hover-lift border border-white/20">
            <div className="text-3xl font-bold text-accent-700">99.9%</div>
            <div className="text-neutral-600">Uptime</div>
          </div>
          <div className="text-center bg-white/10 backdrop-blur-sm p-6 rounded-xl hover-lift border border-white/20">
            <div className="text-3xl font-bold text-primary-700">24/7</div>
            <div className="text-neutral-600">Monitoring</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;