'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { Users, Edit, BarChart3 as AnalyticsIcon } from 'lucide-react';
import { useClasses } from '@/hooks/use-classes';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
                        <Legend />
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

const StudentPerformanceTable = ({ students, isLoading }: { students: StudentData[], isLoading: boolean }) => {
    return (
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
                            <TableHead className="text-right">Quizzes Completed</TableHead>
                            <TableHead className="text-right">Average Score</TableHead>
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
    )
}


function AnalyticsPage() {
    const supabase = createClient();
    const { user } = useUser();
    const { classes, isLoading: isLoadingClasses } = useClasses();
    const [students, setStudents] = useState<StudentData[]>([]);
    const [isLoadingStudents, setIsLoadingStudents] = useState(true);
    const [classPerformanceData, setClassPerformanceData] = useState<{name: string, avgScore: number}[]>([]);

    // Fetch enrolled students for teacher's classes
    useEffect(() => {
        async function fetchStudents() {
            if (!user || !classes || classes.length === 0) {
                setStudents([]);
                setIsLoadingStudents(false);
                return;
            }

            try {
                const classIds = classes.map(c => c.id);
                
                // Get enrollments for all classes
                const { data: enrollments, error: enrollError } = await supabase
                    .from('enrollments')
                    .select('user_id')
                    .in('class_id', classIds)
                    .eq('status', 'active');

                if (enrollError) throw enrollError;

                if (!enrollments || enrollments.length === 0) {
                    setStudents([]);
                    setIsLoadingStudents(false);
                    return;
                }

                const studentIds = [...new Set(enrollments.map(e => e.user_id))];

                // Get user profiles
                const { data: profiles, error: profileError } = await supabase
                    .from('users')
                    .select('id, display_name, avatar_url, xp')
                    .in('id', studentIds);

                if (profileError) throw profileError;

                setStudents(profiles || []);
            } catch (error) {
                console.error('Error fetching students:', error);
            } finally {
                setIsLoadingStudents(false);
            }
        }

        if (!isLoadingClasses) {
            fetchStudents();
        }
    }, [user, classes, isLoadingClasses]);

    // Calculate class performance data
    useEffect(() => {
        if (classes && classes.length > 0) {
            // For now, show placeholder data - actual performance would come from attempts table
            const performanceData = classes.map(c => ({
                name: c.name,
                avgScore: 0, // Would be calculated from actual attempts
            }));
            setClassPerformanceData(performanceData);
        }
    }, [classes]);

    const overallStats = useMemo(() => {
        return {
            averageScore: 0,
            totalAssessments: 0
        };
    }, []);

    const isLoading = isLoadingClasses || isLoadingStudents;

  return (
    <div>
        <h2 className="text-3xl font-bold text-foreground">Analytics</h2>
        <p className="text-muted-foreground mt-1 mb-8">
            An overview of class and student performance.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard 
                title="Overall Average Score"
                value={`${overallStats.averageScore}%`}
                icon={AnalyticsIcon}
                isLoading={isLoading}
            />
            <StatCard 
                title="Total Assessments Taken"
                value={overallStats.totalAssessments}
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
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-8">
            <ClassPerformanceChart performanceData={classPerformanceData} isLoading={isLoading} />
            <StudentPerformanceTable students={students} isLoading={isLoading} />
        </div>
    </div>
  );
}

export default AnalyticsPage;