
'use client'
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Menu, Search, ChevronDown, BookOpen, Layers, FileText, Target, User, LogOut, LayoutDashboard, Sparkles } from "lucide-react";
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-user';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { allSubjects } from '@/lib/subjects';
import { cn } from '@/lib/utils';


const NavLink = ({ href, children }: { href: string, children: React.ReactNode }) => (
    <Link href={href} className="text-sm font-medium text-muted-foreground hover:text-primary px-3 py-2 rounded-md transition-colors">
      {children}
    </Link>
  );

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isClient, setIsClient] = useState(false);
    const router = useRouter();
    const { user, loading: userLoading } = useUser();

    useEffect(() => {
        setIsClient(true);
    }, []);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const filteredSubjects = allSubjects.filter(subject =>
            subject.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (filteredSubjects.length > 0) {
            router.push(`/subjects/${filteredSubjects[0].slug}`);
        }
    };

    const filteredSubjects = searchQuery ? allSubjects.filter(subject =>
        subject.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) : [];

  return (
    <div className="bg-background text-foreground flex flex-col min-h-screen">
        <header className="bg-background/80 backdrop-blur-lg sticky top-0 z-50 border-b">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex-shrink-0">
                        <Link href="/" className="text-2xl font-bold text-foreground">IGA<span className="text-primary">Prep</span></Link>
                    </div>
                    <nav className="hidden md:flex items-center space-x-1">
                        {isClient && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="group inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary px-3 py-2 rounded-md transition-colors focus:outline-none">
                                        <span>Resources</span>
                                        <ChevronDown className="ml-1 h-4 w-4 text-muted-foreground group-hover:text-primary transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56">
                                    <DropdownMenuItem asChild>
                                        <Link href="/resources/topical-questions" className="font-medium">
                                            <Target className="mr-2 h-4 w-4 text-primary" />
                                            <span>Topical Questions</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href="/resources/past-papers">
                                            <FileText className="mr-2 h-4 w-4" />
                                            <span>Past Papers</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href="/resources/revision-notes">
                                            <BookOpen className="mr-2 h-4 w-4" />
                                            <span>Revision Notes</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href="/resources/quizzes">
                                            <Layers className="mr-2 h-4 w-4" />
                                            <span>Quizzes</span>
                                        </Link>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        <NavLink href="/pricing">Pricing</NavLink>
                        <form onSubmit={handleSearchSubmit} className="relative w-full max-w-xs ml-4">
                            <label htmlFor="search" className="sr-only">Search</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                                </div>
                                <input
                                    id="search"
                                    name="search"
                                    className="block w-full pl-10 pr-3 py-2 border border-border rounded-md leading-5 bg-background placeholder-muted-foreground focus:outline-none focus:placeholder-muted-foreground/70 focus:ring-1 focus:ring-ring focus:border-ring sm:text-sm"
                                    placeholder="Search for a subject"
                                    type="search"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            {searchQuery && filteredSubjects.length > 0 && (
                                <div className="absolute mt-1 w-full rounded-md bg-background shadow-lg z-10 border">
                                    <ul>
                                        {filteredSubjects.map(subject => (
                                            <li key={subject.slug}>
                                                <Link href={`/subjects/${subject.slug}`} className="block px-4 py-2 text-sm text-foreground hover:bg-muted">
                                                    {subject.name}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </form>
                    </nav>
                    <div className="hidden md:flex items-center space-x-2">
                        {userLoading ? (
                            <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                        ) : user ? (
                            <>
                                {/* Upgrade Button - show for non-premium users */}
                                {user.subscription_tier === 'free' && (
                                    <Button asChild className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold">
                                        <Link href="/pricing">
                                            <Sparkles className="w-4 h-4 mr-1" />
                                            Upgrade
                                        </Link>
                                    </Button>
                                )}
                                {/* Avatar with Dropdown */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Avatar className="h-10 w-10 cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                                            <AvatarImage src={user.avatar_url || undefined} alt={user.display_name || 'User'} />
                                            <AvatarFallback className="bg-primary text-primary-foreground">
                                                {(user.display_name || user.email || 'U').charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuItem asChild>
                                            <Link href={user.role === 'teacher' ? '/teacher' : user.role === 'super_admin' || user.role === 'content_moderator' ? '/admin' : '/student'} className="cursor-pointer">
                                                <LayoutDashboard className="mr-2 h-4 w-4" />
                                                Dashboard
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                            onClick={async () => {
                                                const { createClient } = await import('@/lib/supabase/client');
                                                const supabase = createClient();
                                                await supabase.auth.signOut();
                                                router.push('/');
                                                router.refresh();
                                            }}
                                            className="cursor-pointer text-destructive focus:text-destructive"
                                        >
                                            <LogOut className="mr-2 h-4 w-4" />
                                            Logout
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </>
                        ) : (
                            <>
                                <Button asChild variant="ghost">
                                    <Link href="/login">Log In</Link>
                                </Button>
                                <Button asChild>
                                    <Link href="/signup">Get Started</Link>
                                </Button>
                            </>
                        )}
                    </div>
                    <div className="md:hidden">
                        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 rounded-md text-muted-foreground hover:bg-muted">
                            <Menu className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>
            {isMobileMenuOpen && (
                <div className="md:hidden border-t">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        <Link href="/resources/topical-questions" className="block px-3 py-2 rounded-md text-base font-medium text-primary hover:text-primary-foreground hover:bg-primary">⭐ Topical Questions</Link>
                        <Link href="/resources/past-papers" className="block px-3 py-2 rounded-md text-base font-medium text-foreground hover:text-primary-foreground hover:bg-primary">Past Papers</Link>
                        <Link href="/resources/revision-notes" className="block px-3 py-2 rounded-md text-base font-medium text-foreground hover:text-primary-foreground hover:bg-primary">Revision Notes</Link>
                        <Link href="/resources/quizzes" className="block px-3 py-2 rounded-md text-base font-medium text-foreground hover:text-primary-foreground hover:bg-primary">Quizzes</Link>
                        <Link href="/pricing" className="block px-3 py-2 rounded-md text-base font-medium text-foreground hover:text-primary-foreground hover:bg-primary">Pricing</Link>
                        <Link href="/teacher" className="block px-3 py-2 rounded-md text-base font-medium text-foreground hover:text-primary-foreground hover:bg-primary">For Teachers</Link>
                        <Link href="/faq" className="block px-3 py-2 rounded-md text-base font-medium text-foreground hover:text-primary-foreground hover:bg-primary">FAQ</Link>
                    </div>
                    <div className="pt-4 pb-3 border-t">
                        <div className="px-5">
                            {user ? (
                                <Button asChild className="w-full">
                                    <Link href={user.role === 'teacher' ? '/teacher' : user.role === 'super_admin' || user.role === 'content_moderator' ? '/admin' : '/student'}>
                                        Go to Dashboard
                                    </Link>
                                </Button>
                            ) : (
                                <>
                                    <Button asChild className="w-full">
                                        <Link href="/signup">Get Started</Link>
                                    </Button>
                                    <p className="mt-3 text-center text-sm">
                                        Already have an account? <Link href="/login" className="font-medium text-primary">Log In</Link>
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </header>
        <main className="flex-grow">
            {children}
        </main>
        <footer className="bg-muted/50 text-muted-foreground">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-8">
                    <div className="col-span-full lg:col-span-1 mb-4 lg:mb-0">
                         <h3 className="text-xl font-bold text-foreground">IGA<span className="text-primary">Prep</span></h3>
                         <p className="mt-2 text-sm">The best revision materials for IGCSE, GCSE & A-Levels.</p>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-foreground tracking-wider uppercase">Product</h3>
                        <ul className="mt-4 space-y-2">
                            <li><Link href="/pricing" className="hover:text-primary">Pricing</Link></li>
                            <li><Link href="/teacher" className="hover:text-primary">For Teachers</Link></li>
                             <li><Link href="/subjects" className="hover:text-primary">Subjects</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-foreground tracking-wider uppercase">Company</h3>
                        <ul className="mt-4 space-y-2">
                            <li><Link href="#" className="hover:text-primary">About Us</Link></li>
                            <li><Link href="#" className="hover:text-primary">Contact</Link></li>
                            <li><Link href="/faq" className="hover:text-primary">FAQ</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-foreground tracking-wider uppercase">Legal</h3>
                        <ul className="mt-4 space-y-2">
                            <li><Link href="#" className="hover:text-primary">Privacy Policy</Link></li>
                            <li><Link href="#" className="hover:text-primary">Terms of Service</Link></li>
                        </ul>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                        <h3 className="text-sm font-semibold text-foreground tracking-wider uppercase">Connect</h3>
                        <ul className="mt-4 space-y-2">
                            <li><Link href="#" className="hover:text-primary">Twitter</Link></li>
                            <li><Link href="#" className="hover:text-primary">Facebook</Link></li>
                            <li><Link href="#" className="hover:text-primary">Instagram</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="mt-8 border-t pt-8 text-center">
                    <p>&copy; {new Date().getFullYear()} IGA Prep. All rights reserved.</p>
                </div>
            </div>
      </footer>
    </div>
  );
}

    