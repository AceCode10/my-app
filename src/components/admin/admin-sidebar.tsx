'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
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
  Upload,
  Target,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface MenuItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: MenuItem[];
}

interface MenuGroup {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: MenuItem[];
  defaultOpen?: boolean;
}

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

  // Track which groups are open
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    main: true,
    content: true,
    system: false,
  });

  const toggleGroup = (group: string) => {
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  // Super Admin menu groups
  const superAdminGroups: MenuGroup[] = [
    {
      label: 'Main',
      icon: LayoutDashboard,
      defaultOpen: true,
      items: [
        { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/admin/users', label: 'User Management', icon: Users },
      ],
    },
    {
      label: 'Content Management',
      icon: FileText,
      defaultOpen: true,
      items: [
        { href: '/admin/content', label: 'All Content', icon: FileText },
        { href: '/admin/topical-questions', label: 'Topical Questions', icon: Target },
        { href: '/admin/papers', label: 'Past Papers', icon: ScrollText },
        { href: '/admin/bulk-import', label: 'Bulk Import', icon: Upload },
      ],
    },
    {
      label: 'System',
      icon: Settings,
      defaultOpen: false,
      items: [
        { href: '/admin/settings', label: 'System Settings', icon: Settings },
        { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
        { href: '/admin/audit-logs', label: 'Audit Logs', icon: Activity },
      ],
    },
  ];

  // Content Moderator menu groups
  const contentModeratorGroups: MenuGroup[] = [
    {
      label: 'Main',
      icon: LayoutDashboard,
      defaultOpen: true,
      items: [
        { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      label: 'Content Management',
      icon: FileText,
      defaultOpen: true,
      items: [
        { href: '/admin/topical-questions', label: 'Topical Questions', icon: Target },
        { href: '/admin/papers', label: 'Past Papers', icon: ScrollText },
        { href: '/admin/content/flashcards', label: 'Flashcards', icon: Layers },
        { href: '/admin/content/subjects', label: 'Subjects & Topics', icon: FolderTree },
        { href: '/admin/bulk-import', label: 'Bulk Import', icon: Upload },
      ],
    },
    {
      label: 'Reports',
      icon: BarChart3,
      defaultOpen: false,
      items: [
        { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
      ],
    },
  ];

  const menuGroups = isSuperAdmin ? superAdminGroups : contentModeratorGroups;

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
      <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
        {menuGroups.map((group) => {
          const GroupIcon = group.icon;
          const isGroupOpen = openGroups[group.label.toLowerCase().replace(/\s+/g, '-')] ?? group.defaultOpen;
          const hasActiveItem = group.items.some(
            item => pathname === item.href || pathname.startsWith(item.href + '/')
          );

          return (
            <Collapsible
              key={group.label}
              open={isGroupOpen}
              onOpenChange={() => toggleGroup(group.label.toLowerCase().replace(/\s+/g, '-'))}
            >
              <CollapsibleTrigger className="w-full">
                <div
                  className={cn(
                    'flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    'text-muted-foreground hover:bg-muted',
                    hasActiveItem && 'text-foreground'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <GroupIcon className="h-4 w-4" />
                    <span>{group.label}</span>
                  </div>
                  <ChevronDown 
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      isGroupOpen && "rotate-180"
                    )} 
                  />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1 space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 ml-2 rounded-lg text-sm transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground font-medium'
                          : 'text-muted-foreground hover:bg-muted'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
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
