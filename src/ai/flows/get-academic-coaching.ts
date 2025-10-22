
'use server';
/**
 * @fileOverview An AI agent that gives students helpful academic coaching.
 *
 * - getAcademicCoaching - A function that handles the academic coaching process.
 * - GetAcademicCoachingInput - The input type for the getAcademicCoaching function.
 * - GetAcademicCoachingOutput - The return type for the getAcademicCoaching function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const GetAcademicCoachingInputSchema = z.object({
  question: z.string().describe('The question the student is asking.'),
});
export type GetAcademicCoachingInput = z.infer<typeof GetAcademicCoachingInputSchema>;

const GetAcademicCoachingOutputSchema = z.object({
  answer: z.string().describe('The answer to the question.'),
});
export type GetAcademicCoachingOutput = z.infer<typeof GetAcademicCoachingOutputSchema>;

export async function getAcademicCoaching(input: GetAcademicCoachingInput): Promise<GetAcademicCoachingOutput> {
  return getAcademicCoachingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getAcademicCoachingPrompt',
  input: {schema: GetAcademicCoachingInputSchema},
  output: {schema: GetAcademicCoachingOutputSchema},
  prompt: `You are an expert academic coach named Kodi, skilled at helping students understand subject matter.

  A student is asking you a question, please answer it in a helpful and informative way.

  Question: {{{question}}}`,
});

const getAcademicCoachingFlow = ai.defineFlow(
  {
    name: 'getAcademicCoachingFlow',
    inputSchema: GetAcademicCoachingInputSchema,
    outputSchema: GetAcademicCoachingOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
