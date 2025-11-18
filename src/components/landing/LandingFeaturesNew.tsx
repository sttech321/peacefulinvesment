import { Bot, TrendingUp, Shield, Users, Bell, BarChart } from "lucide-react";
import balance1 from '@/assets/balance-icon-1.svg';
import balance2 from '@/assets/balance-icon-2.svg';
import balance3 from '@/assets/balance-icon-3.svg';
import balance4 from '@/assets/balance-icon-4.svg';

const LandingFeaturesNew = () => {
  const features = [
    {
     
      title: "Limited Transparency",
      description: "Many investment options lack clarity on how companies use their profits. This makes it difficult to know if your investments are indirectly supporting activities you oppose.",
    },
    {
     
      title: "Navigating Ethical Complexities",
      description: "Discerning the ethical implications of various industries and companies can be overwhelming. You might need guidance on issues like social justice, environmental impact, and fair labor practices.",
    },
    {
     
      title: "Reconciling Faith with Returns",
      description: "A common concern is that prioritizing your values means sacrificing financial returns. We strive to mitigate this concern through our rigorous screening process that is designed to help drive value over time while staying true to your Catholic beliefs",
    },
    {
     
      title: "Ongoing Maintenance",
      description: "With the speed of change today, it can be difficult to maintain a portfolio that reflects catholic values over time. Companies and industries are constantly shifting and what may have been an investment that met your needs yesterday may no longer fit those same standards today.",
    },
  ];

  return (
    <section className="pb-24 px-6 bg-black">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-white uppercase mb-6">
            <span className="text-[var(--yellowcolor)]">Balancing Growth and Faith</span>: <span className="block">Can You Have Both?</span>
          </h2>
          <p className="font-open-sans text-xl text-white max-w-5xl mx-auto">
           As a Catholic individual, you likely desire financial security and growth for yourself and your family. However, you also want your investments to reflect your values and avoid supporting activities that contradict your faith (e.g., abortion, embryonic stem cell research, adult entertainment).
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} style={{ animationDelay: `${index * 0.1}s` }} className="relative rounded-lg bg-gradient-pink-to-yellow p-[2px]">
            
              <div className="relative m-[1px] feature-card group h-full bg-black rounded-lg p-8 px-3 text-center z-10 border-0">
                <div className="mb-6">
                  <div className="w-16 h-16 mx-auto">
                    {(() => {
                      const icons = [balance1, balance2, balance3, balance4];
                      const src = icons[index] ?? icons[0];
                      return <img src={src} alt={feature.title} className="mx-auto" />;
                    })()}
                  </div>
                </div>

                <h3 className="text-2xl font-normal max-w-[160px] mx-auto font-bebas-neue text-white mb-4">
                  {feature.title}
                </h3>

                <p className="text-white text-sm font-open-sans leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        {/* <div className="mt-20 text-center">
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
        </div> */}
      </div>
    </section>
  );
};

export default LandingFeaturesNew;