
'use client';
import { useState, useEffect } from 'react';
import { Mail, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@/hooks/use-user';
import { useToast } from "@/hooks/use-toast";
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
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
                router.push('/admin/dashboard');
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
            const { error } = await supabase.auth.signInWithPassword({
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
            }
            // Success is handled by useUser hook redirect
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
                <p className="text-muted-foreground animate-pulse">Loading...</p>
            </div>
        );
    }

    if (user) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <p className="text-muted-foreground animate-pulse">Redirecting...</p>
            </div>
        );
    }
    

    return (
        <div className="bg-background text-foreground flex items-center justify-center min-h-screen">
            <div className="max-w-md w-full px-4 sm:px-6 lg:px-8 mx-auto">
                <div className="p-6 sm:p-8 bg-card rounded-2xl shadow-lg">
                    <h2 className="text-2xl font-bold text-card-foreground text-center mb-2">
                        {isTeacher ? 'Welcome Back, Teacher!' : 'Welcome Back!'}
                    </h2>
                    <p className="text-center text-muted-foreground mb-6">
                        {isTeacher ? 'Log in to access your teacher dashboard.' : 'Log in to continue your learning journey.'}
                    </p>
                    <form className="space-y-4" onSubmit={handleSubmit}>
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
                                placeholder="Password"
                                className="w-full pl-10 pr-4 py-3 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <button type="submit" className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-lg hover:bg-primary/90 transition-colors shadow-md disabled:bg-primary/50" disabled={isSubmitting}>
                            {isSubmitting ? 'Logging In...' : 'Log In'}
                        </button>
                    </form>
                    <div className="flex items-center my-6">
                        <div className="flex-grow border-t"></div>
                        <span className="mx-4 text-muted-foreground text-sm">OR</span>
                        <div className="flex-grow border-t"></div>
                    </div>
                    <button onClick={handleGoogleSignIn} disabled={isSubmitting} className="w-full flex items-center justify-center space-x-2 border font-medium py-3 rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50">
                        <img src="https://www.google.com/favicon.ico" alt="Google icon" className="w-5 h-5" />
                        <span>Sign in with Google</span>
                    </button>
                    <p className="text-center text-sm text-muted-foreground mt-6">
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
