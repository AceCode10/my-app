
'use client';

import React, { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, MessageSquare, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useDoc, useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { Class, Announcement, Note } from '@/types';
import { collection, doc, query, orderBy, Timestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';


const AnnouncementFeed = ({ classId }: { classId: string }) => {
    const firestore = useFirestore();
    const announcementsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'classes', classId, 'announcements'), orderBy('createdAt', 'desc'));
    }, [firestore, classId]);

    const { data: announcements, isLoading } = useCollection<Announcement>(announcementsQuery);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-16 w-full" />
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Announcements</CardTitle>
                <CardDescription>Updates and assigned work from your teacher.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {announcements && announcements.length > 0 ? (
                        announcements.map(announcement => (
                            <div key={announcement.id} className="p-4 rounded-lg bg-muted/50 border">
                                <div className="flex items-start gap-4">
                                     <Avatar className="h-8 w-8">
                                        {/* In a real app, you'd fetch the teacher's profile for the image */}
                                        <AvatarFallback>{announcement.authorName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <p className="text-sm text-foreground whitespace-pre-wrap">{announcement.message}</p>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            - {announcement.authorName}, {formatDistanceToNow(announcement.createdAt.toDate(), { addSuffix: true })}
                                        </p>
                                    </div>
                                </div>
                                {announcement.noteId && announcement.notePath && (
                                    <Link href={announcement.notePath}>
                                        <div className="mt-3 ml-12 p-3 border rounded-lg bg-background hover:bg-accent flex items-center gap-3">
                                            <BookOpen className="h-5 w-5 text-primary flex-shrink-0"/>
                                            <div>
                                                <p className="font-semibold text-foreground text-sm">{announcement.noteTitle}</p>
                                                <p className="text-xs text-muted-foreground">Assigned Revision Note</p>
                                            </div>
                                        </div>
                                    </Link>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10 border-2 border-dashed rounded-lg">
                            <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground mt-2">No announcements from your teacher yet.</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}


export default function StudentClassDetailsPage() {
    const router = useRouter();
    const params = useParams();
    const classId = params.classId as string;
    const firestore = useFirestore();
    const { user } = useUser();

    const classRef = useMemoFirebase(() => {
        if (!firestore || !classId) return null;
        return doc(firestore, 'classes', classId);
    }, [firestore, classId]);
    
    const { data: classData, isLoading: isClassLoading } = useDoc<Class>(classRef);
    
    if (isClassLoading) {
        return (
             <div>
                <Skeleton className="h-9 w-48 mb-4" />
                <div className="mb-8">
                    <Skeleton className="h-9 w-1/2 mb-2" />
                    <Skeleton className="h-5 w-1/4" />
                </div>
                <Skeleton className="h-[400px] w-full" />
            </div>
        )
    }

    if (!classData) {
        return (
            <div>
                 <Button variant="ghost" onClick={() => router.push('/dashboard/classes')} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to My Classes
                </Button>
                <div className="text-center py-20 bg-background rounded-2xl shadow-sm border border-dashed">
                    <h3 className="text-xl font-semibold text-foreground">Class Not Found</h3>
                    <p className="text-muted-foreground mt-2">You are not enrolled in this class or it does not exist.</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <Button variant="ghost" onClick={() => router.push('/dashboard/classes')} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to My Classes
            </Button>
            
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-foreground">{classData.name}</h2>
                <p className="text-muted-foreground mt-1">{classData.subject}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2">
                    <AnnouncementFeed classId={classId} />
                </div>
                <div className="md:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center"><Users className="mr-2" /> Classmates</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">There are {classData.studentIds?.length || 0} students in this class.</p>
                             {/* Future implementation: List classmates here */}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
