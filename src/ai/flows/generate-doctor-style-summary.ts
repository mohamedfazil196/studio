'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating a doctor-style summary of a medical report.
 *
 * The flow takes a medical report document (PDF, PNG, JPG) as input and returns a detailed, technical summary.
 *
 * @fileOverview
 * - generateDoctorStyleSummary - A function that generates a doctor-style summary of a medical report.
 * - GenerateDoctorStyleSummaryInput - The input type for the generateDoctorStyleSummary function.
 * - GenerateDoctorStyleSummaryOutput - The return type for the generateDoctorStyleSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDoctorStyleSummaryInputSchema = z.object({
  reportDataUri: z
    .string()
    .describe(
      "A medical report document (PDF, PNG, JPG) as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});

export type GenerateDoctorStyleSummaryInput = z.infer<
  typeof GenerateDoctorStyleSummaryInputSchema
>;

const GenerateDoctorStyleSummaryOutputSchema = z.object({
  doctorStyleSummary: z
    .string()
    .describe('A detailed, technical summary of the medical report.'),
});

export type GenerateDoctorStyleSummaryOutput = z.infer<
  typeof GenerateDoctorStyleSummaryOutputSchema
>;

export async function generateDoctorStyleSummary(
  input: GenerateDoctorStyleSummaryInput
): Promise<GenerateDoctorStyleSummaryOutput> {
  return generateDoctorStyleSummaryFlow(input);
}

const generateDoctorStyleSummaryPrompt = ai.definePrompt({
  name: 'generateDoctorStyleSummaryPrompt',
  input: {schema: GenerateDoctorStyleSummaryInputSchema},
  output: {schema: GenerateDoctorStyleSummaryOutputSchema},
  prompt: `You are an AI assistant that specializes in summarizing medical reports for doctors.
  Given a medical report, provide a detailed, technical summary that highlights key medical insights and technical details.

  Medical Report:
  {{media url=reportDataUri}}`,
});

const generateDoctorStyleSummaryFlow = ai.defineFlow(
  {
    name: 'generateDoctorStyleSummaryFlow',
    inputSchema: GenerateDoctorStyleSummaryInputSchema,
    outputSchema: GenerateDoctorStyleSummaryOutputSchema,
  },
  async input => {
    try {
      const {output} = await generateDoctorStyleSummaryPrompt(input);
      return output!;
    } catch (error: any) {
      if (error.message.includes('503')) {
        return {
          doctorStyleSummary:
            'The AI service is currently overloaded. Please try again in a few moments.',
        };
      }
      // Re-throw other errors
      throw error;
    }
  }
);
