import { Star, Quote, TrendingUp } from 'lucide-react';

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

  return (
    <section className='px-6 pt-10 md:pt-12 lg:pt-24'>
      <div className='mx-auto max-w-7xl'>
        {/* Section Header */}
        <div className='mb-16 text-center'>
          <h2 className='mb-6 font-inter text-2xl font-bold uppercase text-white md:text-3xl'>
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

        {/* Testimonials Grid */}
        <div className='mb-20 grid grid-cols-1 gap-8 md:grid-cols-2'>
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className='glass-card hover:glow-primary group bg-black'
              style={{ animationDelay: `${index * 0.1}s` }}
            >
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
          ))}
        </div>

        {/* Trust Indicators */}
        <div className='glass-card'>
          <h3 className='mb-8 text-center text-2xl font-bold text-foreground'>
            Powering Trading Success Worldwide
          </h3>
          <div className='grid grid-cols-2 gap-6 md:grid-cols-6'>
            {trustIndicators.map((indicator, index) => (
              <div key={index} className='group text-center'>
                <div className='mb-2 text-4xl transition-transform group-hover:scale-110'>
                  {indicator.logo}
                </div>
                <div className='mb-1 text-xl font-bold text-foreground'>
                  {indicator.count}
                </div>
                <div className='text-sm text-muted-foreground'>
                  {indicator.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Overall Rating Summary */}
        <div className='mt-16 text-center'>
          <div className='glass-card inline-flex items-center gap-4'>
            <div className='flex items-center gap-1'>
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className='fill-accent-green text-accent-green h-6 w-6'
                />
              ))}
            </div>
            <div className='text-2xl font-bold text-foreground'>4.9/5</div>
            <div className='text-muted-foreground'>
              • Average rating from 3,247 traders
            </div>
            <div className='text-accent-green flex items-center gap-2'>
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
