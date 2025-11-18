import { Smartphone, Monitor, Users, Award, TrendingUp, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const LandingServices = () => {
  const services = [
    {
      icon: Monitor,
      title: "Desktop Trading Platform",
      description: "Full-featured desktop application with advanced charting, strategy testing, and portfolio management.",
      features: ["Advanced Charts", "Strategy Backtesting", "Multi-Account Support", "Real-time Data"],
      action: "Download App",
      link: "/downloads"
    },
    {
      icon: Smartphone,
      title: "Mobile Trading",
      description: "Trade on-the-go with our mobile app featuring all essential trading tools and notifications.",
      features: ["Mobile Charts", "Push Notifications", "Quick Orders", "Portfolio Tracking"],
      action: "Get Mobile App",
      link: "/downloads"
    },
    {
      icon: Users,
      title: "Community Platform",
      description: "Join our exclusive community of traders sharing strategies, insights, and market analysis.",
      features: ["Strategy Sharing", "Expert Insights", "Discussion Forums", "Live Webinars"],
      action: "Join Community",
      link: "/auth"
    },
    {
      icon: Award,
      title: "Managed Accounts",
      description: "Let our expert traders manage your portfolio with proven strategies and risk management.",
      features: ["Expert Management", "Custom Strategies", "Risk Controls", "Monthly Reports"],
      action: "Learn More",
      link: "/auth"
    },
    {
      icon: TrendingUp,
      title: "Copy Trading",
      description: "Automatically copy trades from successful traders and mirror their strategies in real-time.",
      features: ["Top Traders", "Auto Copy", "Risk Settings", "Performance Tracking"],
      action: "Start Copying",
      link: "/auth"
    },
    {
      icon: Target,
      title: "Trading Education",
      description: "Comprehensive courses and resources to improve your trading skills and market knowledge.",
      features: ["Video Courses", "Live Training", "Market Analysis", "Strategy Guides"],
      action: "Start Learning",
      link: "/auth"
    },
  ];

  return (
    <section className="py-24 px-6 bg-muted/50">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Complete Trading <span className="text-gradient">Ecosystem</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            From beginner-friendly tools to advanced institutional features, 
            we provide everything you need for successful trading.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {services.map((service, index) => (
            <div 
              key={index} 
              className="glass-card group hover:scale-105 transition-all duration-300"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                  <service.icon className="w-8 h-8 text-primary-foreground" />
                </div>
                
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    {service.title}
                  </h3>
                  
                  <p className="text-muted-foreground mb-4 leading-relaxed">
                    {service.description}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2 mb-6">
                    {service.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Link to={service.link}>
                    <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      {service.action}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Stats */}
        <div className="mt-20 glass-card">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-foreground mb-4">
              Trusted by Professionals Worldwide
            </h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-primary mb-2">200+</div>
              <div className="text-muted-foreground text-sm">Countries Supported</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">1M+</div>
              <div className="text-muted-foreground text-sm">Trades Executed</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">$50B+</div>
              <div className="text-muted-foreground text-sm">Trading Volume</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">15+</div>
              <div className="text-muted-foreground text-sm">Years Experience</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingServices;