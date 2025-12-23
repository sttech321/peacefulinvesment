import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, TrendingUp, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from '@/hooks/useAuth';


const LandingCTA = () => {
  const { user } = useAuth();

  return (
    <section className="py-24 px-6 bg-background">
      <div className="max-w-6xl mx-auto">
        {/* Main CTA */}
        <div className="glass-card text-center relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-10 left-10 w-32 h-32 bg-primary rounded-full blur-xl" />
            <div className="absolute bottom-10 right-10 w-24 h-24 bg-primary rounded-full blur-lg" />
          </div>
          
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Ready to Start Your <span className="text-gradient">Investment Journey?</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Join thousands of successful investors who trust our platform for their trading needs. 
              Start with our free trial and see the difference professional tools can make.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              {!user && (
              <Link to="/auth">
                <Button className="download-btn-primary group">
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
               )}
              
              <Link to="/downloads">
                <Button variant="outline" className="px-8 py-4 text-lg rounded-2xl">
                  App is coming soon
                </Button>
              </Link>
            </div>
            
            {/* Trust Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-border">
              <div className="flex items-center justify-center gap-3">
                <Shield className="w-6 h-6 text-primary" />
                <div className="text-left">
                  <div className="font-semibold text-foreground">Bank-Grade Security</div>
                  <div className="text-sm text-muted-foreground">Your funds are protected</div>
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-3">
                <TrendingUp className="w-6 h-6 text-primary" />
                <div className="text-left">
                  <div className="font-semibold text-foreground">Proven Results</div>
                  <div className="text-sm text-muted-foreground">94.2% success rate</div>
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-3">
                <Users className="w-6 h-6 text-primary" />
                <div className="text-left">
                  <div className="font-semibold text-foreground">Expert Support</div>
                  <div className="text-sm text-muted-foreground">24/7 assistance available</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary CTAs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
          <div className="glass-card text-center">
            <h3 className="text-xl font-bold text-foreground mb-4">
              New to Trading?
            </h3>
            <p className="text-muted-foreground mb-6">
              Access our comprehensive education center with courses, tutorials, and expert insights.
            </p>
            <Link to="/auth">
              <Button variant="outline" className="w-full">
                Start Learning
              </Button>
            </Link>
          </div>
          
          <div className="glass-card text-center">
            <h3 className="text-xl font-bold text-foreground mb-4">
              Professional Trader?
            </h3>
            <p className="text-muted-foreground mb-6">
              Explore our advanced tools, API access, and institutional-grade features.
            </p>
            <Link to="/auth">
              <Button variant="outline" className="w-full">
                View Pro Features
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingCTA;