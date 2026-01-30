import React, { useEffect, useRef, useState } from 'react';
import stats from '@/services/stats';
import joinIcon from '@/assets/join-icon.svg';
import { useHomePageContent } from '@/hooks/useHomePageContent';

export default function LandingCount() {
  const stored = stats.getStats();
  const start = stats.getStartStats();
  const [values, setValues] = useState(() => ({
    users: stored.users,
    aum: stored.aum,
  }));
  const animRef = useRef<{ users: number; aum: number }>({
    users:
      start?.users ??
      Math.max(
        0,
        Math.floor(stored.users - Math.max(1, Math.floor(stored.users * 0.02)))
      ),
    aum:
      start?.aum ??
      Math.max(
        0,
        Math.floor(stored.aum - Math.max(1, Math.floor(stored.aum * 0.02)))
      ),
  });

  const { content } = useHomePageContent();

  useEffect(() => {
    // animate from start to current on mount
    animate('users', animRef.current.users, stored.users, 900);
    animate('aum', animRef.current.aum, stored.aum, 1000);

    const unsub = stats.subscribe(s => {
      // animate to new values when updated
      animate('users', animRef.current.users ?? s.users, s.users, 800);
      animate('aum', animRef.current.aum ?? s.aum, s.aum, 900);
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function easeOutCubic(t: number) {
    return 1 - Math.pow(1 - t, 3);
  }

  function animate(
    key: 'users' | 'aum',
    from: number,
    to: number,
    duration = 800
  ) {
    const startTime = performance.now();
    const initial = from;
    const change = to - initial;

    function step(now: number) {
      const elapsed = Math.min(now - startTime, duration);
      const t = elapsed / duration;
      const eased = easeOutCubic(t);
      const current = Math.round(initial + change * eased);
      if (key === 'users') animRef.current.users = current;
      else animRef.current.aum = current;
      setValues({ users: animRef.current.users, aum: animRef.current.aum });
      if (elapsed < duration) requestAnimationFrame(step);
      else {
        if (key === 'users') animRef.current.users = to;
        else animRef.current.aum = to;
        setValues({ users: animRef.current.users, aum: animRef.current.aum });
      }
    }
    requestAnimationFrame(step);
  }

  function formatUsers(u: number) {
    if (u >= 1000000) return `${Math.round(u / 1000000)}M+`;
    if (u >= 1000) return `${Math.round(u / 1000)}K+`;
    return `${u}+`;
  }

  function formatAum(a: number) {
    if (a >= 1000000000) return `$${(a / 1000000000).toFixed(1)}B+`;
    if (a >= 1000000) return `$${(a / 1000000).toFixed(1)}M+`;
    if (a >= 1000) return `$${Math.round(a / 1000)}K+`;
    return `$${a}`;
  }

  return (
    <section className='px-6 py-7 md:py-12 lg:py-24'>
      <div className='mx-auto max-w-7xl'>
        <div className='animate-slide-up' style={{ animationDelay: '0.4s' }}>
          <div className='bg-gradient-pink-to-yellow rounded-sm p-[2px]'>
            <div className='grid grid-cols-2 items-center gap-0 rounded-sm bg-black md:grid-cols-4 pt-5 pb-4'>
              <div className='glass-card border-0 bg-transparent p-4 text-center shadow-none'>
                <div className='mb-2 font-bebas-neue text-[45px] xl:text-[50px] font-normal leading-[36px] text-white'>
                  {/* {formatUsers(values.users)} */}
                  {content.stats_aum_value}
                </div>
                <div className='font-open-sans text-[18px] lg:text-2xl font-normal text-white'>
                  {content.stats_aum_label}
                </div>
              </div>
              <div className='glass-card border-0 bg-transparent p-4 text-center shadow-none'>
                <div className='mb-2 font-bebas-neue text-[45px] xl:text-[50px] font-normal leading-[36px] text-white'>
                  {/* {formatAum(values.aum)} */}
                  {content.stats_investors_value}
                </div>
                <div className='font-open-sans text-[18px] lg:text-2xl font-normal text-white'>
                  {content.stats_investors_label}
                </div>
              </div>
              <div className='glass-card border-0 bg-transparent p-4 text-center shadow-none'>
                <div className='mb-2 font-bebas-neue text-[45px] xl:text-[50px] font-normal leading-[36px] text-white'>
                  {content.stats_uptime_value}
                </div>
                <div className='font-open-sans text-[18px] lg:text-2xl font-normal text-white'>
                  {content.stats_uptime_label}
                </div>
              </div>
              <div className='glass-card border-0 bg-transparent p-4 text-center shadow-none'>
                <div className='mb-2 font-bebas-neue text-[45px] xl:text-[50px] font-normal leading-[36px] text-white'>
                  {content.stats_support_value}
                </div>
                <div className='font-open-sans text-[18px] lg:text-2xl font-normal text-white'>
                  {content.stats_support_label}
                </div>
              </div>
            </div>
          </div>

          <div className='mt-5 px-6 pt-10 text-center'>
            <img className='mx-auto' src={content.home_stats_image_1 || joinIcon} alt='Join Icon' />
            <h2 className='pt-5 font-inter text-2xl uppercase text-white lg:text-3xl'>
              {content.community_title}
            </h2>
            <p className='mt-2 font-open-sans text-lg text-white lg:text-2xl'>
              {content.community_description}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
