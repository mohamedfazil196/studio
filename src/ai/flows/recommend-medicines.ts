
'use server';
/**
 * @fileOverview A flow that recommends medicines based on a medical report.
 *
 * - recommendMedicines - A function that handles the medicine recommendation process.
 * - RecommendMedicinesInput - The input type for the recommendMedicines function.
 * - RecommendMedicinesOutput - The return type for the recommendMedicines function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RecommendMedicinesInputSchema = z.object({
  reportDataUri: z
    .string()
    .describe(
      "A medical report document (PDF, PNG, JPG) as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type RecommendMedicinesInput = z.infer<
  typeof RecommendMedicinesInputSchema
>;

const RecommendMedicinesOutputSchema = z.object({
  disclaimer: z
    .string()
    .describe('A clear disclaimer that this is not medical advice.'),
  recommendations: z
    .array(
      z.object({
        medicineName: z
          .string()
          .describe('The name of the recommended medicine.'),
        reason: z
          .string()
          .describe(
            'The reason or condition for which this medicine is recommended.'
          ),
      })
    )
    .describe('A list of recommended medicines.'),
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
  prompt: `You are a medical expert. Based on the following medical report, suggest relevant medicines.
You will provide a list of medicines and the reason for each recommendation.
You MUST also include a clear disclaimer that these are only suggestions and the user must consult a qualified doctor before taking any medication.

Medical Report:
{{media url=reportDataUri}}
`,
});

const recommendMedicinesFlow = ai.defineFlow(
  {
    name: 'recommendMedicinesFlow',
    inputSchema: RecommendMedicinesInputSchema,
    outputSchema: RecommendMedicinesOutputSchema,
  },
  async input => {
    try {
      const {output} = await prompt(input);
      if (!output) {
        return {
          disclaimer:
            'AI analysis could not be completed. Please consult a medical professional.',
          recommendations: [],
        };
      }
      return output;
    } catch (error: any) {
       if (error.message.includes('503')) {
         return {
          disclaimer:
            'The AI service is currently overloaded and cannot provide medicine recommendations. Please try again later.',
          recommendations: [],
        };
       }
       // Re-throw other errors
       throw error;
    }
  }
);
