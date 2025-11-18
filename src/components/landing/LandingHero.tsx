import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, Shield, Users, Award } from "lucide-react";
import { Link } from "react-router-dom";
import tradingHeroBg from "@/assets/trading-hero-bg.jpg";

const LandingHero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0 hero-bg"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(11, 27, 59, 0.95) 0%, rgba(15, 23, 42, 0.9) 50%, rgba(255, 215, 0, 0.1) 100%), url(${tradingHeroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary/10 rounded-full blur-xl animate-float" />
        <div className="absolute top-3/4 right-1/4 w-24 h-24 bg-primary/10 rounded-full blur-lg animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/3 w-16 h-16 bg-primary/15 rounded-full blur-md animate-float" style={{ animationDelay: '2s' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-left lg:text-left">
            {/* Logo/Badge */}
            <div className="mb-8 animate-slide-up">
              <div className="inline-flex items-center gap-3 glass-card px-6 py-3 rounded-full">
                <Award className="w-6 h-6 text-primary" />
                <span className="text-sm font-semibold text-foreground">Trusted by 50,000+ Investors</span>
              </div>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              Your Gateway to <span className="text-gradient bg-gradient-to-r from-primary to-primary-muted bg-clip-text text-transparent">Smart Investment</span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl animate-slide-up" style={{ animationDelay: '0.4s' }}>
              Complete investment platform with automated trading, portfolio management, and expert insights. Start your financial journey with confidence.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-start animate-slide-up" style={{ animationDelay: '0.6s' }}>
              <Link to="/auth">
                <Button className="download-btn-primary group">
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              
              <Link to="/downloads">
                <Button variant="outline" className="glass text-white border-white/20 hover:bg-white/10 px-8 py-4 text-lg rounded-2xl">
                  Download App
                </Button>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center gap-6 mt-8 animate-fade-in" style={{ animationDelay: '0.8s' }}>
              <div className="flex items-center gap-2 text-primary/80">
                <Shield className="w-5 h-5" />
                <span className="text-white font-medium">Bank-Grade Security</span>
              </div>
              <div className="flex items-center gap-2 text-primary/80">
                <TrendingUp className="w-5 h-5" />
                <span className="text-white font-medium">94.2% Success Rate</span>
              </div>
            </div>
          </div>

          {/* Right Content - Stats Grid */}
          <div className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <div className="grid grid-cols-2 gap-6">
              <div className="glass-card text-center">
                <div className="text-3xl font-bold text-primary mb-2">$2.8B+</div>
                <div className="text-white/70 text-sm">Assets Under Management</div>
              </div>
              <div className="glass-card text-center">
                <div className="text-3xl font-bold text-primary mb-2">50K+</div>
                <div className="text-white/70 text-sm">Active Investors</div>
              </div>
              <div className="glass-card text-center">
                <div className="text-3xl font-bold text-primary mb-2">99.9%</div>
                <div className="text-white/70 text-sm">Platform Uptime</div>
              </div>
              <div className="glass-card text-center">
                <div className="text-3xl font-bold text-primary mb-2">24/7</div>
                <div className="text-white/70 text-sm">Expert Support</div>
              </div>
            </div>
            
            {/* Additional Features */}
            <div className="mt-8 glass-card">
              <div className="text-center mb-4">
                <Users className="w-8 h-8 text-primary mx-auto mb-2" />
                <h3 className="text-lg font-semibold text-white mb-2">Join Our Community</h3>
                <p className="text-white/70 text-sm">Connect with successful investors and learn from the best</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingHero;