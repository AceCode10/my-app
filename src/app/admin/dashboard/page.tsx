'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, FileText, Edit } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from '@/lib/supabase/client';

const StatCard = ({ title, value, icon, isLoading }: { title: string, value: number, icon: React.ReactNode, isLoading: boolean }) => {
    return (
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
};


function AdminDashboardPage() {
    const supabase = createClient();
    const [usersCount, setUsersCount] = useState(0);
    const [notesCount, setNotesCount] = useState(0);
    const [quizzesCount, setQuizzesCount] = useState(0);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const [isLoadingNotes, setIsLoadingNotes] = useState(true);
    const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(true);

    useEffect(() => {
        fetchCounts();
    }, []);

    async function fetchCounts() {
        try {
            // Fetch users count
            const { count: usersTotal, error: usersError } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true });
            
            if (usersError) throw usersError;
            setUsersCount(usersTotal || 0);
            setIsLoadingUsers(false);

            // Fetch notes count
            const { count: notesTotal, error: notesError } = await supabase
                .from('notes')
                .select('*', { count: 'exact', head: true });
            
            if (notesError) throw notesError;
            setNotesCount(notesTotal || 0);
            setIsLoadingNotes(false);

            // Fetch quizzes count
            const { count: quizzesTotal, error: quizzesError } = await supabase
                .from('quizzes')
                .select('*', { count: 'exact', head: true });
            
            if (quizzesError) throw quizzesError;
            setQuizzesCount(quizzesTotal || 0);
            setIsLoadingQuizzes(false);
        } catch (error) {
            console.error('Error fetching counts:', error);
            setIsLoadingUsers(false);
            setIsLoadingNotes(false);
            setIsLoadingQuizzes(false);
        }
    }
    
    return (
        <div>
            
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-foreground">Admin Dashboard</h2>
                    <p className="text-muted-foreground mt-1">An overview of your platform's content and users.</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <StatCard 
                    title="Total Users" 
                    value={usersCount} 
                    icon={<Users className="h-4 w-4 text-muted-foreground" />}
                    isLoading={isLoadingUsers}
                />
                <StatCard 
                    title="Total Notes" 
                    value={notesCount} 
                    icon={<FileText className="h-4 w-4 text-muted-foreground" />}
                    isLoading={isLoadingNotes}
                />
                <StatCard 
                    title="Total Quizzes" 
                    value={quizzesCount} 
                    icon={<Edit className="h-4 w-4 text-muted-foreground" />}
                    isLoading={isLoadingQuizzes}
                />
            </div>
        </div>
    );
}

export default AdminDashboardPage;
