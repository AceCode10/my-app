'use client';

import { useEffect, useRef } from 'react';
import { useProgress, ActivityType } from '@/hooks/use-progress';

interface ProgressTrackerProps {
  activityType: ActivityType;
  subjectId?: string;
  topicId?: string;
  noteId?: string;
  questionId?: string;
  children: React.ReactNode;
}

export function ProgressTracker({
  activityType,
  subjectId,
  topicId,
  noteId,
  questionId,
  children
}: ProgressTrackerProps) {
  const { trackProgress } = useProgress();
  const hasTracked = useRef(false);

  useEffect(() => {
    // Only track once per mount
    if (hasTracked.current) return;
    hasTracked.current = true;

    // Track that user started this activity
    trackProgress(activityType, {
      subjectId,
      topicId,
      noteId,
      questionId,
      completionPercentage: 0
    });
  }, [activityType, subjectId, topicId, noteId, questionId, trackProgress]);

  return <>{children}</>;
}

interface ScrollProgressTrackerProps extends ProgressTrackerProps {
  containerRef?: React.RefObject<HTMLElement>;
}

export function ScrollProgressTracker({
  activityType,
  subjectId,
  topicId,
  noteId,
  questionId,
  children,
  containerRef
}: ScrollProgressTrackerProps) {
  const { trackProgress } = useProgress();
  const lastPercentage = useRef(0);
  const hasTrackedStart = useRef(false);

  useEffect(() => {
    // Track start
    if (!hasTrackedStart.current) {
      hasTrackedStart.current = true;
      trackProgress(activityType, {
        subjectId,
        topicId,
        noteId,
        questionId,
        completionPercentage: 0
      });
    }

    const handleScroll = () => {
      const element = containerRef?.current || document.documentElement;
      const scrollTop = element.scrollTop || window.scrollY;
      const scrollHeight = element.scrollHeight - element.clientHeight;
      
      if (scrollHeight <= 0) return;
      
      const percentage = Math.min(100, Math.round((scrollTop / scrollHeight) * 100));
      
      // Only update if percentage changed significantly (every 10%)
      if (percentage >= lastPercentage.current + 10 || percentage === 100) {
        lastPercentage.current = percentage;
        trackProgress(activityType, {
          subjectId,
          topicId,
          noteId,
          questionId,
          progressData: { scrollPercentage: percentage },
          completionPercentage: percentage
        });
      }
    };

    const target = containerRef?.current || window;
    target.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      target.removeEventListener('scroll', handleScroll);
    };
  }, [activityType, subjectId, topicId, noteId, questionId, trackProgress, containerRef]);

  return <>{children}</>;
}
