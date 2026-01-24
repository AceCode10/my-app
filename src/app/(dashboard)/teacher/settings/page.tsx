'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@/hooks/use-user';
import { useTheme } from 'next-themes';
import { 
    Bell, Sun, Moon, ShieldCheck, User, Upload, CreditCard, Loader2, Globe, LogOut, GraduationCap, Check, School
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { COUNTRIES } from '@/lib/countries';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ExamBoardSelector } from '@/components/exam-board-selector';
import { EXAM_BOARDS } from '@/lib/exam-boards';

// Create supabase client outside component to prevent re-creation on every render
const supabase = createClient();

const avatars = [
    'https://placehold.co/128x128/3b82f6/ffffff?text=D',
    'https://placehold.co/128x128/f97316/ffffff?text=T',
    'https://placehold.co/128x128/16a34a/ffffff?text=M',
    'https://placehold.co/128x128/9333ea/ffffff?text=P',
];

function SettingsPage() {
    const { user, loading: isUserLoading } = useUser();
    const { toast } = useToast();
    const { theme, setTheme } = useTheme();
    const router = useRouter();

    const [displayName, setDisplayName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [schoolName, setSchoolName] = useState('');
    const [selectedExamBoards, setSelectedExamBoards] = useState<string[]>([]);
    const [selectedCountry, setSelectedCountry] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSavingExamBoards, setIsSavingExamBoards] = useState(false);
    const [isSavingCountry, setIsSavingCountry] = useState(false);
    const [notifications, setNotifications] = useState({ 
        studentRequests: true, 
        submissions: true,
        classUpdates: true,
        weeklyReport: false
    });
    const [isSavingNotifications, setIsSavingNotifications] = useState(false);
    const [mounted, setMounted] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setMounted(true);
        if (user) {
            setDisplayName(user.display_name || '');
            setAvatarUrl(user.avatar_url || `https://placehold.co/128x128/3b82f6/ffffff?text=${(user.display_name || 'T').charAt(0)}`);
            setSchoolName((user as any).school_name || '');
            setSelectedExamBoards(user.exam_boards || []);
            setSelectedCountry(user.country || '');
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
            // Prepare update object - only include fields that exist in database
                const updateData: any = {
                    display_name: displayName,
                    avatar_url: avatarUrl,
                };
                
                // Only include school_name if column exists (check by attempting to include it)
                try {
                    updateData.school_name = schoolName;
                } catch (e) {
                    // Skip school_name if column doesn't exist
                }
                
                const { error } = await supabase
                    .from('users')
                    .update(updateData)
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
        if (!user) return;

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
                redirectTo: `${window.location.origin}/auth/callback?next=/teacher/settings`,
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

    const email = user.email || 'teacher@example.com';
    const usernameInitial = (displayName || 'T').charAt(0);
    const isSubscribed = user.subscription_tier === 'pro';

    return (
        <div>
            <h2 className="text-3xl font-bold text-foreground mb-2">Settings</h2>
            <p className="text-muted-foreground mb-8">Manage your teacher account preferences and settings</p>
            
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
                            <div>
                                <Label htmlFor="schoolName">School / Institution</Label>
                                <div className="relative mt-1">
                                    <School className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        id="schoolName"
                                        type="text" 
                                        value={schoolName} 
                                        onChange={(e) => setSchoolName(e.target.value)}
                                        className="pl-10"
                                        placeholder="Enter your school name"
                                    />
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
                            Select the exam boards you teach. This helps filter content and resources.
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
                            disabled={isSavingExamBoards}
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
                
                {/* Notifications */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center"><Bell className="mr-2 h-5 w-5"/> Notifications</CardTitle>
                        <CardDescription>Manage how you receive notifications and updates.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Student Requests</Label>
                                <p className="text-sm text-muted-foreground">Get notified when students request to join your class</p>
                            </div>
                            <Switch 
                                checked={notifications.studentRequests} 
                                onCheckedChange={(checked) => setNotifications(p => ({ ...p, studentRequests: checked }))}
                            />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Assessment Submissions</Label>
                                <p className="text-sm text-muted-foreground">Get notified when students submit assessments</p>
                            </div>
                            <Switch 
                                checked={notifications.submissions} 
                                onCheckedChange={(checked) => setNotifications(p => ({ ...p, submissions: checked }))}
                            />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Class Updates</Label>
                                <p className="text-sm text-muted-foreground">Get notified about class activity and announcements</p>
                            </div>
                            <Switch 
                                checked={notifications.classUpdates} 
                                onCheckedChange={(checked) => setNotifications(p => ({ ...p, classUpdates: checked }))}
                            />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Weekly Class Report</Label>
                                <p className="text-sm text-muted-foreground">Receive a weekly summary of class performance</p>
                            </div>
                            <Switch 
                                checked={notifications.weeklyReport} 
                                onCheckedChange={(checked) => setNotifications(p => ({ ...p, weeklyReport: checked }))}
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
                        <CardTitle className="flex items-center"><ShieldCheck className="mr-2 h-5 w-5"/> Security</CardTitle>
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
                                    {isSubscribed ? 'Teacher Plan' : 'Free Plan'}
                                </p>
                                <p className={`text-sm ${isSubscribed ? 'text-green-600/80 dark:text-green-400/80' : 'text-primary/80'}`}>
                                    {isSubscribed ? 'Your teacher account benefits are active.' : 'Upgrade to unlock all teacher features.'}
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
      </div>
    );
}

export default SettingsPage;
