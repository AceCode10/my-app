'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@/hooks/use-user';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Sun, Moon, ShieldCheck, Bell, User, Upload, CreditCard, Loader2, GraduationCap, Check, Globe, LogOut, Target } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { ExamBoardSelector } from '@/components/exam-board-selector';
import { EXAM_BOARDS } from '@/lib/exam-boards';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { COUNTRIES } from '@/lib/countries';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDailyGoals } from '@/hooks/use-daily-goals';
import { GoalSelectionModal } from '@/components/gamification';

const avatars = [
    'https://placehold.co/128x128/00bf8f/ffffff?text=S',
    'https://placehold.co/128x128/7c3aed/ffffff?text=L',
    'https://placehold.co/128x128/f97316/ffffff?text=A',
    'https://placehold.co/128x128/3b82f6/ffffff?text=B',
];


export default function SettingsPage() {
    const { user, loading: isUserLoading } = useUser();
    const supabase = createClient();
    const { toast } = useToast();
    const { theme, setTheme } = useTheme();
    const router = useRouter();

    const [displayName, setDisplayName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [selectedExamBoards, setSelectedExamBoards] = useState<string[]>([]);
    const [selectedCountry, setSelectedCountry] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSavingExamBoards, setIsSavingExamBoards] = useState(false);
    const [isSavingCountry, setIsSavingCountry] = useState(false);
    const [notifications, setNotifications] = useState({ 
        newBadges: true, 
        quizReminders: true,
        weeklyProgress: true,
        newContent: false
    });
    const [isSavingNotifications, setIsSavingNotifications] = useState(false);
    const [mounted, setMounted] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showGoalModal, setShowGoalModal] = useState(false);
    
    // Daily goals hook
    const { presets, preferences, setDifficulty, isLoading: isLoadingGoals } = useDailyGoals();

    useEffect(() => {
        setMounted(true);
        if (user) {
            setDisplayName(user.display_name || '');
            setAvatarUrl(user.avatar_url || `https://placehold.co/128x128/00bf8f/ffffff?text=${(user.display_name || 'S').charAt(0)}`);
            setSelectedExamBoards(user.exam_boards || []);
            setSelectedCountry(user.country || '');
            // Load notification preferences if stored
            if ((user as any).notification_preferences) {
                setNotifications(prev => ({ ...prev, ...(user as any).notification_preferences }));
            }
        }
    }, [user]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            toast({ variant: 'destructive', title: 'Error', description: 'Not authenticated.' });
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('users')
                .update({
                    display_name: displayName,
                    avatar_url: avatarUrl
                })
                .eq('id', user.id);

            if (error) throw error;
            toast({ title: 'Success', description: 'Your profile has been updated.' });
        } catch (error) {
            console.error('Error updating profile:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update profile.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveExamBoards = async () => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Error', description: 'Not authenticated.' });
            return;
        }

        if (selectedExamBoards.length === 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select at least one exam board.' });
            return;
        }

        setIsSavingExamBoards(true);
        try {
            const { error } = await supabase
                .from('users')
                .update({
                    exam_boards: selectedExamBoards,
                    onboarding_completed: true
                })
                .eq('id', user.id);

            if (error) throw error;
            toast({ title: 'Success', description: 'Your exam board preferences have been saved.' });
        } catch (error) {
            console.error('Error updating exam boards:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update exam boards.' });
        } finally {
            setIsSavingExamBoards(false);
        }
    };

    const handleSaveCountry = async () => {
        if (!user) return;
        
        setIsSavingCountry(true);
        try {
            const { error } = await supabase
                .from('users')
                .update({ country: selectedCountry })
                .eq('id', user.id);

            if (error) throw error;
            toast({ title: 'Success', description: 'Your country has been updated.' });
        } catch (error) {
            console.error('Error updating country:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update country.' });
        } finally {
            setIsSavingCountry(false);
        }
    };

    const handleSaveNotifications = async () => {
        if (!user) return;
        
        setIsSavingNotifications(true);
        try {
            // Try to update notification preferences if column exists
                let updateError = null;
                try {
                    const { error } = await supabase
                        .from('users')
                        .update({ notification_preferences: notifications })
                        .eq('id', user.id);
                    updateError = error;
                } catch (e) {
                    // Column doesn't exist, skip
                    console.log('Notification preferences column not available');
                }

            if (updateError) throw updateError;
            toast({ title: 'Success', description: 'Notification preferences saved.' });
        } catch (error) {
            console.error('Error updating notifications:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save notification preferences.' });
        } finally {
            setIsSavingNotifications(false);
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
    };

    const handlePasswordReset = async () => {
        if (!user?.email) return;
        
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                redirectTo: `${window.location.origin}/auth/callback?next=/student/settings`,
            });
            
            if (error) throw error;
            toast({ title: 'Email Sent', description: 'Check your email for a password reset link.' });
        } catch (error) {
            console.error('Error sending reset email:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to send password reset email.' });
        }
    };


    if (!mounted || isUserLoading) {
        return (
            <div className="space-y-8">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">Please log in to view settings.</p>
            </div>
        );
    }

    const email = user.email || 'student@example.com';
    const usernameInitial = (displayName || 'S').charAt(0);
    const isSubscribed = user.subscription_tier === 'pro' || user.subscription_tier === 'essential';


    return (
        <div>
            <h2 className="text-3xl font-bold text-foreground mb-2">Settings</h2>
            <p className="text-muted-foreground mb-8">Manage your account preferences and settings</p>
            
            <div className="max-w-3xl space-y-6">
                {/* Profile Information */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center"><User className="mr-2 h-5 w-5" /> Profile Information</CardTitle>
                        <CardDescription>Manage your public profile and account details.</CardDescription>
                    </CardHeader>
                     <form onSubmit={handleSaveProfile}>
                        <CardContent className="space-y-6">
                            <div className="flex items-center space-x-6">
                                <Avatar className="h-24 w-24">
                                    <AvatarImage src={avatarUrl} alt={displayName} />
                                    <AvatarFallback className="text-2xl">{usernameInitial}</AvatarFallback>
                                </Avatar>
                                <div className="space-y-2">
                                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Upload Photo
                                    </Button>
                                    <Input 
                                        id="file-upload" 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        onChange={handleFileChange} 
                                        accept="image/*" 
                                    />
                                    <p className="text-xs text-muted-foreground">Or choose an avatar:</p>
                                    <div className="flex space-x-2">
                                        {avatars.map((av, index) => (
                                            <button key={index} type="button" onClick={() => setAvatarUrl(av)} className={`rounded-full overflow-hidden border-2 transition-all ${avatarUrl === av ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-muted-foreground/50'}`}>
                                                <Avatar className="h-10 w-10">
                                                    <AvatarImage src={av} />
                                                </Avatar>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <Label htmlFor="displayName">Full Name</Label>
                                    <Input 
                                        id="displayName"
                                        type="text" 
                                        value={displayName} 
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        className="mt-1" 
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input id="email" type="email" value={email} className="mt-1 bg-muted/50" disabled />
                                    <p className="text-xs text-muted-foreground mt-1"></p>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                             <Button type="submit" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {isLoading ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>

                {/* Exam Board Preference */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <GraduationCap className="mr-2 h-5 w-5" /> 
                            Exam Board Preferences
                        </CardTitle>
                        <CardDescription>
                            Select the exam boards you're studying. Content will be filtered based on your selection.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <ExamBoardSelector
                            selectedBoards={selectedExamBoards}
                            onSelectionChange={setSelectedExamBoards}
                        />
                        {selectedExamBoards.length > 0 && (
                            <p className="text-sm text-muted-foreground">
                                <Check className="inline h-4 w-4 text-green-500 mr-1" />
                                {selectedExamBoards.length} exam board{selectedExamBoards.length > 1 ? 's' : ''} selected: {' '}
                                {selectedExamBoards.map(id => EXAM_BOARDS.find(b => b.id === id)?.shortName).join(', ')}
                            </p>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button 
                            onClick={handleSaveExamBoards} 
                            disabled={isSavingExamBoards || selectedExamBoards.length === 0}
                        >
                            {isSavingExamBoards ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {isSavingExamBoards ? 'Saving...' : 'Save Exam Boards'}
                        </Button>
                    </CardFooter>
                </Card>

                {/* Country/Region */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Globe className="mr-2 h-5 w-5" /> 
                            Country / Region
                        </CardTitle>
                        <CardDescription>
                            Your country helps us customize content and recommendations.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                            <SelectTrigger className="w-full max-w-xs">
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
                    </CardContent>
                    <CardFooter>
                        <Button 
                            onClick={handleSaveCountry} 
                            disabled={isSavingCountry || !selectedCountry}
                        >
                            {isSavingCountry ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {isSavingCountry ? 'Saving...' : 'Save Country'}
                        </Button>
                    </CardFooter>
                </Card>

                {/* Appearance */}
                <Card>
                     <CardHeader>
                         <CardTitle className="flex items-center"><Sun className="mr-2 h-5 w-5"/> Appearance</CardTitle>
                         <CardDescription>Customize the look and feel of the application.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div>
                            <Label className="text-sm font-medium">Theme</Label>
                            <div className="mt-3 grid grid-cols-2 gap-4">
                                <button 
                                    onClick={() => setTheme('light')} 
                                    className={`p-4 rounded-lg border-2 transition-all ${theme === 'light' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                                >
                                    <div className="flex items-center space-x-3">
                                        <Sun className="w-6 h-6 text-yellow-500"/>
                                        <span className="font-semibold">Light Mode</span>
                                    </div>
                                </button>
                                <button 
                                    onClick={() => setTheme('dark')} 
                                    className={`p-4 rounded-lg border-2 transition-all ${theme === 'dark' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                                >
                                    <div className="flex items-center space-x-3">
                                        <Moon className="w-6 h-6 text-blue-500"/>
                                        <span className="font-semibold">Dark Mode</span>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Daily Goals */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center"><Target className="mr-2 h-5 w-5" /> Daily Goals</CardTitle>
                        <CardDescription>Set your daily XP target and study goals.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label className="text-sm font-medium mb-3 block">Current Goal Difficulty</Label>
                            <div className="p-4 rounded-lg border-2 border-primary bg-primary/5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-lg capitalize">
                                            {preferences?.preferred_difficulty || 'Regular'}
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {preferences?.preferred_difficulty === 'casual' && '25 XP per day - Perfect for light study sessions'}
                                            {preferences?.preferred_difficulty === 'regular' && '50 XP per day - Balanced daily practice'}
                                            {preferences?.preferred_difficulty === 'serious' && '75 XP per day - Dedicated study routine'}
                                            {preferences?.preferred_difficulty === 'intense' && '100 XP per day - Maximum commitment'}
                                            {!preferences?.preferred_difficulty && '50 XP per day - Balanced daily practice'}
                                        </p>
                                    </div>
                                    <div className="text-3xl">
                                        {preferences?.preferred_difficulty === 'casual' && '🌱'}
                                        {preferences?.preferred_difficulty === 'regular' && '📚'}
                                        {preferences?.preferred_difficulty === 'serious' && '🔥'}
                                        {preferences?.preferred_difficulty === 'intense' && '💪'}
                                        {!preferences?.preferred_difficulty && '📚'}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <Button 
                            onClick={() => setShowGoalModal(true)} 
                            variant="outline" 
                            className="w-full"
                            disabled={isLoadingGoals}
                        >
                            {isLoadingGoals ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Target className="mr-2 h-4 w-4" />}
                            Change Daily Goal
                        </Button>
                    </CardContent>
                </Card>

                {/* Notifications */}
                <Card>
                     <CardHeader>
                        <CardTitle className="flex items-center"><Bell className="mr-2 h-5 w-5" /> Notifications</CardTitle>
                        <CardDescription>Manage how you receive notifications and updates.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>New Badges Earned</Label>
                                <p className="text-sm text-muted-foreground">Get notified when you earn new badges</p>
                            </div>
                            <Switch 
                                checked={notifications.newBadges} 
                                onCheckedChange={(checked) => setNotifications(p => ({ ...p, newBadges: checked }))}
                            />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Quiz Reminders</Label>
                                <p className="text-sm text-muted-foreground">Reminders for scheduled quizzes and practice</p>
                            </div>
                            <Switch 
                                checked={notifications.quizReminders} 
                                onCheckedChange={(checked) => setNotifications(p => ({ ...p, quizReminders: checked }))}
                            />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Weekly Progress Report</Label>
                                <p className="text-sm text-muted-foreground">Receive a weekly summary of your progress</p>
                            </div>
                            <Switch 
                                checked={notifications.weeklyProgress} 
                                onCheckedChange={(checked) => setNotifications(p => ({ ...p, weeklyProgress: checked }))}
                            />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>New Content Alerts</Label>
                                <p className="text-sm text-muted-foreground">Get notified when new study materials are added</p>
                            </div>
                            <Switch 
                                checked={notifications.newContent} 
                                onCheckedChange={(checked) => setNotifications(p => ({ ...p, newContent: checked }))}
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleSaveNotifications} disabled={isSavingNotifications}>
                            {isSavingNotifications ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {isSavingNotifications ? 'Saving...' : 'Save Preferences'}
                        </Button>
                    </CardFooter>
                </Card>

                {/* Security */}
                <Card>
                     <CardHeader>
                        <CardTitle className="flex items-center"><ShieldCheck className="mr-2 h-5 w-5" /> Security</CardTitle>
                        <CardDescription>Manage your account security settings.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Password</p>
                                <p className="text-sm text-muted-foreground">Change your account password</p>
                            </div>
                            <Button variant="secondary" onClick={handlePasswordReset}>
                                Reset Password
                            </Button>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Sign Out</p>
                                <p className="text-sm text-muted-foreground">Sign out from all devices</p>
                            </div>
                            <Button variant="outline" onClick={handleSignOut}>
                                <LogOut className="mr-2 h-4 w-4" />
                                Sign Out
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Subscription */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center"><CreditCard className="mr-2 h-5 w-5" /> Subscription</CardTitle>
                        <CardDescription>Manage your subscription and billing.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <div className={`p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${isSubscribed ? 'bg-green-500/10 border border-green-500/30' : 'bg-primary/10 border border-primary'}`}>
                            <div>
                                <p className={`font-bold ${isSubscribed ? 'text-green-600 dark:text-green-400' : 'text-primary'}`}>
                                    {isSubscribed ? (user.subscription_tier === 'pro' ? 'Pro Plan' : 'Essential Plan') : 'Free Plan'}
                                </p>
                                <p className={`text-sm ${isSubscribed ? 'text-green-600/80 dark:text-green-400/80' : 'text-primary/80'}`}>
                                    {isSubscribed ? 'Your premium access is active.' : 'Upgrade to unlock all features and content.'}
                                </p>
                            </div>
                            <Button variant={isSubscribed ? 'secondary' : 'default'} asChild>
                                <Link href="/pricing">
                                    {isSubscribed ? 'Manage Subscription' : 'Upgrade Now'}
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

            </div>

            {/* Goal Selection Modal */}
            <GoalSelectionModal
                isOpen={showGoalModal}
                onClose={() => setShowGoalModal(false)}
                presets={presets.length > 0 ? presets : [
                    { id: '1', difficulty: 'casual', display_name: 'Casual', description: '5 mins a day', xp_target: 25, questions_target: 5, time_target_minutes: 5, xp_bonus: 5, icon: '🌱', sort_order: 1 },
                    { id: '2', difficulty: 'regular', display_name: 'Regular', description: '10 mins a day', xp_target: 50, questions_target: 10, time_target_minutes: 10, xp_bonus: 10, icon: '📚', sort_order: 2 },
                    { id: '3', difficulty: 'serious', display_name: 'Serious', description: '15 mins a day', xp_target: 75, questions_target: 15, time_target_minutes: 15, xp_bonus: 15, icon: '🔥', sort_order: 3 },
                    { id: '4', difficulty: 'intense', display_name: 'Intense', description: '20 mins a day', xp_target: 100, questions_target: 25, time_target_minutes: 20, xp_bonus: 25, icon: '💪', sort_order: 4 },
                ]}
                currentDifficulty={preferences?.preferred_difficulty || 'regular'}
                onSelect={async (difficulty) => {
                    await setDifficulty(difficulty);
                    setShowGoalModal(false);
                    
                    // Trigger event to notify dashboard to refresh
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('goal_preference_changed', {
                            detail: { difficulty }
                        }));
                    }
                    
                    toast({ 
                        title: 'Daily Goal Updated', 
                        description: `Your daily goal has been set to ${difficulty} difficulty.` 
                    });
                }}
            />
        </div>
    );
}
