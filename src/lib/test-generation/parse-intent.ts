/**
 * Stage 1 — read the teacher's sentence.
 *
 * The only genuinely ambiguous step in the pipeline, and therefore the only one
 * the model touches. It returns the teacher's own words; nothing here resolves
 * an identifier or picks a question.
 */

import { z } from 'zod';

import { getLlmProvider } from '@/lib/llm';

import { IntentParseError } from './errors';
import type { RawIntent } from './types';

export const RawIntentSchema = z.object({
  subject: z.string().max(120).nullable(),
  examBoard: z.string().max(120).nullable(),
  level: z.string().max(60).nullable(),
  durationMinutes: z.number().int().min(5).max(360).nullable(),
  totalMarks: z.number().int().min(1).max(300).nullable(),
  topics: z.array(z.string().max(120)).max(20).default([]),
  difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']).nullable(),
  questionTypes: z.array(z.string().max(40)).max(10).default([]),
  calculatorAllowed: z.boolean().nullable(),
  title: z.string().max(160).nullable(),
  notes: z.string().max(500).nullable(),
});

/**
 * Shape hint appended to the system prompt by the provider. Hand-written rather
 * than derived, so it stays readable and carries the per-field guidance the
 * model actually needs.
 */
const SHAPE_HINT: Record<string, unknown> = {
  subject: 'string | null — the subject as written, e.g. "biology" or "0610"',
  examBoard: 'string | null — e.g. "cambridge", "CIE", "edexcel"',
  level: 'string | null — e.g. "igcse", "as", "a2", "o level"',
  durationMinutes: 'integer | null — only if a time was stated',
  totalMarks: 'integer | null — only if a mark total was stated',
  topics: 'string[] — topic names explicitly named, otherwise []',
  difficulty: '"easy" | "medium" | "hard" | "mixed" | null',
  questionTypes: 'string[] — e.g. ["mcq"], ["structured"], otherwise []',
  calculatorAllowed: 'boolean | null',
  title: 'string | null — only if the teacher named the test',
  notes: 'string | null — anything you could not map, verbatim',
};

const SYSTEM = `You extract test parameters from a teacher's request.

Rules:
- Never invent an id, uuid, or database key. Return the words the teacher used.
- null means "not stated". Do not guess a duration, a mark total, or a level.
- topics: only topic names the teacher explicitly named. Otherwise an empty array.
- Put anything you could not map into "notes", verbatim.
- Do not write questions or mark schemes. You are only reading the request.
- If the request is not about creating a test, set every field to null and
  explain in "notes".`;

export async function parseIntent(prompt: string): Promise<{
  intent: RawIntent;
  usage: { inputTokens: number; outputTokens: number; model: string; provider: string };
}> {
  const llm = getLlmProvider();

  // No temperature: sampling parameters are rejected by the current Claude
  // models, and the provider drops them anyway. See lib/llm/anthropic.ts.
  const result = await llm.complete<unknown>({
    system: SYSTEM,
    user: prompt,
    jsonSchema: SHAPE_HINT,
    maxTokens: 800,
  });

  // Built before the validity check so a rejected response is still billed and
  // recorded — a run of unparseable outputs costs real money and should show up
  // in the spend dashboard rather than vanishing.
  const usage = {
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    model: result.model,
    provider: result.provider,
  };

  const parsed = RawIntentSchema.safeParse(result.json);
  if (!parsed.success) {
    throw new IntentParseError(
      'Could not read that request. Try naming the subject and how long the test should be.',
      parsed.error.issues,
      usage,
    );
  }

  return { intent: parsed.data, usage };
}
