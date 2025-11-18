import { Star, Quote, TrendingUp } from "lucide-react";

const TestimonialsSection = () => {
  const testimonials = [
    {
      name: "Marcus Chen",
      role: "Forex Trader",
      company: "Independent",
      avatar: "👨‍💼",
      rating: 5,
      quote: "This app gave me complete freedom! I can monitor and control all my MetaTrader bots while traveling. The real-time alerts saved me from a major drawdown last week.",
      profit: "+$12,450",
      timeframe: "Last month"
    },
    {
      name: "Sarah Rodriguez",
      role: "Algo Trading Specialist",
      company: "PropFirm Trading",
      avatar: "👩‍💻",
      rating: 5,
      quote: "Managing 15+ strategies across multiple MT4 accounts was chaos before this tool. Now I have everything in one dashboard with perfect visibility and control.",
      profit: "+$28,900",
      timeframe: "This quarter"
    },
    {
      name: "David Kim",
      role: "Professional Trader",
      company: "Hedge Fund",
      avatar: "👨‍💼",
      rating: 5,
      quote: "The risk management features and instant notifications are game-changers. I caught a runaway bot before it could damage my account significantly.",
      profit: "+$45,200",
      timeframe: "YTD"
    },
    {
      name: "Emma Thompson",
      role: "Retail Trader",
      company: "Part-time Trading",
      avatar: "👩‍🔬",
      rating: 5,
      quote: "As someone with a day job, being able to monitor my bots remotely is invaluable. The mobile-friendly interface lets me check performance during lunch breaks.",
      profit: "+$8,750",
      timeframe: "Last 3 months"
    },
  ];

  const trustIndicators = [
    { name: "Trading Platforms", logo: "📊", count: "MT4 & MT5" },
    { name: "Active Users", logo: "👥", count: "50,000+" },
    { name: "Volume Managed", logo: "💰", count: "$2.8B+" },
    { name: "Success Rate", logo: "📈", count: "94.2%" },
    { name: "Uptime", logo: "⚡", count: "99.9%" },
    { name: "Countries", logo: "🌍", count: "120+" },
  ];

  return (
    <section className="py-24 px-6 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Trusted by <span className="text-gradient">Professional Traders</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Join thousands of successful traders who rely on Peaceful Investment 
            to optimize their automated trading strategies and maximize profits.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index}
              className="glass-card hover:glow-primary group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Quote Icon */}
              <div className="mb-4">
                <Quote className="w-8 h-8 text-accent-cyan opacity-50" />
              </div>

              {/* Testimonial Text */}
              <blockquote className="text-foreground text-lg leading-relaxed mb-6">
                "{testimonial.quote}"
              </blockquote>

              {/* Rating */}
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-accent-green text-accent-green" />
                ))}
              </div>

              {/* Author Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-2xl">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">
                      {testimonial.name}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
                
                {/* Performance Badge */}
                <div className="text-right">
                  <div className="text-accent-green font-bold text-lg flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    {testimonial.profit}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {testimonial.timeframe}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust Indicators */}
        <div className="glass-card">
          <h3 className="text-2xl font-bold text-foreground mb-8 text-center">
            Powering Trading Success Worldwide
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
            {trustIndicators.map((indicator, index) => (
              <div 
                key={index}
                className="text-center group"
              >
                <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">
                  {indicator.logo}
                </div>
                <div className="text-xl font-bold text-foreground mb-1">
                  {indicator.count}
                </div>
                <div className="text-sm text-muted-foreground">
                  {indicator.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Overall Rating Summary */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-4 glass-card">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-6 h-6 fill-accent-green text-accent-green" />
              ))}
            </div>
            <div className="text-2xl font-bold text-foreground">4.9/5</div>
            <div className="text-muted-foreground">
              • Average rating from 3,247 traders
            </div>
            <div className="flex items-center gap-2 text-accent-green">
              <TrendingUp className="w-4 h-4" />
              <span className="font-semibold">97% recommend</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;