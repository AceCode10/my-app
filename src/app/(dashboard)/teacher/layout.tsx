'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
    LayoutDashboard, Users, BarChart3, Edit, Settings,
    LogOut, BookOpen, Layers, ClipboardCheck, FileText, Hammer, Menu, X, GraduationCap,
    ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/notification-bell';
import withRole from '@/hooks/withRole';
import { cn } from '@/lib/utils';
import { KodiLoadingGif } from '@/components/ui/kodi-loading-gif';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const navItems = [
    { href: '/teacher', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/teacher/classes', label: 'My Classes', icon: Users },
    { href: '/teacher/subjects', label: 'Subjects', icon: GraduationCap },
    { href: '/teacher/test-builder', label: 'Test Builder', icon: Hammer },
    { href: '/teacher/tests', label: 'My Tests', icon: FileText },
    { href: '/teacher/submissions', label: 'Submissions', icon: ClipboardCheck },
    { href: '/teacher/analytics', label: 'Analytics', icon: BarChart3 },
];

function TeacherDashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useUser();
    const router = useRouter();
    const pathname = usePathname();
    const supabase = createClient();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('teacher-sidebar-collapsed');
            return stored === 'true';
        }
        return false;
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('teacher-sidebar-collapsed', String(sidebarCollapsed));
        }
    }, [sidebarCollapsed]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <KodiLoadingGif />
            </div>
        );
    }

    const username = user?.display_name || user?.email || 'Teacher';

    return (
        <TooltipProvider>
            <div className="flex h-screen bg-background">
                {/* Sidebar */}
                <aside
                    className={cn(
                        'fixed inset-y-0 left-0 z-50 bg-card border-r transform transition-all duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
                        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
                        sidebarCollapsed ? 'w-20' : 'w-64'
                    )}
                >
                    <div className="flex flex-col h-full">
                        {/* Logo */}
                        <div className="flex items-center justify-between h-16 px-4 border-b">
                            <Link href="/teacher" className="flex items-center space-x-2 min-w-0">
                                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                                    <span className="text-primary-foreground font-bold text-sm">IGA</span>
                                </div>
                                {!sidebarCollapsed && (
                                    <div className="min-w-0">
                                        <h1 className="text-sm font-bold text-foreground truncate">IGA Prep</h1>
                                        <p className="text-xs text-muted-foreground">Teacher</p>
                                    </div>
                                )}
                            </Link>
                            <button
                                onClick={() => setSidebarOpen(false)}
                                className="lg:hidden p-2 rounded-md hover:bg-muted flex-shrink-0"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Collapse Toggle Button - Desktop only */}
                        <div className="hidden lg:flex justify-end px-2 py-2 border-b">
                            <button
                                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                                className="p-1.5 rounded-md hover:bg-muted transition-colors"
                                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            >
                                {sidebarCollapsed ? (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                                )}
                            </button>
                        </div>

                        {/* Navigation */}
                        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href || (item.href !== '/teacher' && pathname.startsWith(item.href));
                                
                                const linkContent = (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setSidebarOpen(false)}
                                        className={cn(
                                            'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                                            sidebarCollapsed ? 'justify-center' : 'space-x-3',
                                            isActive
                                                ? 'bg-primary text-primary-foreground'
                                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                        )}
                                    >
                                        <Icon className="h-5 w-5 flex-shrink-0" />
                                        {!sidebarCollapsed && <span>{item.label}</span>}
                                    </Link>
                                );

                                if (sidebarCollapsed) {
                                    return (
                                        <Tooltip key={item.href} delayDuration={0}>
                                            <TooltipTrigger asChild>
                                                {linkContent}
                                            </TooltipTrigger>
                                            <TooltipContent side="right">
                                                <p>{item.label}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                }

                                return linkContent;
                            })}
                        </nav>

                        {/* Footer with Settings */}
                        <div className="p-2 border-t space-y-1">
                            {sidebarCollapsed ? (
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <Link
                                            href="/teacher/settings"
                                            onClick={() => setSidebarOpen(false)}
                                            className={cn(
                                                'flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                                                pathname === '/teacher/settings'
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                            )}
                                        >
                                            <Settings className="h-5 w-5" />
                                        </Link>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                        <p>Settings</p>
                                    </TooltipContent>
                                </Tooltip>
                            ) : (
                                <Link
                                    href="/teacher/settings"
                                    onClick={() => setSidebarOpen(false)}
                                    className={cn(
                                        'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                                        pathname === '/teacher/settings'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    )}
                                >
                                    <Settings className="h-5 w-5" />
                                    <span>Settings</span>
                                </Link>
                            )}
                            
                            {!sidebarCollapsed && (
                                <>
                                    <div className="flex items-center space-x-3 px-3 py-2">
                                        <img 
                                            className="h-10 w-10 rounded-full object-cover flex-shrink-0" 
                                            src={user?.avatar_url || `https://placehold.co/100x100/3b82f6/ffffff?text=${username.charAt(0)}`} 
                                            alt="User avatar" 
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">{username}</p>
                                            <p className="text-xs text-muted-foreground">Teacher Account</p>
                                        </div>
                                    </div>
                                    <Button onClick={handleLogout} variant="outline" size="sm" className="w-full">
                                        <LogOut className="mr-2 h-4 w-4" />
                                        Logout
                                    </Button>
                                </>
                            )}
                            
                            {sidebarCollapsed && (
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:bg-muted hover:text-foreground"
                                        >
                                            <LogOut className="h-5 w-5" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                        <p>Logout</p>
                                    </TooltipContent>
                                </Tooltip>
                            )}
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
                    <h1 className="text-lg font-semibold">IGA Prep</h1>
                    <NotificationBell />
                </header>

                {/* Desktop Header */}
                <header className="hidden lg:flex items-center justify-end h-14 px-6 border-b bg-card">
                    <NotificationBell />
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
        </TooltipProvider>
    );
}

export default withRole(TeacherDashboardLayout, ['teacher', 'admin']);
