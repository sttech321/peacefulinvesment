import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import tradingHeroBg from '@/assets/home-banner-img.png';
import { useAuth } from '@/hooks/useAuth';

const LandingHeroNew = () => {
  const { user } = useAuth();

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Background */}
      <div
        className="hero-bg absolute inset-0"
        style={{
          backgroundImage: `url(${tradingHeroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 text-center">
        <div className="grid items-center gap-12">
          <div className="w-full max-w-3xl text-left">
            <h1 className="mb-6 font-inter font-bold uppercase text-white text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
              Your Gateway to{' '}
              <span className="text-[var(--yellowcolor)]">
                Smart Investment
              </span>
            </h1>

            <p className="mb-8 max-w-2xl font-inter text-lg md:text-[20px] text-white">
              Complete investment platform with automated trading, portfolio
              management, and expert insights. Start your financial journey with confidence. 
            </p>

            {/* CTA Buttons */}
            <div className="flex gap-4">
              {/* Show ONLY if user is NOT logged in */}
              {!user && (
                <Link
                  to="/auth?mode=signup"
                  className="bg-gradient-pink-to-yellow rounded-[12px] p-[2px]"
                >
                  <Button className="block h-[45px] rounded-[10px] bg-black px-6 text-xs font-semibold uppercase text-white hover:bg-gradient-pink-to-yellow">
                    Start Trading
                  </Button>
                </Link>
              )}

              <Link
                to="/downloads"
                className="bg-gradient-pink-to-yellow rounded-[12px] p-[2px]"
              >
                <Button className="block h-[45px] rounded-[10px] bg-gradient-yellow-to-pink px-6 text-xs font-semibold uppercase text-white">
                App is coming soon
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingHeroNew;
