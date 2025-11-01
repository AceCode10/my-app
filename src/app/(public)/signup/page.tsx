
'use client';
import { useState, useEffect } from 'react';
import { Mail, KeyRound, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const supabase = createClient();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isTeacher, setIsTeacher] = useState(false);

    useEffect(() => {
        setIsTeacher(searchParams.get('plan') === 'teacher');
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Determine role before signup
            let role: 'student' | 'teacher' | 'super_admin' = isTeacher ? 'teacher' : 'student';
            const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
            
            if (adminEmail && email === adminEmail) {
                role = 'super_admin';
            }

            // Sign up with Supabase Auth
            // The database trigger will automatically create the user profile
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        display_name: name,
                        role: role, // Pass role in metadata for trigger
                    },
                },
            });

            if (authError) {
                throw authError;
            }

            if (authData.user) {
                toast({ title: 'Account Created!', description: 'Welcome to IGCSE Simplified!' });
                
                // Redirect based on role
                if (role === 'super_admin') {
                    router.push('/admin/dashboard');
                } else if (role === 'teacher') {
                    router.push('/teacher');
                } else {
                    router.push('/student');
                }
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
        <div className="bg-background text-foreground flex items-center justify-center min-h-screen px-4">
            <div className="max-w-md w-full mx-auto">
                <div className="p-6 sm:p-8 bg-card rounded-2xl shadow-lg">
                    <h2 className="text-2xl font-bold text-card-foreground text-center mb-2">
                        {isTeacher ? 'Create Your Teacher Account' : 'Create Your Account'}
                    </h2>
                    <p className="text-center text-muted-foreground mb-6">
                        {isTeacher ? 'Start your journey to empowering your students.' : 'Start your journey to mastering IGCSE subjects.'}
                    </p>
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Full Name"
                                className="w-full pl-10 pr-4 py-3 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
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
                                placeholder="Password"
                                className="w-full pl-10 pr-4 py-3 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        
                        <button type="submit" className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-lg hover:bg-primary/90 transition-colors shadow-md disabled:bg-primary/50" disabled={isLoading}>
                            {isLoading ? 'Creating Account...' : (isTeacher ? 'Sign Up as a Teacher' : 'Sign Up')}
                        </button>
                    </form>
                    <div className="flex items-center my-6">
                        <div className="flex-grow border-t"></div>
                        <span className="mx-4 text-muted-foreground text-sm">OR</span>
                        <div className="flex-grow border-t"></div>
                    </div>
                    <button onClick={handleGoogleSignIn} disabled={isLoading} className="w-full flex items-center justify-center space-x-2 border font-medium py-3 rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50">
                        <img src="https://www.google.com/favicon.ico" alt="Google icon" className="w-5 h-5" />
                        <span>Sign up with Google</span>
                    </button>
                    <p className="text-center text-sm text-muted-foreground mt-6">
                        Already have an account? <Link href={isTeacher ? "/login?plan=teacher" : "/login"} className="font-medium text-primary hover:underline">Log In</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
