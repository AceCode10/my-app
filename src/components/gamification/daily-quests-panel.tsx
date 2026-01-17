'use client';

/**
 * Daily Quests Panel
 * Shows today's quests with progress
 */

import { motion } from 'framer-motion';
import { Check, Star, Gift, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { DailyQuest } from '@/lib/gamification/daily-goals-service';

interface DailyQuestsPanelProps {
  quests: DailyQuest[];
  onQuestClick?: (quest: DailyQuest) => void;
  className?: string;
}

export function DailyQuestsPanel({ quests, onQuestClick, className }: DailyQuestsPanelProps) {
  const completedCount = quests.filter(q => q.is_completed).length;
  const totalCount = quests.length;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            Daily Quests
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {completedCount}/{totalCount} completed
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {quests.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No quests available today
          </p>
        ) : (
          quests.map((quest, index) => (
            <QuestItem
              key={quest.id}
              quest={quest}
              index={index}
              onClick={() => onQuestClick?.(quest)}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

interface QuestItemProps {
  quest: DailyQuest;
  index: number;
  onClick?: () => void;
}

function QuestItem({ quest, index, onClick }: QuestItemProps) {
  const progress = Math.min(
    (quest.current_progress / quest.requirement_value) * 100,
    100
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={onClick}
      className={cn(
        'relative p-3 rounded-lg border transition-all',
        quest.is_completed
          ? 'bg-green-500/10 border-green-500/30'
          : 'bg-muted/30 border-transparent hover:border-muted-foreground/20',
        onClick && 'cursor-pointer'
      )}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0',
          quest.is_completed
            ? 'bg-green-500/20'
            : 'bg-muted'
        )}>
          {quest.is_completed ? (
            <Check className="h-5 w-5 text-green-500" />
          ) : (
            quest.icon
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={cn(
              'font-medium text-sm truncate',
              quest.is_completed && 'line-through text-muted-foreground'
            )}>
              {quest.title}
            </h4>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {quest.description}
          </p>
          
          {/* Progress bar (only show if not completed) */}
          {!quest.is_completed && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {quest.current_progress}/{quest.requirement_value}
              </span>
            </div>
          )}
        </div>

        {/* Reward */}
        <div className={cn(
          'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0',
          quest.is_completed
            ? 'bg-green-500/20 text-green-600'
            : 'bg-yellow-500/20 text-yellow-600'
        )}>
          <Gift className="h-3 w-3" />
          +{quest.xp_reward} XP
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Compact quest list for sidebar/widget use
 */
interface CompactQuestListProps {
  quests: DailyQuest[];
  maxVisible?: number;
  onViewAll?: () => void;
}

export function CompactQuestList({ quests, maxVisible = 3, onViewAll }: CompactQuestListProps) {
  const visibleQuests = quests.slice(0, maxVisible);
  const remainingCount = quests.length - maxVisible;

  return (
    <div className="space-y-2">
      {visibleQuests.map((quest) => (
        <div
          key={quest.id}
          className={cn(
            'flex items-center gap-2 p-2 rounded-lg',
            quest.is_completed ? 'bg-green-500/10' : 'bg-muted/50'
          )}
        >
          <span className="text-sm">{quest.icon}</span>
          <span className={cn(
            'text-sm flex-1 truncate',
            quest.is_completed && 'line-through text-muted-foreground'
          )}>
            {quest.title}
          </span>
          {quest.is_completed ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <span className="text-xs text-yellow-500 font-medium">
              +{quest.xp_reward}
            </span>
          )}
        </div>
      ))}
      
      {remainingCount > 0 && onViewAll && (
        <button
          onClick={onViewAll}
          className="flex items-center gap-1 text-sm text-primary hover:underline"
        >
          View {remainingCount} more
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
