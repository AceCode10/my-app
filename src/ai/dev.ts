import { config } from 'dotenv';
config();

import '@/ai/flows/generate-quiz-questions.ts';
import '@/ai/flows/get-academic-coaching.ts';
import '@/ai/flows/generate-model-answer.ts';
import '@/ai/flows/generate-revision-note.ts';
import '@/ai/flows/get-leaderboard.ts';
