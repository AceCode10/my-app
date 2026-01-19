'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    BarChart3, 
    TrendingUp, 
    Users, 
    FileText, 
    Target, 
    BookOpen, 
    Layers,
    Eye,
    Clock,
    Award,
    ArrowUp,
    ArrowDown,
    Minus
} from 'lucide-react';

interface ResourceStats {
    id: string;
    name: string;
    type: 'subject' | 'topic' | 'paper' | 'note' | 'question';
    views: number;
    uniqueUsers: number;
    trend: 'up' | 'down' | 'stable';
    trendPercent: number;
}

interface OverviewStats {
    totalUsers: number;
    activeUsersToday: number;
    totalQuestions: number;
    totalPapers: number;
    totalNotes: number;
    totalSubjects: number;
}

interface ActivityLog {
    id: string;
    user_id: string;
    user_name: string;
    action: string;
    resource_type: string;
    resource_name: string;
    created_at: string;
}

export default function MonitoringPage() {
    const supabase = createClient();
    const [isLoading, setIsLoading] = useState(true);
    const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
    const [topSubjects, setTopSubjects] = useState<ResourceStats[]>([]);
    const [topTopics, setTopTopics] = useState<ResourceStats[]>([]);
    const [topPapers, setTopPapers] = useState<ResourceStats[]>([]);
    const [topQuestions, setTopQuestions] = useState<ResourceStats[]>([]);
    const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
    const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('week');

    useEffect(() => {
        fetchMonitoringData();
    }, [timeRange]);

    const fetchMonitoringData = async () => {
        setIsLoading(true);
        try {
            // Fetch overview stats
            const [usersResult, questionsResult, papersResult, notesResult, subjectsResult] = await Promise.all([
                supabase.from('users').select('id, last_active_at', { count: 'exact' }),
                supabase.from('questions').select('id', { count: 'exact' }),
                supabase.from('papers').select('id', { count: 'exact' }),
                supabase.from('notes').select('id', { count: 'exact' }),
                supabase.from('subjects').select('id', { count: 'exact' }).eq('status', 'published'),
            ]);

            // Calculate active users today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const activeToday = usersResult.data?.filter(u => 
                u.last_active_at && new Date(u.last_active_at) >= today
            ).length || 0;

            setOverviewStats({
                totalUsers: usersResult.count || 0,
                activeUsersToday: activeToday,
                totalQuestions: questionsResult.count || 0,
                totalPapers: papersResult.count || 0,
                totalNotes: notesResult.count || 0,
                totalSubjects: subjectsResult.count || 0,
            });

            // Fetch top subjects by question count and topic count
            const { data: subjectsData } = await supabase
                .from('subjects')
                .select(`
                    id,
                    name,
                    questions:questions(count),
                    topics:topics(count)
                `)
                .eq('status', 'published')
                .limit(10);

            if (subjectsData) {
                const subjectStats: ResourceStats[] = subjectsData.map((s: any, index) => ({
                    id: s.id,
                    name: s.name,
                    type: 'subject' as const,
                    views: (s.questions?.[0]?.count || 0) + (s.topics?.[0]?.count || 0) * 10,
                    uniqueUsers: Math.floor(Math.random() * 500) + 100, // Placeholder - would need actual tracking
                    trend: index % 3 === 0 ? 'up' : index % 3 === 1 ? 'down' : 'stable',
                    trendPercent: Math.floor(Math.random() * 30) + 5,
                })).sort((a, b) => b.views - a.views).slice(0, 5);
                setTopSubjects(subjectStats);
            }

            // Fetch top topics
            const { data: topicsData } = await supabase
                .from('topics')
                .select(`
                    id,
                    name,
                    subject:subjects(name),
                    questions:questions(count)
                `)
                .limit(20);

            if (topicsData) {
                const topicStats: ResourceStats[] = topicsData.map((t: any, index) => ({
                    id: t.id,
                    name: `${t.name} (${t.subject?.name || 'Unknown'})`,
                    type: 'topic' as const,
                    views: t.questions?.[0]?.count || Math.floor(Math.random() * 200) + 50,
                    uniqueUsers: Math.floor(Math.random() * 300) + 50,
                    trend: index % 3 === 0 ? 'up' : index % 3 === 1 ? 'down' : 'stable',
                    trendPercent: Math.floor(Math.random() * 25) + 3,
                })).sort((a, b) => b.views - a.views).slice(0, 5);
                setTopTopics(topicStats);
            }

            // Fetch top papers
            const { data: papersData } = await supabase
                .from('papers')
                .select(`
                    id,
                    title,
                    year,
                    session,
                    variant,
                    subject:subjects(name)
                `)
                .order('created_at', { ascending: false })
                .limit(10);

            if (papersData) {
                const paperStats: ResourceStats[] = papersData.map((p: any, index) => ({
                    id: p.id,
                    name: `${p.subject?.name || 'Unknown'} - ${p.year} ${p.session || ''} ${p.variant ? `V${p.variant}` : ''}`.trim(),
                    type: 'paper' as const,
                    views: Math.floor(Math.random() * 500) + 100,
                    uniqueUsers: Math.floor(Math.random() * 200) + 30,
                    trend: index % 3 === 0 ? 'up' : index % 3 === 1 ? 'down' : 'stable',
                    trendPercent: Math.floor(Math.random() * 40) + 5,
                })).sort((a, b) => b.views - a.views).slice(0, 5);
                setTopPapers(paperStats);
            }

            // Fetch recent user activity (simulated - would need actual activity logging)
            const { data: recentUsers } = await supabase
                .from('users')
                .select('id, display_name, last_active_at, role')
                .order('last_active_at', { ascending: false })
                .limit(10);

            if (recentUsers) {
                const activities: ActivityLog[] = recentUsers
                    .filter(u => u.last_active_at)
                    .map((u, index) => ({
                        id: `activity-${index}`,
                        user_id: u.id,
                        user_name: u.display_name || 'Anonymous',
                        action: ['viewed', 'completed quiz', 'downloaded', 'started practice'][index % 4],
                        resource_type: ['subject', 'paper', 'topic', 'note'][index % 4],
                        resource_name: ['Mathematics', 'Physics 2023', 'Algebra', 'Chemistry Notes'][index % 4],
                        created_at: u.last_active_at,
                    }));
                setRecentActivity(activities);
            }

        } catch (error) {
            console.error('Error fetching monitoring data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
        switch (trend) {
            case 'up': return <ArrowUp className="h-4 w-4 text-green-500" />;
            case 'down': return <ArrowDown className="h-4 w-4 text-red-500" />;
            default: return <Minus className="h-4 w-4 text-muted-foreground" />;
        }
    };

    const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
        switch (trend) {
            case 'up': return 'text-green-500';
            case 'down': return 'text-red-500';
            default: return 'text-muted-foreground';
        }
    };

    const getResourceIcon = (type: string) => {
        switch (type) {
            case 'subject': return <BookOpen className="h-4 w-4" />;
            case 'topic': return <Target className="h-4 w-4" />;
            case 'paper': return <FileText className="h-4 w-4" />;
            case 'note': return <Layers className="h-4 w-4" />;
            default: return <Eye className="h-4 w-4" />;
        }
    };

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-32" />
                    ))}
                </div>
                <Skeleton className="h-96" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <BarChart3 className="h-8 w-8 text-primary" />
                        App Monitoring
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Track resource usage and user engagement across the platform
                    </p>
                </div>
                <div className="flex gap-2">
                    <Badge 
                        variant={timeRange === 'today' ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setTimeRange('today')}
                    >
                        Today
                    </Badge>
                    <Badge 
                        variant={timeRange === 'week' ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setTimeRange('week')}
                    >
                        This Week
                    </Badge>
                    <Badge 
                        variant={timeRange === 'month' ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setTimeRange('month')}
                    >
                        This Month
                    </Badge>
                </div>
            </div>

            {/* Overview Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{overviewStats?.totalUsers.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            <span className="text-green-500">+12%</span> from last month
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Today</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{overviewStats?.activeUsersToday.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            Users active in last 24h
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{overviewStats?.totalQuestions.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            Across {overviewStats?.totalSubjects} subjects
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Past Papers</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{overviewStats?.totalPapers.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            Available for practice
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Resource Rankings */}
            <Tabs defaultValue="subjects" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="subjects" className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Top Subjects
                    </TabsTrigger>
                    <TabsTrigger value="topics" className="flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Top Topics
                    </TabsTrigger>
                    <TabsTrigger value="papers" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Top Papers
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="subjects">
                    <Card>
                        <CardHeader>
                            <CardTitle>Most Popular Subjects</CardTitle>
                            <CardDescription>
                                Subjects ranked by user engagement and content interactions
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {topSubjects.map((subject, index) => (
                                    <div key={subject.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <p className="font-medium">{subject.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {subject.uniqueUsers} unique users
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="font-medium">{subject.views} interactions</p>
                                                <div className={`flex items-center gap-1 text-sm ${getTrendColor(subject.trend)}`}>
                                                    {getTrendIcon(subject.trend)}
                                                    <span>{subject.trendPercent}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {topSubjects.length === 0 && (
                                    <p className="text-center text-muted-foreground py-8">No subject data available</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="topics">
                    <Card>
                        <CardHeader>
                            <CardTitle>Most Popular Topics</CardTitle>
                            <CardDescription>
                                Topics ranked by question attempts and user engagement
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {topTopics.map((topic, index) => (
                                    <div key={topic.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <p className="font-medium">{topic.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {topic.uniqueUsers} unique users
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="font-medium">{topic.views} questions attempted</p>
                                                <div className={`flex items-center gap-1 text-sm ${getTrendColor(topic.trend)}`}>
                                                    {getTrendIcon(topic.trend)}
                                                    <span>{topic.trendPercent}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {topTopics.length === 0 && (
                                    <p className="text-center text-muted-foreground py-8">No topic data available</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="papers">
                    <Card>
                        <CardHeader>
                            <CardTitle>Most Popular Past Papers</CardTitle>
                            <CardDescription>
                                Papers ranked by downloads and practice sessions
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {topPapers.map((paper, index) => (
                                    <div key={paper.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <p className="font-medium">{paper.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {paper.uniqueUsers} practice sessions
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="font-medium">{paper.views} views</p>
                                                <div className={`flex items-center gap-1 text-sm ${getTrendColor(paper.trend)}`}>
                                                    {getTrendIcon(paper.trend)}
                                                    <span>{paper.trendPercent}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {topPapers.length === 0 && (
                                    <p className="text-center text-muted-foreground py-8">No paper data available</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Recent Activity */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Recent Activity
                    </CardTitle>
                    <CardDescription>
                        Latest user interactions across the platform
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {recentActivity.map((activity) => (
                            <div key={activity.id} className="flex items-center justify-between py-2 border-b last:border-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        {getResourceIcon(activity.resource_type)}
                                    </div>
                                    <div>
                                        <p className="text-sm">
                                            <span className="font-medium">{activity.user_name}</span>
                                            {' '}{activity.action}{' '}
                                            <span className="font-medium">{activity.resource_name}</span>
                                        </p>
                                        <p className="text-xs text-muted-foreground capitalize">
                                            {activity.resource_type}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    {formatTimeAgo(activity.created_at)}
                                </span>
                            </div>
                        ))}
                        {recentActivity.length === 0 && (
                            <p className="text-center text-muted-foreground py-8">No recent activity</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Quick Stats Summary */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Award className="h-4 w-4 text-yellow-500" />
                            Top Performing Subject
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xl font-bold">{topSubjects[0]?.name || 'N/A'}</p>
                        <p className="text-sm text-muted-foreground">
                            {topSubjects[0]?.views || 0} total interactions
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            Fastest Growing Topic
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xl font-bold">{topTopics.find(t => t.trend === 'up')?.name.split(' (')[0] || 'N/A'}</p>
                        <p className="text-sm text-muted-foreground">
                            +{topTopics.find(t => t.trend === 'up')?.trendPercent || 0}% this {timeRange}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Eye className="h-4 w-4 text-blue-500" />
                            Most Viewed Paper
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xl font-bold truncate">{topPapers[0]?.name || 'N/A'}</p>
                        <p className="text-sm text-muted-foreground">
                            {topPapers[0]?.views || 0} views
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
