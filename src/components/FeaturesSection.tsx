import { Activity, Zap, Bell, Shield } from "lucide-react";

const FeaturesSection = () => {
  const features = [
    {
      icon: Activity,
      title: "Live Bot Monitoring",
      description: "Track balance, open trades, win rates, and performance metrics in real-time. Get instant insights into your bot's activity and profitability.",
    },
    {
      icon: Zap,
      title: "Strategy Control",
      description: "Start, stop, or adjust your trading strategies remotely. Fine-tune parameters and optimize performance from anywhere in the world.",
    },
    {
      icon: Bell,
      title: "Smart Alerts",
      description: "Get instant notifications about bot activity, trades, errors, or market opportunities. Never miss important trading events again.",
    },
    {
      icon: Shield,
      title: "Secure & Encrypted",
      description: "Bank-grade encryption protects your trading data and account information. Full privacy and complete account safety guaranteed.",
    },
  ];

  return (
    <section className="py-24 px-6 bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Everything You Need to <span className="text-gradient">Master Your Bots</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Professional-grade tools designed for serious traders who demand control, 
            transparency, and performance from their automated trading systems.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="feature-card group text-center"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="mb-6">
                <div className="w-16 h-16 mx-auto bg-gradient-primary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-8 h-8 text-white" />
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

        {/* Trading Platform Compatibility */}
        <div className="mt-20 glass-card text-center">
          <h3 className="text-2xl font-bold text-foreground mb-6">
            Full MetaTrader Compatibility
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="text-6xl mb-4">📈</div>
              <h4 className="text-xl font-semibold text-foreground mb-2">MetaTrader 4</h4>
              <p className="text-muted-foreground">Complete support for MT4 Expert Advisors, custom indicators, and trading signals.</p>
            </div>
            <div>
              <div className="text-6xl mb-4">📊</div>
              <h4 className="text-xl font-semibold text-foreground mb-2">MetaTrader 5</h4>
              <p className="text-muted-foreground">Advanced MT5 features including market depth, economic calendar, and multi-asset trading.</p>
            </div>
          </div>
          
          {/* Additional Features */}
          <div className="mt-12 pt-8 border-t border-border">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-accent-green rounded-full"></div>
                <span>Multi-account management</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-accent-cyan rounded-full"></div>
                <span>VPS integration support</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-accent-green rounded-full"></div>
                <span>Cloud synchronization</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-accent-cyan rounded-full"></div>
                <span>Risk management tools</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-accent-green rounded-full"></div>
                <span>Performance analytics</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-accent-cyan rounded-full"></div>
                <span>24/7 monitoring</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;