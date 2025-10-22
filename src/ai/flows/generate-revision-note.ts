
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating a revision note based on a given topic.
 *
 * - generateRevisionNote - A function that generates note content for a specific topic.
 * - GenerateRevisionNoteInput - The input type for the generateRevisionNote function.
 * - GenerateRevisionNoteOutput - The return type for the generateRevisionNote function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

export const GenerateRevisionNoteInputSchema = z.object({
  topic: z.string().describe('The IGCSE topic for which to generate the revision note.'),
});
export type GenerateRevisionNoteInput = z.infer<typeof GenerateRevisionNoteInputSchema>;

export const GenerateRevisionNoteOutputSchema = z.object({
  htmlContent: z.string().describe('The generated revision note content in well-structured HTML format.'),
});
export type GenerateRevisionNoteOutput = z.infer<typeof GenerateRevisionNoteOutputSchema>;

export async function generateRevisionNote(input: GenerateRevisionNoteInput): Promise<GenerateRevisionNoteOutput> {
  return generateRevisionNoteFlow(input);
}

const generateRevisionNotePrompt = ai.definePrompt({
  name: 'generateRevisionNotePrompt',
  input: {schema: GenerateRevisionNoteInputSchema},
  output: {schema: GenerateRevisionNoteOutputSchema},
  prompt: `You are an expert IGCSE content creator. Your task is to generate a comprehensive, well-structured revision note for the topic: '{{{topic}}}'.

The output must be in HTML format.
- Use appropriate semantic tags: <h2> for main sections, <h3> for sub-sections, <p> for paragraphs, <ul>/<ol> for lists, and <b>/<strong> for key terms.
- For worked examples, wrap the entire section in a <div class="worked-example">. Start this section with an <h3>Worked Example</h3>.
- For exam tips, wrap the entire section in a <div class="exam-tip">. Start this section with an <h3>Exam Tip</h3>.
- Ensure the content is accurate, concise, and covers the key concepts of the topic suitable for IGCSE-level students.
- Do not include <html>, <head>, or <body> tags. The output should be only the content that can be placed inside a main content <div>.
`,
});

const generateRevisionNoteFlow = ai.defineFlow(
  {
    name: 'generateRevisionNoteFlow',
    inputSchema: GenerateRevisionNoteInputSchema,
    outputSchema: GenerateRevisionNoteOutputSchema,
  },
  async input => {
    const {output} = await generateRevisionNotePrompt(input);
    return output!;
  }
);
