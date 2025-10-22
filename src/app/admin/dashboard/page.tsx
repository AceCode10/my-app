'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import type { UserProfile, Note, Quiz } from "@/types";
import { collection, query } from "firebase/firestore";
import { Users, FileText, Edit } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import withRole from "@/hooks/withRole";

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
    const firestore = useFirestore();

    const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
    const notesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'notes')) : null, [firestore]);
    const quizzesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'quizzes')) : null, [firestore]);

    const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);
    const { data: notes, isLoading: isLoadingNotes } = useCollection<Note>(notesQuery);
    const { data: quizzes, isLoading: isLoadingQuizzes } = useCollection<Quiz>(quizzesQuery);
    
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
                    value={users?.length || 0} 
                    icon={<Users className="h-4 w-4 text-muted-foreground" />}
                    isLoading={isLoadingUsers}
                />
                <StatCard 
                    title="Total Notes" 
                    value={notes?.length || 0} 
                    icon={<FileText className="h-4 w-4 text-muted-foreground" />}
                    isLoading={isLoadingNotes}
                />
                <StatCard 
                    title="Total Quizzes" 
                    value={quizzes?.length || 0} 
                    icon={<Edit className="h-4 w-4 text-muted-foreground" />}
                    isLoading={isLoadingQuizzes}
                />
            </div>
        </div>
    );
}

export default AdminDashboardPage;
