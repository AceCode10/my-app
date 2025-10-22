
'use client';
import { useState, useEffect } from 'react';
import { Mail, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { GoogleAuthProvider, signInWithRedirect, signInWithEmailAndPassword, getRedirectResult } from 'firebase/auth';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { useToast } from "@/hooks/use-toast";
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

const GOOGLE_SIGN_IN_REDIRECT_KEY = 'isGoogleSignInRedirect';

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const auth = useAuth();
    const firestore = useFirestore();
    const { user, isUserLoading, roles } = useUser();
    const { toast } = useToast();
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isProcessingRedirect, setIsProcessingRedirect] = useState(false);
    const [isTeacher, setIsTeacher] = useState(false);

    useEffect(() => {
        setIsTeacher(searchParams.get('plan') === 'teacher');
    }, [searchParams]);
    
    useEffect(() => {
        if (!isUserLoading && user) {
            // Wait until roles are loaded before redirecting
            if (roles.length > 0) {
                 if (roles.includes('admin')) {
                    router.push('/admin/dashboard');
                } else if (roles.includes('teacher')) {
                    router.push('/teacher/dashboard');
                } else {
                    router.push('/dashboard');
                }
            }
        }
    }, [user, isUserLoading, roles, router]);

    useEffect(() => {
        const isGoogleRedirect = sessionStorage.getItem(GOOGLE_SIGN_IN_REDIRECT_KEY) === 'true';
        if (!auth || !firestore || !isGoogleRedirect) {
            return;
        }

        setIsProcessingRedirect(true);
        getRedirectResult(auth)
            .then(async (result) => {
                if (result) {
                    const user = result.user;
                    const userRef = doc(firestore, 'users', user.uid);
                    const userSnap = await getDoc(userRef);

                    if (!userSnap.exists()) {
                        const plan = searchParams.get('plan');
                        let finalRole: string | string[] = plan === 'teacher' ? 'teacher' : 'student';

                        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
                        if (user.email === adminEmail) {
                            finalRole = ['admin', 'teacher'];
                        }
                        
                        await setDoc(userRef, {
                            uid: user.uid,
                            email: user.email,
                            displayName: user.displayName,
                            photoURL: user.photoURL,
                            role: finalRole,
                            xp: 0,
                            streak: 0,
                            activeSubjects: [],
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp(),
                        });
                    }
                }
            })
            .catch((error) => {
                console.error("Error handling redirect result:", error);
                toast({
                    variant: "destructive",
                    title: "Sign-In Failed",
                    description: "Could not complete sign-in with Google. Please try again.",
                });
            })
            .finally(() => {
                sessionStorage.removeItem(GOOGLE_SIGN_IN_REDIRECT_KEY);
                setIsProcessingRedirect(false);
            });
    // The dependency array is intentionally kept lean to only run once on redirect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auth, firestore]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth) {
             toast({ variant: "destructive", title: "Login Failed", description: "Authentication service is not ready. Please wait a moment and try again." });
             return;
        };
        setIsSubmitting(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Login Failed",
                description: "Invalid email or password. Please try again.",
            });
            setIsSubmitting(false);
        }
    };

    const handleGoogleSignIn = async () => {
        if (!auth) {
             toast({ variant: "destructive", title: "Google Sign-In Failed", description: "Authentication service is not ready. Please wait a moment and try again." });
             return;
        }
        setIsSubmitting(true);
        try {
            sessionStorage.setItem(GOOGLE_SIGN_IN_REDIRECT_KEY, 'true');
            const provider = new GoogleAuthProvider();
            await signInWithRedirect(auth, provider);
        } catch (error) {
            console.error("Error during Google sign-in:", error);
            sessionStorage.removeItem(GOOGLE_SIGN_IN_REDIRECT_KEY);
            toast({
              variant: "destructive",
              title: "Google Sign-In Failed",
              description: "Could not start sign-in with Google. Please try again.",
            });
            setIsSubmitting(false);
        }
    };

    if (isUserLoading || isProcessingRedirect || (user && roles.length === 0)) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <p className="text-muted-foreground animate-pulse">Verifying credentials and redirecting...</p>
            </div>
        )
    }

    // If the user is logged in but has no roles (or has not been redirected),
    // they should not see the login form. They should stay on the loading screen.
    if (user && roles.length > 0) {
        // This case should be handled by the redirection useEffect, but as a fallback,
        // we can show the loading screen.
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
