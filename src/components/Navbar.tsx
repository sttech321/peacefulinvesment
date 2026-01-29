import { useMemo, useState, useEffect, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Menu,
  X,
  Shield,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Shield as VerificationIcon,
  Edit,
  Heart,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useUserRole } from '@/hooks/useUserRole';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import logoAnimation from '@/assets/new-logo.gif';
import defaultHeaderMenu from '@/config/headerMenu.json';

interface LinkItem {
  id?: string;
  label: string;
  to: string;
  order?: number;
}

type NavLink = {
  name: string;
  href: string;
};

type ProfileMenuLabels = {
  profileSettings: string;
  verificationCenter: string;
  prayerTasks: string;
  adminDashboard: string;
  signOut: string;
};

type NormalizedLink = {
  name: string;
  href: string;
  order: number;
};

const sanitizeLinks = (links: LinkItem[]): NormalizedLink[] =>
  links
    .map((link, index) => {
      const name = (link.label ?? '').trim();
      const href = (link.to ?? '').trim();
      const order = Number.isFinite(Number(link.order))
        ? Number(link.order)
        : index + 1;

      return {
        name,
        href,
        order,
      };
    })
    .filter((link) => link.name.length > 0 && link.href.length > 0)
    .sort((a, b) => a.order - b.order);

const DEFAULT_NAV_LINKS_AUTH: NavLink[] = defaultHeaderMenu.auth;
const DEFAULT_NAV_LINKS_GUEST: NavLink[] = defaultHeaderMenu.guest;

const DEFAULT_PROFILE_MENU_LABELS: ProfileMenuLabels = {
  profileSettings: 'Profile Settings',
  verificationCenter: 'Verification Center',
  prayerTasks: 'Prayer Tasks',
  adminDashboard: 'Admin Dashboard',
  signOut: 'Sign Out',
};

const buildDefaultHeaderLinks = (): LinkItem[] =>
  DEFAULT_NAV_LINKS_AUTH.map((link, index) => ({
    label: link.name,
    to: link.href,
    order: index + 1,
  }));

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [headerLinks, setHeaderLinks] = useState<LinkItem[]>(() => buildDefaultHeaderLinks());
  const [isHeaderEditorOpen, setIsHeaderEditorOpen] = useState(false);
  const [isHeaderSaving, setIsHeaderSaving] = useState(false);
  const [headerLinksDraft, setHeaderLinksDraft] = useState<LinkItem[]>([]);
  const [profileMenuLabels, setProfileMenuLabels] = useState<ProfileMenuLabels>(
    DEFAULT_PROFILE_MENU_LABELS
  );
  const [profileMenuLabelsDraft, setProfileMenuLabelsDraft] =
    useState<ProfileMenuLabels>(DEFAULT_PROFILE_MENU_LABELS);
  const [isNavContentReady, setIsNavContentReady] = useState(false);

  useEffect(() => {
    const loadNavContent = async () => {
      let nextHeaderLinks = buildDefaultHeaderLinks();
      let nextProfileMenuLabels = { ...DEFAULT_PROFILE_MENU_LABELS };

      try {
        const { data, error } = await supabase
          .from('app_settings' as any)
          .select('value')
          .eq('key', 'header_links')
          .maybeSingle();

        if (!error && (data as any)?.value) {
          const parsedLinks = JSON.parse((data as any).value) as LinkItem[];
          if (Array.isArray(parsedLinks)) {
            const sortedLinks = [...parsedLinks].sort((a, b) => {
              const orderA = a.order !== undefined ? a.order : 999;
              const orderB = b.order !== undefined ? b.order : 999;
              return orderA - orderB;
            });
            nextHeaderLinks = sortedLinks;
          }
        }
      } catch (error) {
        console.error('Error fetching header links:', error);
      }

      try {
        const { data, error } = await supabase
          .from('app_settings' as any)
          .select('value')
          .eq('key', 'profile_menu_labels')
          .maybeSingle();

        if (!error && (data as any)?.value) {
          const parsed = JSON.parse((data as any).value) as Partial<ProfileMenuLabels>;
          if (parsed && typeof parsed === 'object') {
            nextProfileMenuLabels = {
              ...DEFAULT_PROFILE_MENU_LABELS,
              ...parsed,
            };
          }
        }
      } catch (error) {
        console.error('Error fetching profile menu labels:', error);
      }

      setHeaderLinks(nextHeaderLinks);
      setProfileMenuLabels(nextProfileMenuLabels);
      setIsNavContentReady(true);
    };

    void loadNavContent();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const openHeaderEditor = () => {
    const defaultAuthLinks = DEFAULT_NAV_LINKS_AUTH.map((link, index) => ({
      id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
      label: link.name,
      to: link.href,
      order: index + 1,
    }));

    const baseLinks = headerLinks.length > 0 ? headerLinks : defaultAuthLinks;
    const sortedLinks = [...baseLinks]
      .map((link, index) => ({
        ...link,
        id: link.id ?? `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
      }))
      .sort((a, b) => {
      const orderA = a.order !== undefined ? a.order : 999;
      const orderB = b.order !== undefined ? b.order : 999;
      return orderA - orderB;
    });

    setHeaderLinksDraft(sortedLinks);
    setProfileMenuLabelsDraft(profileMenuLabels);
    setIsHeaderEditorOpen(true);
  };

  const updateHeaderDraft = (index: number, patch: Partial<LinkItem>) => {
    setHeaderLinksDraft((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      )
    );
  };

  const addHeaderLink = () => {
    setHeaderLinksDraft((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${prev.length}-${Math.random().toString(36).slice(2)}`,
        label: '',
        to: '',
        order: prev.length + 1,
      },
    ]);
  };

  const removeHeaderLink = (index: number) => {
    setHeaderLinksDraft((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveHeaderLinks = async () => {
    if (!user) {
      return;
    }

    setIsHeaderSaving(true);
    const sanitized = headerLinksDraft
      .map((link, index) => ({
        label: (link.label ?? '').trim(),
        to: (link.to ?? '').trim(),
        order: Number.isFinite(Number(link.order))
          ? Number(link.order)
          : index + 1,
      }))
      .filter((link) => link.label.length > 0 && link.to.length > 0);

    const { error } = await supabase
      .from('app_settings')
      .upsert(
        {
          key: 'header_links',
          value: JSON.stringify(sanitized),
          description: 'Navigation links for the header/navbar',
        },
        { onConflict: 'key' }
      );

    const { error: labelsError } = await supabase
      .from('app_settings')
      .upsert(
        {
          key: 'profile_menu_labels',
          value: JSON.stringify(profileMenuLabelsDraft),
          description: 'Labels for the profile dropdown menu',
        },
        { onConflict: 'key' }
      );

    setIsHeaderSaving(false);
    if (!error && !labelsError) {
      const sortedLinks = [...sanitized].sort((a, b) => {
        const orderA = a.order !== undefined ? a.order : 999;
        const orderB = b.order !== undefined ? b.order : 999;
        return orderA - orderB;
      });
      setHeaderLinks(sortedLinks);
      setProfileMenuLabels(profileMenuLabelsDraft);
      setIsHeaderEditorOpen(false);
    }
  };

  const isAuthenticated = Boolean(user);

  const activeProfileMenuLabels = isHeaderEditorOpen
    ? profileMenuLabelsDraft
    : profileMenuLabels;

  // Prefer configured header links for authenticated users; otherwise use defaults.
  const activeHeaderLinks = isHeaderEditorOpen ? headerLinksDraft : headerLinks;

  const normalizedHeaderLinks = useMemo<NormalizedLink[]>(
    () => sanitizeLinks(activeHeaderLinks),
    [activeHeaderLinks]
  );

  const mainNavLinks: NavLink[] = useMemo(() => {
    if (normalizedHeaderLinks.length === 0) {
      return isAuthenticated ? DEFAULT_NAV_LINKS_AUTH : DEFAULT_NAV_LINKS_GUEST;
    }

    if (isAuthenticated) {
      return normalizedHeaderLinks.map(({ name, href }) => ({ name, href }));
    }

    const overrides = new Map(normalizedHeaderLinks.map((link) => [link.href, link]));

    return DEFAULT_NAV_LINKS_GUEST.map((defaultLink) => {
      const override = overrides.get(defaultLink.href);
      if (!override) {
        return defaultLink;
      }

      return {
        name: override.name,
        href: override.href,
      };
    });
  }, [isAuthenticated, normalizedHeaderLinks]);

  // Services dropdown for logged-in users
  // Show "Overseas Company" only for USA users who have completed their profile
  // Check both is_usa_client flag and country code as fallback
  const countryCode = (profile?.country_code || profile?.country || "").toString().trim().toUpperCase();
  const country = (profile?.country || "").toString().trim().toLowerCase();
  const isUSAClient = profile?.is_usa_client || 
                      countryCode === "US" || 
                      countryCode === "USA" || 
                      country === "united states";
  
  // Check if profile is effectively complete (similar to ProfileCompletionGuard)
  const isProfileEffectivelyComplete = () => {
    if (!profile) return false;
    if (profile.has_completed_profile) return true;
    // Check if essential fields are filled (indicates profile was filled)
    const essentialFieldsCount = [
      profile.full_name,
      profile.phone,
      profile.address,
      profile.city,
      profile.state,
      profile.zip_code
    ].filter(Boolean).length;
    // If they have at least 3 essential fields, consider profile filled
    return essentialFieldsCount >= 3;
  };
  
  const isProfileComplete = isProfileEffectivelyComplete();
  const showOverseasCompany = isUSAClient && isProfileComplete;

  const servicesLinks = [
    ...(showOverseasCompany ? [{ name: 'Overseas Company', href: '/overseas-company' }] : []),
    { name: 'Requests', href: '/requests' },
  ];

  if (!isNavContentReady) {
    return <div className='h-[80px]' />;
  }

  return (
    <>
      <nav
        className='fixed left-0 right-0 top-0 z-50 border-b bg-[#000] backdrop-blur-xl px-6'
        style={{ borderColor: 'var(--pinkcolor)' }}
      >
        <div className='mx-auto max-w-7xl'>
          <div className='flex h-[80px] min-w-0 items-center justify-between'>
          {/* Logo */} 
          <Link
            to='/'
            className='flex min-w-0 flex-shrink-0 items-center space-x-2 outline-none'
          >
            <img
              src={logoAnimation}
              alt='Peaceful Investment'
              className='h-full w-full max-w-[67px]'
            />
            {/* <span className='truncate text-lg font-bold text-foreground text-white sm:text-xl'>
              Peaceful Investment
            </span> */}
          </Link>

          {/* Desktop Navigation */}
          <div className='hidden items-center space-x-6 lg:flex'>
            {/* Main navigation links */}
            {mainNavLinks.map(link => (
              <Link
                key={link.name}
                to={link.href}
                className='font-inter text-xs font-semibold uppercase text-white transition-colors hover:text-primary outline-none'
              >
                {link.name}
              </Link>
            ))}

            {/* Services Dropdown for logged-in users */}
            {/* {user && (
              <DropdownMenu>
                <DropdownMenuTrigger className='flex items-center gap-1 font-inter text-xs font-semibold uppercase text-white transition-colors hover:text-muted-foreground outline-none'>
                  Services
                  <ChevronDown className='h-4 w-4' />
                </DropdownMenuTrigger>
                <DropdownMenuContent className='w-48 border border-border/40 bg-background/95 backdrop-blur-xl'>
                  {servicesLinks.map(link => (
                    <DropdownMenuItem key={link.name} asChild>
                      <Link to={link.href} className='w-full cursor-pointer'>
                        {link.name}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )} */}
          </div>

          {/* Right Side Actions */}
          <div className='hidden items-center space-x-3 lg:flex'>
            {user ? (
              <>
                {/* Theme Toggle */}
                {/* <ThemeToggle /> */}

                {isAdmin() && (
                  <Button
                    size='sm'
                    className='bg-gradient-pink-to-yellow hover:bg-gradient-yellow-to-pink text-white border-0 px-4 py-2 font-inter text-xs font-semibold uppercase absolute right-6 top-5 rounded-[8px] h-10'
                    onClick={openHeaderEditor}
                  ><Edit className='h-4 w-4' />
                     Menu
                  </Button>
                )}

                {/* Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant='ghost'
                      className='flex items-center gap-2 px-3 py-2 border-0 bg-gradient-pink-to-yellow rounded-[10px] text-white hover:text-white '
                      style={{ "--tw-ring-offset-width": "0" } as CSSProperties}
                    >
                      <User className='h-4 w-4' />
                      <span className='text-sm'>
                        {user.email?.split('@')[0]}
                      </span>
                      <ChevronDown className='h-4 w-4' />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className='w-56 border-0 bg-white/95 backdrop-blur-xl rounded-sm'
                    align='end'
                  >
                    <DropdownMenuItem asChild>
                      <Link
                        to='/profile'
                        className='flex w-full cursor-pointer items-center gap-2'
                      >
                        <User className='h-4 w-4' />
                        {activeProfileMenuLabels.profileSettings}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        to='/verification'
                        className='flex w-full cursor-pointer items-center gap-2'
                      >
                        <VerificationIcon className='h-4 w-4' />
                        {activeProfileMenuLabels.verificationCenter}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        to='/prayer-tasks'
                        className='flex w-full cursor-pointer items-center gap-2'
                      >
                        <Heart className='h-4 w-4' />
                        {activeProfileMenuLabels.prayerTasks}
                      </Link>
                    </DropdownMenuItem>
                    {isAdmin() && (
                      <DropdownMenuItem asChild>
                        <Link
                          to='/admin/dashboard'
                          className='flex w-full cursor-pointer items-center gap-2'
                        >
                          <Edit className='h-4 w-4' />
                          {activeProfileMenuLabels.adminDashboard}
                        </Link>
                      </DropdownMenuItem>
                    )}
                    
                    <DropdownMenuSeparator className='bg-black/10' />
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className='flex w-full cursor-pointer items-center gap-2 text-destructive focus:text-white hover:bg-black hover:text-white'
                    >
                      <LogOut className='h-4 w-4' />
                      {activeProfileMenuLabels.signOut}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                {/* <ThemeToggle /> */}
                <Link
                  to='/auth'
                  className='bg-gradient-pink-to-yellow rounded-[12px] p-[2px]'
                >
                  <Button
                    variant='ghost'
                    className='hover:bg-gradient-pink-to-yellow block h-[35px] rounded-[10px] border-0 bg-black p-0 px-5 font-inter text-xs font-semibold uppercase text-white hover:text-white'
                  >
                    Login
                  </Button>
                </Link>
                <Link
                  to='/auth?mode=signup'
                  className='bg-gradient-pink-to-yellow rounded-[12px] p-[2px]'
                >
                  <Button className='bg-gradient-yellow-to-pink hover:bg-gradient-pink-to-yellow block h-[35px] rounded-[10px] border-0 p-0 px-5 font-inter text-xs font-semibold uppercase text-white'>
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className='ml-2 flex-shrink-0 lg:hidden'>

             {isAdmin() && (
                  <Button
                    size='sm'
                    className='bg-gradient-pink-to-yellow hover:bg-gradient-yellow-to-pink text-white border-0 px-4 py-1 font-inter text-xs font-semibold uppercase absolute right-20 top-5 rounded-[8px] h-[36px]'
                    onClick={openHeaderEditor}
                  ><Edit className='h-4 w-4' />
                    Menu
                  </Button>
                )}

            <button
              onClick={() => setIsOpen(!isOpen)}
              className='p-1 text-muted-foreground hover:text-foreground'
            >
              {isOpen ? (
                <X className='h-7 w-7' />
              ) : (
                <Menu className='h-7 w-7' />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className='fixed inset-x-0 top-[80px] z-50 border-t border-border/40 bg-[#0c0715]/85 shadow-lg backdrop-blur-xl lg:hidden'>
            <div className='w-full max-w-full overflow-x-hidden'>
              <div className='space-y-1 px-3 py-2'>
                {/* Main nav links */}
                {mainNavLinks.map(link => (
                  <Link
                    key={link.name}
                    to={link.href}
                    className='block truncate px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground'
                    onClick={() => setIsOpen(false)}
                  >
                    {link.name}
                  </Link>
                ))}

                {/* Services for mobile */}
                {user && (
                  <>
                    {/* <div className='px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                      Services
                    </div>
                    {servicesLinks.map(link => (
                      <Link
                        key={link.name}
                        to={link.href}
                        className='block truncate px-6 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground'
                        onClick={() => setIsOpen(false)}
                      >
                        {link.name}
                      </Link>
                    ))} */}

                    <div className='px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                      Account
                    </div>
                    <Link
                      to='/profile'
                      className='block truncate px-6 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground'
                      onClick={() => setIsOpen(false)}
                    >
                      {activeProfileMenuLabels.profileSettings}
                    </Link>
                    <Link
                      to='/verification'
                      className='block truncate px-6 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground'
                      onClick={() => setIsOpen(false)}
                    >
                      {activeProfileMenuLabels.verificationCenter}
                    </Link>
                    <Link
                      to='/prayer-tasks'
                      className='block truncate px-6 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground'
                      onClick={() => setIsOpen(false)}
                    >
                      {activeProfileMenuLabels.prayerTasks}
                    </Link>
                    {isAdmin() && (
                      <Link
                        to='/admin/dashboard'
                        className='block truncate px-6 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground'
                        onClick={() => setIsOpen(false)}
                      >
                        {activeProfileMenuLabels.adminDashboard}
                      </Link>
                    )}
                  </>
                )}

                <div className='mt-2 space-y-2 border-t border-border/40 px-3 py-3'>
                  {/* <div className='flex justify-center'>
                    <ThemeToggle />
                  </div> */}
                  {user ? (
                    <div className='space-y-2'>
                      <p className='truncate px-3 text-xs text-muted-foreground'>
                        {user.email}
                      </p>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => {
                          handleSignOut();
                          setIsOpen(false);
                        }}
                        className='w-full text-sm'
                      >
                        Sign Out
                      </Button>
                    </div>
                  ) : (
                    <div className='space-y-2'>
                      <Link
                        to='/auth'
                        className='bg-gradient-pink-to-yellow block rounded-[12px] p-[2px]'
                        onClick={() => setIsOpen(false)}
                      >
                        <Button
                          variant='ghost'
                          size='sm'
                          className='hover:bg-gradient-pink-to-yellow block h-[35px] w-full rounded-[10px] border-0 bg-black p-0 px-5 font-inter text-xs font-semibold uppercase text-white hover:text-white'
                        >
                          Login
                        </Button>
                      </Link>
                      <Link
                        to='/auth?mode=signup'
                        className='bg-gradient-pink-to-yellow block rounded-[12px] p-[2px]'
                        onClick={() => setIsOpen(false)}
                      >
                        <Button
                          size='sm'
                          className='bg-gradient-yellow-to-pink hover:bg-gradient-pink-to-yellow block h-[35px] w-full rounded-[10px] border-0 p-0 px-5 font-inter text-xs font-semibold uppercase text-white'
                        >
                          Sign Up
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>

    {user && isAdmin() && (
      <>
        <div
          className={`fixed inset-0 z-40 bg-black/60 transition-opacity ${
            isHeaderEditorOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
          onClick={() => setIsHeaderEditorOpen(false)}
          aria-hidden='true'
        />
        <aside
          className={`fixed right-0 top-0 z-50 h-full w-full max-w-md transform bg-[#2e2e2e] text-white shadow-2xl transition-transform duration-300 ${
            isHeaderEditorOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          aria-label='Edit Header Menu'
        >
          <div className='flex items-center justify-between border-b border-white/10 px-6 py-4'>
            <h2 className='text-lg font-semibold'>Edit Header Menu</h2>
            <Button
              size='sm'
              variant='outline'
              className='text-black border-0 rounded-[8px] bg-white/10 hover:bg-white/20'
              onClick={() => setIsHeaderEditorOpen(false)}
            >
              <X className="h-4 w-4 text-white" />
            </Button>
          </div>
          <div
            className='space-y-4 px-6 pt-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent'
            style={{ height: 'calc(100vh - 157px)' }}
          >
            <div className='space-y-4'>
              {headerLinksDraft.map((link, index) => (
                <div
                  key={link.id ?? `${index}`}
                  className='rounded-lg border border-white/10 p-4 space-y-2 bg-black/20 my-2 inline-block w-full'
                >
                  <div className='flex items-center justify-between'>
                    <span className='text-sm text-white font-normal'>Link {index + 1}</span>
                    <Button
                      size='sm'
                      variant='outline'
                      className='text-black border-0 rounded-[8px]'
                      onClick={() => removeHeaderLink(index)}
                    >
                      Remove
                    </Button>
                  </div>
                  <div className='space-y-1'>
                    <label className='text-sm text-muted-foreground'>Label</label>
                    <Input
                      value={link.label}
                      onChange={(event) =>
                        updateHeaderDraft(index, { label: event.target.value })
                      }
                      className='text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none'
                      style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                    />
                  </div>
                  <div className='space-y-2'>
                    <label className='text-sm text-muted-foreground'>Link</label>
                    <Input
                      value={link.to}
                      onChange={(event) =>
                        updateHeaderDraft(index, { to: event.target.value })
                      }
                      className='text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none'
                      style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                    />
                  </div>
                  <div className='space-y-2'>
                    <label className='text-sm text-muted-foreground'>Order</label>
                    <Input
                      type='number'
                      value={link.order ?? index + 1}
                      onChange={(event) =>
                        updateHeaderDraft(index, { order: Number(event.target.value) })
                      }
                      className='text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none'
                      style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                    />
                  </div>
                </div>
              ))}
              {headerLinksDraft.length === 0 && (
                <p className='text-sm text-muted-foreground'>No links yet. Add your first link below.</p>
              )}
              <Button
                size='sm'
                className='w-full bg-gradient-pink-to-yellow text-white rounded-[8px] border-0'
                onClick={addHeaderLink}
              >
                Add Link
              </Button>
            </div>
            <div className='space-y-4 border-t border-white/10 pt-6'>
              <h3 className='text-sm font-semibold text-white'>Profile Menu Labels</h3>
              <div className='space-y-2'>
                <label className='text-sm text-muted-foreground'>Profile Settings</label>
                <Input
                  value={profileMenuLabelsDraft.profileSettings}
                  onChange={(event) =>
                    setProfileMenuLabelsDraft((prev) => ({
                      ...prev,
                      profileSettings: event.target.value,
                    }))
                  }
                  className='text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none'
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>
              <div className='space-y-2'>
                <label className='text-sm text-muted-foreground'>Verification Center</label>
                <Input
                  value={profileMenuLabelsDraft.verificationCenter}
                  onChange={(event) =>
                    setProfileMenuLabelsDraft((prev) => ({
                      ...prev,
                      verificationCenter: event.target.value,
                    }))
                  }
                  className='text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none'
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>
              <div className='space-y-2'>
                <label className='text-sm text-muted-foreground'>Prayer Tasks</label>
                <Input
                  value={profileMenuLabelsDraft.prayerTasks}
                  onChange={(event) =>
                    setProfileMenuLabelsDraft((prev) => ({
                      ...prev,
                      prayerTasks: event.target.value,
                    }))
                  }
                  className='text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none'
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>
              <div className='space-y-2'>
                <label className='text-sm text-muted-foreground'>Admin Dashboard</label>
                <Input
                  value={profileMenuLabelsDraft.adminDashboard}
                  onChange={(event) =>
                    setProfileMenuLabelsDraft((prev) => ({
                      ...prev,
                      adminDashboard: event.target.value,
                    }))
                  }
                  className='text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none'
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>
              <div className='space-y-2'>
                <label className='text-sm text-muted-foreground'>Sign Out</label>
                <Input
                  value={profileMenuLabelsDraft.signOut}
                  onChange={(event) =>
                    setProfileMenuLabelsDraft((prev) => ({
                      ...prev,
                      signOut: event.target.value,
                    }))
                  }
                  className='text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none'
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>
            </div>
          </div>
          <div className='p-6'>
            <Button
              className='w-full bg-gradient-pink-to-yellow text-white rounded-[8px] border-0'
              onClick={handleSaveHeaderLinks}
              disabled={isHeaderSaving}
            >
              {isHeaderSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </aside>
      </>
    )}
  </>
  );
};

export default Navbar;
