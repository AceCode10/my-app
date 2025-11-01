'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FileQuestion,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  BarChart3,
  ClipboardList,
  Upload,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: ('super_admin' | 'content_moderator')[];
}

const navigation: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    roles: ['super_admin', 'content_moderator']
  },
  {
    label: 'Subjects & Topics',
    href: '/admin/subjects',
    icon: BookOpen,
    roles: ['super_admin', 'content_moderator']
  },
  {
    label: 'Question Bank',
    href: '/admin/questions',
    icon: FileQuestion,
    roles: ['super_admin', 'content_moderator']
  },
  {
    label: 'Past Papers',
    href: '/admin/papers',
    icon: FileText,
    roles: ['super_admin', 'content_moderator']
  },
  {
    label: 'Bulk Import',
    href: '/admin/import',
    icon: Upload,
    roles: ['super_admin', 'content_moderator']
  },
  {
    label: 'Approvals',
    href: '/admin/approvals',
    icon: ClipboardList,
    roles: ['super_admin', 'content_moderator']
  },
  {
    label: 'Users',
    href: '/admin/users',
    icon: Users,
    roles: ['super_admin']
  },
  {
    label: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
    roles: ['super_admin']
  },
  {
    label: 'Audit Logs',
    href: '/admin/audit-logs',
    icon: Shield,
    roles: ['super_admin']
  },
  {
    label: 'Settings',
    href: '/admin/settings',
    icon: Settings,
    roles: ['super_admin']
  }
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=' + encodeURIComponent(pathname));
    } else if (!loading && user) {
      // Check if user has admin access
      if (user.role !== 'super_admin' && user.role !== 'content_moderator') {
        router.push('/unauthorized');
      }
    }
  }, [user, loading, router, pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <p className="text-muted-foreground animate-pulse">Loading...</p>
      </div>
    );
  }

  if (!user || (user.role !== 'super_admin' && user.role !== 'content_moderator')) {
    return null;
  }

  const userRole = user.role;
  const filteredNavigation = navigation.filter(item => item.roles.includes(userRole));

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b">
            <Link href="/admin" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">IS</span>
              </div>
              <div>
                <h1 className="text-sm font-bold text-foreground">IGCSE Simplified</h1>
                <p className="text-xs text-muted-foreground">Admin Panel</p>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-md hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t">
            <div className="flex items-center space-x-3 mb-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.avatar_url || undefined} alt={user.display_name || 'Admin'} />
                <AvatarFallback>
                  {(user.display_name || user.email || 'A').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user.display_name || user.email}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {userRole === 'super_admin' ? 'Super Admin' : 'Content Moderator'}
                </p>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between h-16 px-4 border-b bg-card">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md hover:bg-muted"
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold">Admin Panel</h1>
          <div className="w-10" /> {/* Spacer for centering */}
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
