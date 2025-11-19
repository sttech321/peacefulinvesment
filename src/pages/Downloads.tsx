import HeroSection from '@/components/HeroSection';
import DownloadSection from '@/components/DownloadSection';
import InstallGuide from '@/components/InstallGuide';
import TestimonialsSection from '@/components/TestimonialsSection';
import FAQSection from '@/components/FAQSection';
import Footer from '@/components/Footer';

const Downloads = () => {
  return (
    <div className='min-h-screen pt-16'>
      <div className='pink-yellow-shadow'>
        <HeroSection />
        <DownloadSection />
        <InstallGuide />
        <TestimonialsSection />
        <FAQSection />
      </div>
      <Footer />
    </div>
  );
};

export default Downloads;
