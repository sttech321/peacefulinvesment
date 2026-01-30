import bridgegapimage1 from '@/assets/bridge-gap-image-1.png';
import bridgegapimage2 from '@/assets/bridge-gap-image-2.png';
import bridgegapimage3 from '@/assets/bridge-gap-image-3.png';
import bridgegapimage4 from '@/assets/bridge-gap-image-4.png';
import { useHomePageContent } from '@/hooks/useHomePageContent';

const LandingServicesNew = () => {
  const { content, loading } = useHomePageContent();

  const fallbackImages = [bridgegapimage1, bridgegapimage2, bridgegapimage3, bridgegapimage4];

  if (loading) {
    return <section className='px-6 pb-7 md:pb-12 lg:pb-24' />;
  }

  const section = content.services_section;
  const titleBeforeHighlight = section?.titleBeforeHighlight ?? '';
  const titleHighlight = section?.titleHighlight ?? '';
  const subtitle = section?.subtitle ?? '';
  const cards = Array.isArray(section?.cards) ? section.cards : [];

  return (
    <section className='px-6 pb-7 md:pb-12 lg:pb-24'>
      <div className='mx-auto max-w-7xl'>
        <div className='mb-10 text-center lg:mb-16'>
          <h2 className='mx-auto max-w-2xl text-2xl font-bold uppercase text-white md:text-3xl lg:mb-6'>
            {titleBeforeHighlight}
            <span className='text-[var(--yellowcolor)]'> {' '}{titleHighlight}</span>
          </h2>
          <p className='mx-auto max-w-5xl pt-5 font-open-sans text-lg text-white lg:text-xl'>
            {subtitle}
          </p>
        </div>

        {/* Services Grid */}
        <div className='mx-auto grid max-w-6xl grid-cols-1 gap-[40px] md:grid-cols-2 lg:grid-cols-2 lg:gap-[90px]'>
          {Array.from({ length: 4 }).map((_, index) => {
            const card = cards[index];
            const imageUrl = card?.imageUrl?.trim();
            const imageSrc = imageUrl ? imageUrl : fallbackImages[index];
            const title = card?.title ?? '';
            const description = card?.description ?? '';

            return (
            <div
              key={index}
              style={{ animationDelay: `${index * 0.1}s` }}
              className='bg-gradient-pink-to-yellow hover:glow-primary relative rounded-lg p-[2px]'
            >
              <div className='group relative z-10 h-full rounded-lg border-0 bg-black p-2 text-center'>
                <div className='mb-6'>
                  <div className='mx-auto'>
                    <img
                      src={imageSrc}
                      alt={title}
                      className='mx-auto'
                    />
                  </div>
                </div>
                <div className='mx-auto max-w-sm px-5 pb-5'>
                  <h3 className='mx-auto mb-4 font-bebas-neue text-2xl font-normal text-white'>
                    {title}
                  </h3>

                  <p className='font-open-sans text-sm leading-relaxed text-white'>
                    {description}
                  </p>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default LandingServicesNew;
