
'use client';

import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { FileUploader } from "@/components/file-uploader";
import { AnalysisDisplay } from "@/components/analysis-display";
import { generateDoctorStyleSummary } from '@/ai/flows/generate-doctor-style-summary';
import { generatePatientFriendlySummary } from '@/ai/flows/generate-patient-friendly-summary';
import { provideLifestyleAndHealthSuggestions } from '@/ai/flows/provide-lifestyle-and-health-suggestions';
import { recommendMedicines } from '@/ai/flows/recommend-medicines';
import { Skeleton } from '@/components/ui/skeleton';
import { Bot } from 'lucide-react';
import { type Analysis } from '@/app/types/analysis';
import { Button } from '@/components/ui/button';
import { useFirebase } from '@/firebase';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection } from 'firebase/firestore';

export default function AnalysisPage() {
    const { firestore, user } = useFirebase();
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

                    const [patientSummaryResult, lifestyleSuggestionsResult, medicinesResult] = await Promise.all([
                        generatePatientFriendlySummary({ reportData: doctorSummary }),
                        provideLifestyleAndHealthSuggestions({ reportText: doctorSummary }),
                        recommendMedicines({ reportSummary: doctorSummary }),
                    ]);

                    const finalAnalysis: Analysis = {
                        doctorSummary,
                        patientSummary: patientSummaryResult.summary,
                        lifestyleSuggestions: lifestyleSuggestionsResult.suggestions,
                        severity: patientSummaryResult.severity,
                        medicines: medicinesResult,
                    };
                    
                    setAnalysis(finalAnalysis);

                    if (user && firestore) {
                        const reportsColRef = collection(firestore, 'users', user.uid, 'medical_reports');
                        addDocumentNonBlocking(reportsColRef, {
                            doctorSummary: finalAnalysis.doctorSummary,
                            patientSummary: finalAnalysis.patientSummary,
                            lifestyleSuggestions: finalAnalysis.lifestyleSuggestions,
                            severity: finalAnalysis.severity,
                            medicines: finalAnalysis.medicines,
                            fileName: file.name,
                            fileType: file.type,
                            uploadTimestamp: new Date().toISOString(),
                            userId: user.uid,
                        });
                    }

                } catch (error) {
                    console.error("Analysis Error (inner):", error);
                    toast({
                        title: "Analysis Failed",
                        description: "Something went wrong processing the report. The file may be unreadable or corrupted.",
                        variant: "destructive",
                    });
                    handleReset();
                } finally {
                    setIsProcessing(false);
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

    if (isProcessing) {
        return (
           <div className="w-full max-w-2xl mx-auto p-8 space-y-6 flex flex-col items-center justify-center min-h-[70vh] text-center">
              <Bot className="w-24 h-24 text-primary animate-pulse" />
              <h2 className="text-2xl font-headline font-bold mt-4">Analyzing Your Report...</h2>
              <p className="text-muted-foreground">The AI is working its magic. This may take a moment.</p>
              <div className="w-full space-y-4 mt-8">
                <Skeleton className="h-4 w-3/4 mx-auto" />
                <Skeleton className="h-4 w-1/2 mx-auto" />
              </div>
          </div>
        )
    }

    if (analysis) {
        return (
          <div className="w-full">
            <AnalysisDisplay fileName={uploadedFileName!} analysis={analysis} />
            <div className="text-center mt-8">
                <Button variant="outline" onClick={handleReset}>Analyze Another Report</Button>
            </div>
          </div>
        );
    }

    return (
        <FileUploader onFileUpload={handleFileUpload} />
    )
}
