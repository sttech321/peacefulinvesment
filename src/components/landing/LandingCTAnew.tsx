import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const LandingCTAnew = () => {
  const { user } = useAuth(); // ✅ hook used correctly

  return (
    <section className="px-6 pb-10 text-center md:pb-12 lg:pb-24">
      <div className="animate-slide-up mx-auto max-w-7xl">
        <div className="text-center">
          <h2 className="mx-auto mb-6 text-2xl font-bold uppercase text-white md:text-3xl">
            Ready to Start Your
            <span className="text-[var(--yellowcolor)]"> Investment Journey</span>
            ?
          </h2>

          <p className="mx-auto max-w-4xl font-open-sans text-lg text-white lg:text-xl">
            Join successful investors who trust our platform for
            their trading needs.
          </p>

          {/* CTA Buttons */}
          <div className="pt-10">
            <div className="flex justify-center gap-4">
              {/* Show ONLY if user is NOT logged in */}
              {!user && (
                <Link
                  to="/auth"
                  className="bg-gradient-pink-to-yellow inline-block rounded-[12px] p-[2px]"
                >
                  <Button className="block h-[45px] rounded-[10px] bg-black px-6 text-xs font-semibold uppercase text-white hover:bg-gradient-pink-to-yellow">
                    Start Free Trial
                  </Button>
                </Link>
              )}

              <Link
                to="/downloads"
                className="bg-gradient-pink-to-yellow inline-block rounded-[12px] p-[2px]"
              >
                <Button className="block h-[45px] rounded-[10px] bg-gradient-yellow-to-pink px-6 text-xs font-semibold uppercase text-white hover:bg-gradient-pink-to-yellow">
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

export default LandingCTAnew;
