

'use client';

import React, { useState, useMemo } from 'react';
import { 
    Users, PlusCircle, BookOpen, ArrowRight, Book, Activity, Bell
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { CreateClassModal } from '@/components/teacher/create-class-modal';
import { useClasses } from '@/hooks/use-classes';
import { allSubjects } from '@/lib/subjects';
import { Skeleton } from '@/components/ui/skeleton';
import { ContentSeeder } from '@/components/content-seeder';
import { collection, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import type { QuizAttempt, Class } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

const getSubjectVisuals = (subjectName: string) => {
    const subjectData = allSubjects.find(s => s.name.toLowerCase().includes(subjectName.toLowerCase().split(' ')[0]));
    if (subjectData) {
        return { icon: <subjectData.icon />, color: subjectData.color };
    }
    return { icon: <Book />, color: 'text-gray-500' };
};

const RecentActivity = () => {
    const { user, firestore } = useUser();
    const { classes, isLoading: isLoadingClasses } = useClasses();

    const classIds = useMemo(() => classes?.map(c => c.id) || [], [classes]);

    const attemptsQuery = useMemoFirebase(() => {
        if (!firestore || classIds.length === 0) return null;
        return query(
            collection(firestore, 'quizAttempts'),
            where('classId', 'in', classIds.slice(0,10)),
            orderBy('completedAt', 'desc'),
            limit(5)
        );
    }, [firestore, classIds]);
    
    const { data: recentAttempts, isLoading: isLoadingAttempts } = useCollection<QuizAttempt>(attemptsQuery);
    
    const pendingRequests = useMemo(() => {
        if (!classes) return [];
        return classes.flatMap(c => 
            (c.pendingStudentIds || []).map(studentId => ({
                type: 'request',
                classId: c.id,
                className: c.name,
                // In a real app, we'd fetch student names, but for this component, we'll keep it simple.
                message: `New request to join ${c.name}`, 
                date: new Date() // Placeholder date
            }))
        );
    }, [classes]);

    const formattedAttempts = useMemo(() => {
        if (!recentAttempts) return [];
        return recentAttempts.map(attempt => {
             const className = classes?.find(c => c.id === attempt.classId)?.name || '';
             return {
                type: 'submission',
                message: `New submission for "${attempt.topic}" quiz in ${className}`,
                date: (attempt.completedAt as Timestamp)?.toDate(),
                classId: attempt.classId
            }
        });
    }, [recentAttempts, classes]);

    const activities = useMemo(() => {
        const combined = [...pendingRequests, ...formattedAttempts];
        return combined.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 7);
    }, [pendingRequests, formattedAttempts]);

    const isLoading = isLoadingClasses || isLoadingAttempts;

    if (isLoading) {
        return (
            <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
            </div>
        )
    }
    
    if (activities.length === 0) {
        return (
            <div className="text-center py-10 border-2 border-dashed rounded-lg">
                <Bell className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">No recent activity in your classes.</p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {activities.map((activity, index) => (
                <Link href={`/teacher/dashboard/classes/${activity.classId}`} key={index}>
                    <div className="flex items-center space-x-4 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                        <Avatar>
                            <AvatarFallback>
                                {activity.type === 'request' ? <Users className="h-4 w-4"/> : <BookOpen className="h-4 w-4"/>}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{activity.message}</p>
                            <p className="text-xs text-muted-foreground">{formatDistanceToNow(activity.date, { addSuffix: true })}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground"/>
                    </div>
                </Link>
            ))}
        </div>
    )
}


const DashboardView = ({ 
    onNewClassClick, 
    classes,
    isLoadingClasses,
}: { 
    onNewClassClick: () => void, 
    classes: ReturnType<typeof useClasses>['classes'],
    isLoadingClasses: boolean,
}) => {
    const { user } = useUser();
    const username = user?.displayName || 'Teacher';
    const router = useRouter();
    
    const totalStudents = classes ? classes.reduce((acc, curr) => acc + (curr.studentIds?.length || 0), 0) : 0;
    const totalPending = classes ? classes.reduce((acc, curr) => acc + (curr.pendingStudentIds?.length || 0), 0) : 0;

    return (
    <div>
        <ContentSeeder />
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-8">
            <div>
                <h2 className="text-3xl font-bold text-foreground">Welcome back, {username}!</h2>
                <p className="text-muted-foreground mt-1">Here's a summary of your teaching dashboard.</p>
            </div>
            <div className="flex space-x-2 mt-4 md:mt-0">
                <Button onClick={onNewClassClick}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create New Class
                </Button>
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-background p-4 rounded-xl shadow-sm border"><div className="flex items-center space-x-4"><div className="p-3 rounded-full bg-blue-500/10"><Users className="w-6 h-6 text-blue-500"/></div><div><p className="text-2xl font-bold text-foreground">{isLoadingClasses ? <Skeleton className="h-8 w-12"/> : classes?.length || 0}</p><p className="text-sm text-muted-foreground">Active Classes</p></div></div></div>
            <div className="bg-background p-4 rounded-xl shadow-sm border"><div className="flex items-center space-x-4"><div className="p-3 rounded-full bg-green-500/10"><Users className="w-6 h-6 text-green-500"/></div><div><p className="text-2xl font-bold text-foreground">{isLoadingClasses ? <Skeleton className="h-8 w-12"/> : totalStudents}</p><p className="text-sm text-muted-foreground">Total Students</p></div></div></div>
            <div className="bg-background p-4 rounded-xl shadow-sm border"><div className="flex items-center space-x-4"><div className="p-3 rounded-full bg-yellow-500/10"><Activity className="w-6 h-6 text-yellow-500"/></div><div><p className="text-2xl font-bold text-foreground">{isLoadingClasses ? <Skeleton className="h-8 w-12"/> : totalPending}</p><p className="text-sm text-muted-foreground">Pending Requests</p></div></div></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-background p-4 sm:p-6 rounded-2xl shadow-sm border">
                <div className="flex justify-between items-center mb-4">
                     <h3 className="font-bold text-foreground text-lg">My Classes</h3>
                     <Button variant="link" onClick={() => router.push('/teacher/dashboard/classes')}>View All</Button>
                </div>
                {isLoadingClasses ? (
                    <div className="space-y-4">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                ) : !classes || classes.length === 0 ? (
                     <div className="text-center py-10 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">You haven't created any classes yet.</p>
                        <Button variant="link" className="mt-2" onClick={onNewClassClick}>Create one now</Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {classes.slice(0, 5).map(c => { // Show first 5 classes on dashboard
                             const { icon, color } = getSubjectVisuals(c.subject);
                            return (
                            <div key={c.id} className="p-4 border rounded-lg hover:bg-muted/50">
                               <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                                    <div className="flex items-center space-x-3">
                                        <div className={'p-2 rounded-md bg-muted'}>{React.cloneElement(icon as React.ReactElement, {className: "w-5 h-5 text-primary"})}</div>
                                        <div>
                                            <h4 className="font-bold text-foreground">{c.name}</h4>
                                            <p className="text-sm text-muted-foreground">{c.studentIds?.length || 0} students • {c.pendingStudentIds?.length || 0} pending</p>
                                        </div>
                                    </div>
                                    <div className="flex space-x-2 mt-3 sm:mt-0 self-end sm:self-center">
                                        <Button onClick={() => router.push(`/teacher/dashboard/classes/${c.id}`)} variant="secondary" size="sm">
                                            Manage Class <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )})}
                    </div>
                )}
            </div>
            <div className="bg-background p-4 sm:p-6 rounded-2xl shadow-sm border">
                 <h3 className="font-bold text-foreground text-lg mb-4">Recent Activity</h3>
                 <RecentActivity />
            </div>
        </div>
    </div>
)};

// --- MAIN CONTROLLER --- //
export default function TeacherDashboardPage() {
    const { user } = useUser();
    const { classes, isLoading: isLoadingClasses, createClass, isCreating } = useClasses();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleClassCreated = async (newClass: { name: string; subject: string; classCode: string }) => {
        await createClass(newClass);
        setIsModalOpen(false);
    };

    if (!user) {
        return <Skeleton className="h-[600px] w-full" />; // Or a more sophisticated loader
    }

    return (
        <>
            <CreateClassModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onClassCreated={handleClassCreated}
                isCreating={isCreating}
            />
            <DashboardView
                onNewClassClick={() => setIsModalOpen(true)}
                classes={classes}
                isLoadingClasses={isLoadingClasses}
            />
        </>
    );
}
