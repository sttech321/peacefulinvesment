import React, { PureComponent } from 'react';
import faithfinanceimg from '@/assets/faithfinanceimg.svg';

export default class LandingFaithFinancest extends PureComponent {
  render() {
    return (
      <section className='px-6 pb-7 md:pb-12 lg:pb-24 lg:pt-10'>
        <div className='mx-auto flex max-w-7xl flex-col items-center justify-between lg:flex-row'>
          <div className='mb-10 pr-0 lg:mb-0 lg:w-3/5 lg:pr-12'>
            <h3 className='font-inter text-2xl font-semibold uppercase text-white md:text-3xl'>
              Catholic Investment Solutions for You: Aligning Your{' '}
              <span className='text-[var(--yellowcolor)]'>
                Faith & Finances{' '}
              </span>
            </h3>
            <p className='pt-5 font-open-sans text-lg leading-[30px] text-white lg:pt-12'>
              Do you yearn to grow your wealth while staying true to your
              Catholic values? Many Catholic individuals, like you, share this
              desire. You’ve worked hard and saved diligently, and now you want
              your investments to reflect your faith. But navigating the
              complexities of financial planning while adhering to Catholic
              social teaching can be daunting. Finding catholic investment
              solutions for individuals that you can trust is also difficult.
              <br />
              <br />
              At Peaceful Investment, we specialize in helping Catholic
              individuals like yourself achieve your financial goals. We
              understand the importance of aligning your investments with your
              values. <br />
              <br />
              We combine human expertise with innovative technology to create
              personalized financial plans and investment strategies that
              consider both your financial objectives and your Catholic beliefs.
            </p>
          </div>

          <div className='flex justify-center lg:w-2/5'>
            <img className='mx-auto' src={faithfinanceimg} alt='Join Icon' />
          </div>
        </div>
      </section>
    );
  }
}
