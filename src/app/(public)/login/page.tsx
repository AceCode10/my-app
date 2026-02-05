
'use client';
import { useState, useEffect, Suspense, useRef } from 'react';
import { Mail, KeyRound, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser, invalidateUserCache } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';
import { KodiLoadingGif } from '@/components/ui/kodi-loading-gif';

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading } = useUser();
    const supabase = createClient();
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isTeacher, setIsTeacher] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const redirectingRef = useRef(false);
    const loginTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setIsTeacher(searchParams.get('plan') === 'teacher');
        // Check for error params from auth callback
        const error = searchParams.get('error');
        if (error === 'auth_failed') {
            setErrorMessage('Authentication failed. Please try again.');
        } else if (error === 'no_code') {
            setErrorMessage('Login session expired. Please try again.');
        }
    }, [searchParams]);
    
    // Clear any stale cache when login page loads
    useEffect(() => {
        if (!loading && !user) {
            // User is not logged in - ensure cache is clear
            invalidateUserCache();
        }
    }, [loading, user]);
    
    useEffect(() => {
        if (!loading && user && !redirectingRef.current) {
            redirectingRef.current = true;
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

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (loginTimeoutRef.current) {
                clearTimeout(loginTimeoutRef.current);
            }
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrorMessage(null);
        
        // Set a timeout to reset submitting state if login takes too long
        loginTimeoutRef.current = setTimeout(() => {
            setIsSubmitting(false);
            setErrorMessage('Login is taking longer than expected. Please wait a moment and try again.');
        }, 30000); // 30 second timeout - profile fetch can be slow
        
        try {
            // Clear any existing cache before login
            invalidateUserCache();
            
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            
            if (loginTimeoutRef.current) {
                clearTimeout(loginTimeoutRef.current);
            }
            
            if (error) {
                // Map error messages to user-friendly text
                let friendlyMessage = 'Invalid email or password. Please try again.';
                if (error.message.includes('Invalid login credentials')) {
                    friendlyMessage = 'Invalid email or password. Please check your credentials.';
                } else if (error.message.includes('Email not confirmed')) {
                    friendlyMessage = 'Please verify your email address before logging in.';
                } else if (error.message.includes('Too many requests')) {
                    friendlyMessage = 'Too many login attempts. Please wait a moment and try again.';
                }
                setErrorMessage(friendlyMessage);
                setIsSubmitting(false);
                return;
            }
            
            // On success, manually redirect based on role to avoid race condition
            if (data.user) {
                try {
                    const { data: profile } = await supabase
                        .from('users')
                        .select('role')
                        .eq('id', data.user.id)
                        .single();
                    
                    // Clear timeout since we're about to redirect
                    if (loginTimeoutRef.current) {
                        clearTimeout(loginTimeoutRef.current);
                    }
                    
                    // Use window.location for a full page reload to ensure cookies are set
                    // This is more reliable than router.push for auth state changes
                    if (profile?.role === 'super_admin' || profile?.role === 'content_moderator') {
                        window.location.href = '/admin';
                    } else if (profile?.role === 'teacher') {
                        window.location.href = '/teacher';
                    } else {
                        window.location.href = '/student';
                    }
                    return; // Don't reset isSubmitting - we're navigating away
                } catch (profileError) {
                    // If profile fetch fails, still redirect to student dashboard
                    console.error('Profile fetch error:', profileError);
                    window.location.href = '/student';
                    return;
                }
            } else {
                // No user returned but no error - unusual state
                setErrorMessage('Login failed. Please try again.');
                setIsSubmitting(false);
            }
        } catch (error: unknown) {
            if (loginTimeoutRef.current) {
                clearTimeout(loginTimeoutRef.current);
            }
            setErrorMessage('An unexpected error occurred. Please try again.');
            setIsSubmitting(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setIsSubmitting(true);
        setErrorMessage(null);
        // Clear cache before OAuth login
        invalidateUserCache();
        
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });
            
            if (error) {
                setErrorMessage(error.message || 'Could not start sign-in with Google. Please try again.');
                setIsSubmitting(false);
            }
        } catch (error: unknown) {
            console.error("Error during Google sign-in:", error);
            setErrorMessage('Could not start sign-in with Google. Please try again.');
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
                    
                    {/* Inline error message */}
                    {errorMessage && (
                        <div className="flex items-center gap-2 p-3 mb-4 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{errorMessage}</span>
                        </div>
                    )}
                    
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
