import {
  Star,
  Quote,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import styles from './TestimonialsSection.module.css';

const TestimonialsSection = () => {
  const testimonials = [
    {
      name: 'Marcus Chen',
      role: 'Forex Trader',
      company: 'Independent',
      avatar: '👨‍💼',
      rating: 5,
      quote:
        'This app gave me complete freedom! I can monitor and control all my MetaTrader bots while traveling. The real-time alerts saved me from a major drawdown last week.',
      profit: '+$12,450',
      timeframe: 'Last month',
    },
    {
      name: 'Sarah Rodriguez',
      role: 'Algo Trading Specialist',
      company: 'PropFirm Trading',
      avatar: '👩‍💻',
      rating: 5,
      quote:
        'Managing 15+ strategies across multiple MT4 accounts was chaos before this tool. Now I have everything in one dashboard with perfect visibility and control.',
      profit: '+$28,900',
      timeframe: 'This quarter',
    },
    {
      name: 'David Kim',
      role: 'Professional Trader',
      company: 'Hedge Fund',
      avatar: '👨‍💼',
      rating: 5,
      quote:
        'The risk management features and instant notifications are game-changers. I caught a runaway bot before it could damage my account significantly.',
      profit: '+$45,200',
      timeframe: 'YTD',
    },
    {
      name: 'Emma Thompson',
      role: 'Retail Trader',
      company: 'Part-time Trading',
      avatar: '👩‍🔬',
      rating: 5,
      quote:
        'As someone with a day job, being able to monitor my bots remotely is invaluable. The mobile-friendly interface lets me check performance during lunch breaks.',
      profit: '+$8,750',
      timeframe: 'Last 3 months',
    },
  ];

  const trustIndicators = [
    { name: 'Trading Platforms', logo: '📊', count: 'MT4 & MT5' },
    { name: 'Active Users', logo: '👥', count: '50,000+' },
    { name: 'Volume Managed', logo: '💰', count: '$2.8B+' },
    { name: 'Success Rate', logo: '📈', count: '94.2%' },
    { name: 'Uptime', logo: '⚡', count: '99.9%' },
    { name: 'Countries', logo: '🌍', count: '120+' },
  ];

  // Embla carousel setup
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: 'start',
    slidesToScroll: 1,
  });
  const [prevDisabled, setPrevDisabled] = useState(true);
  const [nextDisabled, setNextDisabled] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setPrevDisabled(!emblaApi.canScrollPrev());
    setNextDisabled(!emblaApi.canScrollNext());
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => emblaApi && emblaApi.scrollTo(index),
    [emblaApi]
  );
  const scrollPrev = useCallback(
    () => emblaApi && emblaApi.scrollPrev(),
    [emblaApi]
  );
  const scrollNext = useCallback(
    () => emblaApi && emblaApi.scrollNext(),
    [emblaApi]
  );

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  return (
    <section className={`px-6 pt-10 md:pt-12 lg:pt-24 ${styles.new_section}`}>
      <div className='mx-auto max-w-7xl'>
        {/* Section Header */}
        <div className='mb-9 lg:mb-16 text-center'>
          <h2 className='mb-4 lg:mb-6 font-inter text-2xl font-bold uppercase text-white md:text-3xl'>
            Trusted by{' '}
            <span className='text-[var(--yellowcolor)]'>
              Professional Traders
            </span>
          </h2>
          <p className='mx-auto max-w-3xl font-open-sans text-lg text-white lg:text-xl'>
            Join thousands of successful traders who rely on Peaceful Investment
            to optimize their automated trading strategies and maximize profits.
          </p>
        </div>

        {/* Testimonials Slider (Embla) */}
        <div className='mb-9 lg:mb-16 xl:mb-20'>
          <div className='relative'>
            <div className='overflow-hidden' ref={emblaRef}>
              <div className='-ml-4 flex'>
                {testimonials.map((testimonial, index) => (
                  <div
                    key={index}
                    className='shrink-0 grow-0 basis-full pl-4 md:basis-1/2'
                  >
                    <div className='glass-card group bg-black'>
                      {/* Quote Icon */}
                      <div className='mb-4'>
                        <Quote className='h-8 w-8 text-white opacity-40' />
                      </div>

                      {/* Testimonial Text */}
                      <blockquote className='mb-6 font-open-sans text-lg leading-relaxed text-muted-foreground'>
                        "{testimonial.quote}"
                      </blockquote>

                      {/* Rating */}
                      <div className='mb-4 flex items-center gap-1'>
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star
                            key={i}
                            className='fill-accent-green h-5 w-5 text-[var(--yellowcolor)]'
                          />
                        ))}
                      </div>

                      {/* Author Info */}
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-4'>
                          <div className='flex h-12 w-12 items-center justify-center rounded-full bg-gradient-primary text-2xl'>
                            {testimonial.avatar}
                          </div>
                          <div>
                            <div className='font-semibold text-white'>
                              {testimonial.name}
                            </div>
                            <div className='text-sm text-muted-foreground'>
                              {testimonial.role}
                            </div>
                          </div>
                        </div>

                        {/* Performance Badge */}
                        <div className='text-right'>
                          <div className='font-sembold flex items-center gap-1 text-lg text-muted-foreground'>
                            <TrendingUp className='h-4 w-4' />
                            {testimonial.profit}
                          </div>
                          <div className='text-xs text-muted-foreground'>
                            {testimonial.timeframe}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Arrows */}
            <button
              type='button'
              onClick={scrollPrev}
              disabled={prevDisabled}
              aria-label='Previous testimonials'
              className='absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-black/60 p-2 text-white backdrop-blur transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-40'
            >
              <ChevronLeft className='h-5 w-5' />
            </button>
            <button
              type='button'
              onClick={scrollNext}
              disabled={nextDisabled}
              aria-label='Next testimonials'
              className='absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-black/60 p-2 text-white backdrop-blur transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-40'
            >
              <ChevronRight className='h-5 w-5' />
            </button>
          </div>

          {/* Dots */}
          <div className='mt-6 flex justify-center gap-2'>
            {scrollSnaps.map((_, idx) => (
              <button
                key={idx}
                type='button'
                onClick={() => scrollTo(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={
                  'h-2.5 w-2.5 rounded-full transition ' +
                  (idx === selectedIndex
                    ? 'bg-[var(--yellowcolor)]'
                    : 'bg-white/30 hover:bg-white/50')
                }
              />
            ))}
          </div>
        </div>

        {/* Trust Indicators */}
        <div>
          <h3 className='mb-6 text-center font-inter text-2xl font-bold uppercase text-white md:text-3xl'>
            Powering Trading{' '}
            <span className='text-[var(--yellowcolor)]'>Success Worldwide</span>
          </h3>

          <div className='animate-slide-up' style={{ animationDelay: '0.4s' }}>
            <div className='bg-gradient-pink-to-yellow rounded-sm p-[2px]'>
              <div className='grid grid-cols-2 gap-6 rounded-sm bg-black p-6 md:grid-cols-6'>
                {trustIndicators.map((indicator, index) => (
                  <div key={index} className='group text-center'>
                    <div className='mb-2 text-4xl transition-transform group-hover:scale-110'>
                      {indicator.logo}
                    </div>
                    <div className='mb-1 text-xl font-bold text-white'>
                      {indicator.count}
                    </div>
                    <div className='text-sm text-muted-foreground'>
                      {indicator.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Overall Rating Summary */}
        <div className='mt-16 text-center'>
          <div className='glass-card inline-flex flex-wrap justify-center items-center gap-[10px] lg:gap-4 bg-primary/90'>
            <div className='flex items-center gap-1'>
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className='fill-accent-green h-6 w-6 text-white'
                />
              ))}
            </div>
            <div className='text-2xl font-bold text-white'>4.9/5</div>
            <div className='text-white'>
              • Average rating from 3,247 traders
            </div>
            <div className='flex items-center gap-2 text-white'>
              <TrendingUp className='h-4 w-4' />
              <span className='font-semibold'>97% recommend</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
