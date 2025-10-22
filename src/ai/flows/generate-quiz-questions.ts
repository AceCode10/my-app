
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating quiz questions based on a given topic.
 *
 * - generateQuizQuestions - A function that generates quiz questions for a specific topic.
 * - GenerateQuizQuestionsInput - The input type for the generateQuizQuestions function.
 * - GenerateQuizQuestionsOutput - The return type for the generateQuizQuestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const GenerateQuizQuestionsInputSchema = z.object({
  topic: z.string().describe('The topic for which to generate quiz questions.'),
  numQuestions: z.number().int().min(1).max(10).default(5).describe('The number of quiz questions to generate (1-10).'),
});
export type GenerateQuizQuestionsInput = z.infer<typeof GenerateQuizQuestionsInputSchema>;

const GenerateQuizQuestionsOutputSchema = z.object({
  questions: z.array(
    z.object({
      id: z.string().describe("A unique identifier for the question."),
      prompt: z.string().describe('The quiz question text.'),
      options: z.array(z.string()).length(4).describe('An array of exactly four possible answer options.'),
      correctAnswer: z.string().describe('The correct answer from the options array.'),
      explanation: z.string().describe('A brief explanation of why the answer is correct.'),
      type: z.literal("mcq").describe("The type of the question, which is 'mcq' for multiple choice."),
      marks: z.number().describe("The number of marks for the question, defaulting to 1."),
    })
  ).describe('An array of quiz questions with options and correct answers.'),
});
export type GenerateQuizQuestionsOutput = z.infer<typeof GenerateQuizQuestionsOutputSchema>;

export async function generateQuizQuestions(input: GenerateQuizQuestionsInput): Promise<GenerateQuizQuestionsOutput> {
  return generateQuizQuestionsFlow(input);
}

const generateQuizQuestionsPrompt = ai.definePrompt({
  name: 'generateQuizQuestionsPrompt',
  input: {schema: GenerateQuizQuestionsInputSchema},
  output: {schema: GenerateQuizQuestionsOutputSchema},
  prompt: `You are an expert IGCSE teacher, skilled at creating practice quizzes.
  Generate {{numQuestions}} multiple-choice quiz questions about {{topic}}.
  Each question should have four possible answers, one of which is correct.
  Provide a clear explanation of why the correct answer is correct.
  Each question should have a unique ID, a type of 'mcq', and be worth 1 mark.

  Format the output as a JSON object that strictly follows the provided schema.
`,
});

const generateQuizQuestionsFlow = ai.defineFlow(
  {
    name: 'generateQuizQuestionsFlow',
    inputSchema: GenerateQuizQuestionsInputSchema,
    outputSchema: GenerateQuizQuestionsOutputSchema,
  },
  async input => {
    const {output} = await generateQuizQuestionsPrompt(input);
    return output!;
  }
);
