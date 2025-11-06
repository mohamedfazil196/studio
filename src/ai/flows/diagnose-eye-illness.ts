
'use server';
/**
 * @fileOverview A flow that analyzes an image of an eye to identify potential diseases or illnesses.
 *
 * - diagnoseEyeIllness - A function that handles the eye diagnosis process.
 * - DiagnoseEyeIllnessInput - The input type for the diagnoseEyeIllness function.
 * - DiagnoseEyeIllnessOutput - The return type for the diagnoseEyeIllness function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DiagnoseEyeIllnessInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "An image of an eye as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  userDescription: z
    .string()
    .describe(
      'A description of symptoms or concerns provided by the user.'
    ),
});
export type DiagnoseEyeIllnessInput = z.infer<
  typeof DiagnoseEyeIllnessInputSchema
>;

const DiagnoseEyeIllnessOutputSchema = z.object({
  possibleCondition: z
    .string()
    .describe('The name of the most likely condition identified.'),
  description: z
    .string()
    .describe(
      'A detailed description of the condition, its common symptoms, and why the AI considered it.'
    ),
  severity: z
    .enum(['Low', 'Medium', 'High', 'Unknown'])
    .describe(
      'An assessment of the potential severity of the condition. Options are "Low", "Medium", "High", or "Unknown".'
    ),
  disclaimer: z
    .string()
    .describe('A mandatory disclaimer about this not being a real medical diagnosis.'),
});
export type DiagnoseEyeIllnessOutput = z.infer<
  typeof DiagnoseEyeIllnessOutputSchema
>;

export async function diagnoseEyeIllness(
  input: DiagnoseEyeIllnessInput
): Promise<DiagnoseEyeIllnessOutput> {
  return diagnoseEyeIllnessFlow(input);
}

const prompt = ai.definePrompt({
  name: 'diagnoseEyeIllnessPrompt',
  input: {schema: DiagnoseEyeIllnessInputSchema},
  output: {schema: DiagnoseEyeIllnessOutputSchema},
  prompt: `You are a highly skilled AI ophthalmologist. Your task is to analyze an image of a human eye and provide a preliminary analysis based on visual evidence and a user-provided description.

  **Instructions:**
  1. Carefully examine the provided image of the eye.
  2. Read the user's description of their symptoms.
  3. Based on the visual information and symptoms, identify the most likely medical condition. If no condition is apparent, state that the eye appears healthy.
  4. Provide a detailed description of this condition.
  5. Assess the potential severity as 'Low', 'Medium', or 'High'. If the image quality is poor or no condition is identified, use 'Unknown'.
  6. You MUST output a disclaimer stating: "This is an AI-generated analysis and is not a substitute for a professional medical diagnosis. Please consult a qualified ophthalmologist for any health concerns."

  **User's Description of Symptoms:**
  "{{{userDescription}}}"

  **Eye Image:**
  {{media url=imageDataUri}}
  `,
});

const diagnoseEyeIllnessFlow = ai.defineFlow(
  {
    name: 'diagnoseEyeIllnessFlow',
    inputSchema: DiagnoseEyeIllnessInputSchema,
    outputSchema: DiagnoseEyeIllnessOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      return {
        possibleCondition: 'Analysis Inconclusive',
        description:
          'The AI could not determine a possible condition based on the provided image and description. This may be due to image quality or lack of clear visual signs.',
        severity: 'Unknown',
        disclaimer:
          'This is an AI-generated analysis and is not a substitute for a professional medical diagnosis. Please consult a qualified ophthalmologist for any health concerns.',
      };
    }
    return output;
  }
);
