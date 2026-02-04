
'use client';
import { useState, useEffect, Suspense } from 'react';
import { Mail, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@/hooks/use-user';
import { useToast } from "@/hooks/use-toast";
import { createClient } from '@/lib/supabase/client';
import { KodiLoadingGif } from '@/components/ui/kodi-loading-gif';

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading } = useUser();
    const { toast } = useToast();
    const supabase = createClient();
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isTeacher, setIsTeacher] = useState(false);

    useEffect(() => {
        setIsTeacher(searchParams.get('plan') === 'teacher');
    }, [searchParams]);
    
    useEffect(() => {
        if (!loading && user) {
            // Redirect based on role
            if (user.role === 'super_admin' || user.role === 'content_moderator') {
                router.push('/admin');
            } else if (user.role === 'teacher') {
                router.push('/teacher');
            } else {
                router.push('/student');
            }
        }
    }, [user, loading, router]);

    // Google OAuth is handled by Supabase Auth automatically


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            
            if (error) {
                toast({
                    variant: "destructive",
                    title: "Login Failed",
                    description: error.message || "Invalid email or password. Please try again.",
                });
                setIsSubmitting(false);
                return;
            }
            
            // On success, manually redirect based on role to avoid race condition
            if (data.user) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', data.user.id)
                    .single();
                
                if (profile?.role === 'super_admin' || profile?.role === 'content_moderator') {
                    router.push('/admin');
                } else if (profile?.role === 'teacher') {
                    router.push('/teacher');
                } else {
                    router.push('/student');
                }
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Login Failed",
                description: "An unexpected error occurred. Please try again.",
            });
            setIsSubmitting(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setIsSubmitting(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });
            
            if (error) {
                toast({
                    variant: "destructive",
                    title: "Google Sign-In Failed",
                    description: error.message || "Could not start sign-in with Google. Please try again.",
                });
                setIsSubmitting(false);
            }
        } catch (error) {
            console.error("Error during Google sign-in:", error);
            toast({
                variant: "destructive",
                title: "Google Sign-In Failed",
                description: "Could not start sign-in with Google. Please try again.",
            });
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <KodiLoadingGif />
            </div>
        );
    }

    if (user) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <KodiLoadingGif />
            </div>
        );
    }
    

    return (
        <div className="bg-background text-foreground flex items-center justify-center min-h-screen p-4">
            <div className="max-w-md w-full mx-auto">
                <div className="p-6 sm:p-8 bg-card rounded-2xl shadow-lg">
                    <h2 className="text-xl sm:text-2xl font-bold text-card-foreground text-center mb-2">
                        {isTeacher ? 'Welcome Back!' : 'Welcome Back!'}
                    </h2>
                    <p className="text-center text-sm sm:text-base text-muted-foreground mb-6">
                        {isTeacher ? 'Log in to access your dashboard.' : 'Log in to access your dashboard.'}
                    </p>
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                            <input
                                type="email"
                                placeholder="Email Address"
                                className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 rounded-lg border bg-background text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-primary"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="relative">
                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                            <input
                                type="password"
                                placeholder="Password"
                                className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 rounded-lg border bg-background text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-primary"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <button type="submit" className="w-full bg-primary text-primary-foreground font-bold py-2.5 sm:py-3 rounded-lg hover:bg-primary/90 transition-colors shadow-md disabled:bg-primary/50 text-sm sm:text-base" disabled={isSubmitting}>
                            {isSubmitting ? 'Logging In...' : 'Log In'}
                        </button>
                    </form>
                    <div className="flex items-center my-5 sm:my-6">
                        <div className="flex-grow border-t"></div>
                        <span className="mx-3 sm:mx-4 text-muted-foreground text-xs sm:text-sm">OR</span>
                        <div className="flex-grow border-t"></div>
                    </div>
                    <button onClick={handleGoogleSignIn} disabled={isSubmitting} className="w-full flex items-center justify-center space-x-2 border font-medium py-2.5 sm:py-3 rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50 text-sm sm:text-base">
                        <img src="https://www.google.com/ficon.ico" alt="Google icon" className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>Sign in with Google</span>
                    </button>
                    <p className="text-center text-xs sm:text-sm text-muted-foreground mt-5 sm:mt-6">
                        Don't have an account?{' '}
                        {isTeacher ? (
                            <Link href="/signup?plan=teacher" className="font-medium text-primary hover:underline">
                                Sign up as a teacher
                            </Link>
                        ) : (
                            <Link href="/signup" className="font-medium text-primary hover:underline">
                                Sign up
                            </Link>
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <KodiLoadingGif />
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
