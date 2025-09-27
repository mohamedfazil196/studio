"use client";

import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/layout/header";
import { FileUploader } from "@/components/file-uploader";
import { AnalysisDisplay } from "@/components/analysis-display";
import { generateDoctorStyleSummary } from '@/ai/flows/generate-doctor-style-summary';
import { generatePatientFriendlySummary } from '@/ai/flows/generate-patient-friendly-summary';
import { provideLifestyleAndHealthSuggestions } from '@/ai/flows/provide-lifestyle-and-health-suggestions';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export type Analysis = {
  doctorSummary: string;
  patientSummary: string;
  lifestyleSuggestions: string;
  severity: 'Normal' | 'Needs Attention' | 'Immediate Action';
};

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    setAnalysis(null);
    setUploadedFileName(file.name);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const dataUri = reader.result as string;
          
          const doctorSummaryResult = await generateDoctorStyleSummary({ reportDataUri: dataUri });
          const doctorSummary = doctorSummaryResult.doctorStyleSummary;

          if (!doctorSummary) {
            throw new Error("Failed to generate a doctor-style summary.");
          }

          const [patientSummaryResult, lifestyleSuggestionsResult] = await Promise.all([
            generatePatientFriendlySummary({ reportData: doctorSummary }),
            provideLifestyleAndHealthSuggestions({ reportText: doctorSummary }),
          ]);

          setAnalysis({
            doctorSummary,
            patientSummary: patientSummaryResult.summary,
            lifestyleSuggestions: lifestyleSuggestionsResult.suggestions,
            severity: patientSummaryResult.severity,
          });
          setIsProcessing(false);
        } catch (error) {
          console.error("Analysis Error (inner):", error);
          toast({
            title: "Analysis Failed",
            description: "Something went wrong processing the report. The file may be unreadable or corrupted.",
            variant: "destructive",
          });
          handleReset();
        }
      };
      reader.onerror = () => {
        throw new Error("Failed to read the file.");
      }
    } catch (error) {
      console.error("Analysis Error (outer):", error);
      toast({
        title: "File Error",
        description: "Something went wrong while reading your file. Please try again.",
        variant: "destructive",
      });
      handleReset();
    }
  };

  const handleReset = () => {
    setAnalysis(null);
    setUploadedFileName(null);
    setIsProcessing(false);
  }

  const LoadingState = () => (
    <div className="w-full max-w-2xl mx-auto p-8 space-y-6">
        <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className='space-y-2'>
                <Skeleton className="h-6 w-72" />
                <Skeleton className="h-4 w-48" />
            </div>
        </div>
        <div className="space-y-4 pt-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full rounded-lg" />
        </div>
        <p className="text-center text-muted-foreground animate-pulse">Analyzing your report... this may take a moment.</p>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-grow flex items-center justify-center p-4">
        {isProcessing ? (
          <LoadingState />
        ) : analysis ? (
          <div className="w-full">
            <AnalysisDisplay fileName={uploadedFileName!} analysis={analysis} />
            <div className="text-center mt-8">
                <Button variant="outline" onClick={handleReset}>Analyze Another Report</Button>
            </div>
          </div>
        ) : (
          <FileUploader onFileUpload={handleFileUpload} />
        )}
      </main>
      <footer className="text-center p-4 text-sm text-muted-foreground">
          <p>MediScan AI is a hackathon project. Not intended for real medical diagnosis or advice.</p>
      </footer>
    </div>
  );
}
