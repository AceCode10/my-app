'use client';

import React from 'react';
import Link from 'next/link';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
} from "@/components/ui/sidebar"
import {
    LayoutDashboard, Users, Settings, ChevronDown, 
    LogOut, BookOpen, Edit, Layers, School, BarChart3 as AnalyticsIcon, ShieldAlert, Image as ImageIcon, PanelLeft,
} from 'lucide-react';
import { useUser, useAuth, useSidebar } from '@/firebase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useRouter, usePathname } from 'next/navigation';
import withRole from '@/hooks/withRole';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';


const AdminSidebar = () => {
    const pathname = usePathname();
    const { state } = useSidebar();

    const navItems = [
        { href: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard /> },
        { href: '/admin/dashboard/analytics', label: 'Analytics', icon: <AnalyticsIcon /> },
        { href: '/admin/dashboard/users', label: 'Manage Users', icon: <Users /> },
        { href: '/admin/dashboard/notes', label: 'Manage Notes', icon: <BookOpen /> },
        { href: '/admin/dashboard/quizzes', label: 'Manage Quizzes', icon: <Edit /> },
        { href: '/admin/dashboard/flashcards', label: 'Flashcard Decks', icon: <Layers /> },
        { href: '/admin/dashboard/classes', label: 'Manage Classes', icon: <School /> },
        { href: '/admin/dashboard/media', label: 'Media Library', icon: <ImageIcon />, disabled: true },
        { href: '/admin/dashboard/reports', label: 'Moderation', icon: <ShieldAlert />, disabled: true },
    ];

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="flex items-center justify-between">
                 <div className={cn("text-2xl font-bold", state === 'collapsed' && 'hidden')}>
                    IGCSE <span className="text-primary">Admin</span>
                </div>
                <SidebarTrigger>
                    <Button variant="ghost" size="icon" className="p-2 md:flex group-data-[collapsible=icon]:hidden">
                        <PanelLeft className="h-5 w-5"/>
                        <span className="sr-only">Toggle Sidebar</span>
                    </Button>
                </SidebarTrigger>
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu>
                    {navItems.map(item => (
                        <SidebarMenuItem key={item.label}>
                             <Link href={item.href}>
                                <SidebarMenuButton 
                                    tooltip={item.label} 
                                    disabled={item.disabled}
                                    isActive={
                                        item.href === '/admin/dashboard'
                                            ? pathname === item.href
                                            : pathname.startsWith(item.href)
                                    }
                                >
                                    {item.icon}
                                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                                </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <Link href="/admin/dashboard/settings">
                            <SidebarMenuButton tooltip="Settings" isActive={pathname === '/admin/dashboard/settings'}>
                                <Settings />
                                <span className="group-data-[collapsible=icon]:hidden">Settings</span>
                            </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
};

const AdminHeader = () => {
    const { user, profile } = useUser();
    const auth = useAuth();
    const username = profile?.displayName || user?.displayName || 'Admin';
    const router = useRouter();

    const handleLogout = async () => {
        if (!auth) return;
        await auth.signOut();
        router.push('/');
    };

    return (
        <header className="h-16 bg-background border-b flex items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="md:hidden" />
            </div>
            <div className="flex items-center space-x-2 sm:space-x-5">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <div className="flex items-center space-x-3 cursor-pointer">
                            <img className="h-10 w-10 rounded-full object-cover" data-ai-hint="avatar" src={profile?.photoURL || `https://placehold.co/100x100/dc2626/ffffff?text=${username.charAt(0)}`} alt="Admin avatar" />
                            <div className="hidden sm:block">
                                <p className="text-sm font-semibold text-foreground">{username}</p>
                                <p className="text-xs text-primary font-medium">
                                    Admin Role
                                </p>
                            </div>
                            <ChevronDown className="h-5 w-5 text-muted-foreground hidden sm:block" />
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                        <DropdownMenuItem asChild>
                             <Link href="/dashboard" className="flex items-center w-full">
                                <LayoutDashboard className="mr-2 h-4 w-4" />
                                <span>View as Student</span>
                            </Link>
                        </DropdownMenuItem>
                         <DropdownMenuItem asChild>
                             <Link href="/teacher/dashboard" className="flex items-center w-full">
                                <LayoutDashboard className="mr-2 h-4 w-4" />
                                <span>View as Teacher</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href="/admin/dashboard/settings" className="flex items-center w-full">
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Settings</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
};


function AdminDashboardLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
        <SidebarProvider>
            <div className="flex h-screen bg-muted/50 font-sans">
                <AdminSidebar />
                <div className="flex-1 flex flex-col">
                    <AdminHeader />
                    <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto w-full">
                        {children}
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}

export default withRole(AdminDashboardLayout, ['admin']);

    