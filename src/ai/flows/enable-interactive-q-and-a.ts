
'use server';
/**
 * @fileOverview Implements the interactive Q&A functionality for medical reports.
 *
 * - askQuestion - Allows users to ask questions about their medical reports and receive AI-powered answers.
 * - InteractiveQAndAInput - The input type for the askQuestion function.
 * - InteractiveQAndAOutput - The return type for the askQuestion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InteractiveQAndAInputSchema = z.object({
  reportSummary: z.string().describe('A summary of the medical report.'),
  question: z.string().describe('The question about the medical report.'),
});
export type InteractiveQAndAInput = z.infer<typeof InteractiveQAndAInputSchema>;

const InteractiveQAndAOutputSchema = z.object({
  answer: z.string().describe('The AI-powered answer to the question.'),
});
export type InteractiveQAndAOutput = z.infer<typeof InteractiveQAndAOutputSchema>;

export async function askQuestion(input: InteractiveQAndAInput): Promise<InteractiveQAndAOutput> {
  return interactiveQAndAFlow(input);
}

const interactiveQAndAPrompt = ai.definePrompt({
  name: 'interactiveQAndAPrompt',
  input: {schema: InteractiveQAndAInputSchema},
  output: {schema: InteractiveQAndAOutputSchema},
  prompt: `You are a medical expert answering questions about a medical report.

  Here is a summary of the medical report:
  {{reportSummary}}

  Here is the question:
  {{question}}

  First, answer the question clearly and concisely, using information from the report summary.
  If the question cannot be answered based on the summary, state that you cannot answer the question.
  
  After providing the answer, you MUST include the following disclaimer on a new line:
  "Disclaimer: I am an AI assistant and not a medical professional. Please consult with a qualified doctor for any medical advice."
  `,
});

const interactiveQAndAFlow = ai.defineFlow(
  {
    name: 'interactiveQAndAFlow',
    inputSchema: InteractiveQAndAInputSchema,
    outputSchema: InteractiveQAndAOutputSchema,
  },
  async input => {
    const {output} = await interactiveQAndAPrompt(input);
    return output!;
  }
);
