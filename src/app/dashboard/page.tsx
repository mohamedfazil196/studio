"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/layout/header";
import { FileUploader } from "@/components/file-uploader";
import { AnalysisDisplay } from "@/components/analysis-display";
import { generateDoctorStyleSummary } from '@/ai/flows/generate-doctor-style-summary';
import { generatePatientFriendlySummary } from '@/ai/flows/generate-patient-friendly-summary';
import { provideLifestyleAndHealthSuggestions } from '@/ai/flows/provide-lifestyle-and-health-suggestions';
import { recommendMedicines } from '@/ai/flows/recommend-medicines';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useFirebase } from '@/firebase';
import { User as UserIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';

export type Analysis = {
  doctorSummary: string;
  patientSummary: string;
  lifestyleSuggestions: string;
  severity: 'Normal' | 'Needs Attention' | 'Immediate Action';
  medicines: string;
};

export default function DashboardPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, isUserLoading } = useFirebase();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleFileUpload = async (file: File) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to analyze reports.",
        variant: "destructive",
      });
      router.push('/login');
      return;
    }
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

          const [patientSummaryResult, lifestyleSuggestionsResult, medicinesResult] = await Promise.all([
            generatePatientFriendlySummary({ reportData: doctorSummary }),
            provideLifestyleAndHealthSuggestions({ reportText: doctorSummary }),
            recommendMedicines({ reportSummary: doctorSummary }),
          ]);

          setAnalysis({
            doctorSummary,
            patientSummary: patientSummaryResult.summary,
            lifestyleSuggestions: lifestyleSuggestionsResult.suggestions,
            severity: patientSummaryResult.severity,
            medicines: medicinesResult.medicines,
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
  
  const DashboardSkeleton = () => (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className='space-y-2'>
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-64" />
            </div>
        </div>
        <Skeleton className="h-80 w-full" />
    </div>
  );

  if (isUserLoading || !user) {
    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            <Header />
            <main className="flex-grow flex items-center justify-center p-4">
                <DashboardSkeleton />
            </main>
             <footer className="text-center p-4 text-sm text-muted-foreground">
                <p>MediScan AI is for demonstration purposes only. Not for real medical diagnosis.</p>
            </footer>
        </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-grow p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {!analysis && !isProcessing && (
            <div className="mb-8">
              <Card className='bg-card/50 border-primary/20 p-6'>
                  <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16 border-2 border-primary">
                          <AvatarImage src={user.photoURL ?? undefined} alt={user.displayName ?? "User"} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                              <UserIcon className="h-8 w-8" />
                          </AvatarFallback>
                      </Avatar>
                      <div>
                          <h1 className="text-2xl font-bold font-headline">Welcome back, {user.displayName || user.email}!</h1>
                          <p className="text-muted-foreground">Ready to analyze a new report?</p>
                      </div>
                  </div>
              </Card>
            </div>
          )}

          {isProcessing ? (
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
        </div>
      </main>
      <footer className="text-center p-4 text-sm text-muted-foreground">
          <p>MediScan AI is for demonstration purposes only. Not for real medical diagnosis.</p>
      </footer>
    </div>
  );
}
