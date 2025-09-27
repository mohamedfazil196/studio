'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating a patient-friendly summary of a medical report.
 *
 * - generatePatientFriendlySummary - A function that takes medical report data and returns a simplified summary.
 * - GeneratePatientFriendlySummaryInput - The input type for the generatePatientFriendlySummary function.
 * - GeneratePatientFriendlySummaryOutput - The return type for the generatePatientFriendlySummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePatientFriendlySummaryInputSchema = z.object({
  reportData: z.string().describe('The medical report data in text format.'),
});
export type GeneratePatientFriendlySummaryInput = z.infer<
  typeof GeneratePatientFriendlySummaryInputSchema
>;

const GeneratePatientFriendlySummaryOutputSchema = z.object({
  summary: z.string().describe('A simplified, patient-friendly summary of the medical report.'),
});
export type GeneratePatientFriendlySummaryOutput = z.infer<
  typeof GeneratePatientFriendlySummaryOutputSchema
>;

export async function generatePatientFriendlySummary(
  input: GeneratePatientFriendlySummaryInput
): Promise<GeneratePatientFriendlySummaryOutput> {
  return generatePatientFriendlySummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePatientFriendlySummaryPrompt',
  input: {schema: GeneratePatientFriendlySummaryInputSchema},
  output: {schema: GeneratePatientFriendlySummaryOutputSchema},
  prompt: `You are an expert medical summarizer. You will be provided with a medical report, and you will generate a simplified summary of the report for a patient to easily understand.

Medical Report:
{{{reportData}}}`,
});

const generatePatientFriendlySummaryFlow = ai.defineFlow(
  {
    name: 'generatePatientFriendlySummaryFlow',
    inputSchema: GeneratePatientFriendlySummaryInputSchema,
    outputSchema: GeneratePatientFriendlySummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
