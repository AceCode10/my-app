
'use client';
import { useState, useEffect, Suspense, useRef, useCallback } from 'react';
import { Mail, KeyRound, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useUser, invalidateUserCache } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';
import { KodiLoadingGif } from '@/components/ui/kodi-loading-gif';

function LoginContent() {
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

    const redirectToRole = useCallback((role?: string) => {
        if (redirectingRef.current) {
            return;
        }

        redirectingRef.current = true;

        if (loginTimeoutRef.current) {
            clearTimeout(loginTimeoutRef.current);
            loginTimeoutRef.current = null;
        }

        // Check for redirectTo param (set by middleware when unauthenticated user hits protected route)
        const redirectTo = searchParams.get('redirectTo');
        if (redirectTo && redirectTo.startsWith('/')) {
            window.location.href = redirectTo;
            return;
        }

        if (role === 'super_admin' || role === 'content_moderator') {
            window.location.href = '/admin';
        } else if (role === 'teacher') {
            window.location.href = '/teacher';
        } else if (role === 'student') {
            window.location.href = '/student';
        } else {
            window.location.href = '/';
        }
    }, [searchParams]);

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
    
    // NOTE: Do NOT call invalidateUserCache() on mount here.
    // It races with useUser's initializeAuth() and corrupts global auth state.
    // Cache is cleared in handleSubmit before login and on SIGNED_OUT events.
    
    useEffect(() => {
        if (!loading && user) {
            redirectToRole(user.role);
        }
    }, [user, loading, redirectToRole]);

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
        const loginStart = Date.now();
        console.log('[Login] handleSubmit start');
        
        // Set a timeout to reset submitting state if login takes too long
        loginTimeoutRef.current = setTimeout(() => {
            console.warn(`[Login] 15s timeout fired (${Date.now() - loginStart}ms elapsed)`);
            setIsSubmitting(false);
            setErrorMessage('Login is taking longer than expected. Please wait a moment and try again.');
        }, 15000); // 15 second timeout
        
        try {
            // Clear any existing cache before login
            console.log('[Login] Calling invalidateUserCache()...');
            invalidateUserCache();
            
            console.log('[Login] Calling signInWithPassword()...');
            const signInStart = Date.now();
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            console.log(`[Login] signInWithPassword completed in ${Date.now() - signInStart}ms, user: ${!!data?.user}, error: ${error?.message || 'none'}`);
            
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
            
            if (data.user) {
                console.log(`[Login] User authenticated: ${data.user.id.substring(0, 8)}...`);
                const metadataRole = typeof data.user.user_metadata?.role === 'string'
                    ? data.user.user_metadata.role
                    : undefined;
                console.log(`[Login] Metadata role: ${metadataRole || 'not set'}`);

                if (metadataRole) {
                    console.log(`[Login] Redirecting via metadata role: ${metadataRole}`);
                    redirectToRole(metadataRole);
                    return;
                }

                // Query DB for role with a 5s fallback timeout.
                // If the query hangs, redirect to default role instead of staying stuck.
                console.log('[Login] Querying DB for role...');
                const roleQueryStart = Date.now();
                const fallbackTimeout = setTimeout(() => {
                    console.warn(`[Login] Role query timeout after ${Date.now() - roleQueryStart}ms - redirecting with default role`);
                    redirectToRole('student');
                }, 5000);

                try {
                    const { data: profile } = await supabase
                        .from('users')
                        .select('role')
                        .eq('id', data.user.id)
                        .maybeSingle();

                    clearTimeout(fallbackTimeout);
                    console.log(`[Login] Role query completed in ${Date.now() - roleQueryStart}ms, role: ${profile?.role || 'none'}`);
                    redirectToRole(profile?.role || 'student');
                    return;
                } catch (roleErr) {
                    clearTimeout(fallbackTimeout);
                    console.error(`[Login] Role query threw after ${Date.now() - roleQueryStart}ms:`, roleErr);
                    redirectToRole('student');
                    return;
                }
            }

            // If no auth user returned, let useUser handle state and unlock UI
            setIsSubmitting(false);
            setErrorMessage('Login succeeded but session was not available. Please refresh and try again.');
            
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
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
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
