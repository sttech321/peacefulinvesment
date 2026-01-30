import balance1 from '@/assets/balance-icon-1.svg';
import balance2 from '@/assets/balance-icon-2.svg';
import balance3 from '@/assets/balance-icon-3.svg';
import balance4 from '@/assets/balance-icon-4.svg';
import { useHomePageContent } from '@/hooks/useHomePageContent';

const LandingFeaturesNew = () => {
  const { content } = useHomePageContent();

  const fallbackIcons = [balance1, balance2, balance3, balance4];
  const section = (content as any)?.features_section;
  const cards: Array<{ iconUrl?: string; title?: string; description?: string }> =
    Array.isArray(section?.cards) ? section.cards : [];

  return (
    <section className='px-6 pb-10 md:pb-12 lg:pb-24'>
      <div className='mx-auto max-w-7xl'>
        {/* Section Header */}
        <div className='lg:md-16 mb-10 text-center'>
          <h2 className='mb-6 text-2xl font-bold uppercase text-white md:text-3xl'>
            <span className='text-[var(--yellowcolor)]'>
              {section?.titleYellow ?? ''}
            </span>
            : <span className='block'>{section?.titleWhite ?? ''}</span>
          </h2>
          <p className='mx-auto max-w-5xl font-open-sans text-lg text-white lg:text-xl'>
            {section?.subtitle ?? ''}
          </p>
        </div>

        {/* Features Grid */}

        <div className='grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4'>
          {cards.map((feature, index) => (
            <div
              key={index}
              style={{ animationDelay: `${index * 0.1}s` }}
              className='bg-gradient-pink-to-yellow hover:glow-primary relative rounded-lg p-[2px]'
            >
              <div className='group relative z-10 m-[0px] h-full rounded-lg border-0 bg-black p-8 px-3 text-center'>
                <div className='mb-6'>
                  <div className='w-20 h-20 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 mb-5'>
                    <img
                      className='w-10 h-10'
                      src={feature.iconUrl || fallbackIcons[index]}
                      alt={feature.title}
                    />
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
