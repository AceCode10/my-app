

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
    LayoutDashboard, Users, BarChart3, Edit, Settings, ChevronDown, 
    LogOut, Filter, Search, BookOpen, Layers, PanelLeft,
} from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { useSidebar } from '@/components/ui/sidebar';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { useRouter, usePathname } from 'next/navigation';
import { NotificationBell, Notification } from '@/components/notification-bell';
import { Input } from '@/components/ui/input';
import withRole from '@/hooks/withRole';
import { cn } from '@/lib/utils';

const searchItems = [
    { name: 'Alice Johnson', category: 'students', path: '#' },
    { name: 'Grade 10 - Core Mathematics', category: 'classes', path: '/teacher/classes' },
    { name: 'Algebra Fundamentals Quiz', category: 'assessments', path: '/teacher/assessments' },
    { name: 'Bob Williams', category: 'students', path: '#' },
    { name: 'Grade 11 - Physics', category: 'classes', path: '/teacher/classes' },
];

const AppSidebar = () => {
    const pathname = usePathname();
    const { state } = useSidebar();

    const navItems = [
        { href: '/teacher', label: 'Dashboard', icon: <LayoutDashboard /> },
        { href: '/teacher/classes', label: 'My Classes', icon: <Users /> },
        { href: '/teacher/notes', label: 'My Notes', icon: <BookOpen /> },
        { href: '/teacher/assessments', label: 'Assessments', icon: <Edit /> },
        { href: '/teacher/flashcards', label: 'Flashcards', icon: <Layers /> },
        { href: '/teacher/analytics', label: 'Analytics', icon: <BarChart3 /> },
    ];

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="flex items-center justify-between">
                 <div className={cn("text-2xl font-bold", state === 'collapsed' && 'hidden')}>
                    IGCSE <span className="text-primary">Simplified</span>
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
                                    isActive={
                                        item.href === '/teacher/dashboard' 
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
                        <Link href="/teacher/settings">
                             <SidebarMenuButton tooltip="Settings" isActive={pathname === '/teacher/settings'}>
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

const AppHeader = () => {
    const { user } = useUser();
    const supabase = createClient();
    const username = user?.display_name || 'Teacher';
    const router = useRouter();
    const [filter, setFilter] = React.useState('all');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [filteredItems, setFilteredItems] = React.useState(searchItems);

    React.useEffect(() => {
        const results = searchItems.filter(item => {
            const queryMatch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
            const filterMatch = filter === 'all' || item.category === filter;
            return queryMatch && filterMatch;
        });
        setFilteredItems(results);
    }, [searchQuery, filter]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (filteredItems.length > 0) {
            router.push(filteredItems[0].path);
        }
      };

    return (
        <header className="h-16 bg-background border-b flex items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-2 md:w-1/3">
                <SidebarTrigger className="md:hidden" />
            </div>
            <div className="w-full md:w-1/3 flex justify-center">
                 <form onSubmit={handleSearchSubmit} className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input 
                        placeholder="Search students, classes..." 
                        className="pl-10" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8">
                                <Filter className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Filter by</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioGroup value={filter} onValueChange={setFilter}>
                                <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="students">Students</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="classes">Classes</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="assessments">Assessments</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                     {searchQuery && (
                        <div className="absolute mt-1 w-full rounded-md bg-background shadow-lg z-10 border">
                            <ul>
                                {filteredItems.length > 0 ? filteredItems.map(item => (
                                    <li key={item.name}>
                                        <Link href={item.path} className="block px-4 py-2 text-sm text-foreground hover:bg-muted">
                                            {item.name} <span className="text-xs text-muted-foreground">in {item.category}</span>
                                        </Link>
                                    </li>
                                )) : (
                                    <li className="px-4 py-2 text-sm text-muted-foreground">No results found.</li>
                                )}
                            </ul>
                        </div>
                    )}
                </form>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-5 justify-end w-1/3">
                <NotificationBell />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <div className="flex items-center space-x-3 cursor-pointer">
                            <img className="h-10 w-10 rounded-full object-cover" data-ai-hint="avatar" src={user?.avatar_url || `https://placehold.co/100x100/3b82f6/ffffff?text=${username.charAt(0)}`} alt="Teacher avatar" />
                            <div className="hidden sm:block">
                                <p className="text-sm font-semibold text-foreground">{username}</p>
                                <p className="text-xs text-muted-foreground">
                                    Teacher Account
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
                            <Link href="/teacher/settings" className="flex items-center w-full">
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

function TeacherDashboardLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {

    return (
        <SidebarProvider>
            <div className="flex h-screen bg-muted/50 font-sans">
                <AppSidebar />
                <div className="flex-1 flex flex-col">
                    <AppHeader />
                    <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
                        {children}
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}


export default withRole(TeacherDashboardLayout, ['teacher', 'admin']);
