'use client';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { UserProfile, Note, Quiz } from '@/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, FileText, Edit, BarChart3 as AnalyticsIcon } from 'lucide-react';
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
import { useMemo } from 'react';
import { format } from 'date-fns';

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
  const firestore = useFirestore();

  const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
  const notesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'notes'), orderBy('createdAt', 'asc')) : null, [firestore]);
  const quizzesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'quizzes'), orderBy('createdAt', 'asc')) : null, [firestore]);

  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);
  const { data: notes, isLoading: isLoadingNotes } = useCollection<Note>(notesQuery);
  const { data: quizzes, isLoading: isLoadingQuizzes } = useCollection<Quiz>(quizzesQuery);

  const roleDistribution = useMemo(() => {
    if (!users) return [];
    const roles = users.reduce((acc, user) => {
      const userRoles = Array.isArray(user.role) ? user.role : [user.role || 'student'];
      userRoles.forEach(role => {
        acc[role] = (acc[role] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(roles).map(([name, value]) => ({ name, value }));
  }, [users]);

  const contentCreationData = useMemo(() => {
    if (!notes || !quizzes) return [];
    
    const combined = [
        ...(notes || []).map(n => ({ type: 'note', date: n.createdAt?.toDate() })),
        ...(quizzes || []).map(q => ({ type: 'quiz', date: q.createdAt?.toDate() }))
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
            <StatCard title="Total Users" value={users?.length ?? 0} icon={<Users className="h-4 w-4 text-muted-foreground" />} isLoading={isLoadingUsers} />
            <StatCard title="Total Notes" value={notes?.length ?? 0} icon={<FileText className="h-4 w-4 text-muted-foreground" />} isLoading={isLoadingNotes} />
            <StatCard title="Total Quizzes" value={quizzes?.length ?? 0} icon={<Edit className="h-4 w-4 text-muted-foreground" />} isLoading={isLoadingQuizzes} />
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
