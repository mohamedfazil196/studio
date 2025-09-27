'use server';
/**
 * @fileOverview A flow that recommends medicines based on a medical report summary.
 *
 * - recommendMedicines - A function that handles the medicine recommendation process.
 * - RecommendMedicinesInput - The input type for the recommendMedicines function.
 * - RecommendMedicinesOutput - The return type for the recommendMedicines function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RecommendMedicinesInputSchema = z.object({
  reportSummary: z
    .string()
    .describe('The summary of the medical report to analyze.'),
});
export type RecommendMedicinesInput = z.infer<
  typeof RecommendMedicinesInputSchema
>;

const RecommendMedicinesOutputSchema = z.object({
  medicines: z
    .string()
    .describe(
      'A list of recommended medicines based on the medical report summary, including a disclaimer.'
    ),
});
export type RecommendMedicinesOutput = z.infer<
  typeof RecommendMedicinesOutputSchema
>;

export async function recommendMedicines(
  input: RecommendMedicinesInput
): Promise<RecommendMedicinesOutput> {
  return recommendMedicinesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recommendMedicinesPrompt',
  input: {schema: RecommendMedicinesInputSchema},
  output: {schema: RecommendMedicinesOutputSchema},
  prompt: `You are a medical expert. Based on the following medical report summary, suggest relevant medicines.
IMPORTANT: You must include a clear disclaimer that these are only suggestions and the user must consult a qualified doctor before taking any medication.

Medical Report Summary:
{{{reportSummary}}}

Recommended Medicines:`,
});

const recommendMedicinesFlow = ai.defineFlow(
  {
    name: 'recommendMedicinesFlow',
    inputSchema: RecommendMedicinesInputSchema,
    outputSchema: RecommendMedicinesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
