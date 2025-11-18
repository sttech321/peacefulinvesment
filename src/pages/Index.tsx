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

const Index = () => {
  return (
    <div className='min-h-screen bg-black pt-16'>
      
      <LandingHeroNew />
      <LandingCount />
      <LandingFeaturesNew />
      <LandingFaithFinancest />
      <LandingServicesNew />
      <LandingTestimonials />
      <LandingFAQ />
      <LandingCTA />
      <Footer />
    </div>
  );
};

export default Index;
;