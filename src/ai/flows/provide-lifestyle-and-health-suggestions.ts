
'use server';
/**
 * @fileOverview A flow that provides lifestyle and health suggestions based on the medical report.
 *
 * - provideLifestyleAndHealthSuggestions - A function that handles the lifestyle and health suggestions process.
 * - ProvideLifestyleAndHealthSuggestionsInput - The input type for the provideLifestyleAndHealthSuggestions function.
 * - ProvideLifestyleAndHealthSuggestionsOutput - The return type for the provideLifestyleAndHealthSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProvideLifestyleAndHealthSuggestionsInputSchema = z.object({
  reportDataUri: z
    .string()
    .describe(
      "A medical report document (PDF, PNG, JPG) as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ProvideLifestyleAndHealthSuggestionsInput = z.infer<
  typeof ProvideLifestyleAndHealthSuggestionsInputSchema
>;

const ProvideLifestyleAndHealthSuggestionsOutputSchema = z.object({
  suggestions: z
    .string()
    .describe(
      'Lifestyle and health suggestions based on the medical report analysis.'
    ),
});
export type ProvideLifestyleAndHealthSuggestionsOutput = z.infer<
  typeof ProvideLifestyleAndHealthSuggestionsOutputSchema
>;

export async function provideLifestyleAndHealthSuggestions(
  input: ProvideLifestyleAndHealthSuggestionsInput
): Promise<ProvideLifestyleAndHealthSuggestionsOutput> {
  return provideLifestyleAndHealthSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'provideLifestyleAndHealthSuggestionsPrompt',
  input: {schema: ProvideLifestyleAndHealthSuggestionsInputSchema},
  output: {schema: ProvideLifestyleAndHealthSuggestionsOutputSchema},
  prompt: `Based on the following medical report, provide lifestyle and health suggestions to the patient:

Medical Report:
{{media url=reportDataUri}}

Suggestions:`,
});

const provideLifestyleAndHealthSuggestionsFlow = ai.defineFlow(
  {
    name: 'provideLifestyleAndHealthSuggestionsFlow',
    inputSchema: ProvideLifestyleAndHealthSuggestionsInputSchema,
    outputSchema: ProvideLifestyleAndHealthSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
