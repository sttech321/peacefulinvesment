import { Bot, TrendingUp, Shield, Users, Bell, BarChart } from "lucide-react";

const LandingFeatures = () => {
  const features = [
    {
      icon: Bot,
      title: "Automated Trading",
      description: "AI-powered trading bots that execute strategies 24/7, maximizing opportunities while you sleep.",
    },
    {
      icon: BarChart,
      title: "Portfolio Analytics",
      description: "Advanced analytics and insights to track performance, risk metrics, and optimize your investments.",
    },
    {
      icon: Shield,
      title: "Risk Management",
      description: "Sophisticated risk controls and stop-loss mechanisms to protect your capital at all times.",
    },
    {
      icon: TrendingUp,
      title: "Market Intelligence",
      description: "Real-time market data, news, and expert analysis to make informed investment decisions.",
    },
    {
      icon: Users,
      title: "Expert Community",
      description: "Connect with professional traders and learn from successful investment strategies.",
    },
    {
      icon: Bell,
      title: "Smart Alerts",
      description: "Intelligent notifications for market opportunities, portfolio changes, and important events.",
    },
  ];

  return (
    <section className="py-24 px-6 bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Everything You Need to <span className="text-gradient">Succeed in Trading</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Professional-grade tools and features designed to help both beginners and experts 
            achieve their financial goals with confidence and precision.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="feature-card group text-center"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="mb-6">
                <div className="w-16 h-16 mx-auto bg-gradient-primary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-8 h-8 text-primary-foreground" />
                </div>
              </div>
              
              <h3 className="text-xl font-semibold text-foreground mb-4">
                {feature.title}
              </h3>
              
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 text-center">
          <div className="glass-card inline-block">
            <h3 className="text-2xl font-bold text-foreground mb-4">
              Ready to Transform Your Trading?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-2xl">
              Join thousands of successful investors who trust our platform for their trading needs.
            </p>
            <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>No hidden fees</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>Start with $100</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>Free trial available</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingFeatures;