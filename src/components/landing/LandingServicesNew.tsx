import React, { PureComponent } from 'react';
import bridgegapimage1 from '@/assets/bridge-gap-image-1.png';
import bridgegapimage2 from '@/assets/bridge-gap-image-2.png';
import bridgegapimage3 from '@/assets/bridge-gap-image-3.png';
import bridgegapimage4 from '@/assets/bridge-gap-image-4.png';

const LandingServicesNew = () => {
  const Servicesfeatures = [
    {
      src: bridgegapimage1,
      title: 'Deep Understanding of Catholic Values',
      description:
        'Our team is well-versed in Catholic social teaching and its application to investment decisions. We work closely with you to ensure your portfolio reflects your ethical principles.',
    },
    {
      src: bridgegapimage2,
      title: 'Faith-Based Investment Research',
      description:
        'We go beyond traditional financial metrics. Our research process incorporates a thorough analysis of a company’s social and environmental impact, aligning your investments with your values.',
    },
    {
      src: bridgegapimage3,
      title: 'Personalized Faith & Finance Score',
      description:
        'This innovative tool analyzes your existing portfolio or potential investments, generating a score that reflects their alignment with Catholic values.',
    },
    {
      src: bridgegapimage4,
      title: 'Experience You Can Trust',
      description:
        'We leverage our team’s significant expertise into personalized strategies for individual investors like you.',
    },
  ];

  return (
    <section className='px-6 pb-7 md:pb-12 lg:pb-24'>
      <div className='mx-auto max-w-7xl'>
        <div className='mb-10 text-center lg:mb-16'>
          <h2 className='mx-auto max-w-2xl text-2xl font-bold uppercase text-white md:text-3xl lg:mb-6'>
            We Can Help You Bridge the Gap Between Your
            <span className='text-[var(--yellowcolor)]'>
              {' '}
              Faith and Finances
            </span>
          </h2>
          <p className='mx-auto max-w-5xl pt-5 font-open-sans text-lg text-white lg:text-xl'>
            As a Catholic individual, you likely desire financial security and
            growth for yourself and your family. However, you also want your
            investments to reflect your values and avoid supporting activities
            that contradict your faith (e.g., abortion, embryonic stem cell
            research, adult entertainment).
          </p>
        </div>

        {/* Services Grid */}
        <div className='mx-auto grid max-w-6xl grid-cols-1 gap-[40px] md:grid-cols-2 lg:grid-cols-2 lg:gap-[90px]'>
          {Servicesfeatures.map((feature, index) => (
            <div
              key={index}
              style={{ animationDelay: `${index * 0.1}s` }}
              className='bg-gradient-pink-to-yellow hover:glow-primary relative rounded-lg p-[2px]'
            >
              <div className='group relative z-10 h-full rounded-lg border-0 bg-black p-2 text-center'>
                <div className='mb-6'>
                  <div className='mx-auto'>
                    <img
                      src={feature.src}
                      alt={feature.title}
                      className='mx-auto'
                    />
                  </div>
                </div>
                <div className='mx-auto max-w-sm px-5 pb-5'>
                  <h3 className='mx-auto mb-4 font-bebas-neue text-2xl font-normal text-white'>
                    {feature.title}
                  </h3>

                  <p className='font-open-sans text-sm leading-relaxed text-white'>
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LandingServicesNew;
