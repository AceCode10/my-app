'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { Trophy, Zap, Flame, Target, TrendingUp, BookOpen, Clock, Award, ChevronRight, ChevronDown, Star, GraduationCap, FileText, CheckCircle2 } from 'lucide-react';
import { CollapsibleCard } from '@/components/ui/collapsible-section';
import { useUser } from "@/hooks/use-user";
import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
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
import { useGamification } from '@/hooks/use-gamification';
import { useDailyGoals } from '@/hooks/use-daily-goals';
import { DailyGoalRing } from '@/components/gamification';

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

// Subject colors for visual distinction
const SUBJECT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    'Mathematics': { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/30' },
    'Physics': { bg: 'bg-purple-500/10', text: 'text-purple-600', border: 'border-purple-500/30' },
    'Chemistry': { bg: 'bg-green-500/10', text: 'text-green-600', border: 'border-green-500/30' },
    'Biology': { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/30' },
    'English': { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/30' },
    'ICT': { bg: 'bg-cyan-500/10', text: 'text-cyan-600', border: 'border-cyan-500/30' },
    'Computer Science': { bg: 'bg-indigo-500/10', text: 'text-indigo-600', border: 'border-indigo-500/30' },
    'default': { bg: 'bg-gray-500/10', text: 'text-gray-600', border: 'border-gray-500/30' },
};

function getSubjectColor(subject: string) {
    return SUBJECT_COLORS[subject] || SUBJECT_COLORS['default'];
}

export default function ProgressPage() {
    const { user } = useUser();
    const [activeTab, setActiveTab] = useState('overview');
    
    // Gamification hooks
    const { gamification, streakData, getLevelProgress, getXPToNextLevel, getLevelTitle } = useGamification();
    const { goals, primaryGoal, stats: goalStats } = useDailyGoals();

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
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-foreground">My Progress</h1>
                <p className="text-muted-foreground mt-1">Track your learning journey and stay motivated.</p>
            </div>

            {/* Top Stats Row - 4 Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Streak Card */}
                <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-orange-100 text-sm font-medium">Current Streak</p>
                                <p className="text-3xl font-bold mt-1">{streakData?.current_streak ?? userStreak}</p>
                                <p className="text-orange-100 text-xs mt-1">
                                    Best: {streakData?.longest_streak ?? userStreak} days
                                </p>
                            </div>
                            <div className="p-3 bg-white/20 rounded-full">
                                <Flame className="h-6 w-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* XP & Level Card */}
                <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-purple-100 text-sm font-medium">Total XP</p>
                                <p className="text-3xl font-bold mt-1">{(gamification?.total_xp ?? user?.xp ?? totalXP ?? 0).toLocaleString()}</p>
                                <p className="text-purple-100 text-xs mt-1">
                                    Level {gamification?.xp_level ?? 1} • {getLevelTitle()}
                                </p>
                            </div>
                            <div className="p-3 bg-white/20 rounded-full">
                                <Star className="h-6 w-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Papers & Quizzes Card */}
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-100 text-sm font-medium">Assessments</p>
                                <p className="text-3xl font-bold mt-1">{quizzesCompleted}</p>
                                <p className="text-blue-100 text-xs mt-1">
                                    Avg. score: {avgScore}%
                                </p>
                            </div>
                            <div className="p-3 bg-white/20 rounded-full">
                                <FileText className="h-6 w-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Daily Goal Card */}
                <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-green-100 text-sm font-medium">Daily Goal</p>
                                {primaryGoal ? (
                                    <>
                                        <p className="text-3xl font-bold mt-1">
                                            {Math.round((primaryGoal.current_value / primaryGoal.target_value) * 100)}%
                                        </p>
                                        <p className="text-green-100 text-xs mt-1">
                                            {primaryGoal.current_value}/{primaryGoal.target_value} {primaryGoal.goal_type === 'xp' ? 'XP' : primaryGoal.goal_type}
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-3xl font-bold mt-1">--</p>
                                        <p className="text-green-100 text-xs mt-1">Set a goal</p>
                                    </>
                                )}
                            </div>
                            <div className="p-3 bg-white/20 rounded-full">
                                {primaryGoal ? (
                                    <DailyGoalRing goal={primaryGoal} size="sm" showLabel={false} />
                                ) : (
                                    <Target className="h-6 w-6" />
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Level Progress Bar */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-xl font-bold text-primary">{gamification?.xp_level ?? 1}</span>
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-medium">{getLevelTitle()}</span>
                                <span className="text-sm text-muted-foreground">
                                    {getXPToNextLevel()} XP to Level {(gamification?.xp_level ?? 1) + 1}
                                </span>
                            </div>
                            <div className="h-3 bg-muted rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500"
                                    style={{ width: `${getLevelProgress()}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Subject Progress Section */}
            {analyticsData?.subjectProgress && analyticsData.subjectProgress.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-primary" />
                            Subject Progress
                        </CardTitle>
                        <CardDescription>Your progress across different subjects</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {analyticsData.subjectProgress.map((subject: SubjectProgress) => {
                                const colors = getSubjectColor(subject.subject_name);
                                const progressPercent = subject.total_questions > 0 
                                    ? Math.round((subject.correct_answers / subject.total_questions) * 100) 
                                    : 0;
                                
                                return (
                                    <Card 
                                        key={subject.subject_id} 
                                        className={cn("border", colors.border, colors.bg)}
                                    >
                                        <CardContent className="pt-4">
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <h4 className={cn("font-semibold", colors.text)}>
                                                        {subject.subject_name}
                                                    </h4>
                                                    <p className="text-xs text-muted-foreground">
                                                        {subject.topics_practiced} topics practiced
                                                    </p>
                                                </div>
                                                <Badge variant="secondary" className={cn(colors.bg, colors.text)}>
                                                    {progressPercent}%
                                                </Badge>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-xs text-muted-foreground">
                                                    <span>{subject.correct_answers} correct</span>
                                                    <span>{subject.total_questions} total</span>
                                                </div>
                                                <Progress 
                                                    value={progressPercent} 
                                                    className="h-2"
                                                />
                                            </div>
                                            <div className="mt-3 pt-3 border-t flex justify-between items-center">
                                                <span className="text-xs text-muted-foreground">
                                                    +{subject.xp_earned} XP earned
                                                </span>
                                                <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                                                    <Link href={`/student/subjects/${subject.subject_name.toLowerCase().replace(/ /g, '-')}`}>
                                                        Practice <ChevronRight className="h-3 w-3 ml-1" />
                                                    </Link>
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Weekly Activity Chart */}
                <div className="lg:col-span-3">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-primary" />
                                Weekly Activity
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? <Skeleton className="h-[250px] w-full" /> : (
                                <ResponsiveContainer width="100%" height={250}>
                                    <AreaChart data={weeklyXPData}>
                                        <defs>
                                            <linearGradient id="xpGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                        <XAxis dataKey="day" className="text-xs" />
                                        <YAxis className="text-xs" />
                                        <Tooltip 
                                            contentStyle={{ 
                                                backgroundColor: 'hsl(var(--card))', 
                                                border: '1px solid hsl(var(--border))',
                                                borderRadius: '8px'
                                            }}
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="xp" 
                                            stroke="#16a34a" 
                                            strokeWidth={2} 
                                            fill="url(#xpGradient)"
                                            name="XP Gained" 
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Activity */}
                <div className="lg:col-span-2">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-primary" />
                                Recent Activity
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading && (
                                <div className="space-y-3">
                                    <Skeleton className="h-12 w-full" />
                                    <Skeleton className="h-12 w-full" />
                                    <Skeleton className="h-12 w-full" />
                                </div>
                            )}
                            {!isLoading && (!attempts || attempts.length === 0) ? (
                                <div className="text-center py-8">
                                    <GraduationCap className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                                    <p className="text-muted-foreground text-sm">No activity yet</p>
                                    <Button variant="outline" size="sm" className="mt-3" asChild>
                                        <Link href="/student/subjects">Start Learning</Link>
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {attempts?.slice(0, 5).map(attempt => (
                                        <div 
                                            key={attempt.id} 
                                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                                        >
                                            <div className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center",
                                                attempt.score / attempt.total_questions >= 0.7 
                                                    ? "bg-green-500/10 text-green-600" 
                                                    : "bg-orange-500/10 text-orange-600"
                                            )}>
                                                <CheckCircle2 className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate capitalize">
                                                    {attempt.topic || 'Assessment'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {attempt.completed_at ? format(new Date(attempt.completed_at), 'MMM d, h:mm a') : 'N/A'}
                                                </p>
                                            </div>
                                            <Badge variant={
                                                attempt.score / attempt.total_questions >= 0.7 ? "default" : "secondary"
                                            }>
                                                {attempt.score}/{attempt.total_questions}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Goal Stats */}
            {goalStats && goalStats.totalCompleted > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-primary" />
                            Goal Statistics
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-4 bg-muted/50 rounded-lg">
                                <p className="text-2xl font-bold text-primary">{goalStats.totalCompleted}</p>
                                <p className="text-xs text-muted-foreground">Goals Completed</p>
                            </div>
                            <div className="text-center p-4 bg-muted/50 rounded-lg">
                                <p className="text-2xl font-bold text-orange-500">{goalStats.currentStreak}</p>
                                <p className="text-xs text-muted-foreground">Goal Streak</p>
                            </div>
                            <div className="text-center p-4 bg-muted/50 rounded-lg">
                                <p className="text-2xl font-bold text-purple-500">{goalStats.longestStreak}</p>
                                <p className="text-xs text-muted-foreground">Best Streak</p>
                            </div>
                            <div className="text-center p-4 bg-muted/50 rounded-lg">
                                <p className="text-2xl font-bold text-green-500">{goalStats.weekCompleted}</p>
                                <p className="text-xs text-muted-foreground">This Week</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
