import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  MessageSquare,
  FileText,
  Settings,
  BarChart3,
  Activity,
  Menu,
  X,
  LogOut,
  User,
  Building2,
  Share2,
  Table2,
  DollarSign,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';

interface AdminLayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Trading Accounts', href: '/admin/accounts', icon: CreditCard },
  {
    name: 'Overseas Companies',
    href: '/admin/overseas-companies',
    icon: Building2,
  },
  { name: 'Referrals', href: '/admin/referrals', icon: Share2 },
  {
    name: 'Deposit/Withdrawal Requests',
    href: '/admin/requests',
    icon: DollarSign,
  },
  {
    name: 'Contact Requests',
    href: '/admin/contact-requests',
    icon: MessageSquare,
  },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Audit Log', href: '/admin/audit-log', icon: Activity },
  { name: 'Blog Management', href: '/admin/blog', icon: FileText },
  { name: 'Categories', href: '/admin/blog-categories', icon: Table2 },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className='min-h-screen'>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className='fixed inset-0 z-40 bg-black/50 lg:hidden'
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Top bar */}
      <div className='sticky top-0 z-30 h-[80px] border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
        <div className='flex items-center justify-between px-6 py-4'>
          <Button
            variant='ghost'
            size='sm'
            className='lg:hidden'
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className='h-5 w-5' />
          </Button>

          <div className='flex items-center space-x-4'>
            <Link to='/'>
              <Button variant='ghost' size='sm'>
                Home
              </Button>
            </Link>
            <div className='hidden sm:block'>
              <h1 className='text-lg font-semibold'>
                {navigation.find(item => item.href === location.pathname)
                  ?.name || 'Admin'}
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-muted/30 bg-[#000] transition-transform duration-200 ease-in-out lg:fixed lg:inset-auto lg:top-[81px] lg:h-[calc(100vh-4rem)] lg:flex-shrink-0 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} `}
      >
        <div className='flex h-full flex-col'>
          {/* Header */}
          <div className='flex items-center justify-between border-b border-muted/30 p-6'>
            <div className='flex items-center space-x-2'>
              <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary'>
                <LayoutDashboard className='h-5 w-5 text-primary-foreground' />
              </div>
              <span className='text-lg font-semibold text-white'>
                Admin Panel
              </span>
            </div>
            <Button
              variant='ghost'
              size='sm'
              className='lg:hidden'
              onClick={() => setSidebarOpen(false)}
            >
              <X className='h-4 w-4' />
            </Button>
          </div>

          {/* Navigation */}
          <nav className='flex-1 space-y-2 p-4'>
            {navigation.map(item => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  } `}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className='h-4 w-4' />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className='mb-4 border-t border-muted/30 p-4'>
            <div className='flex items-center space-x-3 rounded-lg bg-muted/10 p-3'>
              <div className='flex h-8 w-8 items-center justify-center rounded-full bg-primary/20'>
                <User className='h-4 w-4 text-primary' />
              </div>
              <div className='min-w-0 flex-1'>
                <p className='truncate text-sm font-medium text-white'>
                  {user?.email}
                </p>
                <p className='text-xs text-muted-foreground'>Administrator</p>
              </div>
              <Button
                variant='ghost'
                size='sm'
                onClick={handleSignOut}
                className='text-muted-foreground hover:text-foreground'
              >
                <LogOut className='h-4 w-4' />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className='pink-yellow-shadow min-h-screen pt-10 lg:ml-64 lg:pt-16'>
        {/* Page content */}
        <main className='p-6 pt-0'>{children}</main>
      </div>
    </div>
  );
}
