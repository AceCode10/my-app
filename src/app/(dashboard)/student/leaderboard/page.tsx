
'use client';

import { Leaderboard } from '@/components/gamification';
import { Trophy } from 'lucide-react';

export default function LeaderboardPage() {
    return (
        <div className="space-y-6">
            <div className="text-center">
                <Trophy className="mx-auto h-12 w-12 text-yellow-400" />
                <h2 className="text-3xl font-bold text-foreground mt-2">Leaderboard</h2>
                <p className="text-muted-foreground">See how you stack up against other learners</p>
            </div>
            
            <Leaderboard limit={50} showUserRank={true} />
        </div>
    );
}
