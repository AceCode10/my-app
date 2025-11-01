
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { allSubjects } from '@/lib/subjects';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function AddSubjectsPage() {
    const router = useRouter();
    const { user, profile } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    // Initialize selected subjects from the user's current list
    const [selectedSubjects, setSelectedSubjects] = useState<string[]>(profile?.activeSubjects || []);
    const [isLoading, setIsLoading] = useState(false);

    const handleCheckboxChange = (subjectSlug: string) => {
        setSelectedSubjects(prev =>
            prev.includes(subjectSlug)
                ? prev.filter(slug => slug !== subjectSlug)
                : [...prev, subjectSlug]
        );
    };

    const handleSaveChanges = async () => {
        if (!user || !firestore) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to manage subjects.' });
            return;
        }
        
        setIsLoading(true);
        try {
            const userRef = doc(firestore, 'users', user.uid);
            // This is a simplified approach. For large arrays, a more complex transaction would be better.
            // But for this use case, we just set the array to the new selection.
            await updateDoc(userRef, {
                activeSubjects: selectedSubjects
            });

            toast({ title: 'Subjects Updated!', description: 'Your dashboard has been updated.' });
            router.push('/student');
        } catch (error) {
            console.error("Error updating subjects:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not save your subject preferences.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <div className="mb-8">
                <Button variant="ghost" asChild className="mb-4">
                    <Link href="/dashboard">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Link>
                </Button>
                <h2 className="text-3xl font-bold text-foreground">Manage My Subjects</h2>
                <p className="text-muted-foreground mt-1">Select the subjects you want to see on your dashboard.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Available Subjects</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {allSubjects.map(subject => {
                            const Icon = subject.icon;
                            return (
                                <Label
                                    key={subject.slug}
                                    htmlFor={subject.slug}
                                    className={cn(
                                        "flex items-center p-4 rounded-lg border bg-background hover:bg-muted/50 transition-colors cursor-pointer",
                                        selectedSubjects.includes(subject.slug) && "border-primary bg-primary/5"
                                    )}
                                >
                                    <Checkbox
                                        id={subject.slug}
                                        checked={selectedSubjects.includes(subject.slug)}
                                        onCheckedChange={() => handleCheckboxChange(subject.slug)}
                                        className="mr-4 h-5 w-5"
                                    />
                                    <div className="flex items-center space-x-3">
                                        <div className="bg-muted p-2 rounded-lg"><Icon className={cn('w-6 h-6', subject.color)} /></div>
                                        <span className="font-semibold text-foreground">{subject.name}</span>
                                    </div>
                                </Label>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            <div className="mt-8 flex justify-end">
                <Button onClick={handleSaveChanges} disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>
        </div>
    );
}
