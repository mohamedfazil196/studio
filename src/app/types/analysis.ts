
export type Analysis = {
  doctorSummary: string;
  patientSummary: string;
  lifestyleSuggestions: string;
  severity: 'Normal' | 'Needs Attention' | 'Immediate Action';
  medicines: string;
};
