'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend, PieChart, Pie, Cell } from 'recharts';
import { Trophy, Zap, Flame, Target, TrendingUp, BookOpen, Clock, Award, ChevronRight, ChevronDown } from 'lucide-react';
import { CollapsibleCard } from '@/components/ui/collapsible-section';
import { useUser } from "@/hooks/use-user";
import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from '@/lib/supabase/client';
import { progressAnalyticsService, SubjectProgress, TopicProgress } from '@/lib/analytics/progress-analytics-service';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const supabase = createClient();

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

interface QuizAttempt {
    id: string;
    user_id: string;
    quiz_id: string;
    score: number;
    total_questions: number;
    topic?: string;
    completed_at: string;
}

export default function ProgressPage() {
    const { user } = useUser();
    const [activeTab, setActiveTab] = useState('overview');

    // Cached progress data query - fetches user stats and attempts in parallel
    const { data: progressData, isLoading } = useQuery({
        queryKey: ['student-progress', user?.id],
        queryFn: async () => {
            if (!user?.id) return { xp: 0, streak: 0, attempts: [] };

            const [userResult, attemptsResult] = await Promise.all([
                supabase
                    .from('users')
                    .select('xp, streak_days')
                    .eq('id', user.id)
                    .single(),
                supabase
                    .from('assessment_attempts')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('completed_at', { ascending: false })
                    .limit(100)
            ]);

            return {
                xp: userResult.data?.xp || 0,
                streak: userResult.data?.streak_days || 0,
                attempts: attemptsResult.data || []
            };
        },
        enabled: !!user?.id,
        staleTime: 2 * 60 * 1000, // 2 minutes
    });

    // Enhanced analytics data
    const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
        queryKey: ['student-analytics', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            return progressAnalyticsService.getUserProgress(user.id);
        },
        enabled: !!user?.id,
        staleTime: 5 * 60 * 1000,
    });

    // Recommended topics
    const { data: recommendedTopics } = useQuery({
        queryKey: ['recommended-topics', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            return progressAnalyticsService.getRecommendedTopics(user.id, 5);
        },
        enabled: !!user?.id,
        staleTime: 5 * 60 * 1000,
    });

    const userXP = progressData?.xp || 0;
    const userStreak = progressData?.streak || 0;
    const attempts = progressData?.attempts || [];
    
    const { totalXP, quizzesCompleted, avgScore, weeklyXPData } = useMemo(() => {
        if (!attempts) {
            return { totalXP: 0, quizzesCompleted: 0, avgScore: 0, weeklyXPData: [] };
        }
        
        const quizzesCompleted = attempts.length;
        let totalScore = 0;
        let totalQuestions = 0;

        attempts.forEach(attempt => {
            totalScore += attempt.score;
            totalQuestions += attempt.total_questions;
        });

        const avgScore = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;
        
        const totalXP = userXP;

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
            if (attempt.completed_at) {
                const date = new Date(attempt.completed_at);
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

    }, [attempts, userXP]);

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
                        <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-12" /> : userStreak} Days</div>
                    </CardContent>
                </Card>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3">
                    <CollapsibleCard
                        title="Weekly XP Gain"
                        icon={<TrendingUp className="h-4 w-4" />}
                        defaultOpen={true}
                        storageKey="progress-weekly-xp"
                    >
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
                    </CollapsibleCard>
                </div>
                <div className="lg:col-span-2">
                    <CollapsibleCard
                        title="Recent Quizzes"
                        icon={<Clock className="h-4 w-4" />}
                        defaultOpen={true}
                        storageKey="progress-recent-quizzes"
                    >
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
                                            <TableCell className="font-medium capitalize">{attempt.topic || 'Quiz'}</TableCell>
                                            <TableCell className="text-right">{attempt.score}/{attempt.total_questions}</TableCell>
                                            <TableCell className="text-right text-muted-foreground text-xs">
                                                {attempt.completed_at ? format(new Date(attempt.completed_at), 'MMM d, yyyy') : 'N/A'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CollapsibleCard>
                </div>
            </div>
        </div>
      </div>
    );
}
