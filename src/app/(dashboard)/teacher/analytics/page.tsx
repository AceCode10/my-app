'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Users, Edit, BarChart3 as AnalyticsIcon, TrendingUp, Clock } from 'lucide-react';
import { useClasses } from '@/hooks/use-classes';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, subDays } from 'date-fns';

const StatCard = ({ title, value, icon: Icon, change, isLoading }: { title: string, value: string | number, icon: React.ElementType, change?: string, isLoading?: boolean }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            {isLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">{value}</div>}
            {isLoading ? <Skeleton className="h-4 w-32 mt-1" /> : (change && <p className="text-xs text-muted-foreground">{change}</p>)}
        </CardContent>
    </Card>
);

const ClassPerformanceChart = ({ performanceData, isLoading }: { performanceData: any[], isLoading: boolean }) => (
    <Card>
        <CardHeader>
            <CardTitle>Class Performance</CardTitle>
            <CardDescription>Average score per class across all assessments.</CardDescription>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="w-full h-[300px] flex items-center justify-center">
                    <Skeleton className="w-full h-full" />
                </div>
            ) : performanceData.length === 0 ? (
                <div className="w-full h-[300px] flex items-center justify-center text-muted-foreground">
                    No assessment data available yet.
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="avgScore" fill="#16a34a" name="Average Score (%)" />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </CardContent>
    </Card>
);

interface StudentData {
    id: string;
    display_name: string;
    avatar_url?: string;
    xp?: number;
    totalQuizzes?: number;
    avgScore?: number;
}

const StudentPerformanceTable = ({ students, isLoading }: { students: StudentData[], isLoading: boolean }) => (
    <Card>
        <CardHeader>
            <CardTitle>Student Performance</CardTitle>
            <CardDescription>Performance summary for all students in your classes.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead className="text-right">Total XP</TableHead>
                        <TableHead className="text-right">Quizzes</TableHead>
                        <TableHead className="text-right">Avg Score</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><div className="flex items-center space-x-3"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-4 w-24" /></div></TableCell>
                                <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                            </TableRow>
                        ))
                    ) : students.length > 0 ? (
                        students.map(student => (
                            <TableRow key={student.id}>
                                <TableCell>
                                    <div className="flex items-center space-x-3">
                                        <Avatar>
                                            <AvatarImage src={student.avatar_url} />
                                            <AvatarFallback>{student.display_name?.charAt(0) || 'S'}</AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium">{student.display_name || 'Unknown'}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-medium">{(student.xp || 0).toLocaleString()}</TableCell>
                                <TableCell className="text-right">{student.totalQuizzes || 0}</TableCell>
                                <TableCell className="text-right">{student.avgScore || 0}%</TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">No student data available.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
);

interface AssignmentStats {
    totalAttempts: number;
    avgScore: number;
    pendingGrading: number;
}

export default function AnalyticsPage() {
    const supabase = createClient();
    const { user } = useUser();
    const { classes, isLoading: isLoadingClasses } = useClasses();
    const [students, setStudents] = useState<StudentData[]>([]);
    const [isLoadingStudents, setIsLoadingStudents] = useState(true);
    const [classPerformanceData, setClassPerformanceData] = useState<{name: string, avgScore: number}[]>([]);
    const [assignmentStats, setAssignmentStats] = useState<AssignmentStats>({
        totalAttempts: 0,
        avgScore: 0,
        pendingGrading: 0
    });
    const [weeklyActivity, setWeeklyActivity] = useState<{day: string, attempts: number}[]>([]);

    // Fetch students and performance data
    useEffect(() => {
        async function fetchData() {
            if (!user || !classes || classes.length === 0) {
                setStudents([]);
                setIsLoadingStudents(false);
                return;
            }

            try {
                const classIds = classes.map(c => c.id);
                
                const { data: enrollments } = await supabase
                    .from('enrollments')
                    .select('user_id')
                    .in('class_id', classIds)
                    .eq('status', 'active');

                if (!enrollments || enrollments.length === 0) {
                    setStudents([]);
                    setIsLoadingStudents(false);
                    return;
                }

                const studentIds = [...new Set(enrollments.map(e => e.user_id))];

                const { data: profiles } = await supabase
                    .from('users')
                    .select('id, display_name, avatar_url, xp')
                    .in('id', studentIds);

                const { data: assignments } = await supabase
                    .from('assignments')
                    .select('id')
                    .eq('assigned_by', user.id);

                const assignmentIds = assignments?.map(a => a.id) || [];

                if (assignmentIds.length > 0) {
                    const { data: testAttempts } = await supabase
                        .from('test_attempts')
                        .select('user_id, total_score, max_score, status')
                        .in('assignment_id', assignmentIds);

                    const studentStatsMap = new Map<string, { totalQuizzes: number; totalScore: number; maxScore: number }>();
                    
                    (testAttempts || []).forEach((attempt: any) => {
                        const existing = studentStatsMap.get(attempt.user_id) || { totalQuizzes: 0, totalScore: 0, maxScore: 0 };
                        if (attempt.status === 'graded' || attempt.status === 'submitted') {
                            existing.totalQuizzes++;
                            existing.totalScore += attempt.total_score || 0;
                            existing.maxScore += attempt.max_score || 0;
                        }
                        studentStatsMap.set(attempt.user_id, existing);
                    });

                    const enrichedStudents = (profiles || []).map(p => {
                        const stats = studentStatsMap.get(p.id);
                        return {
                            ...p,
                            totalQuizzes: stats?.totalQuizzes || 0,
                            avgScore: stats && stats.maxScore > 0 
                                ? Math.round((stats.totalScore / stats.maxScore) * 100) 
                                : 0
                        };
                    });

                    enrichedStudents.sort((a, b) => (b.xp || 0) - (a.xp || 0));
                    setStudents(enrichedStudents);

                    const totalAttempts = testAttempts?.length || 0;
                    const gradedAttempts = testAttempts?.filter((a: any) => a.status === 'graded') || [];
                    const pendingGrading = testAttempts?.filter((a: any) => a.status === 'submitted').length || 0;
                    const avgScore = gradedAttempts.length > 0
                        ? Math.round(gradedAttempts.reduce((sum: number, a: any) => sum + ((a.total_score / (a.max_score || 1)) * 100), 0) / gradedAttempts.length)
                        : 0;

                    setAssignmentStats({ totalAttempts, avgScore, pendingGrading });
                } else {
                    setStudents(profiles || []);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setIsLoadingStudents(false);
            }
        }

        if (!isLoadingClasses) {
            fetchData();
        }
    }, [user, classes, isLoadingClasses, supabase]);

    // Fetch class performance
    useEffect(() => {
        async function fetchClassPerformance() {
            if (!user || !classes || classes.length === 0) return;

            try {
                const performanceData: {name: string, avgScore: number}[] = [];

                for (const cls of classes) {
                    const { data: classAssignments } = await supabase
                        .from('assignments')
                        .select('id')
                        .eq('target_class_id', cls.id)
                        .eq('assigned_by', user.id);

                    if (classAssignments && classAssignments.length > 0) {
                        const assignmentIds = classAssignments.map(a => a.id);
                        
                        const { data: attempts } = await supabase
                            .from('test_attempts')
                            .select('total_score, max_score')
                            .in('assignment_id', assignmentIds)
                            .in('status', ['graded', 'submitted']);

                        const totalAttempts = attempts?.length || 0;
                        const avgScore = totalAttempts > 0
                            ? Math.round((attempts || []).reduce((sum, a) => sum + ((a.total_score / (a.max_score || 1)) * 100), 0) / totalAttempts)
                            : 0;

                        performanceData.push({ name: cls.name, avgScore });
                    } else {
                        performanceData.push({ name: cls.name, avgScore: 0 });
                    }
                }

                setClassPerformanceData(performanceData);
            } catch (error) {
                console.error('Error fetching class performance:', error);
            }
        }

        if (!isLoadingClasses && user) {
            fetchClassPerformance();
        }
    }, [classes, user, isLoadingClasses, supabase]);

    // Fetch weekly activity
    useEffect(() => {
        async function fetchWeeklyActivity() {
            if (!user) return;

            try {
                const { data: assignments } = await supabase
                    .from('assignments')
                    .select('id')
                    .eq('assigned_by', user.id);

                const assignmentIds = assignments?.map(a => a.id) || [];
                if (assignmentIds.length === 0) return;

                const days: {day: string, attempts: number}[] = [];
                const today = new Date();

                for (let i = 6; i >= 0; i--) {
                    const date = subDays(today, i);
                    const dayStart = new Date(date);
                    dayStart.setHours(0, 0, 0, 0);
                    const dayEnd = new Date(date);
                    dayEnd.setHours(23, 59, 59, 999);

                    const { count } = await supabase
                        .from('test_attempts')
                        .select('*', { count: 'exact', head: true })
                        .gte('created_at', dayStart.toISOString())
                        .lte('created_at', dayEnd.toISOString())
                        .in('assignment_id', assignmentIds);

                    days.push({
                        day: format(date, 'EEE'),
                        attempts: count || 0
                    });
                }

                setWeeklyActivity(days);
            } catch (error) {
                console.error('Error fetching weekly activity:', error);
            }
        }

        fetchWeeklyActivity();
    }, [user, supabase]);

    const isLoading = isLoadingClasses || isLoadingStudents;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-foreground">Analytics</h2>
                <p className="text-muted-foreground mt-1">
                    An overview of class and student performance.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    title="Average Score"
                    value={`${assignmentStats.avgScore}%`}
                    icon={AnalyticsIcon}
                    isLoading={isLoading}
                />
                <StatCard 
                    title="Total Attempts"
                    value={assignmentStats.totalAttempts}
                    icon={Edit}
                    change={`Across ${classes?.length || 0} classes`}
                    isLoading={isLoading}
                />
                <StatCard 
                    title="Active Students"
                    value={students.length}
                    icon={Users}
                    isLoading={isLoading}
                />
                <StatCard 
                    title="Pending Grading"
                    value={assignmentStats.pendingGrading}
                    icon={Clock}
                    change={assignmentStats.pendingGrading > 0 ? "Needs attention" : "All caught up"}
                    isLoading={isLoading}
                />
            </div>

            {weeklyActivity.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Weekly Activity
                        </CardTitle>
                        <CardDescription>Student attempts over the past 7 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={weeklyActivity}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="day" />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="attempts" fill="#3b82f6" name="Attempts" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <ClassPerformanceChart performanceData={classPerformanceData} isLoading={isLoading} />
                <StudentPerformanceTable students={students} isLoading={isLoading} />
            </div>
        </div>
    );
}
