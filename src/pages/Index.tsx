import LandingHero from '@/components/landing/LandingHero';
import LandingFeatures from '@/components/landing/LandingFeatures';
import LandingServices from '@/components/landing/LandingServices';
import LandingTestimonials from '@/components/landing/LandingTestimonials';
import LandingFAQ from '@/components/landing/LandingFAQ';
import LandingCTA from '@/components/landing/LandingCTA';
import Footer from '@/components/Footer';
import LandingHeroNew from '@/components/landing/LandingHeroNew';
import LandingCount from '@/components/landing/LandingCount';
import LandingFeaturesNew from '@/components/landing/LandingFeaturesNew';
import LandingFaithFinancest from '@/components/landing/LandingFaithFinancest';
import LandingServicesNew from '@/components/landing/LandingServicesNew';
import LandingCTAnew from '@/components/landing/LandingCTAnew';
import { Play } from 'lucide-react';
import { requestIntroReplay } from '@/utils/intro';

const Index = () => {
  return (
    <div className='min-h-screen bg-black pt-16'>
      <button
        type="button"
        onClick={requestIntroReplay}
        className="fixed lg:left-28 xl:left-3 right-52 lg:right-auto top-6 z-[55] inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-medium text-white backdrop-blur transition hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"

        aria-label="Replay intro"
      >
        <Play className="h-4 w-4" />
        Replay 
      </button>
      <LandingHeroNew />
      <div className='pink-yellow-shadow'>
        <LandingCount />
        <LandingFeaturesNew />
        <LandingFaithFinancest />
        <LandingServicesNew />
        <LandingCTAnew />

        {/* <LandingTestimonials />
      <LandingFAQ />
      <LandingCTA /> */}
        <Footer />
      </div>
    </div>
  );
};

export default Index;
