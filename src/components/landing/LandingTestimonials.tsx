import { Star, Quote } from "lucide-react";

const LandingTestimonials = () => {
  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Professional Trader",
      company: "Goldman Sachs",
      content: "The automated trading features have revolutionized my portfolio management. I've seen a 35% increase in returns since switching to this platform.",
      rating: 5,
      avatar: "SJ"
    },
    {
      name: "Michael Chen",
      role: "Investment Manager",
      company: "Morgan Stanley",
      content: "Outstanding risk management tools and real-time analytics. The platform's reliability and performance tracking are second to none.",
      rating: 5,
      avatar: "MC"
    },
    {
      name: "Emily Rodriguez",
      role: "Hedge Fund Analyst",
      company: "Bridgewater",
      content: "The copy trading feature allowed me to learn from top performers while building my own strategies. Incredible educational value.",
      rating: 5,
      avatar: "ER"
    },
    {
      name: "David Thompson",
      role: "Retail Investor",
      company: "Independent",
      content: "Started as a beginner and now I'm consistently profitable. The education resources and community support are invaluable.",
      rating: 5,
      avatar: "DT"
    },
    {
      name: "Lisa Park",
      role: "Quantitative Analyst",
      company: "BlackRock",
      content: "The backtesting capabilities and strategy optimization tools are institutional-grade. Perfect for developing and refining trading algorithms.",
      rating: 5,
      avatar: "LP"
    },
    {
      name: "James Wilson",
      role: "Portfolio Manager",
      company: "Fidelity",
      content: "Multi-account management and automated rebalancing have saved me hours of work daily. The efficiency gains are remarkable.",
      rating: 5,
      avatar: "JW"
    }
  ];

  return (
    <section className="py-24 px-6 bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Trusted by <span className="text-gradient">Industry Leaders</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            See what professional traders and investment managers say about our platform.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index} 
              className="glass-card group hover:scale-105 transition-all duration-300"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Quote Icon */}
              <div className="mb-4">
                <Quote className="w-8 h-8 text-primary/50" />
              </div>
              
              {/* Rating */}
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                ))}
              </div>
              
              {/* Content */}
              <p className="text-foreground mb-6 leading-relaxed">
                "{testimonial.content}"
              </p>
              
              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="font-semibold text-foreground">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  <div className="text-xs text-primary font-medium">{testimonial.company}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Trust Indicators */}
        <div className="mt-20 text-center">
          <div className="glass-card inline-block">
            <h3 className="text-xl font-bold text-foreground mb-6">
              Regulated & Secure
            </h3>
            <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>SEC Registered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>SIPC Protected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>SOC 2 Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>256-bit Encryption</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingTestimonials;