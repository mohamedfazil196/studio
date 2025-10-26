
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

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'bot']),
  content: z.string(),
});

const InteractiveQAndAInputSchema = z.object({
  reportSummary: z.string().describe('A summary of the medical report.'),
  question: z.string().describe('The question about the medical report.'),
  chatHistory: z.array(ChatMessageSchema).optional().describe('The previous messages in the conversation.'),
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
  prompt: `You are a medical expert AI assistant. Your primary goal is to answer questions based on the provided medical report summary and the ongoing conversation history.

  Medical Report Summary (Context):
  {{reportSummary}}

  {{#if chatHistory}}
  Conversation History:
  {{#each chatHistory}}
  {{role}}: {{content}}
  {{/each}}
  {{/if}}

  User's New Question:
  {{question}}

  Instructions:
  1. First, determine if the user's question can be answered using the "Medical Report Summary (Context)" and the "Conversation History" provided above.
  2. If the question is related to the summary or history, answer it clearly and concisely, using only information from the provided context.
  3. If the user's question is a general medical question and cannot be answered from the context, answer it to the best of your ability as a helpful medical AI.
  4. Maintain context from the conversation history to answer follow-up questions.
  5. At the end of EVERY answer, you MUST include the following disclaimer on a new line:
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
