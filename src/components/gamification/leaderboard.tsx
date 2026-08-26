'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Trophy, Medal, Award, Crown, TrendingUp, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';

// Create supabase client outside component to prevent re-creation on every render
const supabase = createClient();

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  avatar_url?: string;
  total_xp: number;
  level: number;
  updated_at: string;
}

/** A row of `leaderboard_cache`, as written by `update_leaderboard_cache()`. */
interface LeaderboardCacheRow {
  user_id: string;
  rank: number;
  total_xp: number | null;
  level: number | null;
  display_name: string | null;
  avatar_url: string | null;
  updated_at: string;
}

interface LeaderboardProps {
  limit?: number;
  showUserRank?: boolean;
}

/**
 * Matched to the refresh cron in vercel.json, which rebuilds leaderboard_cache
 * every 15 minutes — polling faster than the data can change just re-fetches an
 * identical board. Five minutes keeps the board responsive shortly after a
 * rebuild without paying for the other fourteen.
 *
 * The old value was 10 seconds, which cost ~7.5 requests/second across a
 * 300-student cohort. That was survivable only because RLS was silently
 * truncating each response to a single row; now that the board actually returns
 * ~100 rows, a 10s poll would move roughly 200 GB/month per school against a
 * 250 GB included allowance. Polling is gated on tab visibility on top of this,
 * and an immediate refresh fires on focus and on the local `xp_earned` event.
 */
const POLL_INTERVAL_MS = 5 * 60_000;

export function Leaderboard({ limit = 100, showUserRank = true }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [rankedTotal, setRankedTotal] = useState(0);
  const { user } = useUser();

  const loadLeaderboard = useCallback(async () => {
    try {
      // Read the cache, never user_gamification: RLS on that table is
      // `user_id = auth.uid()`, so ordering it by total_xp returns exactly one
      // row — your own — and the board silently shows you alone in first place.
      // leaderboard_cache is `USING (true)`, pre-ranked, and already excludes
      // anyone with leaderboard_opt_out set (see update_leaderboard_cache()).
      // `count: 'exact'` rides along in the same request — it gives the size of
      // the whole ranked field, so the "#N out of M" line can quote the field
      // rather than the page, without a second round trip.
      const { data, error, count } = await supabase
        .from('leaderboard_cache')
        .select('user_id, rank, total_xp, level, display_name, avatar_url, updated_at', {
          count: 'exact',
        })
        .order('rank', { ascending: true })
        .limit(limit);

      if (error) throw error;

      setRankedTotal(count ?? 0);

      const rows = (data ?? []) as LeaderboardCacheRow[];

      const leaderboardData: LeaderboardEntry[] = rows.map((entry) => ({
        rank: entry.rank,
        user_id: entry.user_id,
        display_name: entry.display_name || 'Anonymous',
        avatar_url: entry.avatar_url ?? undefined,
        total_xp: entry.total_xp ?? 0,
        level: entry.level ?? 1,
        updated_at: entry.updated_at,
      }));

      setEntries(leaderboardData);

      if (!user) {
        setUserRank(null);
        return;
      }

      const userEntry = leaderboardData.find((entry) => entry.user_id === user.id);
      if (userEntry) {
        setUserRank(userEntry.rank);
        return;
      }

      // Outside the top N — the cache still holds the real rank (up to 1000).
      // Absent means opted out, or ranked below the cache cutoff.
      const { data: ownRank } = await supabase
        .from('leaderboard_cache')
        .select('rank')
        .eq('user_id', user.id)
        .maybeSingle();

      setUserRank(ownRank?.rank ?? null);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  }, [limit, user]);

  // Keeps the visibility handler from closing over a stale callback.
  const loadRef = useRef(loadLeaderboard);
  loadRef.current = loadLeaderboard;

  useEffect(() => {
    loadLeaderboard();

    // There is deliberately no postgres_changes subscription here. RLS confines
    // user_gamification to your own row, so the old channel could only ever fire
    // for your own XP — it could not tell you someone had overtaken you, while
    // still holding one of the 500 included Realtime connections. Subscribing to
    // leaderboard_cache instead would be worse: update_leaderboard_cache()
    // rebuilds it with DELETE + INSERT, so every refresh would fan ~2000 change
    // events out to every connected client.

    // Your own XP landing is worth an immediate refresh — this is local and free.
    const handleXPEarned = () => loadRef.current();
    window.addEventListener('xp_earned', handleXPEarned);

    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const stopPolling = () => {
      if (pollInterval !== null) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };

    const startPolling = () => {
      if (pollInterval === null) {
        pollInterval = setInterval(() => loadRef.current(), POLL_INTERVAL_MS);
      }
    };

    // A backgrounded tab polls nothing; returning to it refreshes at once so the
    // board is never visibly stale, however long the student was away.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadRef.current();
        startPolling();
      } else {
        stopPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    if (document.visibilityState === 'visible') startPolling();

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('xp_earned', handleXPEarned);
    };
  }, [loadLeaderboard]);

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
        {showUserRank && userRank && (
          <div className="mb-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20">
                  {getRankIcon(userRank)}
                </div>
                <div>
                  <p className="font-semibold">Your Rank</p>
                  <p className="text-sm text-muted-foreground">
                    #{userRank} out of {rankedTotal || entries.length}
                  </p>
                </div>
              </div>
              {getRankBadge(userRank)}
            </div>
          </div>
        )}

        {/* Leaderboard List */}
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Trophy className="h-8 w-8 text-muted-foreground/40" />
            <p className="font-medium">No rankings yet</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              The board fills up once students start earning XP. Finish a quiz to
              claim the first place.
            </p>
          </div>
        ) : (
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
        )}

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
