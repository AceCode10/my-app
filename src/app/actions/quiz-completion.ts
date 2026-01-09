'use server';

import { createClient } from '@/lib/supabase/server';
import { GamificationIntegration } from '@/lib/gamification/integration';

export interface QuizCompletionData {
  userId: string;
  quizId: string;
  score: number;
  totalQuestions: number;
  timeSpentSeconds: number;
  isPerfectScore: boolean;
}

export async function handleQuizCompletion(data: QuizCompletionData) {
  try {
    const supabase = await createClient();
    const integration = new GamificationIntegration();

    // Award XP and check for badges
    const result = await integration.handleQuizCompletion(
      data.userId,
      data.quizId,
      data.score,
      data.totalQuestions,
      data.timeSpentSeconds
    );

    // Update streak
    await integration.handleDailyActivity(data.userId);

    return {
      success: true,
      xpAwarded: result.xpAwarded,
      badgesEarned: result.badgesEarned,
      leveledUp: result.leveledUp,
      newLevel: result.newLevel
    };
  } catch (error) {
    console.error('Error handling quiz completion:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function handleNoteView(userId: string, noteId: string, timeSpentSeconds: number) {
  try {
    const integration = new GamificationIntegration();
    
    const result = await integration.handleNoteView(userId, noteId, timeSpentSeconds);
    await integration.handleDailyActivity(userId);

    return {
      success: true,
      xpAwarded: result.xpAwarded
    };
  } catch (error) {
    console.error('Error handling note view:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function handleAssignmentCompletion(
  userId: string,
  assignmentId: string,
  score: number,
  totalPoints: number
) {
  try {
    const integration = new GamificationIntegration();
    
    const result = await integration.handleAssignmentCompletion(
      userId,
      assignmentId,
      score,
      totalPoints
    );
    await integration.handleDailyActivity(userId);

    return {
      success: true,
      xpAwarded: result.xpAwarded,
      badgesEarned: result.badgesEarned
    };
  } catch (error) {
    console.error('Error handling assignment completion:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
