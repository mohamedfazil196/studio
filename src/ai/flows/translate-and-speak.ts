'use server';
/**
 * @fileOverview A flow that translates text and converts it to speech.
 *
 * - translateAndSpeak - A function that handles the translation and text-to-speech process.
 * - TranslateAndSpeakInput - The input type for the translateAndSpeak function.
 * - TranslateAndSpeakOutput - The return type for the translateAndSpeak function.
 */

import {ai} from '@/ai/genkit';
import {googleAI} from '@genkit-ai/googleai';
import {z} from 'genkit';
import wav from 'wav';

const TranslateAndSpeakInputSchema = z.object({
  text: z.string().describe('The text to translate and speak.'),
  targetLanguage: z.string().describe('The target language code (e.g., "ta" for Tamil, "hi" for Hindi).'),
});
export type TranslateAndSpeakInput = z.infer<typeof TranslateAndSpeakInputSchema>;

const TranslateAndSpeakOutputSchema = z.object({
  translatedText: z.string().describe('The translated text.'),
  audioDataUri: z.string().describe('The spoken audio as a data URI.'),
});
export type TranslateAndSpeakOutput = z.infer<typeof TranslateAndSpeakOutputSchema>;

export async function translateAndSpeak(
  input: TranslateAndSpeakInput
): Promise<TranslateAndSpeakOutput> {
  return translateAndSpeakFlow(input);
}

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    const bufs: Buffer[] = [];
    writer.on('error', reject);
    writer.on('data', (d) => {
      bufs.push(d);
    });
    writer.on('end', () => {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}

const translateAndSpeakFlow = ai.defineFlow(
  {
    name: 'translateAndSpeakFlow',
    inputSchema: TranslateAndSpeakInputSchema,
    outputSchema: TranslateAndSpeakOutputSchema,
  },
  async ({ text, targetLanguage }) => {
    // 1. Translate text
    const { text: translatedText } = await ai.generate({
      prompt: `Translate the following text to ${targetLanguage}: ${text}`,
      model: 'googleai/gemini-2.5-flash',
    });

    if (!translatedText) {
      throw new Error('Translation failed.');
    }

    // 2. Convert translated text to speech
    const { media } = await ai.generate({
      model: googleAI.model('gemini-2.5-flash-preview-tts'),
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Algenib' }, // A generic voice
          },
        },
      },
      prompt: translatedText,
    });
    if (!media) {
      throw new Error('no media returned');
    }
    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );
    
    const wavBase64 = await toWav(audioBuffer);
    
    return {
      translatedText: translatedText,
      audioDataUri: 'data:audio/wav;base64,' + wavBase64,
    };
  }
);
