
'use server';

/**
 * @fileOverview An AI agent that generates a model answer for a given question and provides feedback on a student's answer.
 *
 * - generateModelAnswer - A function that generates a model answer and feedback.
 * - GenerateModelAnswerInput - The input type for the generateModelAnswer function.
 * - GenerateModelAnswerOutput - The return type for the generateModelAnswer function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

export const GenerateModelAnswerInputSchema = z.object({
  question: z.string().describe('The quiz question.'),
  correctAnswer: z.string().describe('The correct answer for the question.'),
  studentAnswer: z.string().describe("The student's incorrect answer."),
  topic: z.string().describe('The topic of the question.'),
});
export type GenerateModelAnswerInput = z.infer<typeof GenerateModelAnswerInputSchema>;

export const GenerateModelAnswerOutputSchema = z.object({
  modelAnswer: z.string().describe('An ideal, concise model answer for the question.'),
  feedback: z
    .string()
    .describe("Constructive feedback for the student, explaining why their answer was incorrect and how the model answer is better."),
});
export type GenerateModelAnswerOutput = z.infer<typeof GenerateModelAnswerOutputSchema>;

export async function generateModelAnswer(input: GenerateModelAnswerInput): Promise<GenerateModelAnswerOutput> {
  return generateModelAnswerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateModelAnswerPrompt',
  input: {schema: GenerateModelAnswerInputSchema},
  output: {schema: GenerateModelAnswerOutputSchema},
  prompt: `You are an expert IGCSE teacher providing feedback on a quiz question.
The student has answered incorrectly. Your task is to:
1. Provide a concise, ideal 'model answer' for the question.
2. Provide constructive feedback explaining why the student's answer is incorrect and why the model answer is correct, referencing the topic. Keep the feedback encouraging and helpful.

Topic: {{{topic}}}
Question: "{{{question}}}"
Correct Answer: "{{{correctAnswer}}}"
Student's Incorrect Answer: "{{{studentAnswer}}}"
`,
});

const generateModelAnswerFlow = ai.defineFlow(
  {
    name: 'generateModelAnswerFlow',
    inputSchema: GenerateModelAnswerInputSchema,
    outputSchema: GenerateModelAnswerOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
