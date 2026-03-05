'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { useClasses } from '@/hooks/use-classes';
import { cn } from '@/lib/utils';
import { KodiLoadingGif } from '@/components/ui/kodi-loading-gif';
import { IGALogoIcon } from '@/components/ui/iga-logo';
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
    { href: '/teacher/submissions', label: 'Submissions', icon: ClipboardCheck, badgeKey: 'pendingReviews' as const },
    { href: '/teacher/analytics', label: 'Analytics', icon: BarChart3 },
];

function TeacherDashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, loading, refresh } = useUser();
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
    const sessionCheckDone = useRef(false);
    const { classes } = useClasses();
    const [pendingReviews, setPendingReviews] = useState(0);

    const classIds = useMemo(() => classes?.map(c => c.id) || [], [classes]);

    // Fetch pending reviews count for sidebar badge
    useEffect(() => {
        if (!user?.id || classIds.length === 0) return;
        supabase
            .from('assessment_attempts')
            .select('*', { count: 'exact', head: true })
            .in('class_id', classIds)
            .eq('status', 'submitted')
            .eq('review_status', 'pending')
            .then(({ count }: { count: number | null }) => {
                setPendingReviews(count || 0);
            });
    }, [user?.id, classIds, supabase]);

    const badgeCounts: Record<string, number> = { pendingReviews };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('teacher-sidebar-collapsed', String(sidebarCollapsed));
        }
    }, [sidebarCollapsed]);

    // Safety net: if loading finishes but user is null, do one getUser() check
    useEffect(() => {
        if (!loading && !user && !sessionCheckDone.current) {
            sessionCheckDone.current = true;
            supabase.auth.getUser().then((result: { data: { user: any }; error: { message: string } | null }) => {
                if (result.data.user && !result.error) {
                    refresh?.(result.data.user.id);
                }
            }).catch(() => {});
        }
    }, [loading, user, supabase, refresh]);

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

    // Show centered login prompt when user is not authenticated
    if (!user) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="text-center p-8 bg-card rounded-xl border shadow-lg max-w-md mx-4">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <LogOut className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="text-xl font-semibold mb-2">Please log in </h2>
                    <p className="text-muted-foreground mb-6">.</p>
                    <Button asChild size="lg" className="w-full">
                        <Link href="/login?plan=teacher">Go to Login</Link>
                    </Button>
                </div>
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
                            <Link href="/teacher" className="flex items-center justify-center w-full">
                                <div className="w-12 h-12 flex-shrink-0">
                                    <IGALogoIcon size="lg" />
                                </div>
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
                                const badgeCount = (item as any).badgeKey ? badgeCounts[(item as any).badgeKey] || 0 : 0;
                                
                                const linkContent = (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setSidebarOpen(false)}
                                        className={cn(
                                            'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors relative',
                                            sidebarCollapsed ? 'justify-center' : 'space-x-3',
                                            isActive
                                                ? 'bg-primary text-primary-foreground'
                                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                        )}
                                    >
                                        <Icon className="h-5 w-5 flex-shrink-0" />
                                        {!sidebarCollapsed && <span className="flex-1">{item.label}</span>}
                                        {badgeCount > 0 && !sidebarCollapsed && (
                                            <span className={cn(
                                                'ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded-full min-w-[18px] text-center',
                                                isActive ? 'bg-primary-foreground text-primary' : 'bg-destructive text-destructive-foreground'
                                            )}>
                                                {badgeCount > 99 ? '99+' : badgeCount}
                                            </span>
                                        )}
                                        {badgeCount > 0 && sidebarCollapsed && (
                                            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-card" />
                                        )}
                                    </Link>
                                );

                                if (sidebarCollapsed) {
                                    return (
                                        <Tooltip key={item.href} delayDuration={0}>
                                            <TooltipTrigger asChild>
                                                {linkContent}
                                            </TooltipTrigger>
                                            <TooltipContent side="right">
                                                <p>{item.label}{badgeCount > 0 ? ` (${badgeCount})` : ''}</p>
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
                                            <p className="text-xs text-muted-foreground">Teacher</p>
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
                {/* Mobile Header - Hide notification bell on test-builder page */}
                <header className="lg:hidden flex items-center justify-between h-16 px-4 border-b bg-card">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 rounded-md hover:bg-muted"
                    >
                        <Menu className="h-6 w-6" />
                    </button>
                    <h1 className="text-lg font-semibold">IGA Prep</h1>
                    {!pathname.includes('/test-builder') && <NotificationBell />}
                    {pathname.includes('/test-builder') && <div className="w-10" />}
                </header>

                {/* Desktop Header - Hide on test-builder page for more space */}
                {!pathname.includes('/test-builder') && (
                    <header className="hidden lg:flex items-center justify-end h-14 px-6 border-b bg-card">
                        <NotificationBell />
                    </header>
                )}

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
