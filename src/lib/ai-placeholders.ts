/**
 * AI Feature Placeholders
 * 
 * Per instructions.md, AI is NOT used for question generation, summarization, or chat tutoring.
 * These are placeholder functions to prevent build errors in components that reference AI features.
 * 
 * TODO: Remove these references from components or implement non-AI alternatives.
 */

export async function generateQuizQuestions(params: any) {
  throw new Error('AI quiz generation is disabled. Please create questions manually.');
}

export async function generateModelAnswer(params: any) {
  return {
    answer: 'AI model answers are disabled. Please provide manual answers.',
    explanation: 'This feature requires manual content creation by teachers.',
  };
}

export async function generateRevisionNote(params: any) {
  throw new Error('AI note generation is disabled. Please create notes manually.');
}

export async function getLeaderboard() {
  // This should actually query the database, not use AI
  // Placeholder until we implement proper leaderboard
  return [];
}

export type LeaderboardUser = {
  id: string;
  display_name: string;
  avatar_url?: string;
  xp: number;
  rank: number;
};

export type GenerateModelAnswerOutput = {
  answer: string;
  explanation: string;
};
