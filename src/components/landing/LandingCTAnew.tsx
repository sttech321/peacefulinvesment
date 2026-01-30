import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useHomePageContent } from '@/hooks/useHomePageContent';

const LandingCTAnew = () => {
  const { user } = useAuth(); // ✅ hook used correctly
  const { content, loading } = useHomePageContent();

  if (loading) {
    return <section className="px-6 pb-10 text-center md:pb-12 lg:pb-24" />;
  }

  const section = content.cta_section;
  const titleBeforeHighlight = section?.titleBeforeHighlight ?? '';
  const titleHighlight = section?.titleHighlight ?? '';
  const titleAfterHighlight = section?.titleAfterHighlight ?? '';
  const subtitle = section?.subtitle ?? '';

  const primaryButtonLabel = section?.primaryButtonLabel ?? '';
  const primaryButtonLink = section?.primaryButtonLink ?? '/auth';
  const secondaryButtonLabel = section?.secondaryButtonLabel ?? '';
  const secondaryButtonLink = section?.secondaryButtonLink ?? '/downloads';

  return (
    <section className="px-6 pb-10 text-center md:pb-12 lg:pb-24">
      <div className="animate-slide-up mx-auto max-w-7xl">
        <div className="text-center">
          <h2 className="mx-auto mb-6 text-2xl font-bold uppercase text-white md:text-3xl">
            {titleBeforeHighlight}
            <span className="text-[var(--yellowcolor)]"> {titleHighlight}</span>
            {titleAfterHighlight}
          </h2>

          <p className="mx-auto max-w-4xl font-open-sans text-lg text-white lg:text-xl">
            {subtitle}
          </p>

          {/* CTA Buttons */}
          <div className="pt-10">
            <div className="flex justify-center gap-4">
              {/* Show ONLY if user is NOT logged in */}
              {!user && (
                <Link
                  to={primaryButtonLink}
                  className="bg-gradient-pink-to-yellow inline-block rounded-[12px] p-[2px]"
                >
                  <Button className="block h-[45px] rounded-[10px] bg-black px-6 text-xs font-semibold uppercase text-white hover:bg-gradient-pink-to-yellow">
                    {primaryButtonLabel}
                  </Button>
                </Link>
              )}

              <Link
                to={secondaryButtonLink}
                className="bg-gradient-pink-to-yellow inline-block rounded-[12px] p-[2px]"
              >
                <Button className="block h-[45px] rounded-[10px] bg-gradient-yellow-to-pink px-6 text-xs font-semibold uppercase text-white hover:bg-gradient-pink-to-yellow">
                  {secondaryButtonLabel}
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
