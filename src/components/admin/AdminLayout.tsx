import { ReactNode, useState, useEffect } from 'react';
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
  ChevronDown,
  ChevronRight,
  Folder,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';

interface AdminLayoutProps {
  children: ReactNode;
}

interface NavigationItem {
  name: string;
  href?: string;
  icon: any;
  subMenu?: Array<{ name: string; href: string; status: string }>;
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  {
    name: 'Users',
    href: '/admin/users',
    icon: Users,
    subMenu: [
      { name: 'Verified', href: '/admin/users?status=verified', status: 'verified' },
      { name: 'Pending', href: '/admin/users?status=pending_verification', status: 'pending_verification' },
      { name: 'Unverified', href: '/admin/users?status=unverified', status: 'unverified' },
      { name: 'Rejected', href: '/admin/users?status=rejected', status: 'rejected' },
      { name: 'Blocked', href: '/admin/users?status=blocked', status: 'blocked' },
    ],
  },
  { name: 'Trading Accounts', href: '/admin/accounts', icon: CreditCard },
  {
    name: 'Overseas Companies',
    href: '/admin/overseas-companies',
    icon: Building2,
    subMenu: [
      { name: 'Pending', href: '/admin/overseas-companies?status=pending', status: 'pending' },
      { name: 'Processing', href: '/admin/overseas-companies?status=processing', status: 'processing' },
      { name: 'Name Selected', href: '/admin/overseas-companies?status=name_selected', status: 'name_selected' },
      { name: 'Completed', href: '/admin/overseas-companies?status=completed', status: 'completed' },
      { name: 'Rejected', href: '/admin/overseas-companies?status=rejected', status: 'rejected' },
    ],
  },
  { name: 'Referrals', href: '/admin/referrals', icon: Share2 },
  {
    name: 'Deposit/Withdrawal Requests',
    href: '/admin/deposit-withdrawal-request',
    icon: DollarSign,
    subMenu: [
      { name: 'Pending', href: '/admin/deposit-withdrawal-request?status=pending', status: 'pending' },
      { name: 'Processing', href: '/admin/deposit-withdrawal-request?status=processing', status: 'processing' },
      { name: 'Completed', href: '/admin/deposit-withdrawal-request?status=completed', status: 'completed' },
      { name: 'Rejected', href: '/admin/deposit-withdrawal-request?status=rejected', status: 'rejected' },
    ],
  },
  {
    name: 'Contact Requests',
    href: '/admin/contact-requests',
    icon: MessageSquare,
    subMenu: [
      { name: 'Pending', href: '/admin/contact-requests?status=pending', status: 'pending' },
      { name: 'In Progress', href: '/admin/contact-requests?status=in_progress', status: 'in_progress' },
      { name: 'Resolved', href: '/admin/contact-requests?status=resolved', status: 'resolved' },
      { name: 'Closed', href: '/admin/contact-requests?status=closed', status: 'closed' },
    ],
  },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Audit Log', href: '/admin/audit-log', icon: Activity },
  { name: 'Blog Management', href: '/admin/blog', icon: FileText },
  { name: 'Categories', href: '/admin/blog-categories', icon: Table2 },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Start with all menus collapsed by default
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();

  const toggleMenu = (menuName: string) => {
    const newExpanded = new Set(expandedMenus);
    if (newExpanded.has(menuName)) {
      newExpanded.delete(menuName);
    } else {
      newExpanded.add(menuName);
    }
    setExpandedMenus(newExpanded);
  };

  // Close expanded menus when navigating to a different section
  useEffect(() => {
    // Find which menu (if any) the current location belongs to
    const currentMenu = navigation.find(item => {
      if (item.href && location.pathname === item.href) {
        return true;
      }
      // Check if it's a submenu item - must match both pathname and status
      if (item.subMenu) {
        return item.subMenu.some(
          subItem => {
            const subItemPath = subItem.href.split('?')[0];
            const subItemStatus = subItem.status;
            const currentPath = location.pathname;
            const currentStatus = new URLSearchParams(location.search).get('status');
            
            // Match if pathname matches AND status matches (if status is present)
            return currentPath === subItemPath && 
                   (!currentStatus || currentStatus === subItemStatus);
          }
        );
      }
      return false;
    });

    // If we're on a menu with submenus, keep it expanded
    // Otherwise, close all expanded menus
    if (currentMenu && currentMenu.subMenu) {
      // Keep this menu expanded
      if (!expandedMenus.has(currentMenu.name)) {
        setExpandedMenus(new Set([currentMenu.name]));
      }
    } else {
      // Close all expanded menus when navigating to a non-submenu section
      setExpandedMenus(new Set());
    }
  }, [location.pathname, location.search]);

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
          <nav className='flex-1 space-y-1 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent'>
            {navigation.map(item => {
              // Use exact match to prevent false positives (e.g., /admin/blog matching /admin/blog-categories)
              const isActive = location.pathname === item.href;
              const isExpanded = expandedMenus.has(item.name);
              const hasSubMenu = item.subMenu && item.subMenu.length > 0;
              
              // Check if any sub-menu item is active - must match both pathname and status
              const isSubMenuActive = item.subMenu?.some(
                subItem => {
                  const subItemPath = subItem.href.split('?')[0];
                  const subItemStatus = subItem.status;
                  const currentPath = location.pathname;
                  const currentStatus = new URLSearchParams(location.search).get('status');
                  
                  // Match if pathname matches AND status is present AND matches
                  // If no status parameter, none of the submenu items should be active
                  return currentPath === subItemPath && 
                         currentStatus !== null && 
                         currentStatus === subItemStatus;
                }
              );

              return (
                <div key={item.name}>
                  {hasSubMenu ? (
                    <>
                      <div className='flex items-center'>
                        <Link
                          to={item.href || '#'}
                          className={`flex-1 flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            isActive || isSubMenuActive
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <item.icon className='h-4 w-4' />
                          <span>{item.name}</span>
                        </Link>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            toggleMenu(item.name);
                          }}
                          className='p-1.5 rounded hover:bg-muted/20 text-[var(--yellowcolor)] hover:text-[var(--yellowcolor)] transition-colors flex items-center justify-center mr-[-10px]'
                          aria-label={isExpanded ? 'Collapse menu' : 'Expand menu'}
                        >
                          {isExpanded ? (
                            <ChevronDown className='h-4 w-4 text-[var(--yellowcolor)]' />
                          ) : (
                            <ChevronRight className='h-4 w-4 text-[var(--yellowcolor)]' />
                          )}
                        </button>
                      </div>
                      {isExpanded && item.subMenu && (
                        <div className='ml-4 mt-1 space-y-1'>
                          {item.subMenu.map((subItem) => {
                            // Check if submenu item is active - must match both pathname and status
                            const subItemPath = subItem.href.split('?')[0];
                            const subItemStatus = subItem.status;
                            const currentPath = location.pathname;
                            const currentStatus = new URLSearchParams(location.search).get('status');
                            
                            // Match if pathname matches AND status is present AND matches
                            // If no status parameter, none of the submenu items should be active
                            const isSubActive = currentPath === subItemPath && 
                                               currentStatus !== null && 
                                               currentStatus === subItemStatus;
                            
                            return (
                              <Link
                                key={subItem.name}
                                to={subItem.href}
                                className={`flex items-center space-x-2 rounded-lg px-3 py-2 text-sm  gap-0 transition-colors ${
                                  isSubActive
                                    ? 'bg-muted/10 text-primary'
                                    : 'text-muted-foreground hover:bg-muted/10 hover:text-white'
                                }`}
                                onClick={() => setSidebarOpen(false)}
                              >
                                <Folder className='h-3 w-3 ml-0 text-primary' />
                                <span className='ml-0'>{subItem.name}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      to={item.href || '#'}
                      className={`flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon className='h-4 w-4' />
                      <span>{item.name}</span>
                    </Link>
                  )}
                </div>
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
