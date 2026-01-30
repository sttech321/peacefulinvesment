import faithfinanceimg from '@/assets/faithfinanceimg.svg';
import { useHomePageContent } from '@/hooks/useHomePageContent';

export default function LandingFaithFinancest() {
  const { content, loading } = useHomePageContent();

  if (loading) {
    return <section className="px-6 pb-7 md:pb-12 lg:pb-24 lg:pt-10" />;
  }

  const section = content.faith_finance_section;

  const titleBeforeHighlight = section?.titleBeforeHighlight ?? '';
  const titleHighlight = section?.titleHighlight ?? '';
  const body = section?.body ?? '';

  const imageSrc = section?.imageUrl?.trim() ? section.imageUrl : faithfinanceimg;
  const imageAlt = section?.imageAlt ?? 'Faith & Finances';

  return (
    <section className='px-6 pb-7 md:pb-12 lg:pb-24 lg:pt-10'>
      <div className='mx-auto flex max-w-7xl flex-col items-center justify-between lg:flex-row'>
        <div className='mb-10 pr-0 lg:mb-0 lg:w-3/5 lg:pr-12'>
          <h3 className='font-inter text-2xl font-semibold uppercase text-white md:text-3xl'>
            {titleBeforeHighlight}{' '}
            <span className='text-[var(--yellowcolor)]'>{titleHighlight}</span>
          </h3>
          <p className='pt-5 font-open-sans text-lg leading-[30px] text-white lg:pt-12 whitespace-pre-line'>
            {body}
          </p>
        </div>

        <div className='flex justify-center lg:w-2/5'>
          <img className='mx-auto' src={imageSrc} alt={imageAlt} />
        </div>
      </div>
    </section>
  );
}
