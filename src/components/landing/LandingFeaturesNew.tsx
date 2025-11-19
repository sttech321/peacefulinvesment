import { Bot, TrendingUp, Shield, Users, Bell, BarChart } from 'lucide-react';
import balance1 from '@/assets/balance-icon-1.svg';
import balance2 from '@/assets/balance-icon-2.svg';
import balance3 from '@/assets/balance-icon-3.svg';
import balance4 from '@/assets/balance-icon-4.svg';

const LandingFeaturesNew = () => {
  const features = [
    {
      src: balance1,
      title: 'Limited Transparency',
      description:
        'Many investment options lack clarity on how companies use their profits. This makes it difficult to know if your investments are indirectly supporting activities you oppose.',
    },
    {
      src: balance2,
      title: 'Navigating Ethical Complexities',
      description:
        'Discerning the ethical implications of various industries and companies can be overwhelming. You might need guidance on issues like social justice, environmental impact, and fair labor practices.',
    },
    {
      src: balance3,
      title: 'Reconciling Faith with Returns',
      description:
        'A common concern is that prioritizing your values means sacrificing financial returns. We strive to mitigate this concern through our rigorous screening process that is designed to help drive value over time while staying true to your Catholic beliefs',
    },
    {
      src: balance4,
      title: 'Ongoing Maintenance',
      description:
        'With the speed of change today, it can be difficult to maintain a portfolio that reflects catholic values over time. Companies and industries are constantly shifting and what may have been an investment that met your needs yesterday may no longer fit those same standards today.',
    },
  ];

  return (
    <section className='px-6 pb-10 md:pb-12 lg:pb-24'>
      <div className='mx-auto max-w-7xl'>
        {/* Section Header */}
        <div className='lg:md-16 mb-10 text-center'>
          <h2 className='mb-6 text-2xl font-bold uppercase text-white md:text-3xl'>
            <span className='text-[var(--yellowcolor)]'>
              Balancing Growth and Faith
            </span>
            : <span className='block'>Can You Have Both?</span>
          </h2>
          <p className='mx-auto max-w-5xl font-open-sans text-lg text-white lg:text-xl'>
            As a Catholic individual, you likely desire financial security and
            growth for yourself and your family. However, you also want your
            investments to reflect your values and avoid supporting activities
            that contradict your faith (e.g., abortion, embryonic stem cell
            research, adult entertainment).
          </p>
        </div>

        {/* Features Grid */}

        <div className='grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4'>
          {features.map((feature, index) => (
            <div
              key={index}
              style={{ animationDelay: `${index * 0.1}s` }}
              className='bg-gradient-pink-to-yellow hover:glow-primary relative rounded-lg p-[2px]'
            >
              <div className='group relative z-10 m-[0px] h-full rounded-lg border-0 bg-black p-8 px-3 text-center'>
                <div className='mb-6'>
                  <div className='group-hover:glow-primary mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-black transition-transform duration-300 group-hover:scale-110'>
                    <img src={feature.src} alt={feature.title} />
                  </div>
                </div>

                <h3 className='mx-auto mb-4 max-w-[160px] font-bebas-neue text-2xl font-normal text-white'>
                  {feature.title}
                </h3>

                <p className='font-open-sans text-sm leading-relaxed text-white'>
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
