'use client';

import { useProgress, UserProgress, ActivityType } from '@/hooks/use-progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  HelpCircle, 
  ClipboardList, 
  Layers, 
  PlayCircle,
  ArrowRight,
  Clock,
  X
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

const activityConfig: Record<ActivityType, { 
  icon: React.ElementType; 
  label: string; 
  color: string;
  getUrl: (progress: UserProgress) => string;
}> = {
  viewing_notes: {
    icon: BookOpen,
    label: 'Reading Notes',
    color: 'bg-blue-500/10 text-blue-500',
    getUrl: (p) => p.topic_id ? `/notes/${p.subject_id}/${p.topic_id}` : `/notes/${p.subject_id}`
  },
  practicing_questions: {
    icon: HelpCircle,
    label: 'Practice Questions',
    color: 'bg-green-500/10 text-green-500',
    getUrl: (p) => p.topic_id ? `/practice/${p.subject_id}/${p.topic_id}` : `/practice/${p.subject_id}`
  },
  taking_quiz: {
    icon: ClipboardList,
    label: 'Quiz',
    color: 'bg-purple-500/10 text-purple-500',
    getUrl: (p) => `/quiz/${p.subject_id}/${p.topic_id}`
  },
  reviewing_flashcards: {
    icon: Layers,
    label: 'Flashcards',
    color: 'bg-orange-500/10 text-orange-500',
    getUrl: (p) => `/flashcards/${p.subject_id}/${p.topic_id}`
  },
  watching_video: {
    icon: PlayCircle,
    label: 'Video',
    color: 'bg-red-500/10 text-red-500',
    getUrl: (p) => `/videos/${p.subject_id}/${p.topic_id}`
  }
};

function ProgressCard({ progress, onDismiss }: { progress: UserProgress; onDismiss: () => void }) {
  const config = activityConfig[progress.activity_type];
  const Icon = config.icon;
  const url = config.getUrl(progress);

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors group">
      <div className={`p-3 rounded-full ${config.color}`}>
        <Icon className="h-5 w-5" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="secondary" className="text-xs">
            {config.label}
          </Badge>
          {progress.completion_percentage > 0 && (
            <Badge variant="outline" className="text-xs">
              {progress.completion_percentage}% complete
            </Badge>
          )}
        </div>
        
        <p className="font-medium truncate">
          {progress.topic_name || progress.subject_name || 'Continue learning'}
        </p>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          <Clock className="h-3 w-3" />
          <span>{formatDistanceToNow(new Date(progress.last_accessed_at), { addSuffix: true })}</span>
          {progress.subject_name && progress.topic_name && (
            <>
              <span>•</span>
              <span>{progress.subject_name}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.preventDefault();
            onDismiss();
          }}
        >
          <X className="h-4 w-4" />
        </Button>
        
        <Link href={url}>
          <Button size="sm" className="gap-1">
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

export function ContinueWhereYouLeftOff() {
  const { recentProgress, loading, markCompleted } = useProgress();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Continue Where You Left Off</CardTitle>
          <CardDescription>Pick up right where you stopped</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (recentProgress.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Continue Where You Left Off
        </CardTitle>
        <CardDescription>Pick up right where you stopped</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {recentProgress.map((progress) => (
          <ProgressCard
            key={progress.id}
            progress={progress}
            onDismiss={() => markCompleted(progress.id)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

export function ContinueWhereYouLeftOffCompact() {
  const { recentProgress, loading } = useProgress();

  if (loading || recentProgress.length === 0) {
    return null;
  }

  const latestProgress = recentProgress[0];
  const config = activityConfig[latestProgress.activity_type];
  const Icon = config.icon;
  const url = config.getUrl(latestProgress);

  return (
    <Link href={url}>
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer">
        <div className={`p-2 rounded-full ${config.color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            Continue: {latestProgress.topic_name || latestProgress.subject_name}
          </p>
          <p className="text-xs text-muted-foreground">
            {config.label} • {latestProgress.completion_percentage}% complete
          </p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  );
}
