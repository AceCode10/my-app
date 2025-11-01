

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard, BookCopy, BarChart3, Trophy, Users, Settings, ChevronDown, 
    LogOut, Filter, Search, PanelLeft,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';
import { NotificationBell, Notification } from '@/components/notification-bell';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KodiAssistant } from '@/components/kodi-assistant';
import { cn } from '@/lib/utils';


const mockStudentNotifications: Notification[] = [
  { id: 1, type: 'streak', message: 'You are on a 3-day streak! Keep it up.', timestamp: '2h ago', read: false },
  { id: 2, type: 'approval', message: 'Your request to join Grade 10 - Core Mathematics has been approved!', timestamp: '5h ago', read: false },
  { id: 3, type: 'submission', message: 'Your Biology quiz has been graded.', timestamp: '1d ago', read: false },
  { id: 4, type: 'badge', message: 'New Badge Unlocked: "Science Whiz"!', timestamp: '3d ago', read: true },
];


const navItems = [
    { href: '/student', label: 'Dashboard', icon: <LayoutDashboard /> },
    { href: '/student/subjects', label: 'Subjects', icon: <BookCopy /> },
    { href: '/student/classes', label: 'My Classes', icon: <Users /> },
    { href: '/student/progress', label: 'Progress', icon: <BarChart3 /> },
    { href: '/student/leaderboard', label: 'Leaderboard', icon: <Trophy /> },
];

const searchItems = [
    { name: 'Maths', category: 'subjects', path: '/student/subjects' },
    { name: 'Physics', category: 'subjects', path: '/student/subjects' },
    { name: 'ICT', category: 'subjects', path: '/student/subjects' },
    { name: 'Algebra Quiz', category: 'quizzes', path: '/subjects/maths' },
    { name: 'Forces Flashcards', category: 'flashcards', path: '/subjects/physics' },
];

const AppSidebar = () => {
    const pathname = usePathname();
    const { user } = useUser();
    const isSubscribed = user?.subscription_tier === 'pro' || user?.subscription_tier === 'essential';

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="flex items-center justify-between">
                 <div className="text-2xl font-bold">
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
                                    isActive={pathname === item.href || (item.href !== '/student' && pathname.startsWith(item.href))}
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
                        <Link href="/student/settings">
                            <SidebarMenuButton tooltip="Settings" isActive={pathname === '/student/settings'}>
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
  const { user, loading } = useUser();
  const supabase = createClient();
  const router = useRouter();
  const username = user?.display_name || user?.email || 'Learner';
  const isSubscribed = user?.subscription_tier === 'pro' || user?.subscription_tier === 'essential';
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
                    placeholder="Search for anything..." 
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
                            <DropdownMenuRadioItem value="subjects">Subjects</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="quizzes">Quizzes</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="flashcards">Flashcards</DropdownMenuRadioItem>
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
        <div className="flex justify-end items-center space-x-2 sm:space-x-5 md:w-1/3">
          {!isSubscribed && (
            <Button asChild size="sm">
                <Link href="/pricing">Upgrade</Link>
            </Button>
          )}
          <NotificationBell initialNotifications={mockStudentNotifications} />
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <div className="flex items-center space-x-3 cursor-pointer">
                      <img className="h-10 w-10 rounded-full object-cover" data-ai-hint="avatar" src={user?.avatar_url || `https://placehold.co/100x100/00bf8f/ffffff?text=${username.charAt(0)}`} alt="User avatar" />
                      <div className="hidden sm:block">
                          <p className="text-sm font-semibold text-foreground">{username}</p>
                          <p className="text-xs text-muted-foreground">{isSubscribed ? 'Pro Plan' : 'Basic Plan'}</p>
                      </div>
                      <ChevronDown className="h-5 w-5 text-muted-foreground hidden sm:block" />
                  </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48">
                  <DropdownMenuItem>
                    <Link href="/student/settings" className="flex items-center">
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


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-screen bg-muted/50 font-sans">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <AppHeader />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto w-full">
            {children}
          </main>
          <KodiAssistant />
        </div>
      </div>
    </SidebarProvider>
  );
}
