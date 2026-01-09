'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  XCircle, 
  Flag, 
  Clock, 
  RotateCcw, 
  Home,
  Trophy,
  TrendingUp,
  BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface SessionSummaryProps {
  stats: {
    correct: number;
    incorrect: number;
    flagged: number;
    viewed: number;
    unanswered: number;
    totalTimeSpent: number;
    isComplete: boolean;
  };
  totalQuestions: number;
  topicName: string;
  subjectName: string;
  subjectSlug: string;
  onRestart: () => void;
  onReviewFlagged?: () => void;
  onReviewIncorrect?: () => void;
}

export function SessionSummary({
  stats,
  totalQuestions,
  topicName,
  subjectName,
  subjectSlug,
  onRestart,
  onReviewFlagged,
  onReviewIncorrect
}: SessionSummaryProps) {
  const answeredCount = stats.correct + stats.incorrect + stats.flagged;
  const completionRate = Math.round((answeredCount / totalQuestions) * 100);
  const successRate = answeredCount > 0 
    ? Math.round((stats.correct / answeredCount) * 100) 
    : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const getPerformanceMessage = () => {
    if (successRate >= 90) return { text: 'Excellent!', emoji: '🌟', color: 'text-green-500' };
    if (successRate >= 70) return { text: 'Good job!', emoji: '👍', color: 'text-blue-500' };
    if (successRate >= 50) return { text: 'Keep practicing!', emoji: '💪', color: 'text-yellow-500' };
    return { text: 'More practice needed', emoji: '📚', color: 'text-orange-500' };
  };

  const performance = getPerformanceMessage();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="text-6xl mb-4">{performance.emoji}</div>
        <h1 className={cn("text-3xl font-bold", performance.color)}>
          {performance.text}
        </h1>
        <p className="text-muted-foreground mt-2">
          {topicName} • {subjectName}
        </p>
      </div>

      {/* Score Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Your Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-6">
            <div className="text-5xl font-bold text-foreground">
              {successRate}%
            </div>
            <p className="text-muted-foreground">
              {stats.correct} out of {answeredCount} answered correctly
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-green-500/10 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">{stats.correct}</div>
              <div className="text-xs text-muted-foreground">Correct</div>
            </div>
            <div className="text-center p-4 bg-red-500/10 rounded-lg">
              <XCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-red-600">{stats.incorrect}</div>
              <div className="text-xs text-muted-foreground">Incorrect</div>
            </div>
            <div className="text-center p-4 bg-orange-500/10 rounded-lg">
              <Flag className="w-6 h-6 text-orange-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-orange-600">{stats.flagged}</div>
              <div className="text-xs text-muted-foreground">Flagged</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Completion</span>
              <span className="font-medium">{completionRate}%</span>
            </div>
            <Progress value={completionRate} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Clock className="w-5 h-5 text-primary" />
              <div>
                <div className="font-medium">{formatTime(stats.totalTimeSpent)}</div>
                <div className="text-xs text-muted-foreground">Time Spent</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-primary" />
              <div>
                <div className="font-medium">{stats.viewed}/{totalQuestions}</div>
                <div className="text-xs text-muted-foreground">Questions Viewed</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="space-y-3">
        {stats.flagged > 0 && onReviewFlagged && (
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={onReviewFlagged}
          >
            <Flag className="w-4 h-4 mr-2 text-orange-500" />
            Review {stats.flagged} Flagged Questions
          </Button>
        )}

        {stats.incorrect > 0 && onReviewIncorrect && (
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={onReviewIncorrect}
          >
            <XCircle className="w-4 h-4 mr-2 text-red-500" />
            Review {stats.incorrect} Incorrect Questions
          </Button>
        )}

        <Button 
          onClick={onRestart}
          className="w-full"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Restart Practice
        </Button>

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1"
            asChild
          >
            <Link href={`/resources/topical-questions/${subjectSlug}`}>
              <BookOpen className="w-4 h-4 mr-2" />
              More Topics
            </Link>
          </Button>
          <Button 
            variant="outline" 
            className="flex-1"
            asChild
          >
            <Link href="/resources/topical-questions">
              <Home className="w-4 h-4 mr-2" />
              All Subjects
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
