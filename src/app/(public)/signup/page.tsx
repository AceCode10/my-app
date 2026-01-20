
'use client';
import { useState, useEffect, Suspense } from 'react';
import { Mail, KeyRound, User, ArrowRight, ArrowLeft, Check, Globe } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { COUNTRIES } from '@/lib/countries';
import { KodiLoadingGif } from '@/components/ui/kodi-loading-gif';

type SignupStep = 'credentials' | 'country';

function SignupContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const supabase = createClient();
    const [step, setStep] = useState<SignupStep>('credentials');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [selectedCountry, setSelectedCountry] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [isTeacher, setIsTeacher] = useState(false);

    useEffect(() => {
        setIsTeacher(searchParams.get('plan') === 'teacher');
    }, [searchParams]);

    const handleCredentialsSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Optimized: Early validation with better UX feedback
        const validationErrors = [];
        
        if (!name?.trim()) {
            validationErrors.push('Full name is required');
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
        
        // Optimized: Skip country step for faster signup - make it optional
        handleFinalSubmit();
    };

    const handleFinalSubmit = async () => {
        setIsLoading(true);

        try {
            // Determine role before signup
            let role: 'student' | 'teacher' | 'super_admin' = isTeacher ? 'teacher' : 'student';
            const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
            
            if (adminEmail && email === adminEmail) {
                role = 'super_admin';
            }

            // Optimized: Parallel signup and profile creation
            const signupPromise = supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        display_name: name,
                        role: role,
                        country: selectedCountry || null,
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
                // Optimized: Only update if additional data needed
                if (selectedCountry) {
                    const updatePromise = supabase
                        .from('users')
                        .update({ country: selectedCountry })
                        .eq('id', authData.user.id);
                    
                    // Don't wait for this - fire and forget for better UX
                    updatePromise.then(({ error }) => {
                        if (error) {
                            console.error('Error updating user country:', error);
                        }
                    });
                }

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
                    {/* Step Indicator */}
                    <div className="flex items-center justify-center gap-2 mb-6">
                        <div className={cn(
                            "h-2 w-8 rounded-full transition-colors",
                            step === 'credentials' ? "bg-primary" : "bg-primary/30"
                        )} />
                        <div className={cn(
                            "h-2 w-8 rounded-full transition-colors",
                            step === 'country' ? "bg-primary" : "bg-muted"
                        )} />
                    </div>

                    {step === 'credentials' ? (
                        <>
                            <h2 className="text-2xl font-bold text-card-foreground text-center mb-2">
                                {isTeacher ? 'Create Your Teacher Account' : 'Create Your Account'}
                            </h2>
                            <p className="text-center text-muted-foreground mb-6">
                                {isTeacher ? 'Start your journey to empowering your students.' : 'Start your journey to mastering your exams.'}
                            </p>
                            <form className="space-y-4" onSubmit={handleCredentialsSubmit}>
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
                                
                                <div className="text-center mt-4">
                                    <button 
                                        type="button" 
                                        onClick={() => setStep('country')}
                                        className="text-sm text-muted-foreground hover:text-primary transition-colors underline"
                                    >
                                        Set country preferences (optional)
                                    </button>
                                </div>
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
                        </>
                    ) : (
                        <>
                            <h2 className="text-2xl font-bold text-card-foreground text-center mb-2">
                                <Globe className="inline h-6 w-6 mr-2" />
                                Select Your Country
                            </h2>
                            <p className="text-center text-muted-foreground mb-6">
                                This helps us customize content for your region. You can change this later.
                            </p>
                            
                            <div className="mb-6">
                                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                                    <SelectTrigger className="w-full h-12">
                                        <SelectValue placeholder="Select your country" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[300px]">
                                        {COUNTRIES.map(country => (
                                            <SelectItem key={country.code} value={country.code}>
                                                {country.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {selectedCountry && (
                                <p className="text-sm text-center text-muted-foreground mb-4">
                                    <Check className="inline h-4 w-4 text-green-500 mr-1" />
                                    Country selected
                                </p>
                            )}

                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setStep('credentials')}
                                    className="flex-1"
                                    disabled={isLoading}
                                >
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Back
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={handleFinalSubmit}
                                    className="flex-1"
                                    disabled={isLoading}
                                >
                                    Skip
                                </Button>
                                <Button
                                    onClick={handleFinalSubmit}
                                    className="flex-1"
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Creating...' : 'Create Account'}
                                </Button>
                            </div>
                        </>
                    )}
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
