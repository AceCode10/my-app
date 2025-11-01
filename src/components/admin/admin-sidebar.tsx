'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileText,
  BookOpen,
  Layers,
  Settings,
  BarChart3,
  Shield,
  FileQuestion,
  FolderTree,
  ScrollText,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminSidebarProps {
  adminRole: {
    code: string;
    name: string;
    permissions: string[];
  };
}

export default function AdminSidebar({ adminRole }: AdminSidebarProps) {
  const pathname = usePathname();
  const isSuperAdmin = adminRole.code === 'super_admin';
  const isContentModerator = adminRole.code === 'content_moderator';

  // Super Admin menu items
  const superAdminItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/users', label: 'User Management', icon: Users },
    { href: '/admin/content', label: 'Content Management', icon: FileText },
    { href: '/admin/settings', label: 'System Settings', icon: Settings },
    { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/admin/audit-logs', label: 'Audit Logs', icon: Activity },
  ];

  // Content Moderator menu items
  const contentModeratorItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      href: '/admin/content',
      label: 'Content',
      icon: FileText,
      children: [
        { href: '/admin/content/questions', label: 'Question Bank', icon: FileQuestion },
        { href: '/admin/content/past-papers', label: 'Past Papers', icon: ScrollText },
        { href: '/admin/content/flashcards', label: 'Flashcards', icon: Layers },
        { href: '/admin/content/subjects', label: 'Subjects & Topics', icon: FolderTree },
      ],
    },
    { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const menuItems = isSuperAdmin ? superAdminItems : contentModeratorItems;

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h2 className="font-bold text-lg">Admin Panel</h2>
            <p className="text-xs text-muted-foreground">{adminRole.name}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

          if ('children' in item && item.children) {
            return (
              <div key={item.href} className="space-y-1">
                <div
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium',
                    'text-muted-foreground hover:bg-muted'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
                <div className="ml-4 space-y-1">
                  {item.children.map((child) => {
                    const ChildIcon = child.icon;
                    const isChildActive = pathname === child.href;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm',
                          isChildActive
                            ? 'bg-primary text-primary-foreground font-medium'
                            : 'text-muted-foreground hover:bg-muted'
                        )}
                      >
                        <ChildIcon className="h-4 w-4" />
                        <span>{child.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Link
          href={isSuperAdmin ? '/teacher' : '/student'}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted"
        >
          <BookOpen className="h-4 w-4" />
          <span>Back to Main App</span>
        </Link>
      </div>
    </aside>
  );
}
