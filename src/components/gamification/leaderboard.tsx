'use client';

import { useState, useEffect } from 'react';
import { Trophy, Medal, Award, Crown, TrendingUp, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  avatar_url?: string;
  total_xp: number;
  level: number;
  updated_at: string;
}

export function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [timeframe, setTimeframe] = useState<'all' | 'week' | 'month'>('all');
  const { user } = useUser();
  const supabase = createClient();

  useEffect(() => {
    loadLeaderboard();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('leaderboard_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leaderboard_cache'
        },
        () => {
          loadLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [timeframe]);

  const loadLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('leaderboard_cache')
        .select('*')
        .order('rank', { ascending: true })
        .limit(100);

      if (error) throw error;

      setEntries(data || []);

      // Find current user's rank
      if (user) {
        const userEntry = data?.find(entry => entry.user_id === user.id);
        setUserRank(userEntry?.rank || null);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2: return <Trophy className="h-6 w-6 text-gray-400" />;
      case 3: return <Medal className="h-6 w-6 text-amber-600" />;
      default: return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">🏆 Champion</Badge>;
    }
    if (rank === 2) {
      return <Badge className="bg-gray-100 text-gray-800 border-gray-300">🥈 Runner-up</Badge>;
    }
    if (rank === 3) {
      return <Badge className="bg-amber-100 text-amber-800 border-amber-300">🥉 Third Place</Badge>;
    }
    if (rank <= 10) {
      return <Badge variant="secondary">Top 10</Badge>;
    }
    return null;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Leaderboard
          </CardTitle>
          <CardDescription>Top performers this week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted animate-pulse">
                <div className="w-10 h-10 bg-muted-foreground/20 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-muted-foreground/20 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted-foreground/20 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Leaderboard
            </CardTitle>
            <CardDescription>Top performers across the platform</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadLeaderboard}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* User's Position Banner */}
        {userRank && (
          <div className="mb-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20">
                  {getRankIcon(userRank)}
                </div>
                <div>
                  <p className="font-semibold">Your Rank</p>
                  <p className="text-sm text-muted-foreground">
                    #{userRank} out of {entries.length}
                  </p>
                </div>
              </div>
              {getRankBadge(userRank)}
            </div>
          </div>
        )}

        {/* Leaderboard List */}
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-2">
            {entries.map((entry, index) => (
              <div
                key={entry.user_id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                  entry.user_id === user?.id 
                    ? 'bg-primary/10 border-2 border-primary/30 shadow-sm' 
                    : 'hover:bg-muted/50 border border-transparent'
                }`}
              >
                {/* Rank */}
                <div className="flex items-center justify-center w-10 h-10">
                  {getRankIcon(entry.rank)}
                </div>

                {/* Avatar */}
                <Avatar className="h-10 w-10">
                  <AvatarImage src={entry.avatar_url} alt={entry.display_name} />
                  <AvatarFallback className="bg-primary/10">
                    {getInitials(entry.display_name)}
                  </AvatarFallback>
                </Avatar>
                
                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium truncate">
                      {entry.display_name}
                    </p>
                    {entry.user_id === user?.id && (
                      <Badge variant="secondary" className="text-xs">You</Badge>
                    )}
                    {getRankBadge(entry.rank)}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      Level {entry.level}
                    </span>
                    <span className="flex items-center gap-1">
                      <Award className="h-3 w-3" />
                      {entry.total_xp.toLocaleString()} XP
                    </span>
                  </div>
                </div>

                {/* Rank Change Indicator (placeholder for future) */}
                {index < 3 && (
                  <div className="text-2xl">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Footer Stats */}
        <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-primary">{entries.length}</p>
            <p className="text-xs text-muted-foreground">Total Players</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary">
              {entries[0]?.total_xp.toLocaleString() || 0}
            </p>
            <p className="text-xs text-muted-foreground">Top XP</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary">
              {entries[0]?.level || 0}
            </p>
            <p className="text-xs text-muted-foreground">Highest Level</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
