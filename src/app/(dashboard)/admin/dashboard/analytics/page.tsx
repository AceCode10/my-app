'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, FileText, Edit } from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { format } from 'date-fns';

interface UserProfile {
  id: string;
  role: string;
}

interface Note {
  id: string;
  created_at: string;
}

interface Quiz {
  id: string;
  created_at: string;
}

const StatCard = ({ title, value, icon, isLoading }: { title: string; value: number; icon: React.ReactNode; isLoading: boolean }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      {isLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">{value}</div>}
    </CardContent>
  </Card>
);

const PlatformAnalyticsPage = () => {
  const supabase = createClient();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(true);

  useEffect(() => {
    async function fetchData() {
      // Fetch users
      const { data: usersData } = await supabase
        .from('users')
        .select('id, role');
      setUsers(usersData || []);
      setIsLoadingUsers(false);

      // Fetch notes
      const { data: notesData } = await supabase
        .from('notes')
        .select('id, created_at')
        .order('created_at', { ascending: true });
      setNotes(notesData || []);
      setIsLoadingNotes(false);

      // Fetch quizzes
      const { data: quizzesData } = await supabase
        .from('quizzes')
        .select('id, created_at')
        .order('created_at', { ascending: true });
      setQuizzes(quizzesData || []);
      setIsLoadingQuizzes(false);
    }

    fetchData();
  }, []);

  const roleDistribution = useMemo(() => {
    if (!users.length) return [];
    const roles = users.reduce((acc, user) => {
      const role = user.role || 'student';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(roles).map(([name, value]) => ({ name, value }));
  }, [users]);

  const contentCreationData = useMemo(() => {
    if (!notes.length && !quizzes.length) return [];
    
    const combined = [
      ...notes.map(n => ({ type: 'note', date: new Date(n.created_at) })),
      ...quizzes.map(q => ({ type: 'quiz', date: new Date(q.created_at) }))
    ].filter(item => item.date);

    combined.sort((a, b) => a.date.getTime() - b.date.getTime());

    const dataByMonth: { [key: string]: { month: string; notes: number; quizzes: number } } = {};

    combined.forEach(item => {
      const month = format(item.date, 'MMM yyyy');
      if (!dataByMonth[month]) {
        dataByMonth[month] = { month, notes: 0, quizzes: 0 };
      }
      if (item.type === 'note') dataByMonth[month].notes++;
      if (item.type === 'quiz') dataByMonth[month].quizzes++;
    });

    return Object.values(dataByMonth);
  }, [notes, quizzes]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
  const isLoading = isLoadingUsers || isLoadingNotes || isLoadingQuizzes;

  return (
    <div>
      <h2 className="text-3xl font-bold text-foreground">Platform Analytics</h2>
      <p className="text-muted-foreground mt-1 mb-8">An overview of platform growth and content statistics.</p>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <StatCard title="Total Users" value={users.length} icon={<Users className="h-4 w-4 text-muted-foreground" />} isLoading={isLoadingUsers} />
        <StatCard title="Total Notes" value={notes.length} icon={<FileText className="h-4 w-4 text-muted-foreground" />} isLoading={isLoadingNotes} />
        <StatCard title="Total Quizzes" value={quizzes.length} icon={<Edit className="h-4 w-4 text-muted-foreground" />} isLoading={isLoadingQuizzes} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>User Role Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingUsers ? <Skeleton className="h-[300px] w-full" /> : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={roleDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {roleDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <RechartsLegend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Content Creation Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[300px] w-full" /> : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={contentCreationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <RechartsTooltip />
                  <RechartsLegend />
                  <Line type="monotone" dataKey="notes" stroke="#8884d8" name="Notes Created" />
                  <Line type="monotone" dataKey="quizzes" stroke="#82ca9d" name="Quizzes Created" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PlatformAnalyticsPage;
