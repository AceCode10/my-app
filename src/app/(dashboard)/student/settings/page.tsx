'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@/hooks/use-user';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Sun, Moon, ShieldCheck, Bell, User, Upload, CreditCard, Loader2, GraduationCap, Check } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { ExamBoardSelector } from '@/components/exam-board-selector';
import { EXAM_BOARDS } from '@/lib/exam-boards';
import { Skeleton } from '@/components/ui/skeleton';

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

    const [displayName, setDisplayName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [selectedExamBoards, setSelectedExamBoards] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSavingExamBoards, setIsSavingExamBoards] = useState(false);
    const [notifications, setNotifications] = useState({ newBadges: true, quizReminders: true });
    const [mounted, setMounted] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setMounted(true);
        if (user) {
            setDisplayName(user.display_name || '');
            setAvatarUrl(user.avatar_url || `https://placehold.co/128x128/00bf8f/ffffff?text=${(user.display_name || 'S').charAt(0)}`);
            setSelectedExamBoards(user.exam_boards || []);
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
            <h2 className="text-3xl font-bold text-foreground mb-8">Settings</h2>
            <div className="max-w-3xl space-y-8">
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
                                    <AvatarFallback>{usernameInitial}</AvatarFallback>
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
                                            <button key={index} type="button" onClick={() => setAvatarUrl(av)} className={`rounded-full overflow-hidden border-2 ${avatarUrl === av ? 'border-primary' : 'border-transparent'}`}>
                                                <Avatar className="h-10 w-10">
                                                    <AvatarImage src={av} />
                                                </Avatar>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-foreground">Full Name</label>
                                    <Input 
                                        type="text" 
                                        value={displayName} 
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        className="mt-1 w-full" 
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-foreground">Email Address</label>
                                    <Input type="email" value={email} className="mt-1 w-full bg-muted/50" disabled />
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

                <Card>
                     <CardHeader>
                         <CardTitle className="flex items-center"><Sun className="mr-2 h-5 w-5"/> Appearance</CardTitle>
                         <CardDescription>Customize the look and feel of the application.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div>
                            <label className="text-sm font-medium text-foreground">Theme</label>
                            <div className="mt-2 grid grid-cols-2 gap-4">
                                <button onClick={() => setTheme('light')} className={`p-4 rounded-lg border-2 ${theme === 'light' ? 'border-primary' : 'border'}`}><div className="flex items-center space-x-3"><Sun className="w-6 h-6 text-yellow-500"/> <span className="font-semibold">Light Mode</span></div></button>
                                <button onClick={() => setTheme('dark')} className={`p-4 rounded-lg border-2 ${theme === 'dark' ? 'border-primary' : 'border'}`}><div className="flex items-center space-x-3"><Moon className="w-6 h-6 text-blue-500"/> <span className="font-semibold">Dark Mode</span></div></button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                     <CardHeader>
                        <CardTitle className="flex items-center"><Bell className="mr-2 h-5 w-5" /> Notifications</CardTitle>
                        <CardDescription>Manage how you receive notifications.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                            <p className="text-muted-foreground">Notify me about new badges earned</p>
                            <button onClick={() => setNotifications(p => ({ ...p, newBadges: !p.newBadges }))} className={`w-12 h-6 rounded-full p-1 transition-colors ${notifications.newBadges ? 'bg-primary' : 'bg-muted'}`}>
                                <div className={`w-4 h-4 rounded-full bg-background transform transition-transform ${notifications.newBadges ? 'translate-x-6' : ''}`}></div>
                            </button>
                        </div>
                        <div className="flex justify-between items-center">
                            <p className="text-muted-foreground">Send me reminders for scheduled quizzes</p>
                             <button onClick={() => setNotifications(p => ({ ...p, quizReminders: !p.quizReminders }))} className={`w-12 h-6 rounded-full p-1 transition-colors ${notifications.quizReminders ? 'bg-primary' : 'bg-muted'}`}>
                                <div className={`w-4 h-4 rounded-full bg-background transform transition-transform ${notifications.quizReminders ? 'translate-x-6' : ''}`}></div>
                            </button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                     <CardHeader>
                        <CardTitle className="flex items-center"><ShieldCheck className="mr-2 h-5 w-5" /> Security</CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-between items-center">
                        <p className="text-muted-foreground">Change your account password.</p>
                        <Button variant="secondary">Change Password</Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center"><CreditCard className="mr-2 h-5 w-5" /> Subscription</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <div className="p-4 bg-primary/10 border border-primary rounded-lg flex justify-between items-center">
                            <div>
                                <p className="font-bold text-primary">{isSubscribed ? 'Pro Plan' : 'Basic Plan'}</p>
                                {isSubscribed ? <p className="text-sm text-primary/80">Your premium access is active.</p> : <p className="text-sm text-primary/80">Upgrade to unlock all features.</p>}
                            </div>
                            <Button variant={isSubscribed ? 'secondary' : 'default'}>{isSubscribed ? 'Manage Subscription' : 'Upgrade Now'}</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
