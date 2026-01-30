import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect, type CSSProperties, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import footerLogo from '@/assets/footerLogo.svg';
import logoAnimation from '@/assets/new-logo.gif';
import FiArrowUpRight from '@/assets/linkArrow.svg';
import { supabase } from '@/integrations/supabase/client';

// Side images

import Left03 from '@/assets/left-03.jpg';
import Right03 from '@/assets/right-03.jpg';

interface LinkItem {
  label: string;
  to: string;
  order?: number;
}

type FooterSupportLinks = {
  heading: string;
  contactLabel: string;
  contactLink: string;
  instagramLink: string;
  facebookLink: string;
};

type FooterAboutContent = {
  title: string;
  description: string;
};

type FooterGuestMenuOverrides = {
  homeLabel: string;
  homeLink: string;
  downloadsLabel: string;
  downloadsLink: string;
  aboutLabel: string;
  aboutLink: string;
};

type FooterCopyrightSettings = {
  text: string;
};

const buildDefaultFooterLinks = (): LinkItem[] => [
  { label: 'Home', to: '/', order: 1 },
  { label: 'About us', to: '/about', order: 2 },
  { label: 'App is coming soon', to: '/downloads', order: 3 },
];

const defaultFooterGuestOverrides = (): FooterGuestMenuOverrides => {
  const defaults = buildDefaultFooterLinks();
  const home = defaults.find(l => l.to === '/');
  const about = defaults.find(l => l.to === '/about');
  const downloads = defaults.find(l => l.to === '/downloads');

  return {
    homeLabel: home?.label ?? 'Home',
    homeLink: home?.to ?? '/',
    downloadsLabel: downloads?.label ?? 'App is coming soon',
    downloadsLink: downloads?.to ?? '/downloads',
    aboutLabel: about?.label ?? 'About us',
    aboutLink: about?.to ?? '/about',
  };
};

const buildGuestFooterLinksFromOverrides = (overrides: FooterGuestMenuOverrides): LinkItem[] => [
  { label: overrides.homeLabel, to: overrides.homeLink, order: 1 },
  { label: overrides.aboutLabel, to: overrides.aboutLink, order: 2 },
  { label: overrides.downloadsLabel, to: overrides.downloadsLink, order: 3 },
];

const defaultFooterAboutContent = (): FooterAboutContent => ({
  title: 'About Us',
  description:
    "We're on a mission to democratize access to professional investments and create opportunities for financial growth across the\n" +
    'globe.',
});

const defaultFooterSupportLinks = (): FooterSupportLinks => ({
  heading: 'Support',
  contactLabel: 'Contact us',
  contactLink: '/contact',
  instagramLink: '#',
  facebookLink: '#',
});

const defaultFooterCopyright = (): FooterCopyrightSettings => ({
  text: 'Peaceful Investment. All rights reserved.',
});

 

const isExternalHref = (href: string) =>
  /^https?:\/\//i.test(href) || /^mailto:/i.test(href) || /^tel:/i.test(href);

const SupportNavLink = ({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) => {
  const normalized = (href ?? '').trim();
  if (!normalized) return null;

  if (isExternalHref(normalized) || normalized === '#') {
    return (
      <a
        href={normalized}
        className={className}
        target={normalized === '#' ? undefined : '_blank'}
        rel={normalized === '#' ? undefined : 'noreferrer'}
      >
        {children}
      </a>
    );
  }

  return (
    <Link to={normalized} className={className}>
      {children}
    </Link>
  );
};

const Footer = () => {
  const location = useLocation();
  const isBlogPage = location.pathname === '/blog';
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [footerLinks, setFooterLinks] = useState<LinkItem[]>(() => buildDefaultFooterLinks());
  const [isFooterReady, setIsFooterReady] = useState(false);
  const [isFooterEditorOpen, setIsFooterEditorOpen] = useState(false);
  const [isFooterSaving, setIsFooterSaving] = useState(false);
  const [footerLinksDraft, setFooterLinksDraft] = useState<LinkItem[]>([]);
  const [guestFooterOverrides, setGuestFooterOverrides] = useState<FooterGuestMenuOverrides>(() => defaultFooterGuestOverrides());
  const [guestFooterOverridesDraft, setGuestFooterOverridesDraft] = useState<FooterGuestMenuOverrides>(() => defaultFooterGuestOverrides());
  const [footerAboutContent, setFooterAboutContent] = useState<FooterAboutContent>(() => defaultFooterAboutContent());
  const [footerAboutContentDraft, setFooterAboutContentDraft] = useState<FooterAboutContent>(() => defaultFooterAboutContent());
  const [footerSupportLinks, setFooterSupportLinks] = useState<FooterSupportLinks>(() => defaultFooterSupportLinks());
  const [footerSupportLinksDraft, setFooterSupportLinksDraft] = useState<FooterSupportLinks>(() => defaultFooterSupportLinks());
  const [footerCopyright, setFooterCopyright] = useState<FooterCopyrightSettings>(() => defaultFooterCopyright());
  const [footerCopyrightDraft, setFooterCopyrightDraft] = useState<FooterCopyrightSettings>(() => defaultFooterCopyright());

  useEffect(() => {
    const loadFooterLinks = async () => {
      let nextFooterLinks = buildDefaultFooterLinks();
      let nextGuestOverrides = { ...defaultFooterGuestOverrides() };
      let nextAboutContent = { ...defaultFooterAboutContent() };
      let nextSupportLinks = { ...defaultFooterSupportLinks() };
      let nextCopyright = { ...defaultFooterCopyright() };

      try {
        const { data, error } = await supabase
          .from('app_settings' as any)
          .select('value')
          .eq('key', 'footer_links')
          .maybeSingle();

        if (!error && (data as any)?.value) {
          const parsedLinks = JSON.parse((data as any).value) as LinkItem[];
          if (Array.isArray(parsedLinks)) {
            nextFooterLinks = [...parsedLinks].sort((a, b) => {
              const orderA = a.order !== undefined ? a.order : 999;
              const orderB = b.order !== undefined ? b.order : 999;
              return orderA - orderB;
            });
          }
        }
      } catch (error) {
        console.error('Error fetching footer links:', error);
      }

      try {
        const { data, error } = await supabase
          .from('app_settings' as any)
          .select('value')
          .eq('key', 'footer_guest_menu_overrides')
          .maybeSingle();

        if (!error && (data as any)?.value) {
          const parsed = JSON.parse((data as any).value) as Partial<FooterGuestMenuOverrides>;
          if (parsed && typeof parsed === 'object') {
            nextGuestOverrides = { ...nextGuestOverrides, ...parsed };
          }
        }
      } catch (error) {
        console.error('Error fetching footer guest menu overrides:', error);
      }

      try {
        const { data, error } = await supabase
          .from('app_settings' as any)
          .select('value')
          .eq('key', 'footer_about_content')
          .maybeSingle();

        if (!error && (data as any)?.value) {
          const parsed = JSON.parse((data as any).value) as Partial<FooterAboutContent>;
          if (parsed && typeof parsed === 'object') {
            nextAboutContent = { ...nextAboutContent, ...parsed };
          }
        }
      } catch (error) {
        console.error('Error fetching footer about content:', error);
      }

      try {
        const { data, error } = await supabase
          .from('app_settings' as any)
          .select('value')
          .eq('key', 'footer_support_links')
          .maybeSingle();

        if (!error && (data as any)?.value) {
          const parsed = JSON.parse((data as any).value) as Partial<FooterSupportLinks>;
          if (parsed && typeof parsed === 'object') {
            nextSupportLinks = { ...nextSupportLinks, ...parsed };
            if (!nextSupportLinks.heading?.trim()) nextSupportLinks.heading = defaultFooterSupportLinks().heading;
          }
        }
      } catch (error) {
        console.error('Error fetching footer support links:', error);
      }

      try {
        const { data, error } = await supabase
          .from('app_settings' as any)
          .select('value')
          .eq('key', 'footer_copyright')
          .maybeSingle();

        if (!error && (data as any)?.value) {
          const raw = (data as any).value;
          try {
            const parsed = JSON.parse(raw) as Partial<FooterCopyrightSettings> | string;
            if (typeof parsed === 'string') {
              nextCopyright = { text: parsed };
            } else if (parsed && typeof parsed === 'object') {
              nextCopyright = { ...nextCopyright, ...parsed };
            }
          } catch {
            // Backward-compatible: allow saving plain strings in value
            nextCopyright = { text: String(raw) };
          }
        }
      } catch (error) {
        console.error('Error fetching footer copyright:', error);
      }

      setFooterLinks(nextFooterLinks);
      setGuestFooterOverrides(nextGuestOverrides);
      setGuestFooterOverridesDraft(nextGuestOverrides);
      setFooterAboutContent(nextAboutContent);
      setFooterAboutContentDraft(nextAboutContent);
      setFooterSupportLinks(nextSupportLinks);
      setFooterSupportLinksDraft(nextSupportLinks);
      setFooterCopyright(nextCopyright);
      setFooterCopyrightDraft(nextCopyright);
      setIsFooterReady(true);
    };

    void loadFooterLinks();
  }, []);

  useEffect(() => {
    // Live updates for footer_links
    const channel = supabase
      .channel('footer_links_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings', filter: 'key=eq.footer_links' },
        (payload: any) => {
          try {
            const raw = payload?.new?.value ?? payload?.old?.value;
            if (!raw) return;
            const parsedLinks = JSON.parse(raw) as LinkItem[];
            if (Array.isArray(parsedLinks)) {
              const sorted = [...parsedLinks].sort((a, b) => {
                const orderA = a.order !== undefined ? a.order : 999;
                const orderB = b.order !== undefined ? b.order : 999;
                return orderA - orderB;
              });
              setFooterLinks(sorted);
            }
          } catch (e) {
            // Ignore parse errors in realtime payload
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings', filter: 'key=eq.footer_guest_menu_overrides' },
        (payload: any) => {
          try {
            const raw = payload?.new?.value ?? payload?.old?.value;
            if (!raw) return;
            const parsed = JSON.parse(raw) as Partial<FooterGuestMenuOverrides>;
            if (parsed && typeof parsed === 'object') {
              setGuestFooterOverrides(prev => ({ ...prev, ...parsed }));
            }
          } catch (e) {
            // Ignore parse errors in realtime payload
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings', filter: 'key=eq.footer_about_content' },
        (payload: any) => {
          try {
            const raw = payload?.new?.value ?? payload?.old?.value;
            if (!raw) return;
            const parsed = JSON.parse(raw) as Partial<FooterAboutContent>;
            if (parsed && typeof parsed === 'object') {
              setFooterAboutContent(prev => ({ ...prev, ...parsed }));
            }
          } catch (e) {
            // Ignore parse errors in realtime payload
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings', filter: 'key=eq.footer_support_links' },
        (payload: any) => {
          try {
            const raw = payload?.new?.value ?? payload?.old?.value;
            if (!raw) return;
            const parsed = JSON.parse(raw) as Partial<FooterSupportLinks>;
            if (parsed && typeof parsed === 'object') {
              setFooterSupportLinks(prev => {
                const next = { ...prev, ...parsed };
                if (!next.heading?.trim()) next.heading = defaultFooterSupportLinks().heading;
                return next;
              });
            }
          } catch (e) {
            // Ignore parse errors in realtime payload
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings', filter: 'key=eq.footer_copyright' },
        (payload: any) => {
          try {
            const raw = payload?.new?.value ?? payload?.old?.value;
            if (!raw) return;
            let next: FooterCopyrightSettings = defaultFooterCopyright();
            try {
              const parsed = JSON.parse(raw) as Partial<FooterCopyrightSettings> | string;
              if (typeof parsed === 'string') {
                next = { text: parsed };
              } else if (parsed && typeof parsed === 'object') {
                next = { ...next, ...parsed };
              }
            } catch {
              next = { text: String(raw) };
            }
            setFooterCopyright(next);
          } catch (e) {
            // Ignore parse errors in realtime payload
          }
        }
      )
      .subscribe();

    return () => {
      try { channel.unsubscribe(); } catch {}
    };
  }, []);

  useEffect(() => {
    const handleOpenFooterEditor = () => {
      if (!user || !isAdmin()) return;

      const base = footerLinks.length > 0 ? footerLinks : buildDefaultFooterLinks();
      const sorted = [...base].sort((a, b) => {
        const orderA = a.order !== undefined ? a.order : 999;
        const orderB = b.order !== undefined ? b.order : 999;
        return orderA - orderB;
      });

      setFooterLinksDraft(sorted);
      setGuestFooterOverridesDraft(guestFooterOverrides);
      setFooterAboutContentDraft(footerAboutContent);
      setFooterSupportLinksDraft(footerSupportLinks);
      setFooterCopyrightDraft(footerCopyright);
      setIsFooterEditorOpen(true);
    };

    window.addEventListener('openFooterEditor', handleOpenFooterEditor as EventListener);
    return () => {
      window.removeEventListener('openFooterEditor', handleOpenFooterEditor as EventListener);
    };
  }, [footerAboutContent, footerCopyright, footerLinks, footerSupportLinks, guestFooterOverrides, isAdmin, user]);

  if (!isFooterReady) {
    return (
      <footer
        className='border-t bg-[#0A0412] px-6 py-10 text-white'
        style={{ borderColor: 'var(--pinkcolor)' }}
      />
    );
  }

  const updateFooterDraft = (index: number, patch: Partial<LinkItem>) => {
    setFooterLinksDraft(prev => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const addFooterLink = () => {
    setFooterLinksDraft(prev => [
      ...prev,
      { label: '', to: '', order: prev.length + 1 },
    ]);
  };

  const removeFooterLink = (index: number) => {
    setFooterLinksDraft(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveFooterLinks = async () => {
    if (!user) return;

    setIsFooterSaving(true);
    const sanitized = footerLinksDraft
      .map((link, index) => ({
        label: (link.label ?? '').trim(),
        to: (link.to ?? '').trim(),
        order: Number.isFinite(Number(link.order)) ? Number(link.order) : index + 1,
      }))
      .filter(link => link.label.length > 0 && link.to.length > 0);

    const { error } = await supabase
      .from('app_settings')
      .upsert(
        {
          key: 'footer_links',
          value: JSON.stringify(sanitized),
          description: 'Navigation links for the footer',
        },
        { onConflict: 'key' }
      );

    const { error: guestError } = await supabase
      .from('app_settings')
      .upsert(
        {
          key: 'footer_guest_menu_overrides',
          value: JSON.stringify({
            homeLabel: (guestFooterOverridesDraft.homeLabel ?? '').trim(),
            homeLink: (guestFooterOverridesDraft.homeLink ?? '').trim(),
            downloadsLabel: (guestFooterOverridesDraft.downloadsLabel ?? '').trim(),
            downloadsLink: (guestFooterOverridesDraft.downloadsLink ?? '').trim(),
            aboutLabel: (guestFooterOverridesDraft.aboutLabel ?? '').trim(),
            aboutLink: (guestFooterOverridesDraft.aboutLink ?? '').trim(),
          }),
          description: 'Guest footer menu overrides (Home/Downloads/About)',
        },
        { onConflict: 'key' }
      );

    const { error: aboutError } = await supabase
      .from('app_settings')
      .upsert(
        {
          key: 'footer_about_content',
          value: JSON.stringify({
            title: (footerAboutContentDraft.title ?? '').trim() || 'About Us',
            description: (footerAboutContentDraft.description ?? '').trim() || defaultFooterAboutContent().description,
          }),
          description: 'Footer About section content (title + description)',
        },
        { onConflict: 'key' }
      );

    const { error: supportError } = await supabase
      .from('app_settings')
      .upsert(
        {
          key: 'footer_support_links',
          value: JSON.stringify({
            heading: (footerSupportLinksDraft.heading ?? '').trim() || defaultFooterSupportLinks().heading,
            contactLabel: (footerSupportLinksDraft.contactLabel ?? '').trim() || 'Contact us',
            contactLink: (footerSupportLinksDraft.contactLink ?? '').trim() || '/contact',
            instagramLink: (footerSupportLinksDraft.instagramLink ?? '').trim() || '#',
            facebookLink: (footerSupportLinksDraft.facebookLink ?? '').trim() || '#',
          }),
          description: 'Footer support section links (contact + social)',
        },
        { onConflict: 'key' }
      );

    const cleanedCopyrightText = (footerCopyrightDraft.text ?? '').trim();
    const { error: copyrightError } = await supabase
      .from('app_settings')
      .upsert(
        {
          key: 'footer_copyright',
          value: JSON.stringify({
            text: cleanedCopyrightText || defaultFooterCopyright().text,
          }),
          description: 'Footer copyright text (supports {year} placeholder)',
        },
        { onConflict: 'key' }
      );

    setIsFooterSaving(false);
    if (!error && !guestError && !aboutError && !supportError && !copyrightError) {
      const sortedLinks = [...sanitized].sort((a, b) => {
        const orderA = a.order !== undefined ? a.order : 999;
        const orderB = b.order !== undefined ? b.order : 999;
        return orderA - orderB;
      });
      setFooterLinks(sortedLinks);
      setGuestFooterOverrides(guestFooterOverridesDraft);
      setFooterAboutContent(footerAboutContentDraft);
      setFooterSupportLinks(footerSupportLinksDraft);
      setFooterCopyright({ text: cleanedCopyrightText || defaultFooterCopyright().text });
      setIsFooterEditorOpen(false);
    }
  };

  const isAuthenticated = Boolean(user);
  const activeFooterLinks = isAuthenticated
    ? (isFooterEditorOpen ? footerLinksDraft : footerLinks)
    : buildGuestFooterLinksFromOverrides(guestFooterOverrides);

  const activeFooterAboutContent = isAuthenticated && isFooterEditorOpen
    ? footerAboutContentDraft
    : footerAboutContent;

  const activeFooterCopyrightText = isAuthenticated && isFooterEditorOpen
    ? footerCopyrightDraft.text
    : footerCopyright.text;

  return (
    <footer
      className='border-t bg-[#0A0412] px-6 py-10 text-white relative'
      style={{ borderColor: 'var(--pinkcolor)' }}
    >
  
      <div className='flex grid-cols-1 flex-wrap justify-center gap-8 md:grid-cols-2 lg:grid-cols-3 lg:flex-nowrap'>
        {/* Left column images */}

        
          <div className='imgLeft01 max-w-40'>
            <Link
              to='https://knightsoftheholyrosary.wordpress.com/2012/06/23/the-sacred-heart-of-jesus-the-immaculate-heart-of-mary-and-the-message-of-fatima/'
              target='_blank'
              className='inline-block bg-white p-1'
            >
              <img src={Left03} alt='Left 03' />
            </Link>
          </div>
     

        {/* Main Footer Content */}

        <div className='mx-auto w-full max-w-7xl'>
          {/* Grid Section */}
          <div className='grid-cols-1 justify-between gap-6 rounded-sm pb-0 md:flex md:grid-cols-2 lg:grid-cols-3 lg:pb-10'>
            {/* Logo & About */}
            <div className='md:max-w-64 lg:max-w-sm'>
              <Link to='/' className='inline-block'>
                <img
                  src={logoAnimation}
                  alt='Footer Logo'
                  className='h-auto w-full max-w-[75px]'
                />
              </Link>

              <h2 className='pt-5 font-inter text-2xl font-bold text-[var(--yellowcolor)]'>
                {(activeFooterAboutContent.title ?? '').trim() || 'About Us'}
              </h2>

              <p className='pt-2 font-open-sans text-sm text-white whitespace-pre-line'>
                {(activeFooterAboutContent.description ?? '').trim() || defaultFooterAboutContent().description}
              </p>
            </div>

            {/* 🔥 Dynamic Link List with Arrow Icons */}
            {activeFooterLinks.length > 0 && (
              <div className='min-w-40 pt-5 lg:pt-9'>
                <ul className='space-y-3'>
                  {activeFooterLinks.map((item, index) => (
                    <li key={index} className='flex items-center gap-3'>
                      <img src={FiArrowUpRight} alt='Arrow' />
                      <Link
                        to={item.to}
                        className='text-[15px] font-normal text-white transition-colors hover:text-primary'
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Empty Columns (optional) */}
            <div className='min-w-32 pt-5 lg:pt-9'>
              <h2 className='pb-2 font-inter text-[20px] font-bold text-[var(--yellowcolor)]'>
                {(footerSupportLinks.heading ?? '').trim() || defaultFooterSupportLinks().heading}
              </h2>
              <ul className='space-y-3'>
                <li>
                  <SupportNavLink
                    href={footerSupportLinks.contactLink}
                    className='text-[15px] font-normal text-white transition-colors hover:text-primary'
                  >
                    {footerSupportLinks.contactLabel}
                  </SupportNavLink>
                </li>
                <li className='flex'>
                  <SupportNavLink href={footerSupportLinks.instagramLink} className='mr-3'>
                    <svg
                      width='26'
                      height='25'
                      viewBox='0 0 26 25'
                      fill='none'
                      xmlns='http://www.w3.org/2000/svg'
                    >
                      <path
                        d='M18.4611 1H6.82037C3.60587 1 1 3.57436 1 6.75V18.25C1 21.4256 3.60587 24 6.82037 24H18.4611C21.6756 24 24.2815 21.4256 24.2815 18.25V6.75C24.2815 3.57436 21.6756 1 18.4611 1Z'
                        stroke='#F3B800'
                        strokeWidth='2'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                      <path
                        d='M17.2969 11.7758C17.4406 12.7329 17.2751 13.7104 16.824 14.5692C16.3729 15.428 15.6592 16.1245 14.7844 16.5595C13.9096 16.9945 12.9182 17.1459 11.9512 16.9922C10.9843 16.8385 10.091 16.3874 9.39847 15.7033C8.70594 15.0191 8.24941 14.1367 8.09381 13.1814C7.93821 12.2261 8.09148 11.2467 8.5318 10.3825C8.97213 9.51823 9.67709 8.81315 10.5464 8.36752C11.4157 7.9219 12.4052 7.75842 13.374 7.90035C14.3622 8.04511 15.2771 8.50003 15.9835 9.1979C16.6899 9.89577 17.1504 10.7996 17.2969 11.7758Z'
                        stroke='#F3B800'
                        strokeWidth='2'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                      <path
                        d='M19.0425 6.1748H19.0535'
                        stroke='white'
                        strokeWidth='2'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                    </svg>
                  </SupportNavLink>{' '}
                  <SupportNavLink href={footerSupportLinks.facebookLink}>
                    <svg
                      width='15'
                      height='25'
                      viewBox='0 0 15 25'
                      fill='none'
                      xmlns='http://www.w3.org/2000/svg'
                    >
                      <path
                        d='M13.8088 0.800049H10.2609C8.69264 0.800049 7.18859 1.40585 6.07966 2.48418C4.97072 3.56252 4.34772 5.02505 4.34772 6.55005V10H0.799805V14.6H4.34772V23.8H9.07828V14.6H12.6262L13.8088 10H9.07828V6.55005C9.07828 6.24505 9.20288 5.95254 9.42466 5.73688C9.64645 5.52121 9.94726 5.40005 10.2609 5.40005H13.8088V0.800049Z'
                        stroke='#F3B800'
                        strokeWidth='1.6'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                    </svg>
                  </SupportNavLink>
                </li>
                {/* <li>
                  <a
                    href='mailto:support@peacefulinvestment.com'
                    className='text-[15px] font-normal text-white transition-colors hover:text-primary'
                  >
                    Help Center
                  </a>
                </li> */}
              </ul>

            </div>
          </div>
        </div>

        {/* Right column images */}
       
          <div className='imgRight01 max-w-40'>
            <Link
              to='https://knightsoftheholyrosary.wordpress.com/2012/06/23/the-sacred-heart-of-jesus-the-immaculate-heart-of-mary-and-the-message-of-fatima/'
              target='_blank'
              className='inline-block bg-white p-1'
            >
              <img src={Right03} alt='Right 03' />
            </Link>
          </div>
      
      </div>

      {/* Bottom Bar */}
      <div className='mx-auto w-full max-w-7xl pt-6 lg:pt-0'>
        <div className='border-t border-secondary-foreground pt-6'>
          <div className='text-center text-sm text-white'>
            &copy;  {new Date().getFullYear()}{' '}
            {(activeFooterCopyrightText ?? '').replace('{year}', String(new Date().getFullYear()))}
          </div>
        </div>
      </div>

      {user && isAdmin() && (
        <>
          <div
            className={`fixed inset-0 z-40 bg-black/70 transition-opacity ${
              isFooterEditorOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
            onClick={() => setIsFooterEditorOpen(false)}
            aria-hidden='true'
          />
          <aside
            className={`fixed right-0 top-0 z-50 h-full w-full max-w-md transform bg-[#2e2e2e] text-black shadow-2xl transition-transform duration-300 ${
              isFooterEditorOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
            aria-label='Edit Footer Links'
          >
            <div className='flex items-center justify-between border-0 border-white/10 px-6 py-4'>
              <h2 className='text-lg font-semibold text-white'>Edit Footer Links</h2>
              <Button
                size='sm'
                variant='outline'
                className='text-black border-0 rounded-[8px] bg-white/10 hover:bg-white/20'
                onClick={() => setIsFooterEditorOpen(false)}
              >
                <X className='h-4 w-4 text-white' />
              </Button>
            </div>
            <div
              className='space-y-4 px-6 pt-0 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent'
              style={{ height: 'calc(100vh - 157px)' }}
            >
             
              <div className='rounded-none border-0 py-0 space-y-3 bg-transparent my-0 inline-block w-full'>
                <div className="bg-black border-l-4 border-primary mx-[-24px] px-6 py-4 mt-[0px!important]">
                  <h3 className="text-white font-semibold">About Section</h3>
                </div>

                <div className='space-y-1'>
                  <Label className='text-sm text-white font-normal'>Title</Label>
                  <Input
                    value={footerAboutContentDraft.title ?? ''}
                    onChange={(e) => setFooterAboutContentDraft(prev => ({ ...prev, title: e.target.value }))}
                    className='text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none'
                    style={{ '--tw-ring-offset-width': '0', boxShadow: 'none', outline: 'none' } as CSSProperties}
                  />
                </div>

                <div className='space-y-1'>
                  <Label className='text-sm text-white font-normal'>Description</Label>
                  <Textarea
                    value={footerAboutContentDraft.description ?? ''}
                    onChange={(e) => setFooterAboutContentDraft(prev => ({ ...prev, description: e.target.value }))}
                    className='text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none min-h-[90px]'
                    style={{ '--tw-ring-offset-width': '0', boxShadow: 'none', outline: 'none' } as CSSProperties}
                  />
                </div>
              </div>


             <div className="bg-black border-l-4 border-primary mx-[-24px] px-6 py-4 mt-[25px!important]">
                <h3 className="text-white font-semibold">Footer Menu</h3>
              </div>

              {(footerLinksDraft ?? []).map((item, index) => (
                <div
                  key={`footer-link-${index}`}
                  className='rounded-lg border border-white/10 p-4 space-y-3 bg-black/20 my-2 inline-block w-full'
                >
                  <div className='flex items-center justify-between'>
                    <span className='text-sm text-white font-normal'>Link {index + 1}</span>
                      <Button
                      size='sm'
                      variant='outline'
                      className='text-white border-0 rounded-[8px] bg-white/10 hover:bg-white/20'
                      onClick={() => removeFooterLink(index)}
                    >
                      Remove
                    </Button>
                  </div>

                  <div className='space-y-1'>
                    <Label className='text-sm text-white font-normal'>Label</Label>
                    <Input
                      value={item.label ?? ''}
                      onChange={(e) => updateFooterDraft(index, { label: e.target.value })}
                      className='text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none'
                      style={{ '--tw-ring-offset-width': '0', boxShadow: 'none', outline: 'none' } as CSSProperties}
                    />
                  </div>
                  <div className='space-y-1'>
                    <Label className='text-sm text-white font-normal'>Link (href)</Label>
                    <Input
                      value={item.to ?? ''}
                      onChange={(e) => updateFooterDraft(index, { to: e.target.value })}
                      className='text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none'
                      style={{ '--tw-ring-offset-width': '0', boxShadow: 'none', outline: 'none' } as CSSProperties}
                    />
                  </div>
                  <div className='space-y-1'>
                    <Label className='text-sm text-white font-normal'>Order</Label>
                    <Input
                      value={String(item.order ?? index + 1)}
                      onChange={(e) => updateFooterDraft(index, { order: Number(e.target.value) })}
                      className='text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none'
                      style={{ '--tw-ring-offset-width': '0', boxShadow: 'none', outline: 'none' } as CSSProperties}
                    />
                  </div>
             
                </div>
              ))}

  <div className='space-y-2'>
                <Button
                  size='sm'
                  className='bg-gradient-pink-to-yellow text-white border-0 rounded-[8px] w-full'
                  onClick={addFooterLink}
                >
                  + Add Link
                </Button>
              </div>


              <div className='rounded-none border-0 py-4 space-y-3 bg-transparent my-4 inline-block w-full'> 

                <div className="bg-black border-l-4 border-primary mx-[-24px] px-6 py-4 mt-[0px!important]">
                <h3 className="text-white font-semibold">Guest Menu Overrides</h3>
              </div>

                <div className='space-y-1'>
                  <Label className='text-sm text-white font-normal'>Home Label</Label>
                  <Input
                    value={guestFooterOverridesDraft.homeLabel ?? ''}
                    onChange={(e) => setGuestFooterOverridesDraft(prev => ({ ...prev, homeLabel: e.target.value }))}
                    className='text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none'
                    style={{ '--tw-ring-offset-width': '0', boxShadow: 'none', outline: 'none' } as CSSProperties}
                  />
                </div>
                <div className='space-y-1'>
                  <Label className='text-sm text-white font-normal'>Home Link</Label>
                  <Input
                    value={guestFooterOverridesDraft.homeLink ?? ''}
                    onChange={(e) => setGuestFooterOverridesDraft(prev => ({ ...prev, homeLink: e.target.value }))}
                    className='text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none'
                    style={{ '--tw-ring-offset-width': '0', boxShadow: 'none', outline: 'none' } as CSSProperties}
                  />
                </div>

                <div className='space-y-1'>
                  <Label className='text-sm text-white font-normal'>Downloads Label</Label>
                  <Input
                    value={guestFooterOverridesDraft.downloadsLabel ?? ''}
                    onChange={(e) => setGuestFooterOverridesDraft(prev => ({ ...prev, downloadsLabel: e.target.value }))}
                    className='text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none'
                    style={{ '--tw-ring-offset-width': '0', boxShadow: 'none', outline: 'none' } as CSSProperties}
                  />
                </div>
                <div className='space-y-1'>
                  <Label className='text-sm text-white font-normal'>Downloads Link</Label>
                  <Input
                    value={guestFooterOverridesDraft.downloadsLink ?? ''}
                    onChange={(e) => setGuestFooterOverridesDraft(prev => ({ ...prev, downloadsLink: e.target.value }))}
                    className='text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none'
                    style={{ '--tw-ring-offset-width': '0', boxShadow: 'none', outline: 'none' } as CSSProperties}
                  />
                </div>

                <div className='space-y-1'>
                  <Label className='text-sm text-white font-normal'>About Label</Label>
                  <Input
                    value={guestFooterOverridesDraft.aboutLabel ?? ''}
                    onChange={(e) => setGuestFooterOverridesDraft(prev => ({ ...prev, aboutLabel: e.target.value }))}
                    className='text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none'
                    style={{ '--tw-ring-offset-width': '0', boxShadow: 'none', outline: 'none' } as CSSProperties}
                  />
                </div>
                <div className='space-y-1'>
                  <Label className='text-sm text-white font-normal'>About Link</Label>
                  <Input
                    value={guestFooterOverridesDraft.aboutLink ?? ''}
                    onChange={(e) => setGuestFooterOverridesDraft(prev => ({ ...prev, aboutLink: e.target.value }))}
                    className='text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none'
                    style={{ '--tw-ring-offset-width': '0', boxShadow: 'none', outline: 'none' } as CSSProperties}
                  />
                </div>
              </div>

             

              <div className='rounded-none border-0 py-4 space-y-3 bg-transparent my-4 inline-block w-full'>
                <div className="bg-black border-l-4 border-primary mx-[-24px] px-6 py-4 mt-[0px!important]">
                  <h3 className="text-white font-semibold">Support Links</h3>
                </div>

                <div className='space-y-1'>
                  <Label className='text-sm text-white font-normal'>Heading</Label>
                  <Input
                    value={footerSupportLinksDraft.heading ?? ''}
                    onChange={(e) => setFooterSupportLinksDraft(prev => ({ ...prev, heading: e.target.value }))}
                    className='text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none'
                    style={{ '--tw-ring-offset-width': '0', boxShadow: 'none', outline: 'none' } as CSSProperties}
                  />
                </div>

                <div className='space-y-1'>
                  <Label className='text-sm text-white font-normal'>Contact Label</Label>
                  <Input
                    value={footerSupportLinksDraft.contactLabel ?? ''}
                    onChange={(e) => setFooterSupportLinksDraft(prev => ({ ...prev, contactLabel: e.target.value }))}
                    className='text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none'
                    style={{ '--tw-ring-offset-width': '0', boxShadow: 'none', outline: 'none' } as CSSProperties}
                  />
                </div>
                <div className='space-y-1'>
                  <Label className='text-sm text-white font-normal'>Contact Link</Label>
                  <Input
                    value={footerSupportLinksDraft.contactLink ?? ''}
                    onChange={(e) => setFooterSupportLinksDraft(prev => ({ ...prev, contactLink: e.target.value }))}
                    className='text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none'
                    style={{ '--tw-ring-offset-width': '0', boxShadow: 'none', outline: 'none' } as CSSProperties}
                  />
                </div>

                <div className='space-y-1'>
                  <Label className='text-sm text-white font-normal'>Instagram Link</Label>
                  <Input
                    value={footerSupportLinksDraft.instagramLink ?? ''}
                    onChange={(e) => setFooterSupportLinksDraft(prev => ({ ...prev, instagramLink: e.target.value }))}
                    className='text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none'
                    style={{ '--tw-ring-offset-width': '0', boxShadow: 'none', outline: 'none' } as CSSProperties}
                  />
                </div>
                <div className='space-y-1'>
                  <Label className='text-sm text-white font-normal'>Facebook Link</Label>
                  <Input
                    value={footerSupportLinksDraft.facebookLink ?? ''}
                    onChange={(e) => setFooterSupportLinksDraft(prev => ({ ...prev, facebookLink: e.target.value }))}
                    className='text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none'
                    style={{ '--tw-ring-offset-width': '0', boxShadow: 'none', outline: 'none' } as CSSProperties}
                  />
                </div>
              </div>

              <div className='rounded-none border-0 py-4 space-y-3 bg-transparent my-4 inline-block w-full'>
                <div className="bg-black border-l-4 border-primary mx-[-24px] px-6 py-4 mt-[0px!important]">
                  <h3 className="text-white font-semibold">Copyright</h3>
                </div>

                <div className='space-y-1'>
                  <Label className='text-sm text-white font-normal'>Text</Label>
                  <Textarea
                    value={footerCopyrightDraft.text ?? ''}
                    onChange={(e) => setFooterCopyrightDraft({ text: e.target.value })}
                    className='text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none min-h-[70px]'
                    style={{ '--tw-ring-offset-width': '0', boxShadow: 'none', outline: 'none' } as CSSProperties}
                  />
                </div>
              </div>

             
            </div>
            <div className='p-6'>
              <Button
                className='w-full bg-gradient-pink-to-yellow text-white rounded-[8px] border-0'
                onClick={handleSaveFooterLinks}
                disabled={isFooterSaving}
              >
                {isFooterSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </aside>
        </>
      )}
    </footer>
  );
};

export default Footer;
