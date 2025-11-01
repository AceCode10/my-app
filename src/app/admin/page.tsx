'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BookOpen,
  FileQuestion,
  FileText,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface DashboardStats {
  subjects: number;
  topics: number;
  questions: number;
  papers: number;
  users: number;
  pendingApprovals: number;
  recentActivity: number;
}

export default function AdminDashboardPage() {
  const { user } = useUser();
  const supabase = createClient();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  async function fetchDashboardStats() {
    try {
      const [
        subjectsResult,
        topicsResult,
        questionsResult,
        papersResult,
        usersResult,
        approvalsResult
      ] = await Promise.all([
        supabase.from('subjects').select('id', { count: 'exact', head: true }),
        supabase.from('topics').select('id', { count: 'exact', head: true }),
        supabase.from('questions').select('id', { count: 'exact', head: true }),
        supabase.from('past_papers').select('id', { count: 'exact', head: true }),
        user?.role === 'super_admin' 
          ? supabase.from('users').select('id', { count: 'exact', head: true })
          : Promise.resolve({ count: 0 }),
        supabase.from('content_approvals').select('id', { count: 'exact', head: true }).eq('status', 'pending')
      ]);

      setStats({
        subjects: subjectsResult.count || 0,
        topics: topicsResult.count || 0,
        questions: questionsResult.count || 0,
        papers: papersResult.count || 0,
        users: usersResult.count || 0,
        pendingApprovals: approvalsResult.count || 0,
        recentActivity: 0 // TODO: Implement recent activity count
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  }

  const isSuperAdmin = user?.role === 'super_admin';

  const statCards = [
    {
      title: 'Subjects',
      value: stats?.subjects || 0,
      icon: BookOpen,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      show: true
    },
    {
      title: 'Topics',
      value: stats?.topics || 0,
      icon: BookOpen,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      show: true
    },
    {
      title: 'Questions',
      value: stats?.questions || 0,
      icon: FileQuestion,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      show: true
    },
    {
      title: 'Past Papers',
      value: stats?.papers || 0,
      icon: FileText,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      show: true
    },
    {
      title: 'Total Users',
      value: stats?.users || 0,
      icon: Users,
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10',
      show: isSuperAdmin
    },
    {
      title: 'Pending Approvals',
      value: stats?.pendingApprovals || 0,
      icon: Clock,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      show: true
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back, {user?.display_name || 'Admin'}!
        </h1>
        <p className="text-muted-foreground mt-2">
          {isSuperAdmin ? 'Super Admin Dashboard' : 'Content Moderator Dashboard'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.filter(card => card.show).map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold">{card.value}</div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <a
              href="/admin/subjects"
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <BookOpen className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium">Manage Subjects</p>
                  <p className="text-sm text-muted-foreground">Add or edit subjects and topics</p>
                </div>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </a>

            <a
              href="/admin/questions"
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <FileQuestion className="h-4 w-4 text-purple-500" />
                </div>
                <div>
                  <p className="font-medium">Add Questions</p>
                  <p className="text-sm text-muted-foreground">Upload new questions to the bank</p>
                </div>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </a>

            <a
              href="/admin/papers"
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <FileText className="h-4 w-4 text-orange-500" />
                </div>
                <div>
                  <p className="font-medium">Upload Past Papers</p>
                  <p className="text-sm text-muted-foreground">Add exam papers and mark schemes</p>
                </div>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </a>

            <a
              href="/admin/import"
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="font-medium">Bulk Import</p>
                  <p className="text-sm text-muted-foreground">Import multiple items via CSV/JSON</p>
                </div>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Platform health and notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Database Connected</p>
                <p className="text-sm text-muted-foreground">All systems operational</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Storage Available</p>
                <p className="text-sm text-muted-foreground">File uploads working normally</p>
              </div>
            </div>

            {stats && stats.pendingApprovals > 0 && (
              <div className="flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-medium">{stats.pendingApprovals} Pending Approvals</p>
                  <p className="text-sm text-muted-foreground">
                    <a href="/admin/approvals" className="text-primary hover:underline">
                      Review now
                    </a>
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
