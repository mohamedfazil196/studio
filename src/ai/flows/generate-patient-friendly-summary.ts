
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
  reportDataUri: z
    .string()
    .describe(
      "A medical report document (PDF, PNG, JPG) as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type GeneratePatientFriendlySummaryInput = z.infer<
  typeof GeneratePatientFriendlySummaryInputSchema
>;

const GeneratePatientFriendlySummaryOutputSchema = z.object({
  summary: z
    .string()
    .describe('A simplified, patient-friendly summary of the medical report.'),
  severity: z
    .enum(['Normal', 'Needs Attention', 'Immediate Action'])
    .describe(
      'The severity of the medical situation based on the report. Options are "Normal", "Needs Attention", or "Immediate Action".'
    ),
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
  You will also assess the severity of the findings in the report. Choose one of the following severity levels:
- "Normal": For results that are within normal ranges and show no cause for concern.
- "Needs Attention": For results that are outside normal ranges or indicate a condition that requires follow-up, but is not an immediate emergency.
- "Immediate Action": For results that indicate a serious or life-threatening condition requiring urgent medical attention.

Medical Report:
{{media url=reportDataUri}}`,
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
