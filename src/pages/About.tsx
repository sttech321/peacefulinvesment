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
    <div className="min-h-screen pink-yellow-shadow pt-16">
      {/* Hero Section */}
      <section className="relative px-6 py-10 md:py-12 lg:py-24 bg-black/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-0">
            <Badge variant="secondary" className="mb-6">
              <Building2 className="w-4 h-4 mr-2" />
              About Peaceful Investment
            </Badge>
            <h1 className="font-inter font-bold text-white text-3xl md:text-4xl lg:text-5xl xl:text-6xl mb-6">
              Empowering Traders
              <span className="text-[var(--yellowcolor)]"> Worldwide</span>
            </h1>
            <p className="max-w-3xl mx-auto font-inter text-lg md:text-[20px] font-normal text-white mb-8">
              We're on a mission to democratize access to professional trading tools and create 
              opportunities for financial growth across the globe.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth" className="bg-gradient-pink-to-yellow rounded-[12px] p-[2px]">
                <Button className="hover:bg-gradient-pink-to-yellow flex  rounded-[10px] border-0 bg-black p-0 px-5 font-inter text-xs font-semibold uppercase text-white hover:text-white w-full">
                  Start Trading Today
                  <ArrowRight className="w-5 h-5 ml-0 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/downloads" className="bg-gradient-pink-to-yellow rounded-[12px] p-[2px]">
                <Button variant="outline" className="bg-gradient-yellow-to-pink hover:bg-gradient-pink-to-yellow block rounded-[10px] border-0 p-0 px-5 font-inter text-xs font-semibold uppercase text-white w-full">
                  View Our Platform
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="px-6 pt-10 md:pt-12 lg:pt-24 bg-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="mb-4 md:mb-6 font-inter text-2xl font-bold text-white md:text-3xl">
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
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Mission
                    </h3>
                    <p className="font-open-sans text-lg text-muted-foreground">
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
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Vision
                    </h3>
                    <p className="font-open-sans text-lg text-muted-foreground">
                      To become the world's most trusted platform for individual traders, 
                      known for innovation, security, and unwavering commitment to client success.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-primary rounded-2xl transform rotate-3"></div>
              <Card className="relative bg-white/50 border-0 shadow-xl">
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
                        <CheckCircle className="w-5 h-5 text-black flex-shrink-0" />
                        <span className="text-black">{feature}</span>
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
      <section className="px-6 pt-10 md:pt-12 lg:pt-24 bg-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="mb-4 md:mb-6 font-inter text-2xl font-bold uppercase text-white md:text-3xl">
              Our Core <span className="text-[var(--yellowcolor)]">Values</span>
            </h2>
            <p className="mx-auto max-w-3xl font-open-sans text-lg text-white lg:text-xl">
              These principles guide everything we do and shape the way we serve our clients.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div
                key={index}
                className="mb-5 md:mb-0 last:mb-0 relative group rounded-xl bg-black/10 backdrop-blur-sm border border-[var(--yellowcolor)] px-6 pt-10 pb-8 text-center shadow-sm transition duration-300 hover:border-[var(--yellowcolor)] hover:shadow-lg hover:shadow-[var(--yellowcolor)]/10"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Step Badge */}
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex">
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[var(--yellowcolor)] text-black shadow-md ring-1 ring-black/10 transition group-hover:scale-105">
                    <value.icon className="h-8 w-8" />
                  </div>
                </div>
                 
                <h3 className="mt-5 text-lg font-semibold text-white">
                  {value.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground font-open-sans">
                  {value.description}
                </p>
                {/* Progress Bar line under card for step flow */}
                {index < values.length - 0 && (
                  <div className="absolute bottom-0 left-1/2 hidden h-10 w-px translate-x-[-50%] translate-y-full bg-gradient-to-b from-[var(--yellowcolor)] to-transparent lg:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Achievements */}
      <section className="px-6 pt-10 md:pt-12 lg:pt-24 bg-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 md:mb-14">
            <h2 className="mb-4 md:mb-5 font-inter text-2xl font-bold uppercase text-white md:text-3xl">
              Our <span className="text-[var(--yellowcolor)]">Achievements</span>
            </h2>
            <p className="mx-auto max-w-3xl font-open-sans text-lg text-white lg:text-xl">
              Milestones that demonstrate our commitment to excellence and growth.
            </p>
          </div>
 


          <div className='bg-gradient-pink-to-yellow rounded-sm p-[2px]'>
            <div className='grid grid-cols-2 gap-0 rounded-sm bg-black md:grid-cols-4 pt-5 pb-4 items-center'>
            {achievements.map((achievement, index) => (
              <div key={index} className="glass-card border-0 bg-transparent p-4 text-center shadow-none">
                <div className="w-20 h-20 mx-auto mb-7 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <achievement.icon className="w-10 h-10 text-primary" />
                </div>
                <div className="mb-2 font-bebas-neue text-[45px] xl:text-[50px] font-normal leading-[36px] text-white">
                  {achievement.number}
                </div>
                <div className="font-open-sans text-[18px] lg:text-xl font-normal text-white pt-2">
                  {achievement.label}
                </div>
              </div>
            ))}
          </div>
          </div>


        </div>
      </section>

      {/* Team */}
      <section className="px-6 pt-10 md:pt-12 lg:pt-24 bg-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 lg:mb-16">
            <h2 className="mb-4 md:mb-5 font-inter text-2xl font-bold uppercase text-white md:text-3xl">
              Meet Our <span className="text-[var(--yellowcolor)]">Leadership Team</span>
            </h2>
            <p className="mx-auto max-w-3xl font-open-sans text-lg text-white lg:text-xl">
              Experienced professionals dedicated to your trading success.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <div 
                key={index} 
                className="hover:glow-primary bg-gradient-pink-to-yellow group relative overflow-hidden rounded-lg p-[2px] text-center h-full"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="rounded-lg bg-black p-8 h-full">
                <div className="mb-6">
                  <div className="w-20 h-20 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Users className="w-12 h-12 text-primary" />
                  </div>
                </div>
                <h3 className="font-bebas-neue text-2xl font-normal text-white mb-1">
                  {member.name}
                </h3>
                <p className="text-primary font-medium mb-3">
                  {member.role}
                </p>
                <p className="font-open-sans text-sm leading-relaxed text-white">
                  {member.description}
                </p>
</div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Timeline */}
      <section className="px-6 pt-10 md:pt-12 lg:pt-24 bg-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 lg:mb-16">
            <h2 className="mb-4 md:mb-5 font-inter text-2xl font-bold uppercase text-white md:text-3xl">
              Our <span className="text-[var(--yellowcolor)]">Journey</span>
            </h2>
            <p className="mx-auto max-w-3xl font-open-sans text-lg text-white lg:text-xl">
              Key milestones in our company's growth and development.
            </p>
          </div>
          <div className="relative">
            <div className="absolute left-1/2 transform -translate-x-px h-full w-0.5 bg-gradient-primary"></div>
            <div className="space-y-12">
              {milestones.map((milestone, index) => {
                const isLeft = index % 2 === 0;
                return (
                  <div
                    key={index}
                    className={`flex items-center ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}
                  >
                    {/* Card Side */}
                    <div className={`md:w-1/2 ${isLeft ? 'pr-4 md:pr-8' : 'pl-4 md:pl-8'}`}>
                      <Card className="glass-card bg-black border-1 shadow-lg relative">
                        <CardContent className="p-0">
                          <div className="flex items-center mb-3">
                            <Badge variant="secondary" className="mr-3 bg-primary hover:bg-primary">
                              {milestone.year}
                            </Badge>
                            <Award className="w-5 h-5 text-primary" />
                          </div>
                          <h3 className="text-xl font-inter font-semibold text-white mb-2">
                            {milestone.title}
                          </h3>
                          <p className="text-muted-foreground font-open-sans leading-relaxed">
                            {milestone.description}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                    {/* Horizontal connector line (attach to card edge) */}
                    <div
                      className={`hidden md:inline-block h-0.5 w-12 bg-primary ${isLeft ? '-ml-[47px]' : '-mr-[47px]'}`}
                      aria-hidden="true"
                    ></div>
                    {/* Timeline Dot */}
                    <div className="hidden md:inline-block w-4 h-4 bg-gradient-primary rounded-full border-4 border-primary shadow-lg"></div>
                    {/* Spacer Side */}
                    <div className="hidden md:inline-block w-1/2 px-8"></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-10 md:py-12 lg:py-24 bg-transparent">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="mb-4 md:mb-5 font-inter text-2xl font-bold uppercase text-white md:text-3xl">
            Ready to Start Your <span className="text-[var(--yellowcolor)]">Trading Journey?</span>
          </h2>
          <p className="mx-auto max-w-3xl font-open-sans text-lg text-white lg:text-xl">
            Join thousands of successful traders who trust Peaceful Investment for their financial growth.
          </p>
          <div className="flex sm:flex-row gap-4 justify-center pt-8 md:pt-10 max-w-sm mx-auto">
            <Link to="/auth" className="bg-gradient-pink-to-yellow rounded-[12px] p-[2px] w-full">
              <Button size="lg" variant="secondary" className="hover:bg-gradient-pink-to-yellow flex rounded-[10px] border-0 bg-black p-0 px-5 font-inter text-sm font-semibold uppercase text-white hover:text-white w-full">
                Create Account
              </Button>
            </Link>
            <Link to="/downloads" className="bg-gradient-pink-to-yellow rounded-[12px] p-[2px] w-full">
              <Button size="lg" variant="outline" className="bg-gradient-yellow-to-pink hover:bg-gradient-pink-to-yellow block rounded-[10px] border-0 p-0 px-5 font-inter text-sm font-semibold uppercase text-white w-full">
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
