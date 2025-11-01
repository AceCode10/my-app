
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { getLeaderboard, type LeaderboardUser } from '@/lib/ai-placeholders';

export default function LeaderboardPage() {
    const [topUsers, setTopUsers] = useState<LeaderboardUser[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                setIsLoading(true);
                const { leaderboard } = await getLeaderboard();
                setTopUsers(leaderboard);
            } catch (error) {
                console.error("Failed to fetch leaderboard:", error);
                setTopUsers([]); // Set to empty array on error to stop loading
            } finally {
                setIsLoading(false);
            }
        };

        fetchLeaderboard();
    }, []);

    return (
        <div className="grid grid-cols-1">
            <div className="col-span-1">
                <div className="text-center mb-8">
                    <Trophy className="mx-auto h-12 w-12 text-yellow-400" />
                    <h2 className="text-3xl font-bold text-foreground mt-2">Leaderboard</h2>
                    <p className="text-muted-foreground">See how you stack up against other learners.</p>
                </div>
                
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-sm text-muted-foreground bg-muted/50">
                                        <th className="p-2 sm:p-4 text-left font-semibold">Rank</th>
                                        <th className="p-2 sm:p-4 text-left font-semibold">User</th>
                                        <th className="p-2 sm:p-4 text-right font-semibold">XP</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        Array.from({ length: 10 }).map((_, index) => (
                                            <tr key={index} className="border-t">
                                                <td className="p-2 sm:p-4"><Skeleton className="h-6 w-6" /></td>
                                                <td className="p-2 sm:p-4">
                                                    <div className="flex items-center space-x-3">
                                                        <Skeleton className="h-10 w-10 rounded-full" />
                                                        <Skeleton className="h-4 w-32" />
                                                    </div>
                                                </td>
                                                <td className="p-2 sm:p-4 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                                            </tr>
                                        ))
                                    ) : (
                                        topUsers?.map((user, index) => (
                                            <tr key={user.uid} className={`border-t ${index < 3 ? 'bg-primary/5' : ''}`}>
                                                <td className="p-2 sm:p-4">
                                                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-foreground font-bold">
                                                        {index + 1}
                                                    </div>
                                                </td>
                                                <td className="p-2 sm:p-4">
                                                    <div className="flex items-center space-x-3">
                                                        <Avatar>
                                                            <AvatarImage src={user.photoURL ?? undefined} alt={user.displayName ?? undefined} />
                                                            <AvatarFallback>{user.displayName?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                                                        </Avatar>
                                                        <span className="font-medium text-foreground">{user.displayName}</span>
                                                    </div>
                                                </td>
                                                <td className="p-2 sm:p-4 text-right font-bold text-lg text-primary">{user.xp?.toLocaleString()}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
