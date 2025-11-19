import { Button } from '@/components/ui/button';
import {
  Download,
  Apple,
  Monitor,
  Smartphone,
  Bot,
  TrendingUp,
} from 'lucide-react';
import tradingHeroBg from '@/assets/trading-hero-bg.jpg';
import dashboardMockup from '@/assets/dashboard-mockup.jpg';
import dashboardBanner from '@/assets/downloadBanner.png';

const HeroSection = () => {
  const detectOS = () => {
    const userAgent = window.navigator.userAgent;
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    return 'Windows';
  };

  const handleDownload = (os: string) => {
    // TODO: Implement actual download logic
    // This will trigger the appropriate download based on OS detection
    window.open(`/downloads/${os.toLowerCase()}`, '_blank');
  };

  return (
    <section className='relative flex min-h-screen items-center justify-center overflow-hidden bg-black/60 py-10'>
      {/* Professional Hero Background */}
      <div className='absolute inset-0'>
        {/* Base gradient background */}
        <div className='absolute inset-0 from-accent-50 via-primary-50 to-accent-100' />

        {/* Animated geometric patterns */}
        <div className='absolute inset-0 opacity-30'>
          <div className='absolute left-20 top-20 h-64 w-64 animate-pulse rounded-full bg-primary-200 blur-3xl' />
          <div
            className='absolute bottom-20 right-20 h-96 w-96 animate-pulse rounded-full bg-accent-200 blur-3xl'
            style={{ animationDelay: '1s' }}
          />
          <div
            className='absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 transform animate-pulse rounded-full bg-primary-100 blur-2xl'
            style={{ animationDelay: '2s' }}
          />
        </div>

        {/* Floating geometric shapes */}
        <div className='pointer-events-none absolute inset-0 overflow-hidden'>
          {/* Animated circles */}
          <div
            className='absolute left-1/4 top-1/4 h-20 w-20 animate-bounce rounded-full bg-primary-400/20'
            style={{ animationDuration: '3s', animationDelay: '0s' }}
          />
          <div
            className='absolute right-1/4 top-3/4 h-16 w-16 animate-bounce rounded-full bg-accent-400/20'
            style={{ animationDuration: '4s', animationDelay: '1s' }}
          />
          <div
            className='absolute right-1/3 top-1/2 h-12 w-12 animate-bounce rounded-full bg-primary-300/30'
            style={{ animationDuration: '2.5s', animationDelay: '2s' }}
          />

          {/* Floating trading icons */}
          <div
            className='animate-float hover-glow absolute right-20 top-20 text-5xl text-primary-400/30'
            style={{ animationDelay: '0.5s' }}
          >
            $
          </div>
          <div
            className='animate-float hover-glow absolute bottom-20 left-20 text-4xl text-accent-400/30'
            style={{ animationDelay: '1.5s' }}
          >
            ₿
          </div>
          <div
            className='animate-float hover-glow absolute right-1/3 top-1/3 text-3xl text-primary-300/25'
            style={{ animationDelay: '2.5s' }}
          >
            📈
          </div>
        </div>

        {/* Subtle grid pattern overlay */}
        <div
          className='absolute inset-0 opacity-5'
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Content */}
      <div className='relative z-10 mx-auto max-w-7xl px-6 text-center'>
        <div className='grid items-center gap-12 lg:grid-cols-2'>
          {/* Left Content */}
          <div className='text-left lg:text-left'>
            {/* Enhanced Bot Icon */}
            <div className='animate-slide-up mb-8'>
              <div className='bg-primary-gradient hover-lift mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl shadow-gold lg:mx-0'>
                <Bot className='h-10 w-10 text-white' />
              </div>
            </div>

            {/* Enhanced Main Headline */}
            <h1
              className='animate-slide-up mb-6 font-inter text-4xl font-bold uppercase text-white md:text-5xl xl:text-6xl'
              style={{ animationDelay: '0.2s' }}
            >
              Test Control Your{' '}
              <span className='text-primary-gradient'>Investment Bots</span>{' '}
              from Anywhere
            </h1>

            {/* Enhanced Subtitle */}
            <p
              className='animate-slide-up mb-8 max-w-2xl font-inter text-[20px] font-normal text-white'
              style={{ animationDelay: '0.4s' }}
            >
              Peaceful Investment - Easily manage strategies, monitor trades,
              and optimize performance with professional-grade tools.
            </p>

            {/* Enhanced Download Buttons */}
            <div
              className='animate-slide-up flex flex-col justify-start gap-4 sm:flex-row'
              style={{ animationDelay: '0.6s' }}
            >
              <span className='bg-gradient-pink-to-yellow hover-lift rounded-[12px] p-[2px]'>
                <Button
                  variant='gradient'
                  size='lg'
                  className='hover:bg-gradient-pink-to-yellow flex w-full gap-0 rounded-[10px] border-0 bg-black p-0 px-5 font-inter text-xs font-semibold uppercase text-white transition-transform hover:text-white'
                  onClick={() => handleDownload('Windows')}
                >
                  <Monitor className='mr-3 h-6 w-6 transition-transform group-hover:scale-110' />
                  Download for Windows
                </Button>
              </span>

              <span className='bg-gradient-pink-to-yellow hover-lift rounded-[12px] p-[2px]'>
                <Button
                  variant='gradient'
                  size='lg'
                  className='hover:bg-gradient-pink-to-yellow flex w-full gap-0 rounded-[10px] border-0 bg-black p-0 px-5 font-inter text-xs font-semibold uppercase text-white transition hover:text-white'
                  onClick={() => handleDownload('macOS')}
                >
                  <Apple className='mr-3 h-6 w-6 transition-transform group-hover:scale-110' />
                  Download for macOS
                </Button>
              </span>

              <span className='bg-gradient-pink-to-yellow hover-lift rounded-[12px] p-[2px]'>
                <Button
                  variant='outline'
                  size='lg'
                  className='hover:bg-gradient-pink-to-yellow flex w-full gap-0 rounded-[10px] border-0 bg-black p-0 px-5 font-inter text-xs font-semibold uppercase text-white transition-transform hover:text-white'
                  onClick={() => handleDownload('Linux')}
                >
                  <Smartphone className='mr-3 h-6 w-6 transition-transform group-hover:scale-110' />
                  Download for Linux
                </Button>
              </span>
            </div>

            {/* Enhanced Auto-detect Note */}
            <div
              className='animate-fade-in mt-6'
              style={{ animationDelay: '0.8s' }}
            >
              <div className='inline-flex items-center gap-3 rounded-full border border-primary-200/50 bg-primary-100 px-4 py-2'>
                <TrendingUp className='h-4 w-4 text-primary-600' />
                <span className='text-sm text-neutral-700'>
                  Detected OS:{' '}
                  <span className='font-semibold text-primary-700'>
                    {detectOS()}
                  </span>{' '}
                  • Works with MT4 & MT5
                </span>
              </div>
            </div>
          </div>

          {/* Enhanced Right Content - Dashboard Preview */}
          <div
            className='animate-slide-up dashboardBanner lg:mt-[-110px]'
            style={{ animationDelay: '0.4s' }}
          >
            <div className='relative'>
              <div className='hover-lift rounded-2xl border border-white/20 bg-white/90 p-1 shadow-xl backdrop-blur-sm'>
                <img
                  src={dashboardBanner}
                  alt='Peaceful Investment Dashboard'
                  className='h-auto w-full rounded-xl shadow-lg'
                />
              </div>

              {/* Enhanced Floating metrics */}
              <div className='animate-float hover-glow absolute -right-3 -top-6 rounded-xl bg-success p-4 text-success-foreground shadow-lg xl:-right-6'>
                <div className='text-sm font-bold'>+1,247 USD</div>
                <div className='text-xs opacity-90'>Today's Profit</div>
              </div>

              <div
                className='animate-float hover-glow absolute -bottom-5 -left-4 rounded-xl bg-primary p-4 text-primary-foreground shadow-lg lg:-bottom-6'
                style={{ animationDelay: '1s' }}
              >
                <div className='text-sm font-bold'>94.2%</div>
                <div className='text-xs opacity-90'>Win Rate</div>
              </div>

              <div
                className='animate-float hover-glow absolute -right-3 top-1/2 rounded-lg bg-accent p-3 text-accent-foreground shadow-lg xl:-right-8'
                style={{ animationDelay: '0.5s' }}
              >
                <div className='text-xs font-bold'>Live</div>
                <div className='mt-1 h-2 w-2 animate-pulse rounded-full bg-green-400'></div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Row */}
        {/* <div className="flex flex-col sm:flex-row gap-8 justify-center items-center mt-20 animate-fade-in" style={{ animationDelay: '1s' }}>
          <div className="text-center bg-white/10 backdrop-blur-sm p-6 rounded-xl hover-lift border border-white/20">
            <div className="text-3xl font-bold text-primary-700">50K+</div>
            <div className="text-neutral-600">Active Traders</div>
          </div>
          <div className="text-center bg-white/10 backdrop-blur-sm p-6 rounded-xl hover-lift border border-white/20">
            <div className="text-3xl font-bold text-success-700">$2.8B+</div>
            <div className="text-neutral-600">Volume Managed</div>
          </div>
          <div className="text-center bg-white/10 backdrop-blur-sm p-6 rounded-xl hover-lift border border-white/20">
            <div className="text-3xl font-bold text-accent-700">99.9%</div>
            <div className="text-neutral-600">Uptime</div>
          </div>
          <div className="text-center bg-white/10 backdrop-blur-sm p-6 rounded-xl hover-lift border border-white/20">
            <div className="text-3xl font-bold text-primary-700">24/7</div>
            <div className="text-neutral-600">Monitoring</div>
          </div>
        </div> */}
      </div>
    </section>
  );
};

export default HeroSection;
