import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useUserRole } from '@/hooks/useUserRole';
import logoAnimation from '@/assets/patrik-logo-animation.gif';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Simplified main navigation for logged-in users
  const mainNavLinks = user
    ? [
        { name: 'Dashboard', href: '/dashboard' },
        { name: 'Trading', href: '/trading' },
        { name: 'Accounts', href: '/meta-trader-accounts' },
        { name: 'Referrals', href: '/referrals' },
        { name: 'Blog', href: '/blog' },
        { name: 'Contact', href: '/contact' },
      ]
    : [
        { name: 'Home', href: '/' },
        { name: 'Downloads', href: '/downloads' },
        { name: 'Blog', href: '/blog' },
        { name: 'Contact', href: '/contact' },
        { name: 'About', href: '/about' },
        { name: 'Features', href: '/#features' },
      ];

  // Services dropdown for logged-in users
  const servicesLinks = [
    { name: 'Overseas Company', href: '/overseas-company' },
    { name: 'Requests', href: '/requests' },
  ];

  return (
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
              className='h-15 w-32  rounded-full'
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
                className='font-inter text-xs font-semibold uppercase text-white transition-colors hover:text-primary'
              >
                {link.name}
              </Link>
            ))}

            {/* Services Dropdown for logged-in users */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger className='flex items-center gap-1 font-inter text-xs font-semibold uppercase text-white transition-colors hover:text-muted-foreground'>
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
            )}
          </div>

          {/* Right Side Actions */}
          <div className='hidden items-center space-x-3 lg:flex'>
            {user ? (
              <>
                {/* Theme Toggle */}
                {/* <ThemeToggle /> */}

                {/* Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant='ghost'
                      className='flex items-center gap-2 px-3 py-2 border-0 bg-gradient-pink-to-yellow rounded-[10px] text-white hover:text-white'
                    >
                      <User className='h-4 w-4' />
                      <span className='text-sm'>
                        {user.email?.split('@')[0]}
                      </span>
                      <ChevronDown className='h-4 w-4' />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className='w-56 border border-border/40 bg-background/95 backdrop-blur-xl'
                    align='end'
                  >
                    <DropdownMenuItem asChild>
                      <Link
                        to='/profile'
                        className='flex w-full cursor-pointer items-center gap-2'
                      >
                        <User className='h-4 w-4' />
                        Profile Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        to='/verification'
                        className='flex w-full cursor-pointer items-center gap-2'
                      >
                        <VerificationIcon className='h-4 w-4' />
                        Verification Center
                      </Link>
                    </DropdownMenuItem>
                    {isAdmin() && (
                      <DropdownMenuItem asChild>
                        <Link
                          to='/admin/dashboard'
                          className='flex w-full cursor-pointer items-center gap-2'
                        >
                          <Edit className='h-4 w-4' />
                          Admin Dashboard
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className='flex w-full cursor-pointer items-center gap-2 text-destructive focus:text-destructive'
                    >
                      <LogOut className='h-4 w-4' />
                      Sign Out
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
            <button
              onClick={() => setIsOpen(!isOpen)}
              className='p-1 text-muted-foreground hover:text-foreground'
            >
              {isOpen ? (
                <X className='h-5 w-5' />
              ) : (
                <Menu className='h-5 w-5' />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className='fixed inset-x-0 top-16 z-50 border-t border-border/40 bg-[#0c0715]/85 shadow-lg backdrop-blur-xl lg:hidden'>
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
                    <div className='px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
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
                    ))}

                    <div className='px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                      Account
                    </div>
                    <Link
                      to='/profile'
                      className='block truncate px-6 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground'
                      onClick={() => setIsOpen(false)}
                    >
                      Profile Settings
                    </Link>
                    <Link
                      to='/verification'
                      className='block truncate px-6 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground'
                      onClick={() => setIsOpen(false)}
                    >
                      Verification Center
                    </Link>
                    {isAdmin() && (
                      <Link
                        to='/admin/dashboard'
                        className='block truncate px-6 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground'
                        onClick={() => setIsOpen(false)}
                      >
                        Admin Dashboard
                      </Link>
                    )}
                  </>
                )}

                <div className='mt-2 space-y-2 border-t border-border/40 px-3 py-3'>
                  <div className='flex justify-center'>
                    <ThemeToggle />
                  </div>
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
  );
};

export default Navbar;
