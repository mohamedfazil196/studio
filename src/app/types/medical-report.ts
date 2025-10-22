
import { type RecommendMedicinesOutput } from "@/ai/flows/recommend-medicines";

export type MedicalReport = {
  id: string;
  userId: string;
  fileName: string;
  fileType: string;
  uploadTimestamp: string;
  doctorSummary: string;
  patientSummary: string;
  lifestyleSuggestions: string;
  severity: 'Normal' | 'Needs Attention' | 'Immediate Action';
  medicines: RecommendMedicinesOutput;
};
