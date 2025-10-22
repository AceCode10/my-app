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
} from "@/components/ui/sidebar"
import {
    LayoutDashboard, Users, Settings, ChevronDown, 
    LogOut, BookOpen, Edit, Layers, School
} from 'lucide-react';
import { useUser, useAuth } from '@/firebase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useRouter, usePathname } from 'next/navigation';
import withRole from '@/hooks/withRole';


const AdminSidebar = () => {
    const pathname = usePathname();

    const navItems = [
        { href: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard /> },
        { href: '/admin/dashboard/users', label: 'Manage Users', icon: <Users /> },
        { href: '/admin/dashboard/notes', label: 'Manage Notes', icon: <BookOpen /> },
        { href: '/admin/dashboard/quizzes', label: 'Manage Quizzes', icon: <Edit /> },
        { href: '/admin/dashboard/flashcards', label: 'Flashcard Decks', icon: <Layers /> },
        { href: '/admin/dashboard/classes', label: 'Manage Classes', icon: <School /> },
    ];

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                 <div className="text-2xl font-bold group-data-[collapsible=icon]:hidden">
                    IGCSE <span className="text-primary">Admin</span>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu>
                    {navItems.map(item => (
                        <SidebarMenuItem key={item.label}>
                            <SidebarMenuButton 
                                asChild
                                tooltip={item.label} 
                                isActive={
                                    item.href === '/admin/dashboard'
                                        ? pathname === item.href
                                        : pathname.startsWith(item.href)
                                }
                            >
                                <Link href={item.href}>
                                    {item.icon}
                                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                     <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Settings" isActive={pathname === '/admin/dashboard/settings'}>
                             <Link href="/admin/dashboard/settings">
                                <Settings />
                                <span className="group-data-[collapsible=icon]:hidden">Settings</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarContent>
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
                    <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
                        {children}
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}

export default withRole(AdminDashboardLayout, ['admin']);