
'use client';
import { useState, useEffect, Suspense, useMemo } from 'react';
import { Mail, KeyRound, User, ArrowRight, ArrowLeft, Check, GraduationCap, BookOpen, Globe, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { createClient } from '@/lib/supabase/client';
import { ExamBoardSelector } from '@/components/exam-board-selector';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { COUNTRIES } from '@/lib/countries';
import { getIconComponent } from '@/lib/icon-mapper';
import { KodiLoadingGif } from '@/components/ui/kodi-loading-gif';

type SignupStep = 'credentials' | 'exam-boards' | 'levels' | 'subjects' | 'country';

interface EducationLevel {
    id: string;
    name: string;
    description: string;
    exam_boards: string[];
}

interface Subject {
    id: string;
    name: string;
    code: string;
    icon_url?: string;
    color?: string;
    exam_board?: string;
    level?: string;
}

const EDUCATION_LEVELS: EducationLevel[] = [
    { id: 'igcse', name: 'IGCSE', description: 'International GCSE (Ages 14-16)', exam_boards: ['cambridge', 'edexcel'] },
    { id: 'gcse', name: 'GCSE', description: 'General Certificate (Ages 14-16)', exam_boards: ['aqa', 'ocr', 'edexcel'] },
    { id: 'as_level', name: 'AS Level', description: 'Advanced Subsidiary (Ages 16-17)', exam_boards: ['cambridge', 'edexcel', 'aqa', 'ocr'] },
    { id: 'a_level', name: 'A Level', description: 'Advanced Level (Ages 16-18)', exam_boards: ['cambridge', 'edexcel', 'aqa', 'ocr'] },
    { id: 'ib_myp', name: 'IB MYP', description: 'IB Middle Years (Ages 11-16)', exam_boards: ['ib'] },
    { id: 'ib_dp', name: 'IB DP', description: 'IB Diploma (Ages 16-19)', exam_boards: ['ib'] },
    { id: 'ap', name: 'AP', description: 'Advanced Placement (High School)', exam_boards: ['ap'] },
];

function SignupContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const supabase = createClient();
    const [step, setStep] = useState<SignupStep>('credentials');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [selectedExamBoards, setSelectedExamBoards] = useState<string[]>([]);
    const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
    const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
    const [selectedCountry, setSelectedCountry] = useState<string>('');
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [subjectSearch, setSubjectSearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isTeacher, setIsTeacher] = useState(false);

    useEffect(() => {
        setIsTeacher(searchParams.get('plan') === 'teacher');
    }, [searchParams]);

    // Fetch subjects - try filtered first, fallback to all subjects
    useEffect(() => {
        const fetchSubjects = async () => {
            // First try to get subjects matching the selected exam boards and levels
            let query = supabase
                .from('subjects')
                .select('id, name, code, icon_url, color, exam_board, level')
                .eq('status', 'published');
            
            // Try filtering by exam boards and levels if selected
            const hasFilters = selectedExamBoards.length > 0 || selectedLevels.length > 0;
            
            if (selectedExamBoards.length > 0) {
                query = query.in('exam_board', selectedExamBoards);
            }
            
            if (selectedLevels.length > 0) {
                query = query.in('level', selectedLevels);
            }
            
            let { data, error } = await query.order('name');
            
            // If no subjects found with filters, fetch all published subjects
            if (!error && (!data || data.length === 0) && hasFilters) {
                const { data: allData, error: allError } = await supabase
                    .from('subjects')
                    .select('id, name, code, icon_url, color, exam_board, level')
                    .eq('status', 'published')
                    .order('name');
                
                if (!allError && allData) {
                    data = allData;
                }
            }
            
            if (!error && data) {
                setSubjects(data);
            }
        };
        fetchSubjects();
    }, [supabase, selectedExamBoards, selectedLevels]);

    // Filter subjects based on search (subjects are already filtered by exam board/level from DB)
    const filteredSubjects = useMemo(() => {
        if (!subjectSearch.trim()) return subjects;
        const search = subjectSearch.toLowerCase();
        return subjects.filter(s => 
            s.name.toLowerCase().includes(search) || 
            s.code.toLowerCase().includes(search)
        );
    }, [subjects, subjectSearch]);

    // Check if we have subjects available based on selections
    const hasSubjectsAvailable = subjects.length > 0;

    // Filter levels based on selected exam boards
    const availableLevels = EDUCATION_LEVELS.filter(level =>
        level.exam_boards.some(board => selectedExamBoards.includes(board))
    );

    const handleCredentialsSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email || !password) {
            toast({
                variant: "destructive",
                title: "Missing Information",
                description: "Please fill in all fields.",
            });
            return;
        }
        if (password.length < 8) {
            toast({
                variant: "destructive",
                title: "Password Too Short",
                description: "Password must be at least 8 characters.",
            });
            return;
        }
        setStep('exam-boards');
    };

    const handleExamBoardsSubmit = () => {
        // Auto-select levels that match the selected exam boards
        const matchingLevels = EDUCATION_LEVELS
            .filter(level => level.exam_boards.some(board => selectedExamBoards.includes(board)))
            .map(level => level.id);
        
        // If only one level matches, auto-select it
        if (matchingLevels.length === 1) {
            setSelectedLevels(matchingLevels);
        }
        
        setStep('levels');
    };

    const handleSkipExamBoards = () => {
        setStep('levels');
    };

    const handleLevelsSubmit = () => {
        setStep('subjects');
    };

    const handleSkipLevels = () => {
        setStep('subjects');
    };

    const handleSubjectsSubmit = () => {
        setStep('country');
    };

    const handleSkipSubjects = () => {
        setStep('country');
    };

    const toggleLevel = (levelId: string) => {
        setSelectedLevels(prev =>
            prev.includes(levelId)
                ? prev.filter(id => id !== levelId)
                : [...prev, levelId]
        );
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

            // Sign up with Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        display_name: name,
                        role: role,
                    },
                },
            });

            if (authError) {
                throw authError;
            }

            // Check if email confirmation is required
            const needsEmailConfirmation = authData.user && !authData.session;
            
            if (authData.user) {
                // Prepare update data based on what user selected
                const updateData: any = {
                    onboarding_completed: true
                };

                if (selectedExamBoards.length > 0) {
                    updateData.exam_boards = selectedExamBoards;
                }

                if (selectedLevels.length > 0) {
                    if (isTeacher) {
                        updateData.levels = selectedLevels;
                    } else {
                        updateData.level = selectedLevels[0]; // Students get single level
                    }
                }

                if (selectedCountry) {
                    updateData.country = selectedCountry;
                }

                // Update user profile
                const { error: updateError } = await supabase
                    .from('users')
                    .update(updateData)
                    .eq('id', authData.user.id);

                if (updateError) {
                    console.error('Error updating user preferences:', updateError);
                }

                // Add selected subjects if any
                if (selectedSubjects.length > 0) {
                    const { error: subjectsError } = await supabase
                        .from('user_subjects')
                        .insert(
                            selectedSubjects.map(subject_id => ({
                                user_id: authData.user.id,
                                subject_id,
                            }))
                        );

                    if (subjectsError) {
                        console.error('Error adding subjects:', subjectsError);
                    }
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
                toast({ title: 'Account Created!', description: 'Welcome to RevisionPlus!' });
                
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
        <div className="bg-background text-foreground flex items-center justify-center min-h-screen px-4 py-8">
            <div className={cn("w-full mx-auto transition-all", step !== 'credentials' ? 'max-w-2xl' : 'max-w-md')}>
                <div className="p-6 sm:p-8 bg-card rounded-2xl shadow-lg">
                    {/* Step Indicator */}
                    <div className="flex items-center justify-center gap-2 mb-6">
                        <div className={cn(
                            "h-2 w-6 rounded-full transition-colors",
                            step === 'credentials' ? "bg-primary" : "bg-primary/30"
                        )} />
                        <div className={cn(
                            "h-2 w-6 rounded-full transition-colors",
                            step === 'exam-boards' ? "bg-primary" : ['levels', 'subjects', 'country'].includes(step) ? "bg-primary/30" : "bg-muted"
                        )} />
                        <div className={cn(
                            "h-2 w-6 rounded-full transition-colors",
                            step === 'levels' ? "bg-primary" : ['subjects', 'country'].includes(step) ? "bg-primary/30" : "bg-muted"
                        )} />
                        <div className={cn(
                            "h-2 w-6 rounded-full transition-colors",
                            step === 'subjects' ? "bg-primary" : step === 'country' ? "bg-primary/30" : "bg-muted"
                        )} />
                        <div className={cn(
                            "h-2 w-6 rounded-full transition-colors",
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
                                    Continue
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                            </form>
                            <div className="flex items-center my-6">
                                <div className="flex-grow border-t"></div>
                                <span className="mx-4 text-muted-foreground text-sm">OR</span>
                                <div className="flex-grow border-t"></div>
                            </div>
                            <button onClick={handleGoogleSignIn} disabled={isLoading} className="w-full flex items-center justify-center space-x-2 border font-medium py-3 rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50">
                                <img src="https://www.google.com/ficon.ico" alt="Google icon" className="w-5 h-5" />
                                <span>Sign up with Google</span>
                            </button>
                            <p className="text-center text-sm text-muted-foreground mt-6">
                                Already have an account? <Link href={isTeacher ? "/login?plan=teacher" : "/login"} className="font-medium text-primary hover:underline">Log In</Link>
                            </p>
                        </>
                    ) : step === 'exam-boards' ? (
                        <>
                            <h2 className="text-2xl font-bold text-card-foreground text-center mb-2">
                                Select Your Exam Boards
                            </h2>
                            <p className="text-center text-muted-foreground mb-6">
                                Choose the exam boards you're studying. You can select multiple and change this later.
                            </p>
                            
                            <ExamBoardSelector
                                selectedBoards={selectedExamBoards}
                                onSelectionChange={setSelectedExamBoards}
                                className="mb-6"
                            />

                            {selectedExamBoards.length > 0 && (
                                <p className="text-sm text-center text-muted-foreground mb-4">
                                    <Check className="inline h-4 w-4 text-green-500 mr-1" />
                                    {selectedExamBoards.length} exam board{selectedExamBoards.length > 1 ? 's' : ''} selected
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
                                    onClick={handleSkipExamBoards}
                                    className="flex-1"
                                    disabled={isLoading}
                                >
                                    Skip
                                </Button>
                                <Button
                                    onClick={handleExamBoardsSubmit}
                                    className="flex-1"
                                >
                                    Continue
                                    <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                            </div>
                        </>
                    ) : step === 'levels' ? (
                        <>
                            <h2 className="text-2xl font-bold text-card-foreground text-center mb-2">
                                <GraduationCap className="inline h-6 w-6 mr-2" />
                                Select Your Education Level
                            </h2>
                            <p className="text-center text-muted-foreground mb-6">
                                Choose the level(s) you're studying. This helps us show you relevant content.
                            </p>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                                {availableLevels.map(level => (
                                    <button
                                        key={level.id}
                                        onClick={() => toggleLevel(level.id)}
                                        className={cn(
                                            "p-4 rounded-xl border-2 text-left transition-all hover:shadow-md",
                                            selectedLevels.includes(level.id)
                                                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                                : "border-muted hover:border-primary/50"
                                        )}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="font-semibold">{level.name}</p>
                                                <p className="text-xs text-muted-foreground mt-1">{level.description}</p>
                                            </div>
                                            {selectedLevels.includes(level.id) && (
                                                <Check className="h-5 w-5 text-primary shrink-0" />
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {selectedLevels.length > 0 && (
                                <p className="text-sm text-center text-muted-foreground mb-4">
                                    <Check className="inline h-4 w-4 text-green-500 mr-1" />
                                    {selectedLevels.length} level{selectedLevels.length > 1 ? 's' : ''} selected
                                </p>
                            )}

                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setStep('exam-boards')}
                                    className="flex-1"
                                    disabled={isLoading}
                                >
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Back
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={handleSkipLevels}
                                    className="flex-1"
                                    disabled={isLoading}
                                >
                                    Skip
                                </Button>
                                <Button
                                    onClick={handleLevelsSubmit}
                                    className="flex-1"
                                >
                                    Continue
                                    <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                            </div>
                        </>
                    ) : step === 'subjects' ? (
                        <>
                            <h2 className="text-2xl font-bold text-card-foreground text-center mb-2">
                                <BookOpen className="inline h-6 w-6 mr-2" />
                                Select Your Subjects
                            </h2>
                            <p className="text-center text-muted-foreground mb-6">
                                Choose the subjects you're {isTeacher ? 'teaching' : 'studying'}. You can add more later.
                            </p>
                            
                            {/* Search bar */}
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search subjects..."
                                    value={subjectSearch}
                                    onChange={(e) => setSubjectSearch(e.target.value)}
                                    className="pl-10"
                                />
                            </div>

                            {selectedSubjects.length > 0 && (
                                <p className="text-sm text-center text-muted-foreground mb-4">
                                    <Check className="inline h-4 w-4 text-green-500 mr-1" />
                                    {selectedSubjects.length} subject{selectedSubjects.length !== 1 ? 's' : ''} selected
                                </p>
                            )}

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 max-h-[400px] overflow-y-auto">
                                {filteredSubjects.map(subject => {
                                    const IconComponent = getIconComponent(subject.icon_url);
                                    return (
                                        <Label
                                            key={subject.id}
                                            htmlFor={`subject-${subject.id}`}
                                            className={cn(
                                                "flex flex-col items-center p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors",
                                                selectedSubjects.includes(subject.id) && "border-primary bg-primary/5"
                                            )}
                                        >
                                            <Checkbox
                                                id={`subject-${subject.id}`}
                                                checked={selectedSubjects.includes(subject.id)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setSelectedSubjects([...selectedSubjects, subject.id]);
                                                    } else {
                                                        setSelectedSubjects(selectedSubjects.filter(id => id !== subject.id));
                                                    }
                                                }}
                                                className="mb-2"
                                            />
                                            <div 
                                                className="p-2 rounded-lg text-white flex items-center justify-center w-10 h-10 mb-2"
                                                style={{ backgroundColor: subject.color || '#3b82f6' }}
                                            >
                                                <IconComponent className="w-6 h-6" />
                                            </div>
                                            <span className="text-xs font-medium text-center">{subject.name}</span>
                                        </Label>
                                    );
                                })}
                            </div>

                            {filteredSubjects.length === 0 && (
                                <p className="text-center text-muted-foreground py-8">No subjects found matching "{subjectSearch}"</p>
                            )}

                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setStep('levels')}
                                    className="flex-1"
                                    disabled={isLoading}
                                >
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Back
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={handleSkipSubjects}
                                    className="flex-1"
                                    disabled={isLoading}
                                >
                                    Skip
                                </Button>
                                <Button
                                    onClick={handleSubjectsSubmit}
                                    className="flex-1"
                                >
                                    Continue
                                    <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                            </div>
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
                                    onClick={() => setStep('subjects')}
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
                                    {isLoading ? 'Creating Account...' : 'Create Account'}
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
