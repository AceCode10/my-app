'use client';

/**
 * League Badge Component
 * Displays current league with icon and tier
 */

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LeagueBadgeProps {
  name: string;
  tier: number;
  icon: string;
  color: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showName?: boolean;
  showTier?: boolean;
  animate?: boolean;
  onClick?: () => void;
  className?: string;
}

const SIZES = {
  sm: { badge: 'w-8 h-8', icon: 'text-lg', name: 'text-xs', tier: 'text-[10px]' },
  md: { badge: 'w-12 h-12', icon: 'text-2xl', name: 'text-sm', tier: 'text-xs' },
  lg: { badge: 'w-16 h-16', icon: 'text-3xl', name: 'text-base', tier: 'text-sm' },
  xl: { badge: 'w-24 h-24', icon: 'text-5xl', name: 'text-lg', tier: 'text-base' },
};

export function LeagueBadge({
  name,
  tier,
  icon,
  color,
  size = 'md',
  showName = true,
  showTier = false,
  animate = true,
  onClick,
  className,
}: LeagueBadgeProps) {
  const sizeConfig = SIZES[size];

  const Badge = animate ? motion.div : 'div';
  const animationProps = animate ? {
    whileHover: { scale: 1.05 },
    whileTap: { scale: 0.95 },
  } : {};

  return (
    <div 
      className={cn(
        'flex flex-col items-center gap-1',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <Badge
        {...animationProps}
        className={cn(
          sizeConfig.badge,
          'rounded-full flex items-center justify-center relative',
          'shadow-lg'
        )}
        style={{
          background: `linear-gradient(135deg, ${color}40, ${color}20)`,
          border: `2px solid ${color}`,
          boxShadow: `0 0 20px ${color}40`,
        }}
      >
        {/* Glow effect */}
        <div 
          className="absolute inset-0 rounded-full blur-md opacity-50"
          style={{ background: color }}
        />
        
        {/* Icon */}
        <span className={cn('relative z-10', sizeConfig.icon)}>
          {icon}
        </span>
      </Badge>

      {/* Name */}
      {showName && (
        <span 
          className={cn('font-semibold', sizeConfig.name)}
          style={{ color }}
        >
          {name}
        </span>
      )}

      {/* Tier */}
      {showTier && (
        <span className={cn('text-muted-foreground', sizeConfig.tier)}>
          Tier {tier}
        </span>
      )}
    </div>
  );
}

/**
 * League progress showing all leagues
 */
interface LeagueProgressProps {
  currentTier: number;
  leagues: Array<{ name: string; tier: number; icon: string; color: string }>;
  className?: string;
}

export function LeagueProgress({ currentTier, leagues, className }: LeagueProgressProps) {
  return (
    <div className={cn('flex items-center justify-center gap-1', className)}>
      {leagues.slice(0, 6).map((league) => {
        const isActive = league.tier === currentTier;
        const isPast = league.tier < currentTier;
        
        return (
          <div
            key={league.tier}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all',
              isActive && 'ring-2 ring-offset-2 scale-110',
              !isActive && !isPast && 'opacity-40 grayscale'
            )}
            style={{
              background: isPast || isActive ? `${league.color}30` : undefined,
              borderColor: league.color,
              ['--tw-ring-color' as string]: isActive ? league.color : undefined,
            }}
            title={league.name}
          >
            {league.icon}
          </div>
        );
      })}
      {leagues.length > 6 && (
        <span className="text-xs text-muted-foreground ml-1">
          +{leagues.length - 6}
        </span>
      )}
    </div>
  );
}
