'use client';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { Trophy, Zap, Flame, Repeat } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import { type QuizAttempt } from "@/types";
import { useMemo } from "react";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProgressPage() {
    const { user, profile } = useUser();
    const firestore = useFirestore();

    const attemptsQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        // Query the global collection and filter by the current user's ID.
        return query(
            collection(firestore, 'quizAttempts'),
            where('userId', '==', user.uid),
            orderBy('completedAt', 'desc')
        );
    }, [firestore, user]);

    const { data: attempts, isLoading } = useCollection<QuizAttempt>(attemptsQuery);
    
    const { totalXP, quizzesCompleted, avgScore, weeklyXPData } = useMemo(() => {
        if (!attempts) {
            return { totalXP: 0, quizzesCompleted: 0, avgScore: 0, weeklyXPData: [] };
        }
        
        const quizzesCompleted = attempts.length;
        let totalScore = 0;
        let totalQuestions = 0;

        attempts.forEach(attempt => {
            totalScore += attempt.score;
            totalQuestions += attempt.totalQuestions;
        });

        const avgScore = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;
        
        const totalXP = profile?.xp || 0;

        // Group XP by day for the last 7 days
        const recentXP: { [key: string]: number } = {};
        const today = new Date();
        for (let i = 0; i < 7; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dayKey = format(d, 'yyyy-MM-dd');
            recentXP[dayKey] = 0;
        }

        attempts.forEach(attempt => {
            if (attempt.completedAt) {
                const date = (attempt.completedAt as any).toDate();
                const dayKey = format(date, 'yyyy-MM-dd');
                if (dayKey in recentXP) {
                    const xp = attempt.score * 10;
                    recentXP[dayKey] += xp;
                }
            }
        });
        
        const weeklyXPData = Object.keys(recentXP)
            .map(key => ({ day: format(new Date(key), 'E'), xp: recentXP[key] }))
            .reverse();

        return { totalXP, quizzesCompleted, avgScore, weeklyXPData };

    }, [attempts, profile?.xp]);

    return (
        <div className="grid grid-cols-1">
          <div className="col-span-1">
            <h2 className="text-3xl font-bold text-foreground mb-4">My Progress</h2>
            <p className="text-muted-foreground mb-8">Track your learning journey and stay motivated.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total XP</CardTitle>
                        <Trophy className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-24" /> : totalXP.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Quizzes Completed</CardTitle>
                        <Zap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-12" /> : quizzesCompleted}</div>
                        <p className="text-xs text-muted-foreground">Avg. score: {avgScore}%</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Learning Streak</CardTitle>
                        <Flame className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-12" /> : (profile?.streak || 0)} Days</div>
                    </CardContent>
                </Card>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Weekly XP Gain</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-[300px] w-full" /> : (
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={weeklyXPData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="day" />
                                    <YAxis />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="xp" stroke="#16a34a" strokeWidth={2} name="XP Gained" />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Recent Quizzes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading && (
                             <div className="space-y-4">
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                            </div>
                        )}
                        {!isLoading && (!attempts || attempts.length === 0) ? (
                            <div className="text-center py-10">
                                <p className="text-muted-foreground">You haven't completed any quizzes yet.</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Topic</TableHead>
                                        <TableHead className="text-right">Score</TableHead>
                                        <TableHead className="text-right">Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {attempts?.slice(0, 5).map(attempt => (
                                        <TableRow key={attempt.id}>
                                            <TableCell className="font-medium capitalize">{attempt.topic}</TableCell>
                                            <TableCell className="text-right">{attempt.score}/{attempt.totalQuestions}</TableCell>
                                            <TableCell className="text-right text-muted-foreground text-xs">
                                                {attempt.completedAt ? format((attempt.completedAt as any).toDate(), 'MMM d, yyyy') : 'N/A'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>
    );
}
