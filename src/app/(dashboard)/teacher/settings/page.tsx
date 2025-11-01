'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@/hooks/use-user';
import { useTheme } from 'next-themes';
import { 
    Bell, Sun, Moon, ShieldCheck, User, Upload, CreditCard, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';


const avatars = [
    'https://placehold.co/128x128/3b82f6/ffffff?text=D',
    'https://placehold.co/128x128/f97316/ffffff?text=T',
    'https://placehold.co/128x128/16a34a/ffffff?text=M',
    'https://placehold.co/128x128/9333ea/ffffff?text=P',
];

function SettingsPage() {
    const { user } = useUser();
    const supabase = createClient();
    const { toast } = useToast();
    const { theme, setTheme } = useTheme();

    const [displayName, setDisplayName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [notifications, setNotifications] = useState({ requests: true, submissions: true });
    const [mounted, setMounted] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setMounted(true);
        if (user) {
            setDisplayName(user.display_name || '');
            setAvatarUrl(user.avatar_url || `https://placehold.co/128x128/3b82f6/ffffff?text=${(user.display_name || 'T').charAt(0)}`);
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

    const handleSaveChanges = async (e: React.FormEvent) => {
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
    
    if (!mounted || !user) {
        return null; // or a loading skeleton
    }

    const email = user.email || 'teacher@example.com';
    const usernameInitial = (displayName || 'T').charAt(0);

    return (
        <div>
            <h2 className="text-3xl font-bold text-foreground mb-8">Settings</h2>
            <div className="max-w-3xl space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center"><User className="mr-2 h-5 w-5" /> Profile Information</CardTitle>
                        <CardDescription>Manage your account details.</CardDescription>
                    </CardHeader>
                     <form onSubmit={handleSaveChanges}>
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
                        <CardTitle className="flex items-center"><Bell className="mr-2 h-5 w-5"/> Notifications</CardTitle>
                        <CardDescription>Manage how you receive notifications.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                            <p className="text-muted-foreground">Email on new student requests</p>
                            <button onClick={() => setNotifications(p=>({...p, requests: !p.requests}))} className={`w-12 h-6 rounded-full p-1 transition-colors ${notifications.requests ? 'bg-primary' : 'bg-muted'}`}>
                                <div className={`w-4 h-4 rounded-full bg-background transform transition-transform ${notifications.requests ? 'translate-x-6' : ''}`}></div>
                            </button>
                        </div>
                        <div className="flex justify-between items-center">
                            <p className="text-muted-foreground">Email on assessment submissions</p>
                            <button onClick={() => setNotifications(p=>({...p, submissions: !p.submissions}))} className={`w-12 h-6 rounded-full p-1 transition-colors ${notifications.submissions ? 'bg-primary' : 'bg-muted'}`}>
                                <div className={`w-4 h-4 rounded-full bg-background transform transition-transform ${notifications.submissions ? 'translate-x-6' : ''}`}></div>
                            </button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center"><ShieldCheck className="mr-2 h-5 w-5"/> Security</CardTitle>
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
                                <p className="font-bold text-primary">Teacher Plan</p>
                                <p className="text-sm text-primary/80">Your teacher account benefits are active.</p>
                            </div>
                            <Button variant="secondary">Manage Subscription</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
      </div>
    );
}

export default SettingsPage;
