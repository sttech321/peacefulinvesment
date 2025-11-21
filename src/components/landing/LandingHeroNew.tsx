import { Button } from '@/components/ui/button';
import { ArrowRight, TrendingUp, Shield, Users, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import tradingHeroBg from '@/assets/home-banner-img.png';

const LandingHeroNew = () => {
  return (
    <section className='relative flex min-h-screen items-center justify-center overflow-hidden'>
      {/* Background */}
      <div
        className='hero-bg absolute inset-0'
        style={{
          backgroundImage: `url(${tradingHeroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Floating Elements */}
      <div className='pointer-events-none absolute inset-0 overflow-hidden'>
        <div className='animate-float absolute left-1/4 top-1/4 h-32 w-32 rounded-full bg-primary/10 blur-xl' />
        <div
          className='animate-float absolute right-1/4 top-3/4 h-24 w-24 rounded-full bg-primary/10 blur-lg'
          style={{ animationDelay: '1s' }}
        />
        <div
          className='animate-float absolute right-1/3 top-1/2 h-16 w-16 rounded-full bg-primary/15 blur-md'
          style={{ animationDelay: '2s' }}
        />
      </div>

      {/* Content */}
      <div className='relative z-10 mx-auto w-full max-w-7xl px-6 text-center'>
        <div className='grid items-center gap-12'>
          {/* Left Content */}
          <div className='w-full max-w-3xl text-left lg:text-left'>
            {/* Logo/Badge */}

            {/* Main Headline */}
            <h1
              className='animate-slide-up mb-6 font-inter font-bold uppercase text-white text-3xl md:text-4xl lg:text-5xl xl:text-6xl'
              style={{ animationDelay: '0.2s' }}
            >
              Your Gateway to{' '}
              <span className='w-full text-[var(--yellowcolor)]'>
                Smart Investment
              </span>
            </h1>

            {/* Subtitle */}
            <p
              className='animate-slide-up mb-8 max-w-2xl font-inter text-lg md:text-[20px] font-normal text-white'
              style={{ animationDelay: '0.4s' }}
            >
              Complete investment platform with automated trading, portfolio
              management, and expert insights. Start your financial journey with
              confidence.
            </p>

            {/* CTA Buttons */}
            <div
              className='animate-slide-up flex justify-start gap-4 sm:flex-row'
              style={{ animationDelay: '0.6s' }}
            >
              <Link
                to='/auth'
                className='bg-gradient-pink-to-yellow rounded-[12px] p-[2px]'
              >
                <Button className='hover:bg-gradient-pink-to-yellow block h-[45px] rounded-[10px] border-0 bg-black p-0 px-6 font-inter text-xs font-semibold uppercase text-white hover:text-white'>
                  Start Trading
                  {/* <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" /> */}
                </Button>
              </Link>

              <Link
                to='/downloads'
                className='bg-gradient-pink-to-yellow rounded-[12px] p-[2px]'
              >
                <Button
                  variant='outline'
                  className='bg-gradient-yellow-to-pink hover:bg-gradient-pink-to-yellow block h-[45px] rounded-[10px] border-0 p-0 px-6 font-inter text-xs font-semibold uppercase text-white'
                >
                  Download App
                </Button>
              </Link>
            </div>

            {/* Trust Indicators */}
            {/* <div className="flex items-center gap-6 mt-8 animate-fade-in" style={{ animationDelay: '0.8s' }}>
              <div className="flex items-center gap-2 text-primary/80">
                <Shield className="w-5 h-5" />
                <span className="text-white font-medium">Bank-Grade Security</span>
              </div>
              <div className="flex items-center gap-2 text-primary/80">
                <TrendingUp className="w-5 h-5" />
                <span className="text-white font-medium">94.2% Success Rate</span>
              </div>
            </div> */}
          </div>

          {/* Right Content - Stats Grid */}
        </div>
      </div>
    </section>
  );
};

export default LandingHeroNew;
