/**
 * Flashcard Service
 * Spaced repetition learning system with SM-2 algorithm
 */

import { createClient } from '@/lib/supabase/client';

export interface FlashcardDeck {
  id: string;
  user_id: string;
  subject_id?: string;
  topic_id?: string;
  title: string;
  description?: string;
  is_public: boolean;
  is_system: boolean;
  card_count: number;
  tags?: string[];
  cover_image_url?: string;
  created_at: string;
  updated_at: string;
  subject?: { id: string; name: string };
  topic?: { id: string; name: string };
}

export interface Flashcard {
  id: string;
  deck_id: string;
  question_id?: string;
  front_content: string;
  back_content: string;
  front_image_url?: string;
  back_image_url?: string;
  hints?: string[];
  tags?: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  position: number;
  created_at: string;
}

export interface FlashcardProgress {
  id: string;
  user_id: string;
  flashcard_id: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  last_reviewed_at?: string;
  next_review_at: string;
  last_rating?: number;
  total_reviews: number;
  correct_count: number;
}

export interface StudySession {
  id: string;
  user_id: string;
  deck_id?: string;
  topic_id?: string;
  session_type: 'review' | 'learn' | 'cram' | 'custom';
  cards_studied: number;
  cards_correct: number;
  cards_wrong: number;
  time_spent_seconds: number;
  started_at: string;
  ended_at?: string;
  is_completed: boolean;
}

export type Rating = 0 | 1 | 2 | 3; // Again, Hard, Good, Easy

export class FlashcardService {
  private supabase = createClient();

  // ============================================
  // DECK MANAGEMENT
  // ============================================

  async createDeck(data: {
    title: string;
    description?: string;
    subject_id?: string;
    topic_id?: string;
    is_public?: boolean;
    tags?: string[];
  }): Promise<FlashcardDeck | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return null;

      const { data: deck, error } = await this.supabase
        .from('flashcard_decks')
        .insert({
          user_id: user.id,
          ...data
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating deck:', error);
        return null;
      }

      return deck;
    } catch (error) {
      console.error('Error in createDeck:', error);
      return null;
    }
  }

  async getUserDecks(): Promise<FlashcardDeck[]> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await this.supabase
        .from('flashcard_decks')
        .select(`
          *,
          subject:subjects(id, name),
          topic:topics(id, name)
        `)
        .or(`user_id.eq.${user.id},is_public.eq.true,is_system.eq.true`)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching decks:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserDecks:', error);
      return [];
    }
  }

  async getDeck(deckId: string): Promise<FlashcardDeck | null> {
    try {
      const { data, error } = await this.supabase
        .from('flashcard_decks')
        .select(`
          *,
          subject:subjects(id, name),
          topic:topics(id, name)
        `)
        .eq('id', deckId)
        .single();

      if (error) {
        console.error('Error fetching deck:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getDeck:', error);
      return null;
    }
  }

  async updateDeck(deckId: string, updates: Partial<FlashcardDeck>): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('flashcard_decks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', deckId);

      return !error;
    } catch (error) {
      console.error('Error updating deck:', error);
      return false;
    }
  }

  async deleteDeck(deckId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('flashcard_decks')
        .delete()
        .eq('id', deckId);

      return !error;
    } catch (error) {
      console.error('Error deleting deck:', error);
      return false;
    }
  }

  // ============================================
  // FLASHCARD MANAGEMENT
  // ============================================

  async addCard(deckId: string, data: {
    front_content: string;
    back_content: string;
    front_image_url?: string;
    back_image_url?: string;
    hints?: string[];
    tags?: string[];
    difficulty?: 'easy' | 'medium' | 'hard';
  }): Promise<Flashcard | null> {
    try {
      // Get max position
      const { data: maxPos } = await this.supabase
        .from('flashcards')
        .select('position')
        .eq('deck_id', deckId)
        .order('position', { ascending: false })
        .limit(1)
        .single();

      const position = (maxPos?.position || 0) + 1;

      const { data: card, error } = await this.supabase
        .from('flashcards')
        .insert({
          deck_id: deckId,
          position,
          ...data
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding card:', error);
        return null;
      }

      return card;
    } catch (error) {
      console.error('Error in addCard:', error);
      return null;
    }
  }

  async getCards(deckId: string): Promise<Flashcard[]> {
    try {
      const { data, error } = await this.supabase
        .from('flashcards')
        .select('*')
        .eq('deck_id', deckId)
        .order('position');

      if (error) {
        console.error('Error fetching cards:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getCards:', error);
      return [];
    }
  }

  async updateCard(cardId: string, updates: Partial<Flashcard>): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('flashcards')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', cardId);

      return !error;
    } catch (error) {
      console.error('Error updating card:', error);
      return false;
    }
  }

  async deleteCard(cardId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('flashcards')
        .delete()
        .eq('id', cardId);

      return !error;
    } catch (error) {
      console.error('Error deleting card:', error);
      return false;
    }
  }

  // ============================================
  // STUDY & SPACED REPETITION
  // ============================================

  async getCardsForReview(deckId?: string, limit = 20): Promise<(Flashcard & { progress?: FlashcardProgress })[]> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return [];

      // Get cards due for review
      let query = this.supabase
        .from('flashcard_progress')
        .select(`
          *,
          flashcard:flashcards(*)
        `)
        .eq('user_id', user.id)
        .lte('next_review_at', new Date().toISOString())
        .order('next_review_at')
        .limit(limit);

      if (deckId) {
        query = query.eq('flashcard.deck_id', deckId);
      }

      const { data: progressData, error } = await query;

      if (error) {
        console.error('Error fetching cards for review:', error);
        return [];
      }

      const cards = (progressData || [])
        .filter(p => p.flashcard)
        .map(p => ({
          ...p.flashcard,
          progress: {
            id: p.id,
            user_id: p.user_id,
            flashcard_id: p.flashcard_id,
            ease_factor: p.ease_factor,
            interval_days: p.interval_days,
            repetitions: p.repetitions,
            last_reviewed_at: p.last_reviewed_at,
            next_review_at: p.next_review_at,
            last_rating: p.last_rating,
            total_reviews: p.total_reviews,
            correct_count: p.correct_count
          }
        }));

      return cards;
    } catch (error) {
      console.error('Error in getCardsForReview:', error);
      return [];
    }
  }

  async getNewCards(deckId: string, limit = 10): Promise<Flashcard[]> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return [];

      // Get cards that don't have progress yet
      const { data: cards, error } = await this.supabase
        .from('flashcards')
        .select('*')
        .eq('deck_id', deckId)
        .not('id', 'in', 
          this.supabase
            .from('flashcard_progress')
            .select('flashcard_id')
            .eq('user_id', user.id)
        )
        .order('position')
        .limit(limit);

      if (error) {
        console.error('Error fetching new cards:', error);
        return [];
      }

      return cards || [];
    } catch (error) {
      console.error('Error in getNewCards:', error);
      return [];
    }
  }

  async reviewCard(flashcardId: string, rating: Rating): Promise<FlashcardProgress | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return null;

      // Get current progress
      const { data: existing } = await this.supabase
        .from('flashcard_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('flashcard_id', flashcardId)
        .single();

      // Calculate new values using SM-2 algorithm
      const currentEase = existing?.ease_factor || 2.5;
      const currentInterval = existing?.interval_days || 0;
      const currentReps = existing?.repetitions || 0;

      const { newEase, newInterval, newReps, nextReview } = this.calculateSM2(
        currentEase,
        currentInterval,
        currentReps,
        rating
      );

      const progressData = {
        user_id: user.id,
        flashcard_id: flashcardId,
        ease_factor: newEase,
        interval_days: newInterval,
        repetitions: newReps,
        last_reviewed_at: new Date().toISOString(),
        next_review_at: nextReview.toISOString(),
        last_rating: rating,
        total_reviews: (existing?.total_reviews || 0) + 1,
        correct_count: (existing?.correct_count || 0) + (rating >= 2 ? 1 : 0),
        updated_at: new Date().toISOString()
      };

      const { data: progress, error } = await this.supabase
        .from('flashcard_progress')
        .upsert(progressData, { onConflict: 'user_id,flashcard_id' })
        .select()
        .single();

      if (error) {
        console.error('Error updating progress:', error);
        return null;
      }

      return progress;
    } catch (error) {
      console.error('Error in reviewCard:', error);
      return null;
    }
  }

  // SM-2 Algorithm implementation
  private calculateSM2(
    currentEase: number,
    currentInterval: number,
    currentReps: number,
    rating: Rating
  ): { newEase: number; newInterval: number; newReps: number; nextReview: Date } {
    const minEase = 1.3;
    
    // Calculate ease factor change
    const easeDelta = 0.1 - (3 - rating) * (0.08 + (3 - rating) * 0.02);
    let newEase = Math.max(minEase, currentEase + easeDelta);
    
    let newInterval: number;
    let newReps: number;
    
    if (rating < 2) {
      // Failed: reset
      newReps = 0;
      newInterval = 1;
    } else {
      newReps = currentReps + 1;
      
      if (currentReps === 0) {
        newInterval = 1;
      } else if (currentReps === 1) {
        newInterval = 6;
      } else {
        newInterval = Math.ceil(currentInterval * newEase);
      }
      
      // Adjust based on rating
      if (rating === 1) {
        newInterval = Math.ceil(newInterval * 0.8);
      } else if (rating === 3) {
        newInterval = Math.ceil(newInterval * 1.3);
      }
    }
    
    // Cap at 365 days
    newInterval = Math.min(newInterval, 365);
    
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + newInterval);
    
    return { newEase, newInterval, newReps, nextReview };
  }

  // ============================================
  // STUDY SESSIONS
  // ============================================

  async startSession(deckId?: string, sessionType: 'review' | 'learn' | 'cram' | 'custom' = 'review'): Promise<string | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return null;

      const { data: session, error } = await this.supabase
        .from('study_sessions')
        .insert({
          user_id: user.id,
          deck_id: deckId,
          session_type: sessionType
        })
        .select()
        .single();

      if (error) {
        console.error('Error starting session:', error);
        return null;
      }

      return session.id;
    } catch (error) {
      console.error('Error in startSession:', error);
      return null;
    }
  }

  async updateSession(sessionId: string, updates: {
    cards_studied?: number;
    cards_correct?: number;
    cards_wrong?: number;
    time_spent_seconds?: number;
  }): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('study_sessions')
        .update(updates)
        .eq('id', sessionId);

      return !error;
    } catch (error) {
      console.error('Error updating session:', error);
      return false;
    }
  }

  async endSession(sessionId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('study_sessions')
        .update({
          ended_at: new Date().toISOString(),
          is_completed: true
        })
        .eq('id', sessionId);

      if (!error) {
        // Update user study stats
        await this.updateStudyStats();
      }

      return !error;
    } catch (error) {
      console.error('Error ending session:', error);
      return false;
    }
  }

  // ============================================
  // STATS & ANALYTICS
  // ============================================

  async getStudyStats(): Promise<any> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return null;

      const { data: stats } = await this.supabase
        .from('user_study_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!stats) {
        // Create default stats
        const { data: newStats } = await this.supabase
          .from('user_study_stats')
          .insert({ user_id: user.id })
          .select()
          .single();
        return newStats;
      }

      return stats;
    } catch (error) {
      console.error('Error getting study stats:', error);
      return null;
    }
  }

  async getDueCount(deckId?: string): Promise<number> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return 0;

      let query = this.supabase
        .from('flashcard_progress')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .lte('next_review_at', new Date().toISOString());

      const { count, error } = await query;

      if (error) return 0;
      return count || 0;
    } catch (error) {
      console.error('Error getting due count:', error);
      return 0;
    }
  }

  async getRecentSessions(limit = 10): Promise<StudySession[]> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await this.supabase
        .from('study_sessions')
        .select(`
          *,
          deck:flashcard_decks(id, title)
        `)
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) return [];
      return data || [];
    } catch (error) {
      console.error('Error getting recent sessions:', error);
      return [];
    }
  }

  private async updateStudyStats(): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return;

      // Get aggregated stats
      const { data: sessions } = await this.supabase
        .from('study_sessions')
        .select('cards_studied, cards_correct, time_spent_seconds, started_at')
        .eq('user_id', user.id)
        .eq('is_completed', true);

      if (!sessions) return;

      const totalCards = sessions.reduce((sum, s) => sum + (s.cards_studied || 0), 0);
      const totalTime = sessions.reduce((sum, s) => sum + (s.time_spent_seconds || 0), 0);
      const totalCorrect = sessions.reduce((sum, s) => sum + (s.cards_correct || 0), 0);
      
      // Calculate streak
      const dates = sessions.map(s => new Date(s.started_at).toDateString());
      const uniqueDates = [...new Set(dates)].sort().reverse();
      let streak = 0;
      const today = new Date().toDateString();
      
      for (let i = 0; i < uniqueDates.length; i++) {
        const expectedDate = new Date();
        expectedDate.setDate(expectedDate.getDate() - i);
        if (uniqueDates[i] === expectedDate.toDateString()) {
          streak++;
        } else {
          break;
        }
      }

      await this.supabase
        .from('user_study_stats')
        .upsert({
          user_id: user.id,
          total_cards_studied: totalCards,
          total_time_seconds: totalTime,
          current_streak: streak,
          longest_streak: streak, // Would need to track separately
          last_study_date: today,
          retention_rate: totalCards > 0 ? (totalCorrect / totalCards) * 100 : 0,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error updating study stats:', error);
    }
  }

  // ============================================
  // DECK GENERATION FROM QUESTIONS
  // ============================================

  async generateDeckFromTopic(topicId: string, title: string): Promise<string | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return null;

      // Get topic info
      const { data: topic } = await this.supabase
        .from('topics')
        .select('*, subject:subjects(*)')
        .eq('id', topicId)
        .single();

      // Create deck
      const deck = await this.createDeck({
        title,
        description: `Flashcards for ${topic?.name}`,
        subject_id: topic?.subject_id,
        topic_id: topicId
      });

      if (!deck) return null;

      // Get questions for topic
      const { data: questions } = await this.supabase
        .from('questions')
        .select('*')
        .eq('topic_id', topicId)
        .eq('status', 'published')
        .limit(50);

      if (questions) {
        for (const q of questions) {
          await this.addCard(deck.id, {
            front_content: q.stem_markdown,
            back_content: q.correct_answer || q.explanation || 'See mark scheme',
            difficulty: q.difficulty || 'medium'
          });
        }
      }

      return deck.id;
    } catch (error) {
      console.error('Error generating deck:', error);
      return null;
    }
  }
}

export const flashcardService = new FlashcardService();
