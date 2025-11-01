'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp,
  Users,
  BookOpen,
  FileQuestion,
  FileText,
  Activity,
  Eye,
  CheckCircle
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface AnalyticsData {
  users: {
    total: number;
    new_this_month: number;
    active_this_week: number;
    by_role: Record<string, number>;
  };
  content: {
    subjects: number;
    topics: number;
    questions: number;
    papers: number;
  };
  engagement: {
    total_views: number;
    avg_session_duration: number;
    completion_rate: number;
  };
  popular_content: Array<{
    id: string;
    title: string;
    type: string;
    views: number;
  }>;
}

export default function AnalyticsPage() {
  const supabase = createClient();
  const { toast } = useToast();

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  async function fetchAnalytics() {
    try {
      // Fetch user statistics
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, role, created_at, last_activity_at');

      if (usersError) throw usersError;

      // Fetch content counts
      const [subjectsRes, topicsRes, questionsRes, papersRes] = await Promise.all([
        supabase.from('subjects').select('id', { count: 'exact', head: true }),
        supabase.from('topics').select('id', { count: 'exact', head: true }),
        supabase.from('questions').select('id', { count: 'exact', head: true }),
        supabase.from('past_papers').select('id', { count: 'exact', head: true })
      ]);

      // Calculate user stats
      const now = new Date();
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const newThisMonth = users?.filter(u => 
        new Date(u.created_at) > oneMonthAgo
      ).length || 0;

      const activeThisWeek = users?.filter(u => 
        u.last_activity_at && new Date(u.last_activity_at) > oneWeekAgo
      ).length || 0;

      const byRole = users?.reduce((acc, u) => {
        acc[u.role] = (acc[u.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Fetch analytics data
      const { data: analyticsData } = await supabase
        .from('content_analytics')
        .select('*')
        .order('view_count', { ascending: false })
        .limit(10);

      const totalViews = analyticsData?.reduce((sum, item) => sum + item.view_count, 0) || 0;
      const avgCompletionRate = analyticsData?.length 
        ? analyticsData.reduce((sum, item) => sum + (item.completion_count / item.view_count || 0), 0) / analyticsData.length
        : 0;

      setAnalytics({
        users: {
          total: users?.length || 0,
          new_this_month: newThisMonth,
          active_this_week: activeThisWeek,
          by_role: byRole
        },
        content: {
          subjects: subjectsRes.count || 0,
          topics: topicsRes.count || 0,
          questions: questionsRes.count || 0,
          papers: papersRes.count || 0
        },
        engagement: {
          total_views: totalViews,
          avg_session_duration: 0, // Placeholder
          completion_rate: avgCompletionRate * 100
        },
        popular_content: analyticsData?.map(item => ({
          id: item.entity_id,
          title: item.entity_type,
          type: item.entity_type,
          views: item.view_count
        })) || []
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load analytics data'
      });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Platform usage statistics and insights
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* User Statistics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">User Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.users.total || 0}</div>
              <p className="text-xs text-muted-foreground">
                +{analytics?.users.new_this_month || 0} this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.users.active_this_week || 0}</div>
              <p className="text-xs text-muted-foreground">
                Active this week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Students</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">
                {analytics?.users.by_role.student || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {((analytics?.users.by_role.student || 0) / (analytics?.users.total || 1) * 100).toFixed(1)}% of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Teachers</CardTitle>
              <Users className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {analytics?.users.by_role.teacher || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {((analytics?.users.by_role.teacher || 0) / (analytics?.users.total || 1) * 100).toFixed(1)}% of total
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Content Statistics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Content Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Subjects</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.content.subjects || 0}</div>
              <p className="text-xs text-muted-foreground">
                Total subjects
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Topics</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.content.topics || 0}</div>
              <p className="text-xs text-muted-foreground">
                Total topics
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Questions</CardTitle>
              <FileQuestion className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.content.questions || 0}</div>
              <p className="text-xs text-muted-foreground">
                In question bank
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Past Papers</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.content.papers || 0}</div>
              <p className="text-xs text-muted-foreground">
                Available papers
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Engagement Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Engagement Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.engagement.total_views || 0}</div>
              <p className="text-xs text-muted-foreground">
                Content views
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics?.engagement.completion_rate.toFixed(1) || 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Average completion
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                +{((analytics?.users.new_this_month || 0) / (analytics?.users.total || 1) * 100).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                User growth this month
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Popular Content */}
      <Card>
        <CardHeader>
          <CardTitle>Popular Content</CardTitle>
          <CardDescription>Most viewed content across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics?.popular_content && analytics.popular_content.length > 0 ? (
            <div className="space-y-4">
              {analytics.popular_content.map((item, index) => (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium capitalize">{item.type}</div>
                      <div className="text-sm text-muted-foreground">{item.title}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{item.views}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No analytics data available yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>User Role Distribution</CardTitle>
          <CardDescription>Breakdown of users by role</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(analytics?.users.by_role || {}).map(([role, count]) => {
              const percentage = ((count / (analytics?.users.total || 1)) * 100).toFixed(1);
              return (
                <div key={role} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="capitalize font-medium">{role.replace('_', ' ')}</span>
                    <span className="text-muted-foreground">{count} ({percentage}%)</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
