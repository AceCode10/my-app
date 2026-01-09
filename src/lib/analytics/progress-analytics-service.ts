/**
 * Progress Analytics Service
 * Detailed per-topic tracking and learning analytics
 */

import { createClient } from '@/lib/supabase/client';

export interface TopicProgress {
  topic_id: string;
  topic_name: string;
  subject_id: string;
  subject_name: string;
  questions_attempted: number;
  questions_correct: number;
  mastery_percentage: number;
  last_practiced_at: string | null;
  weak_areas: string[];
  strength_areas: string[];
  recommended_action: string;
  trend: 'improving' | 'stable' | 'declining' | 'new';
}

export interface SubjectProgress {
  subject_id: string;
  subject_name: string;
  overall_mastery: number;
  topics_mastered: number;
  topics_in_progress: number;
  topics_not_started: number;
  total_topics: number;
  questions_attempted: number;
  questions_correct: number;
  time_spent_minutes: number;
  last_activity: string | null;
  topic_progress: TopicProgress[];
}

export interface LearningStreak {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  streak_history: { date: string; active: boolean }[];
}

export interface WeeklyActivity {
  day: string;
  questions: number;
  minutes: number;
  correct: number;
}

export interface OverallStats {
  total_questions_attempted: number;
  total_questions_correct: number;
  total_time_spent_minutes: number;
  subjects_studied: number;
  topics_mastered: number;
  average_accuracy: number;
  xp_earned: number;
  level: number;
  badges_earned: number;
}

export class ProgressAnalyticsService {
  private supabase = createClient();

  /**
   * Get comprehensive progress for a user
   */
  async getUserProgress(userId: string): Promise<{
    overall: OverallStats;
    subjects: SubjectProgress[];
    streak: LearningStreak;
    weeklyActivity: WeeklyActivity[];
    recentAchievements: any[];
  } | null> {
    try {
      const [overall, subjects, streak, weeklyActivity, achievements] = await Promise.all([
        this.getOverallStats(userId),
        this.getSubjectProgress(userId),
        this.getLearningStreak(userId),
        this.getWeeklyActivity(userId),
        this.getRecentAchievements(userId)
      ]);

      return {
        overall: overall!,
        subjects,
        streak: streak!,
        weeklyActivity,
        recentAchievements: achievements
      };
    } catch (error) {
      console.error('Error getting user progress:', error);
      return null;
    }
  }

  /**
   * Get overall stats for a user
   */
  async getOverallStats(userId: string): Promise<OverallStats | null> {
    try {
      // Get user profile with gamification data
      const { data: profile } = await this.supabase
        .from('users')
        .select('xp, level')
        .eq('id', userId)
        .single();

      // Get topic mastery stats
      const { data: masteryData } = await this.supabase
        .from('topic_mastery')
        .select('questions_attempted, questions_correct, mastery_percentage')
        .eq('user_id', userId);

      // Get study sessions for time spent
      const { data: sessions } = await this.supabase
        .from('study_sessions')
        .select('time_spent_seconds')
        .eq('user_id', userId);

      // Get badges count
      const { count: badgesCount } = await this.supabase
        .from('user_badges')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Get unique subjects
      const { data: subjectsStudied } = await this.supabase
        .from('topic_mastery')
        .select('topic:topics(subject_id)')
        .eq('user_id', userId);

      const totalAttempted = masteryData?.reduce((sum, m) => sum + (m.questions_attempted || 0), 0) || 0;
      const totalCorrect = masteryData?.reduce((sum, m) => sum + (m.questions_correct || 0), 0) || 0;
      const topicsMastered = masteryData?.filter(m => (m.mastery_percentage || 0) >= 80).length || 0;
      const timeSpent = sessions?.reduce((sum, s) => sum + (s.time_spent_seconds || 0), 0) || 0;
      const uniqueSubjects = new Set(subjectsStudied?.map((s: any) => s.topic?.subject_id).filter(Boolean));

      return {
        total_questions_attempted: totalAttempted,
        total_questions_correct: totalCorrect,
        total_time_spent_minutes: Math.floor(timeSpent / 60),
        subjects_studied: uniqueSubjects.size,
        topics_mastered: topicsMastered,
        average_accuracy: totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0,
        xp_earned: profile?.xp || 0,
        level: profile?.level || 1,
        badges_earned: badgesCount || 0
      };
    } catch (error) {
      console.error('Error getting overall stats:', error);
      return null;
    }
  }

  /**
   * Get progress by subject
   */
  async getSubjectProgress(userId: string): Promise<SubjectProgress[]> {
    try {
      // Get all subjects
      const { data: subjects } = await this.supabase
        .from('subjects')
        .select(`
          id,
          name,
          topics(id, name)
        `)
        .order('name');

      if (!subjects) return [];

      // Get user's topic mastery
      const { data: mastery } = await this.supabase
        .from('topic_mastery')
        .select('*')
        .eq('user_id', userId);

      const masteryMap = new Map(mastery?.map(m => [m.topic_id, m]) || []);

      const subjectProgress: SubjectProgress[] = [];

      for (const subject of subjects) {
        const topics = (subject.topics as any[]) || [];
        const topicProgress: TopicProgress[] = [];
        
        let totalMastery = 0;
        let totalAttempted = 0;
        let totalCorrect = 0;
        let topicsMastered = 0;
        let topicsInProgress = 0;
        let topicsNotStarted = 0;
        let lastActivity: string | null = null;

        for (const topic of topics) {
          const m = masteryMap.get(topic.id);
          
          if (m) {
            const mastery_pct = m.mastery_percentage || 0;
            totalMastery += mastery_pct;
            totalAttempted += m.questions_attempted || 0;
            totalCorrect += m.questions_correct || 0;
            
            if (mastery_pct >= 80) topicsMastered++;
            else if (m.questions_attempted > 0) topicsInProgress++;
            else topicsNotStarted++;

            if (m.last_practiced_at) {
              if (!lastActivity || new Date(m.last_practiced_at) > new Date(lastActivity)) {
                lastActivity = m.last_practiced_at;
              }
            }

            topicProgress.push({
              topic_id: topic.id,
              topic_name: topic.name,
              subject_id: subject.id,
              subject_name: subject.name,
              questions_attempted: m.questions_attempted || 0,
              questions_correct: m.questions_correct || 0,
              mastery_percentage: mastery_pct,
              last_practiced_at: m.last_practiced_at,
              weak_areas: m.weak_areas || [],
              strength_areas: [],
              recommended_action: this.getRecommendedAction(mastery_pct, m.questions_attempted || 0),
              trend: this.calculateTrend(m)
            });
          } else {
            topicsNotStarted++;
            topicProgress.push({
              topic_id: topic.id,
              topic_name: topic.name,
              subject_id: subject.id,
              subject_name: subject.name,
              questions_attempted: 0,
              questions_correct: 0,
              mastery_percentage: 0,
              last_practiced_at: null,
              weak_areas: [],
              strength_areas: [],
              recommended_action: 'Start learning this topic',
              trend: 'new'
            });
          }
        }

        if (topics.length > 0) {
          subjectProgress.push({
            subject_id: subject.id,
            subject_name: subject.name,
            overall_mastery: Math.round(totalMastery / topics.length),
            topics_mastered: topicsMastered,
            topics_in_progress: topicsInProgress,
            topics_not_started: topicsNotStarted,
            total_topics: topics.length,
            questions_attempted: totalAttempted,
            questions_correct: totalCorrect,
            time_spent_minutes: 0, // Would need to track per-subject
            last_activity: lastActivity,
            topic_progress: topicProgress.sort((a, b) => a.mastery_percentage - b.mastery_percentage)
          });
        }
      }

      return subjectProgress.sort((a, b) => b.overall_mastery - a.overall_mastery);
    } catch (error) {
      console.error('Error getting subject progress:', error);
      return [];
    }
  }

  /**
   * Get topic-specific progress
   */
  async getTopicProgress(userId: string, topicId: string): Promise<TopicProgress | null> {
    try {
      const { data: topic } = await this.supabase
        .from('topics')
        .select(`
          id,
          name,
          subject:subjects(id, name)
        `)
        .eq('id', topicId)
        .single();

      if (!topic) return null;

      const { data: mastery } = await this.supabase
        .from('topic_mastery')
        .select('*')
        .eq('user_id', userId)
        .eq('topic_id', topicId)
        .single();

      return {
        topic_id: topic.id,
        topic_name: topic.name,
        subject_id: (topic.subject as any)?.id || '',
        subject_name: (topic.subject as any)?.name || '',
        questions_attempted: mastery?.questions_attempted || 0,
        questions_correct: mastery?.questions_correct || 0,
        mastery_percentage: mastery?.mastery_percentage || 0,
        last_practiced_at: mastery?.last_practiced_at || null,
        weak_areas: mastery?.weak_areas || [],
        strength_areas: [],
        recommended_action: this.getRecommendedAction(mastery?.mastery_percentage || 0, mastery?.questions_attempted || 0),
        trend: mastery ? this.calculateTrend(mastery) : 'new'
      };
    } catch (error) {
      console.error('Error getting topic progress:', error);
      return null;
    }
  }

  /**
   * Get learning streak data
   */
  async getLearningStreak(userId: string): Promise<LearningStreak | null> {
    try {
      // Get user stats
      const { data: stats } = await this.supabase
        .from('user_study_stats')
        .select('current_streak, longest_streak, last_study_date')
        .eq('user_id', userId)
        .single();

      // Get activity for last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: sessions } = await this.supabase
        .from('study_sessions')
        .select('started_at')
        .eq('user_id', userId)
        .gte('started_at', thirtyDaysAgo.toISOString())
        .eq('is_completed', true);

      // Build streak history
      const activeDays = new Set(sessions?.map(s => new Date(s.started_at).toDateString()) || []);
      const streakHistory: { date: string; active: boolean }[] = [];

      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        streakHistory.push({
          date: dateStr,
          active: activeDays.has(date.toDateString())
        });
      }

      return {
        current_streak: stats?.current_streak || 0,
        longest_streak: stats?.longest_streak || 0,
        last_activity_date: stats?.last_study_date || null,
        streak_history: streakHistory
      };
    } catch (error) {
      console.error('Error getting learning streak:', error);
      return null;
    }
  }

  /**
   * Get weekly activity breakdown
   */
  async getWeeklyActivity(userId: string): Promise<WeeklyActivity[]> {
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: sessions } = await this.supabase
        .from('study_sessions')
        .select('started_at, cards_studied, cards_correct, time_spent_seconds')
        .eq('user_id', userId)
        .gte('started_at', weekAgo.toISOString())
        .eq('is_completed', true);

      // Group by day
      const dayMap = new Map<string, WeeklyActivity>();
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      // Initialize all days
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayName = days[date.getDay()];
        dayMap.set(dayName, { day: dayName, questions: 0, minutes: 0, correct: 0 });
      }

      // Aggregate data
      sessions?.forEach(session => {
        const date = new Date(session.started_at);
        const dayName = days[date.getDay()];
        const existing = dayMap.get(dayName);
        if (existing) {
          existing.questions += session.cards_studied || 0;
          existing.correct += session.cards_correct || 0;
          existing.minutes += Math.floor((session.time_spent_seconds || 0) / 60);
        }
      });

      return Array.from(dayMap.values());
    } catch (error) {
      console.error('Error getting weekly activity:', error);
      return [];
    }
  }

  /**
   * Get recent achievements
   */
  async getRecentAchievements(userId: string): Promise<any[]> {
    try {
      const { data } = await this.supabase
        .from('user_badges')
        .select(`
          *,
          badge:badges(*)
        `)
        .eq('user_id', userId)
        .order('earned_at', { ascending: false })
        .limit(5);

      return data || [];
    } catch (error) {
      console.error('Error getting achievements:', error);
      return [];
    }
  }

  /**
   * Update topic mastery after practice
   */
  async updateTopicMastery(
    userId: string,
    topicId: string,
    questionsAttempted: number,
    questionsCorrect: number
  ): Promise<boolean> {
    try {
      // Get existing mastery
      const { data: existing } = await this.supabase
        .from('topic_mastery')
        .select('*')
        .eq('user_id', userId)
        .eq('topic_id', topicId)
        .single();

      const totalAttempted = (existing?.questions_attempted || 0) + questionsAttempted;
      const totalCorrect = (existing?.questions_correct || 0) + questionsCorrect;
      const mastery = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

      const { error } = await this.supabase
        .from('topic_mastery')
        .upsert({
          user_id: userId,
          topic_id: topicId,
          questions_attempted: totalAttempted,
          questions_correct: totalCorrect,
          mastery_percentage: mastery,
          last_practiced_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,topic_id' });

      return !error;
    } catch (error) {
      console.error('Error updating topic mastery:', error);
      return false;
    }
  }

  /**
   * Get recommended topics to study
   */
  async getRecommendedTopics(userId: string, limit = 5): Promise<TopicProgress[]> {
    try {
      const subjects = await this.getSubjectProgress(userId);
      const allTopics: TopicProgress[] = [];

      for (const subject of subjects) {
        allTopics.push(...subject.topic_progress);
      }

      // Prioritize: low mastery but attempted > never attempted > high mastery
      return allTopics
        .filter(t => t.mastery_percentage < 80)
        .sort((a, b) => {
          // Prioritize topics that have been attempted but not mastered
          if (a.questions_attempted > 0 && b.questions_attempted === 0) return -1;
          if (a.questions_attempted === 0 && b.questions_attempted > 0) return 1;
          // Then sort by mastery (lower first)
          return a.mastery_percentage - b.mastery_percentage;
        })
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting recommended topics:', error);
      return [];
    }
  }

  // Helper functions
  private getRecommendedAction(mastery: number, attempted: number): string {
    if (attempted === 0) return 'Start learning this topic';
    if (mastery >= 80) return 'Review to maintain mastery';
    if (mastery >= 60) return 'Practice more to improve';
    if (mastery >= 40) return 'Focus on weak areas';
    return 'Review fundamentals';
  }

  private calculateTrend(mastery: any): 'improving' | 'stable' | 'declining' | 'new' {
    // Would need historical data to calculate properly
    // For now, return based on recent activity
    if (!mastery.last_practiced_at) return 'new';
    
    const daysSinceLastPractice = Math.floor(
      (Date.now() - new Date(mastery.last_practiced_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceLastPractice > 14) return 'declining';
    if (mastery.mastery_percentage >= 70) return 'improving';
    return 'stable';
  }
}

export const progressAnalyticsService = new ProgressAnalyticsService();
