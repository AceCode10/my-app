'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
    Users, PlusCircle, BookOpen, ArrowRight, Book, Activity, Bell,
    ClipboardCheck, FileText, Settings, BarChart3, GraduationCap,
    Clock, CheckCircle, AlertCircle, Target, TrendingUp, Layers, Hammer, Globe
} from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { CreateClassModal } from '@/components/teacher/create-class-modal';
import { useClasses } from '@/hooks/use-classes';
import { allSubjects } from '@/lib/subjects';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EXAM_BOARDS } from '@/lib/exam-boards';
import { getFriendlyName } from '@/lib/utils/name';
import { getCountryName } from '@/lib/countries';

const supabase = createClient();

const getSubjectVisuals = (subjectName: string) => {
    const subjectData = allSubjects.find(s => s.name.toLowerCase().includes(subjectName.toLowerCase().split(' ')[0]));
    if (subjectData) {
        return { icon: <subjectData.icon />, color: subjectData.color };
    }
    return { icon: <Book />, color: 'text-gray-500' };
};

const RecentActivity = () => {
    const { classes, isLoading: isLoadingClasses } = useClasses();

    const classIds = useMemo(() => classes?.map(c => c.id) || [], [classes]);

    // Cached recent attempts query
    const { data: recentAttempts = [], isLoading: isLoadingAttempts } = useQuery({
        queryKey: ['teacher-recent-attempts', classIds],
        queryFn: async () => {
            if (classIds.length === 0) return [];
            
            const { data, error } = await supabase
                .from('assessment_attempts')
                .select('*')
                .in('class_id', classIds.slice(0, 10))
                .order('completed_at', { ascending: false })
                .limit(5);

            if (error) throw error;
            return data || [];
        },
        enabled: classIds.length > 0,
        staleTime: 2 * 60 * 1000, // 2 minutes
    });

    const activities = useMemo(() => {
        if (!recentAttempts || !classes) return [];
        
        return recentAttempts.map(attempt => {
            const className = classes.find(c => c.id === attempt.class_id)?.name || '';
            return {
                type: 'submission',
                message: `New submission for "${attempt.topic || 'quiz'}" in ${className}`,
                date: new Date(attempt.completed_at),
                classId: attempt.class_id
            };
        }).slice(0, 7);
    }, [recentAttempts, classes]);

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
                <Link href={`/teacher/classes/${activity.classId}`} key={index}>
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
    stats,
    pendingSubmissions,
}: { 
    onNewClassClick: () => void, 
    classes: ReturnType<typeof useClasses>['classes'],
    isLoadingClasses: boolean,
    stats: {
        totalStudents: number;
        pendingReviews: number;
        totalAssignments: number;
        avgClassScore: number;
    };
    pendingSubmissions: any[];
}) => {
    const { user } = useUser();
    const router = useRouter();
    
    const userExamBoards = user?.exam_boards || [];
    const userLevels = user?.levels || [];
    const userCountry = user?.country;
    const selectedBoardsInfo = EXAM_BOARDS.filter(b => userExamBoards.includes(b.id));

    return (
    <div className="space-y-6">
        {/* Header with User Preferences */}
        <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
            <div>
                <h2 className="text-3xl font-bold text-foreground">Welcome back, {getFriendlyName(user?.display_name, user?.email)}!</h2>
                <p className="text-muted-foreground mt-1">Here's a summary of your teaching dashboard.</p>
            </div>
            <div className="flex flex-col items-end gap-2">
                <div className="flex flex-wrap items-center gap-3 justify-end">
                    {userCountry && (
                        <div className="flex items-center gap-1">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{getCountryName(userCountry)}</span>
                        </div>
                    )}
                    {selectedBoardsInfo.length > 0 && (
                        <div className="flex items-center gap-1">
                            <span className="text-sm text-muted-foreground">Board:</span>
                            <div className="flex gap-1">
                                {selectedBoardsInfo.map(board => (
                                    <Badge key={board.id} variant="secondary" className={board.color + ' text-white text-xs'}>
                                        {board.shortName}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                    {userLevels.length > 0 && (
                        <div className="flex items-center gap-1">
                            <GraduationCap className="h-4 w-4 text-muted-foreground" />
                            <div className="flex gap-1 flex-wrap">
                                {userLevels.slice(0, 3).map(level => (
                                    <Badge key={level} variant="outline" className="text-xs">
                                        {level.toUpperCase().replace('_', ' ')}
                                    </Badge>
                                ))}
                                {userLevels.length > 3 && (
                                    <Badge variant="outline" className="text-xs">+{userLevels.length - 3}</Badge>
                                )}
                            </div>
                        </div>
                    )}
                    <Button variant="ghost" size="sm" asChild>
                        <Link href="/teacher/settings"><Settings className="h-4 w-4" /></Link>
                    </Button>
                </div>
            </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Active Classes</p>
                            <p className="text-2xl font-bold">{isLoadingClasses ? '...' : classes?.length || 0}</p>
                        </div>
                        <div className="p-3 rounded-full bg-blue-500/10">
                            <GraduationCap className="h-5 w-5 text-blue-500" />
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Pending Reviews</p>
                            <p className="text-2xl font-bold text-yellow-600">{stats.pendingReviews}</p>
                        </div>
                        <div className="p-3 rounded-full bg-yellow-500/10">
                            <Clock className="h-5 w-5 text-yellow-500" />
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Avg Score</p>
                            <p className="text-2xl font-bold">{stats.avgClassScore}%</p>
                        </div>
                        <div className="p-3 rounded-full bg-indigo-500/10">
                            <TrendingUp className="h-5 w-5 text-indigo-500" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Quick Actions */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary" />
                    Quick Actions
                </CardTitle>
                <CardDescription>Manage your teaching activities</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <Button variant="default" className="h-20 flex-col gap-2 relative" asChild>
                        <Link href="/teacher/submissions">
                            <ClipboardCheck className="h-6 w-6" />
                            <span>Review Submissions</span>
                            {stats.pendingReviews > 0 && (
                                <Badge variant="destructive" className="absolute -top-1 -right-1">{stats.pendingReviews}</Badge>
                            )}
                        </Link>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col gap-2 bg-primary/5 border-primary/30 hover:bg-primary/10" asChild>
                        <Link href="/teacher/test-builder">
                            <Hammer className="h-6 w-6 text-primary" />
                            <span>Test Builder</span>
                        </Link>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col gap-2" asChild>
                        <Link href="/teacher/assessments">
                            <FileText className="h-6 w-6" />
                            <span>Create Assessment</span>
                        </Link>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col gap-2" asChild>
                        <Link href="/teacher/classes">
                            <Users className="h-6 w-6" />
                            <span>Manage Classes</span>
                        </Link>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col gap-2" asChild>
                        <Link href="/teacher/analytics">
                            <BarChart3 className="h-6 w-6" />
                            <span>View Analytics</span>
                        </Link>
                    </Button>
                </div>
            </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* My Classes */}
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <GraduationCap className="h-5 w-5" />
                            My Classes
                        </span>
                        <Button variant="ghost" size="sm" asChild>
                            <Link href="/teacher/classes">View All</Link>
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoadingClasses ? (
                        <div className="space-y-4">
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                    ) : !classes || classes.length === 0 ? (
                        <div className="text-center py-10 border-2 border-dashed rounded-lg">
                            <GraduationCap className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                            <p className="text-muted-foreground">You haven't created any classes yet.</p>
                            <Button variant="link" className="mt-2" onClick={onNewClassClick}>Create your first class</Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {classes.slice(0, 4).map(c => {
                                const { icon } = getSubjectVisuals(c.subject_id || '');
                                const studentCount = (c as any).student_count || 0;
                                return (
                                    <Link 
                                        key={c.id} 
                                        href={`/teacher/classes/${c.id}`}
                                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-md bg-muted">
                                                {React.cloneElement(icon as React.ReactElement, {"className": "w-5 h-5 text-primary"} as any)}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold">{c.name}</h4>
                                                <p className="text-sm text-muted-foreground">Code: {c.join_code}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Badge variant="secondary" className="flex items-center gap-1">
                                                <Users className="h-3 w-3" />
                                                {studentCount} student{studentCount !== 1 ? 's' : ''}
                                            </Badge>
                                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pending Submissions */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between text-base">
                        <span className="flex items-center gap-2">
                            <ClipboardCheck className="h-4 w-4" />
                            Pending Reviews
                        </span>
                        <Button variant="ghost" size="sm" asChild>
                            <Link href="/teacher/submissions">View All</Link>
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {pendingSubmissions.length === 0 ? (
                        <div className="text-center py-6">
                            <CheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
                            <p className="text-sm text-muted-foreground">All caught up!</p>
                            <p className="text-xs text-muted-foreground">No pending submissions to review</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {pendingSubmissions.slice(0, 5).map((submission, idx) => (
                                <Link
                                    key={idx}
                                    href={`/teacher/submissions/${submission.id}`}
                                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                                >
                                    <div>
                                        <p className="font-medium text-sm">{submission.student_name || 'Student'}</p>
                                        <p className="text-xs text-muted-foreground">{submission.paper_title || 'Assessment'}</p>
                                    </div>
                                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                                        Pending
                                    </Badge>
                                </Link>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>

        {/* Recent Activity */}
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Activity
                </CardTitle>
            </CardHeader>
            <CardContent>
                <RecentActivity />
            </CardContent>
        </Card>
    </div>
)};

// --- MAIN CONTROLLER --- //
export default function TeacherDashboardPage() {
    const { user } = useUser();
    const { classes, isLoading: isLoadingClasses, createClass, isCreating } = useClasses();
    const supabase = createClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [stats, setStats] = useState({
        totalStudents: 0,
        pendingReviews: 0,
        totalAssignments: 0,
        avgClassScore: 0
    });
    const [pendingSubmissions, setPendingSubmissions] = useState<any[]>([]);
    const [isLoadingStats, setIsLoadingStats] = useState(true);

    useEffect(() => {
        if (user && classes && classes.length > 0) {
            fetchTeacherStats();
        } else if (user && classes && classes.length === 0) {
            setIsLoadingStats(false);
        }
    }, [user, classes]);

    async function fetchTeacherStats() {
        try {
            const classIds = classes?.map(c => c.id) || [];
            
            if (classIds.length === 0) {
                setIsLoadingStats(false);
                return;
            }

            // Fetch total students enrolled in teacher's classes
            const { count: studentCount } = await supabase
                .from('enrollments')
                .select('*', { count: 'exact', head: true })
                .in('class_id', classIds)
                .eq('status', 'active');

            // Fetch pending submissions for review
            const { data: pendingData, count: pendingCount } = await supabase
                .from('assessment_attempts')
                .select(`
                    id,
                    user_id,
                    paper_id,
                    submitted_at
                `, { count: 'exact' })
                .in('class_id', classIds)
                .eq('status', 'submitted')
                .eq('review_status', 'pending')
                .order('submitted_at', { ascending: false })
                .limit(10);

            // Enrich pending submissions with student and paper info
            const enrichedSubmissions = await Promise.all(
                (pendingData || []).map(async (sub) => {
                    const { data: userData } = await supabase
                        .from('users')
                        .select('display_name')
                        .eq('id', sub.user_id)
                        .single();
                    
                    const { data: paperData } = await supabase
                        .from('past_papers')
                        .select('title')
                        .eq('id', sub.paper_id)
                        .single();

                    return {
                        ...sub,
                        student_name: userData?.display_name || 'Student',
                        paper_title: paperData?.title || 'Assessment'
                    };
                })
            );

            // Fetch average score from completed attempts
            const { data: completedAttempts } = await supabase
                .from('assessment_attempts')
                .select('percentage')
                .in('class_id', classIds)
                .eq('status', 'submitted')
                .not('percentage', 'is', null);

            let avgScore = 0;
            if (completedAttempts && completedAttempts.length > 0) {
                avgScore = completedAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / completedAttempts.length;
            }

            setStats({
                totalStudents: studentCount || 0,
                pendingReviews: pendingCount || 0,
                totalAssignments: 0,
                avgClassScore: Math.round(avgScore)
            });
            setPendingSubmissions(enrichedSubmissions);
        } catch (error) {
            console.error('Error fetching teacher stats:', error);
        } finally {
            setIsLoadingStats(false);
        }
    }

    const handleClassCreated = async (newClass: { name: string; subject: string; classCode: string }) => {
        await createClass(newClass);
        setIsModalOpen(false);
    };

    if (!user) {
        return <Skeleton className="h-[600px] w-full" />;
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
                isLoadingClasses={isLoadingClasses || isLoadingStats}
                stats={stats}
                pendingSubmissions={pendingSubmissions}
            />
        </>
    );
}
