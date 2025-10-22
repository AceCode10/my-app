
'use client';

import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { Users, Edit, BarChart3 as AnalyticsIcon } from 'lucide-react';
import { useClasses } from '@/hooks/use-classes';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, documentId } from 'firebase/firestore';
import { type QuizAttempt, type UserProfile } from '@/types';
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

const StudentPerformanceTable = ({ students, attempts, isLoading }: { students: UserProfile[], attempts: QuizAttempt[], isLoading: boolean }) => {
    const studentPerformanceData = useMemo(() => {
        if (!students || !attempts) return [];

        return students.map(student => {
            const studentAttempts = attempts.filter(a => a.userId === student.uid);
            const totalQuizzes = studentAttempts.length;
            const totalScore = studentAttempts.reduce((acc, attempt) => acc + (attempt.score / attempt.totalQuestions), 0);
            const avgScore = totalQuizzes > 0 ? Math.round((totalScore / totalQuizzes) * 100) : 0;

            return {
                ...student,
                totalQuizzes,
                avgScore,
            }
        }).sort((a,b) => (b.xp || 0) - (a.xp || 0)); // Sort by XP
    }, [students, attempts]);

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
                        ) : studentPerformanceData.length > 0 ? (
                            studentPerformanceData.map(student => (
                                <TableRow key={student.uid}>
                                    <TableCell>
                                        <div className="flex items-center space-x-3">
                                            <Avatar>
                                                <AvatarImage src={student.photoURL ?? undefined} />
                                                <AvatarFallback>{student.displayName?.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium">{student.displayName}</span>
                                        </div>
                                    </TableCell>
                                    <td className="text-right font-medium">{(student.xp || 0).toLocaleString()}</td>
                                    <td className="text-right">{student.totalQuizzes}</td>
                                    <td className="text-right">{student.avgScore}%</td>
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
    const { classes, isLoading: isLoadingClasses } = useClasses();
    const firestore = useFirestore();

    const allStudentIds = useMemo(() => {
        if (!classes) return [];
        const uniqueIds = new Set(classes.flatMap(c => c.studentIds || []));
        return Array.from(uniqueIds);
    }, [classes]);

    // Query for all student profiles, handling the 30-item 'in' query limit
    const studentsQuery = useMemoFirebase(() => {
        if (!firestore || allStudentIds.length === 0) return null;
        return query(collection(firestore, 'users'), where(documentId(), 'in', allStudentIds.slice(0, 30)));
    }, [firestore, allStudentIds]);

    // Query for all quiz attempts by those students, handling the 30-item 'in' query limit
    const attemptsQuery = useMemoFirebase(() => {
        if (!firestore || allStudentIds.length === 0) return null;
        return query(collection(firestore, 'quizAttempts'), where('userId', 'in', allStudentIds.slice(0, 30)));
    }, [firestore, allStudentIds]);

    const { data: allStudents, isLoading: isLoadingStudents } = useCollection<UserProfile>(studentsQuery);
    const { data: allAttempts, isLoading: isLoadingAttempts } = useCollection<QuizAttempt>(attemptsQuery);
    
    const { overallStats, classPerformanceData } = useMemo(() => {
        if (!classes || !allAttempts) {
            return {
                overallStats: { averageScore: 0, totalAssessments: 0 },
                classPerformanceData: []
            };
        }

        const totalAssessments = allAttempts.length;
        const totalScore = allAttempts.reduce((acc, attempt) => acc + (attempt.score / attempt.totalQuestions), 0);
        const averageScore = totalAssessments > 0 ? Math.round((totalScore / totalAssessments) * 100) : 0;
        
        const performanceData = classes.map(c => {
            const studentIdsInClass = c.studentIds || [];
            const classAttempts = allAttempts.filter(a => studentIdsInClass.includes(a.userId));
            const totalClassAssessments = classAttempts.length;
            const totalClassScore = classAttempts.reduce((acc, attempt) => acc + (attempt.score / attempt.totalQuestions), 0);
            const avgClassScore = totalClassAssessments > 0 ? Math.round((totalClassScore / totalClassAssessments) * 100) : 0;
            return {
                name: c.name,
                avgScore: avgClassScore,
            };
        });

        return {
            overallStats: { averageScore, totalAssessments },
            classPerformanceData: performanceData
        };
    }, [classes, allAttempts]);

    const isLoading = isLoadingClasses || (allStudentIds.length > 0 && (isLoadingAttempts || isLoadingStudents));

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
                value={allStudentIds.length}
                icon={Users}
                isLoading={isLoading}
            />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-8">
            <ClassPerformanceChart performanceData={classPerformanceData} isLoading={isLoading} />
            <StudentPerformanceTable students={allStudents || []} attempts={allAttempts || []} isLoading={isLoading} />
        </div>
    </div>
  );
}

export default AnalyticsPage;

    