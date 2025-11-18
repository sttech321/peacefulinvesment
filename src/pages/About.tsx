import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Target, 
  Shield, 
  TrendingUp, 
  Award, 
  Globe, 
  Heart, 
  Zap,
  CheckCircle,
  Building2,
  Lightbulb,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";

export default function About() {
  const values = [
    {
      icon: Shield,
      title: "Trust & Security",
      description: "Your financial security is our top priority. We implement the highest standards of data protection and regulatory compliance."
    },
    {
      icon: Heart,
      title: "Client-First Approach",
      description: "Every decision we make is centered around our clients' success and financial well-being."
    },
    {
      icon: Zap,
      title: "Innovation",
      description: "We continuously evolve our platform with cutting-edge technology to provide the best trading experience."
    },
    {
      icon: Globe,
      title: "Global Reach",
      description: "Serving clients worldwide with localized support and multi-language capabilities."
    }
  ];

  const achievements = [
    { number: "10K+", label: "Active Traders", icon: Users },
    { number: "$500M+", label: "Trading Volume", icon: TrendingUp },
    { number: "50+", label: "Countries Served", icon: Globe },
    { number: "99.9%", label: "Uptime", icon: CheckCircle }
  ];

  const team = [
    {
      name: "Patrick Oliveri",
      role: "Founder & CEO",
      description: "Financial industry veteran with over 15 years of experience in investment management and technology.",
      image: "/placeholder.svg"
    },
    {
      name: "Sarah Chen",
      role: "Chief Technology Officer",
      description: "Expert in fintech solutions with a focus on secure, scalable trading platforms.",
      image: "/placeholder.svg"
    },
    {
      name: "Michael Rodriguez",
      role: "Head of Compliance",
      description: "Ensures our platform meets all regulatory requirements and maintains the highest ethical standards.",
      image: "/placeholder.svg"
    }
  ];

  const milestones = [
    {
      year: "2020",
      title: "Company Founded",
      description: "Peaceful Investment was established with a vision to democratize access to professional trading tools."
    },
    {
      year: "2021",
      title: "Platform Launch",
      description: "Successfully launched our first trading platform with MetaTrader integration."
    },
    {
      year: "2022",
      title: "Global Expansion",
      description: "Expanded services to 50+ countries and reached 10,000+ active traders."
    },
    {
      year: "2023",
      title: "Advanced Features",
      description: "Introduced AI-powered analytics and advanced risk management tools."
    },
    {
      year: "2024",
      title: "Future Vision",
      description: "Continuing innovation with blockchain integration and enhanced mobile trading capabilities."
    }
  ];

  return (
    <div className="min-h-screen pt-16">
      {/* Hero Section */}
      <section className="relative py-24 px-6 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-6">
              <Building2 className="w-4 h-4 mr-2" />
              About Peaceful Investment
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Empowering Traders
              <span className="block text-gradient">Worldwide</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              We're on a mission to democratize access to professional trading tools and create 
              opportunities for financial growth across the globe.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button className="download-btn-primary group">
                  Start Trading Today
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/downloads">
                <Button variant="outline" className="glass">
                  View Our Platform
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-24 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-6">
                Our Mission & Vision
              </h2>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
                      <Target className="w-6 h-6 text-primary-foreground" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      Mission
                    </h3>
                    <p className="text-muted-foreground">
                      To provide accessible, secure, and innovative trading solutions that empower 
                      individuals to achieve their financial goals through transparent and ethical practices.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
                      <Lightbulb className="w-6 h-6 text-primary-foreground" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      Vision
                    </h3>
                    <p className="text-muted-foreground">
                      To become the world's most trusted platform for individual traders, 
                      known for innovation, security, and unwavering commitment to client success.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-primary/20 rounded-2xl transform rotate-3"></div>
              <Card className="relative glass-card border-0 shadow-xl">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold text-foreground mb-4">
                    Why Choose Peaceful Investment?
                  </h3>
                  <div className="space-y-4">
                    {[
                      "Advanced trading technology with MetaTrader integration",
                      "24/7 customer support in multiple languages",
                      "Regulated and compliant trading environment",
                      "Educational resources and market analysis",
                      "Competitive spreads and low fees",
                      "Mobile trading apps for iOS and Android"
                    ].map((feature, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 px-6 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Our Core <span className="text-gradient">Values</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              These principles guide everything we do and shape the way we serve our clients.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div 
                key={index} 
                className="feature-card group text-center"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="mb-6">
                  <div className="w-16 h-16 mx-auto bg-gradient-primary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <value.icon className="w-8 h-8 text-primary-foreground" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-4">
                  {value.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Achievements */}
      <section className="py-24 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Our <span className="text-gradient">Achievements</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Milestones that demonstrate our commitment to excellence and growth.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {achievements.map((achievement, index) => (
              <div key={index} className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-primary rounded-2xl flex items-center justify-center">
                  <achievement.icon className="w-10 h-10 text-primary-foreground" />
                </div>
                <div className="text-3xl font-bold text-foreground mb-2">
                  {achievement.number}
                </div>
                <div className="text-muted-foreground">
                  {achievement.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-24 px-6 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Meet Our <span className="text-gradient">Leadership Team</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Experienced professionals dedicated to your trading success.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <div 
                key={index} 
                className="feature-card group text-center"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="mb-6">
                  <div className="w-24 h-24 mx-auto bg-gradient-primary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Users className="w-12 h-12 text-primary-foreground" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-1">
                  {member.name}
                </h3>
                <p className="text-primary font-medium mb-3">
                  {member.role}
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  {member.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-24 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Our <span className="text-gradient">Journey</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Key milestones in our company's growth and development.
            </p>
          </div>
          <div className="relative">
            <div className="absolute left-1/2 transform -translate-x-px h-full w-0.5 bg-gradient-primary"></div>
            <div className="space-y-12">
              {milestones.map((milestone, index) => (
                <div key={index} className={`flex items-center ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}>
                  <div className="w-1/2 px-8">
                    <Card className="glass-card border-0 shadow-lg">
                      <CardContent className="p-6">
                        <div className="flex items-center mb-2">
                          <Badge variant="secondary" className="mr-3">
                            {milestone.year}
                          </Badge>
                          <Award className="w-5 h-5 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">
                          {milestone.title}
                        </h3>
                        <p className="text-muted-foreground">
                          {milestone.description}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="w-4 h-4 bg-gradient-primary rounded-full border-4 border-background shadow-lg"></div>
                  <div className="w-1/2 px-8"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-primary">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-primary-foreground mb-4">
            Ready to Start Your Trading Journey?
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            Join thousands of successful traders who trust Peaceful Investment for their financial growth.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="bg-background text-primary hover:bg-background/90">
                Create Account
              </Button>
            </Link>
            <Link to="/downloads">
              <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
