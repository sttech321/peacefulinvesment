import React, { PureComponent } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default class LandingCTAnew extends PureComponent {
  render() {
    return (
      <section className='px-6 pb-10 text-center md:pb-12 lg:pb-24'>
        <div className='animate-slide-up mx-auto max-w-7xl'>
          <div className='text-center'>
            <h2 className='mx-auto mb-6 text-2xl font-bold uppercase text-white md:text-3xl'>
              Ready to Start Your
              <span className='text-[var(--yellowcolor)]'>
                {' '}
                Investment Journey
              </span>
              ?
            </h2>
            <p className='mx-auto max-w-4xl font-open-sans text-lg text-white lg:text-xl'>
              Join thousands of successful investors who trust our platform for
              their trading needs. Start with our free trial and see the
              difference professional tools can make.
            </p>

            {/* CTA Buttons */}
            <div className='pt-10'>
              <div
                className='flex justify-center gap-4 sm:flex-row'
                style={{ animationDelay: '0.6s' }}
              >
                <Link
                  to='/auth'
                  className='bg-gradient-pink-to-yellow inline-block w-fit rounded-[12px] p-[2px]'
                >
                  <Button className='hover:bg-gradient-pink-to-yellow block h-[45px] rounded-[10px] border-0 bg-black p-0 px-6 font-inter text-xs font-semibold uppercase text-white hover:text-white'>
                    Start Free Trial
                  </Button>
                </Link>

                <Link
                  to='/downloads'
                  className='bg-gradient-pink-to-yellow inline-block w-fit rounded-[12px] p-[2px]'
                >
                  <Button className='bg-gradient-yellow-to-pink hover:bg-gradient-pink-to-yellow block h-[45px] rounded-[10px] border-0 p-0 px-6 font-inter text-xs font-semibold uppercase text-white'>
                    Download App
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }
}
