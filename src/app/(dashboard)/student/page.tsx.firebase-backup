
'use client';

import React from 'react';
import { Star, Flame, Award, BookOpen, Bookmark } from 'lucide-react';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { useUser, useFirestore } from '@/firebase';
import { useClasses } from '@/hooks/use-classes';
import { Button } from '@/components/ui/button';
import { allSubjects } from '@/lib/subjects';
import type { Assignment, Quiz, Note } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, documentId } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { ChevronRight } from 'lucide-react';


const MyAssignments = () => {
    const { classes, isLoading: isLoadingClasses } = useClasses();
    const firestore = useFirestore();

    const classIds = React.useMemo(() => classes?.map(c => c.id) || [], [classes]);

    const assignmentsQuery = useMemoFirebase(() => {
        if (!firestore || classIds.length === 0) return null;
        // Firestore 'in' queries are limited to 30 items.
        // For apps with more classes, this would need to be chunked.
        return query(collection(firestore, 'assignments'), where('classId', 'in', classIds.slice(0, 30)));
    }, [firestore, classIds]);
    const { data: assignments, isLoading: isLoadingAssignments } = useCollection<Assignment>(assignmentsQuery);

    const quizIds = React.useMemo(() => assignments?.map(a => a.quizId) || [], [assignments]);

    const quizzesQuery = useMemoFirebase(() => {
        if (!firestore || quizIds.length === 0) return null;
        return query(collection(firestore, 'quizzes'), where(documentId(), 'in', quizIds.slice(0, 30)));
    }, [firestore, quizIds]);
    const { data: quizzes, isLoading: isLoadingQuizzes } = useCollection<Quiz>(quizzesQuery);

    const fullAssignments = React.useMemo(() => {
        if (!assignments || !quizzes) return [];
        return assignments.map(assignment => {
            const quiz = quizzes.find(q => q.id === assignment.quizId);
            const classInfo = classes?.find(c => c.id === assignment.classId);
            return {
                ...assignment,
                subjectSlug: quiz?.subject,
                topicSlug: quiz?.topic,
                className: classInfo?.name,
            };
        }).sort((a, b) => a.dueDate.toDate().getTime() - b.dueDate.toDate().getTime());
    }, [assignments, quizzes, classes]);
    
    const isLoading = isLoadingClasses || (classIds.length > 0 && (isLoadingAssignments || isLoadingQuizzes));

    return (
        <Card>
            <CardHeader>
                <CardTitle>My Assignments</CardTitle>
                 <CardDescription>Quizzes and tasks assigned by your teachers.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-3">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                ) : fullAssignments && fullAssignments.length > 0 ? (
                     <div className="space-y-4">
                        {fullAssignments.map(assignment => (
                            <div key={assignment.id} className="bg-muted/50 p-4 rounded-xl border">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-foreground">{assignment.quizTitle}</h4>
                                        <p className="text-sm text-muted-foreground capitalize">{assignment.className}</p>
                                    </div>
                                    <span className="text-xs font-semibold bg-amber-100 text-amber-800 px-2 py-1 rounded-full dark:bg-amber-900/50 dark:text-amber-300">
                                        Due {formatDistanceToNow(assignment.dueDate.toDate(), { addSuffix: true })}
                                    </span>
                                </div>
                                <div className="flex justify-end mt-4">
                                    <Button asChild size="sm" disabled={!assignment.subjectSlug || !assignment.topicSlug}>
                                        <Link href={`/dashboard/subjects/${assignment.subjectSlug}/${assignment.topicSlug}/quiz?classId=${assignment.classId}`}>
                                            Start Assignment
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        ))}
                     </div>
                ) : (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                        <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" />
                        <h3 className="text-lg font-semibold text-foreground mt-3">No Assignments Due</h3>
                        <p className="text-muted-foreground mt-1">Your teacher hasn't assigned any new work.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

const MySavedNotes = () => {
    const { profile } = useUser();
    const firestore = useFirestore();
    const savedNoteIds = profile?.savedNoteIds || [];

    const notesQuery = useMemoFirebase(() => {
        if (!firestore || savedNoteIds.length === 0) return null;
        // Firestore 'in' query limit is 30. For apps with more saved notes, pagination would be needed.
        return query(collection(firestore, 'notes'), where(documentId(), 'in', savedNoteIds.slice(0, 30)));
    }, [firestore, savedNoteIds]);

    const { data: savedNotes, isLoading } = useCollection<Note>(notesQuery);

    return (
        <Card>
            <CardHeader>
                <CardTitle>My Saved Notes</CardTitle>
                <CardDescription>Your bookmarked notes for quick access.</CardDescription>
            </CardHeader>
            <CardContent>
                 {isLoading ? (
                    <div className="space-y-3">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ) : savedNotes && savedNotes.length > 0 ? (
                    <div className="space-y-2">
                        {savedNotes.map(note => (
                            <Link key={note.id} href={`/dashboard/subjects/${note.subjectId}/${note.topicId.split('-').slice(1).join('-')}/notes`}>
                                <div className="flex items-center p-3 rounded-lg hover:bg-muted/50 transition-colors">
                                    <Bookmark className="h-5 w-5 mr-3 text-primary flex-shrink-0" />
                                    <span className="font-medium text-foreground">{note.title}</span>
                                    <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 border-2 border-dashed rounded-lg">
                        <Bookmark className="mx-auto h-8 w-8 text-muted-foreground" />
                        <h3 className="text-lg font-semibold text-foreground mt-3">No Saved Notes</h3>
                        <p className="text-muted-foreground mt-1">Click the 'Save' button on a note to add it here.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};


export default function DashboardPage() {
  const { user, profile } = useUser();
  
  const username = profile?.displayName || user?.displayName || 'Learner';
  const userActiveSubjects = profile?.activeSubjects;

  const userGamification = {
    xp: profile?.xp || 0,
    streak: profile?.streak || 0,
    badges: 0 
  };

  const activeSubjects = allSubjects.filter(subject => userActiveSubjects?.includes(subject.slug));
  
  return (
    <div className="space-y-8">
        
        <div>
            <h2 className="text-3xl font-bold text-foreground">Welcome back, {username}! 👋</h2>
            <p className="text-muted-foreground mt-1">Let's make today a productive day.</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="flex items-center p-4">
                <div className="p-3 rounded-full bg-amber-500/10"><Star className="w-6 h-6 text-amber-500" /></div>
                <div className="ml-4">
                    <p className="text-2xl font-bold text-foreground">{userGamification.xp.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Total XP</p>
                </div>
            </Card>
             <Card className="flex items-center p-4">
                <div className="p-3 rounded-full bg-red-500/10"><Flame className="w-6 h-6 text-red-500" /></div>
                <div className="ml-4">
                    <p className="text-2xl font-bold text-foreground">{userGamification.streak} Days</p>
                    <p className="text-sm text-muted-foreground">Learning Streak</p>
                </div>
            </Card>
            <Card className="flex items-center p-4">
                <div className="p-3 rounded-full bg-blue-500/10"><Award className="w-6 h-6 text-blue-500" /></div>
                <div className="ml-4">
                    <p className="text-2xl font-bold text-foreground">{userGamification.badges}</p>
                    <p className="text-sm text-muted-foreground">Badges Earned</p>
                </div>
            </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-8">
                <MyAssignments />
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-foreground">My Subjects</h3>
                    <Button asChild variant="outline">
                      <Link href="/dashboard/subjects/add">View All Subjects</Link>
                    </Button>
                  </div>
                    {activeSubjects.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {activeSubjects.map(subject => (
                                <Link key={subject.slug} href={`/dashboard/subjects/${subject.slug}`} className="group">
                                  <Card className="group-hover:border-primary group-hover:shadow-lg transition-all duration-300 flex flex-col justify-between h-full">
                                    <CardHeader>
                                        <div className="mb-4 bg-muted w-fit p-3 rounded-lg"><subject.icon className="w-8 h-8 text-primary" /></div>
                                        <CardTitle className="text-xl">{subject.name}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Progress value={0} className="h-2" />
                                        <p className="text-sm mt-2 text-muted-foreground">{0}% Complete</p>
                                    </CardContent>
                                   </Card>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-background rounded-2xl border border-dashed">
                             <h3 className="text-lg font-semibold text-foreground">No Subjects Added Yet</h3>
                             <p className="text-muted-foreground mt-2 mb-4">Add subjects to your dashboard to start learning.</p>
                             <Button asChild>
                                 <Link href="/dashboard/subjects/add">Add Subjects</Link>
                             </Button>
                        </div>
                    )}
                </div>
            </div>
            <div className="lg:col-span-1 space-y-8">
                <MySavedNotes />
            </div>
        </div>
    </div>
  );
}
