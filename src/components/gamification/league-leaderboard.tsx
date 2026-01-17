'use client';

/**
 * League Leaderboard Component
 * Weekly competition leaderboard with rank zones
 */

import { motion } from 'framer-motion';
import { Crown, TrendingUp, TrendingDown, Clock, Users, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { LeagueMember, League } from '@/lib/gamification/league-service';
import { LeagueBadge } from './league-badge';

interface LeagueLeaderboardProps {
  members: LeagueMember[];
  currentLeague: {
    league_name: string;
    league_tier: number;
    league_icon: string;
    league_color: string;
  } | null;
  league: League | null;
  weekInfo: {
    daysRemaining: number;
    hoursRemaining: number;
  };
  onMemberClick?: (member: LeagueMember) => void;
  className?: string;
}

export function LeagueLeaderboard({
  members,
  currentLeague,
  league,
  weekInfo,
  onMemberClick,
  className,
}: LeagueLeaderboardProps) {
  if (!currentLeague || members.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Join a league to compete!</p>
        </CardContent>
      </Card>
    );
  }

  const promotionSlots = league?.promotion_slots || 10;
  const demotionSlots = league?.demotion_slots || 5;
  const totalMembers = members.length;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LeagueBadge
              name={currentLeague.league_name}
              tier={currentLeague.league_tier}
              icon={currentLeague.league_icon}
              color={currentLeague.league_color}
              size="md"
              showName={false}
            />
            <div>
              <CardTitle className="text-lg">{currentLeague.league_name} League</CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {weekInfo.daysRemaining > 0 ? (
                  <span>{weekInfo.daysRemaining}d {weekInfo.hoursRemaining}h left</span>
                ) : (
                  <span>{weekInfo.hoursRemaining}h left</span>
                )}
                <span className="text-muted-foreground/50">•</span>
                <Users className="h-3.5 w-3.5" />
                <span>{totalMembers} members</span>
              </div>
            </div>
          </div>
        </div>

        {/* Zone indicators */}
        <div className="flex gap-2 mt-3 text-xs">
          {currentLeague.league_tier < 11 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-600">
              <TrendingUp className="h-3 w-3" />
              Top {promotionSlots} promote
            </div>
          )}
          {currentLeague.league_tier > 1 && demotionSlots > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-600">
              <TrendingDown className="h-3 w-3" />
              Bottom {demotionSlots} demote
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-1">
        {members.map((member, index) => (
          <LeaderboardRow
            key={member.user_id}
            member={member}
            index={index}
            promotionSlots={promotionSlots}
            demotionSlots={demotionSlots}
            totalMembers={totalMembers}
            leagueTier={currentLeague.league_tier}
            onClick={() => onMemberClick?.(member)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

interface LeaderboardRowProps {
  member: LeagueMember;
  index: number;
  promotionSlots: number;
  demotionSlots: number;
  totalMembers: number;
  leagueTier: number;
  onClick?: () => void;
}

function LeaderboardRow({
  member,
  index,
  promotionSlots,
  demotionSlots,
  totalMembers,
  leagueTier,
  onClick,
}: LeaderboardRowProps) {
  const rank = member.rank || index + 1;
  
  // Determine zone
  const isPromotion = leagueTier < 11 && rank <= promotionSlots;
  const isDemotion = leagueTier > 1 && demotionSlots > 0 && rank > totalMembers - demotionSlots;
  
  // Rank badge
  const getRankDisplay = () => {
    switch (rank) {
      case 1:
        return <span className="text-lg">🥇</span>;
      case 2:
        return <span className="text-lg">🥈</span>;
      case 3:
        return <span className="text-lg">🥉</span>;
      default:
        return <span className="text-sm font-medium text-muted-foreground">{rank}</span>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-2 rounded-lg transition-all',
        member.is_current_user && 'bg-primary/10 ring-1 ring-primary/30',
        !member.is_current_user && 'hover:bg-muted/50',
        isPromotion && !member.is_current_user && 'bg-green-500/5',
        isDemotion && !member.is_current_user && 'bg-red-500/5',
        onClick && 'cursor-pointer'
      )}
    >
      {/* Rank */}
      <div className="w-8 flex items-center justify-center">
        {getRankDisplay()}
      </div>

      {/* Avatar */}
      <Avatar className="h-8 w-8">
        <AvatarImage src={member.avatar_url || undefined} />
        <AvatarFallback className="text-xs">
          {member.display_name?.charAt(0).toUpperCase() || '?'}
        </AvatarFallback>
      </Avatar>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'font-medium text-sm truncate',
          member.is_current_user && 'text-primary'
        )}>
          {member.display_name}
          {member.is_current_user && (
            <span className="text-xs text-muted-foreground ml-1">(You)</span>
          )}
        </p>
      </div>

      {/* Zone indicator */}
      {isPromotion && (
        <TrendingUp className="h-4 w-4 text-green-500" />
      )}
      {isDemotion && (
        <TrendingDown className="h-4 w-4 text-red-500" />
      )}

      {/* XP */}
      <div className="text-right">
        <p className={cn(
          'font-semibold text-sm',
          rank === 1 && 'text-yellow-500'
        )}>
          {member.weekly_xp.toLocaleString()} XP
        </p>
      </div>
    </motion.div>
  );
}

/**
 * Compact league widget for dashboard
 */
interface LeagueWidgetProps {
  currentLeague: {
    league_name: string;
    league_tier: number;
    league_icon: string;
    league_color: string;
  } | null;
  userRank: LeagueMember | null;
  totalMembers: number;
  weekInfo: { daysRemaining: number; hoursRemaining: number };
  onPress?: () => void;
  className?: string;
}

export function LeagueWidget({
  currentLeague,
  userRank,
  totalMembers,
  weekInfo,
  onPress,
  className,
}: LeagueWidgetProps) {
  if (!currentLeague) {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onPress}
        className={cn(
          'p-4 rounded-2xl cursor-pointer transition-all',
          'bg-gradient-to-br from-muted/50 to-muted/30 border border-muted',
          className
        )}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Crown className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">Join a League</h3>
            <p className="text-sm text-muted-foreground">Compete weekly!</p>
          </div>
          <ChevronRight className="h-5 w-5 ml-auto text-muted-foreground" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onPress}
      className={cn(
        'p-4 rounded-2xl cursor-pointer transition-all border',
        className
      )}
      style={{
        background: `linear-gradient(135deg, ${currentLeague.league_color}15, ${currentLeague.league_color}05)`,
        borderColor: `${currentLeague.league_color}30`,
      }}
    >
      <div className="flex items-center gap-4">
        <LeagueBadge
          name={currentLeague.league_name}
          tier={currentLeague.league_tier}
          icon={currentLeague.league_icon}
          color={currentLeague.league_color}
          size="md"
          showName={false}
        />
        
        <div className="flex-1">
          <h3 className="font-semibold">{currentLeague.league_name} League</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {userRank && (
              <>
                <span className="font-medium" style={{ color: currentLeague.league_color }}>
                  #{userRank.rank}
                </span>
                <span>of {totalMembers}</span>
                <span className="text-muted-foreground/50">•</span>
              </>
            )}
            <span>{weekInfo.daysRemaining}d left</span>
          </div>
        </div>

        {userRank && (
          <div className="text-right">
            <p className="font-bold" style={{ color: currentLeague.league_color }}>
              {userRank.weekly_xp}
            </p>
            <p className="text-xs text-muted-foreground">XP this week</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
