
'use server';

import { config } from 'dotenv';
config();

import '@/ai/flows/generate-doctor-style-summary.ts';
import '@/ai/flows/generate-patient-friendly-summary.ts';
import '@/ai/flows/enable-interactive-q-and-a.ts';
import '@/ai/flows/provide-lifestyle-and-health-suggestions.ts';
import '@/ai/flows/recommend-medicines.ts';
import '@/ai/flows/get-health-tip.ts';

    
