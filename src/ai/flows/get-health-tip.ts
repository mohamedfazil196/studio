
'use server';
/**
 * @fileOverview A flow that provides a personalized health tip based on a health score.
 *
 * - getHealthTip - A function that returns a health tip.
 * - GetHealthTipInput - The input type for the getHealthTip function.
 * - GetHealthTipOutput - The return type for the getHealthTip function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetHealthTipInputSchema = z.object({
  healthScore: z
    .number()
    .describe('The user\'s current health score, from 0 to 100.'),
});
export type GetHealthTipInput = z.infer<typeof GetHealthTipInputSchema>;

const GetHealthTipOutputSchema = z.object({
  tip: z.string().describe('A short, actionable health tip.'),
});
export type GetHealthTipOutput = z.infer<typeof GetHealthTipOutputSchema>;

export async function getHealthTip(
  input: GetHealthTipInput
): Promise<GetHealthTipOutput> {
  return getHealthTipFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getHealthTipPrompt',
  input: {schema: GetHealthTipInputSchema},
  output: {schema: GetHealthTipOutputSchema},
  prompt: `You are a friendly and encouraging health assistant.
Based on the user's health score of {{healthScore}} out of 100, provide one short, actionable, and positive health tip.

If the score is high (80-100), give a tip about maintaining good habits.
If the score is medium (50-79), give a tip about making small improvements.
If the score is low (0-49), give a gentle and encouraging tip about taking the first step.

Keep the tip to a single sentence. Do not include any preamble like "Here is a tip:".
`,
});

const getHealthTipFlow = ai.defineFlow(
  {
    name: 'getHealthTipFlow',
    inputSchema: GetHealthTipInputSchema,
    outputSchema: GetHealthTipOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      return {
        tip: 'Stay hydrated and get plenty of rest.',
      };
    }
    return output;
  }
);
