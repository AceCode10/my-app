'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export type ActivityType = 
  | 'viewing_notes'
  | 'practicing_questions'
  | 'taking_quiz'
  | 'reviewing_flashcards'
  | 'watching_video';

export interface UserProgress {
  id: string;
  activity_type: ActivityType;
  subject_id: string | null;
  subject_name: string | null;
  subject_slug: string | null;
  topic_id: string | null;
  topic_name: string | null;
  topic_slug: string | null;
  note_id: string | null;
  question_id: string | null;
  progress_data: Record<string, any>;
  completion_percentage: number;
  last_accessed_at: string;
}

export function useProgress() {
  const supabase = createClient();
  const [recentProgress, setRecentProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecentProgress = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setRecentProgress([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc('get_recent_progress', { p_limit: 5 });
      
      if (error) {
        console.error('Error fetching progress:', error);
        setRecentProgress([]);
      } else {
        setRecentProgress(data || []);
      }
    } catch (error) {
      console.error('Error in fetchRecentProgress:', error);
      setRecentProgress([]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchRecentProgress();
  }, [fetchRecentProgress]);

  const trackProgress = useCallback(async (
    activityType: ActivityType,
    options: {
      subjectId?: string;
      topicId?: string;
      noteId?: string;
      questionId?: string;
      progressData?: Record<string, any>;
      completionPercentage?: number;
    } = {}
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase.rpc('upsert_user_progress', {
        p_activity_type: activityType,
        p_subject_id: options.subjectId || null,
        p_topic_id: options.topicId || null,
        p_note_id: options.noteId || null,
        p_question_id: options.questionId || null,
        p_progress_data: options.progressData || {},
        p_completion_percentage: options.completionPercentage || 0
      });

      if (error) {
        console.error('Error tracking progress:', error);
        return null;
      }

      // Refresh the recent progress list
      fetchRecentProgress();
      return data;
    } catch (error) {
      console.error('Error in trackProgress:', error);
      return null;
    }
  }, [supabase, fetchRecentProgress]);

  const markCompleted = useCallback(async (progressId: string) => {
    try {
      const { error } = await supabase
        .from('user_progress')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', progressId);

      if (error) {
        console.error('Error marking completed:', error);
        return false;
      }

      fetchRecentProgress();
      return true;
    } catch (error) {
      console.error('Error in markCompleted:', error);
      return false;
    }
  }, [supabase, fetchRecentProgress]);

  return {
    recentProgress,
    loading,
    trackProgress,
    markCompleted,
    refresh: fetchRecentProgress
  };
}
