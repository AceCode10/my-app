
'use client';
import { useState, useEffect, Suspense } from 'react';
import { Mail, KeyRound, User, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { createClient } from '@/lib/supabase/client';
import { KodiLoadingGif } from '@/components/ui/kodi-loading-gif';

function SignupContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const supabase = createClient();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isTeacher, setIsTeacher] = useState(false);

    useEffect(() => {
        setIsTeacher(searchParams.get('plan') === 'teacher');
    }, [searchParams]);

    const handleCredentialsSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Early validation with better UX feedback
        const validationErrors = [];
        
        if (!firstName?.trim()) {
            validationErrors.push('First name is required');
        }
        if (!lastName?.trim()) {
            validationErrors.push('Last name is required');
        }
        if (!email?.trim()) {
            validationErrors.push('Email address is required');
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            validationErrors.push('Please enter a valid email address');
        }
        if (!password) {
            validationErrors.push('Password is required');
        } else if (password.length < 8) {
            validationErrors.push('Password must be at least 8 characters');
        }
        
        if (validationErrors.length > 0) {
            toast({
                variant: "destructive",
                title: "Please fix the following:",
                description: validationErrors.join(', '),
            });
            return;
        }
        
        // Handle signup directly
        handleFinalSubmit();
    };

    const handleFinalSubmit = async () => {
        setIsLoading(true);
        const fullName = `${firstName.trim()} ${lastName.trim()}`;

        try {
            // Determine role before signup
            let role: 'student' | 'teacher' | 'super_admin' = isTeacher ? 'teacher' : 'student';
            const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
            
            if (adminEmail && email === adminEmail) {
                role = 'super_admin';
            }

            // Handle signup and profile creation
            const signupPromise = supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        display_name: fullName,
                        first_name: firstName.trim(),
                        last_name: lastName.trim(),
                        role: role,
                        onboarding_completed: false
                    },
                },
            });

            const [authResult] = await Promise.all([signupPromise]);
            
            const { data: authData, error: authError } = authResult;

            if (authError) {
                throw authError;
            }

            // Check if email confirmation is required
            const needsEmailConfirmation = authData.user && !authData.session;
            
            if (authData.user) {
                // No country update needed - country removed from signup

                setIsLoading(false);

                // If email confirmation is required, show message and redirect to login
                if (needsEmailConfirmation) {
                    toast({ 
                        title: 'Check Your Email!', 
                        description: 'We sent you a confirmation link. Please verify your email to log in.' 
                    });
                    router.push('/login');
                    return;
                }

                // If no email confirmation needed, redirect to dashboard
                toast({ title: 'Account Created!', description: 'Welcome to IGA Prep!' });
                
                // Optimized: Direct role-based redirect
                const redirectMap = {
                    'super_admin': '/admin',
                    'teacher': '/teacher',
                    'student': '/student'
                };
                
                router.push(redirectMap[role]);
            }

        } catch (error: any) {
            setIsLoading(false);
            if (error.message?.includes('already registered')) {
                toast({
                    variant: "destructive",
                    title: "Sign Up Failed",
                    description: "This email is already registered. Please log in.",
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Sign Up Failed",
                    description: error.message || "An unexpected error occurred.",
                });
            }
        }
    };

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });
            
            if (error) {
                throw error;
            }
        } catch (error: any) {
            console.error("Error during Google sign-in redirect:", error);
            toast({
                variant: "destructive",
                title: "Google Sign-In Failed",
                description: error.message || "Could not start sign-in with Google. Please try again.",
            });
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-background text-foreground flex items-center justify-center min-h-screen px-4 py-8">
            <div className="w-full max-w-md mx-auto">
                <div className="p-6 sm:p-8 bg-card rounded-2xl shadow-lg">
                    {true ? (
                        <>
                            <h2 className="text-2xl font-bold text-card-foreground text-center mb-2">
                                {isTeacher ? 'Create Your Teacher Account' : 'Create Your Account'}
                            </h2>
                            <p className="text-center text-muted-foreground mb-6">
                                {isTeacher ? 'Start your journey to empowering your students.' : 'Start your journey to mastering your exams.'}
                            </p>
                            <form className="space-y-4" onSubmit={handleCredentialsSubmit}>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                        <input
                                            type="text"
                                            placeholder="First Name"
                                            className="w-full pl-10 pr-4 py-3 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Last Name"
                                            className="w-full pl-4 pr-4 py-3 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                    <input
                                        type="email"
                                        placeholder="Email Address"
                                        className="w-full pl-10 pr-4 py-3 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="relative">
                                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                    <input
                                        type="password"
                                        placeholder="Password (min 8 characters)"
                                        className="w-full pl-10 pr-4 py-3 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={8}
                                    />
                                </div>
                                
                                <button type="submit" className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-lg hover:bg-primary/90 transition-colors shadow-md flex items-center justify-center gap-2">
                                    {isLoading ? 'Creating Account...' : 'Create Account'}
                                    {!isLoading && <ArrowRight className="h-4 w-4" />}
                                </button>
                            </form>
                            <div className="flex items-center my-6">
                                <div className="flex-grow border-t"></div>
                                <span className="mx-4 text-muted-foreground text-sm">OR</span>
                                <div className="flex-grow border-t"></div>
                            </div>
                            <button onClick={handleGoogleSignIn} disabled={isLoading} className="w-full flex items-center justify-center space-x-2 border font-medium py-3 rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50">
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                </svg>
                                <span>Sign up with Google</span>
                            </button>
                            <p className="text-center text-sm text-muted-foreground mt-6">
                                Already have an account? <Link href={isTeacher ? "/login?plan=teacher" : "/login"} className="font-medium text-primary hover:underline">Log In</Link>
                            </p>
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

export default function SignupPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <KodiLoadingGif />
            </div>
        }>
            <SignupContent />
        </Suspense>
    );
}
