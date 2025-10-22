
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { FileUploader } from "@/components/file-uploader";
import { AnalysisDisplay } from "@/components/analysis-display";
import { generateDoctorStyleSummary } from '@/ai/flows/generate-doctor-style-summary';
import { generatePatientFriendlySummary } from '@/ai/flows/generate-patient-friendly-summary';
import { provideLifestyleAndHealthSuggestions } from '@/ai/flows/provide-lifestyle-and-health-suggestions';
import { recommendMedicines } from '@/ai/flows/recommend-medicines';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useFirebase } from '@/firebase';
import { User as UserIcon, Bot } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { BarChart, CartesianGrid, XAxis, Bar, PieChart, Pie } from "recharts"


export type Analysis = {
  doctorSummary: string;
  patientSummary: string;
  lifestyleSuggestions: string;
  severity: 'Normal' | 'Needs Attention' | 'Immediate Action';
  medicines: string;
};

const chartData = [
  { month: "January", reports: 18 },
  { month: "February", reports: 35 },
  { month: "March", reports: 23 },
  { month: "April", reports: 7 },
  { month: "May", reports: 20 },
  { month: "June", reports: 21 },
]

const chartConfig = {
  reports: {
    label: "Reports",
    color: "hsl(var(--chart-1))",
  },
}

const pieChartData = [
    { name: 'Normal', value: 70, fill: 'hsl(var(--chart-2))' },
    { name: 'Attention', value: 20, fill: 'hsl(var(--chart-3))' },
    { name: 'Urgent', value: 10, fill: 'hsl(var(--chart-4))' },
]

export default function DashboardPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [reportCount, setReportCount] = useState(0);
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
          setReportCount(prev => prev + 1);
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
    <div className="grid gap-8">
        <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className='space-y-2'>
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-64" />
            </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
    </div>
  );

  if (isUserLoading || !user) {
    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <DashboardSkeleton />
        </div>
    );
  }

  if (isProcessing) {
      return (
         <div className="w-full max-w-2xl mx-auto p-8 space-y-6 flex flex-col items-center justify-center min-h-[70vh]">
            <Bot className="w-24 h-24 text-primary animate-pulse" />
            <h2 className="text-2xl font-headline font-bold mt-4">Analyzing Your Report...</h2>
            <p className="text-center text-muted-foreground">The AI is working its magic. This may take a moment.</p>
            <Skeleton className="h-4 w-3/4 mt-8" />
            <Skeleton className="h-4 w-1/2 mt-2" />
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
    <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
             <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 border-2 border-primary">
                      <AvatarImage src={user.photoURL ?? undefined} alt={user.displayName ?? "User"} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                          <UserIcon className="h-8 w-8" />
                      </AvatarFallback>
                  </Avatar>
                  <div>
                      <h1 className="text-3xl font-bold font-headline">Welcome, {user.displayName || user.email}!</h1>
                      <p className="text-muted-foreground">Here is your health overview. Ready to analyze a new report?</p>
                  </div>
              </div>
              <Card className="p-4 bg-card/50">
                  <p className="text-sm text-muted-foreground">Reports Analyzed</p>
                  <p className="text-4xl font-bold text-primary">{reportCount}</p>
              </Card>
        </div>
        
        <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-6">
            <main className="lg:col-span-2">
                 <FileUploader onFileUpload={handleFileUpload} />
            </main>
            <aside className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className='font-headline text-primary'>Analysis History</CardTitle>
                        <CardDescription>Breakdown of recent report results.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center items-center">
                         <ChartContainer config={{}} className="h-[200px] w-full">
                            <PieChart>
                                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                                <Pie data={pieChartData} dataKey="value" nameKey="name" innerRadius={50} labelLine={false} label={({
                                    cx,
                                    cy,
                                    midAngle,
                                    innerRadius,
                                    outerRadius,
                                    percent,
                                  }) => {
                                    const RADIAN = Math.PI / 180;
                                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                    const y = cy + radius * Math.sin(-midAngle * RADIAN);

                                    return (
                                      <text
                                        x={x}
                                        y={y}
                                        fill="white"
                                        textAnchor={x > cx ? 'start' : 'end'}
                                        dominantBaseline="central"
                                        className='text-xs font-bold'
                                      >
                                        {`${(percent * 100).toFixed(0)}%`}
                                      </text>
                                    );
                                  }}>
                                </Pie>
                            </PieChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className='font-headline text-primary'>Monthly Usage</CardTitle>
                        <CardDescription>Reports analyzed per month.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="h-[200px] w-full">
                            <BarChart accessibilityLayer data={chartData}>
                                <CartesianGrid vertical={false} />
                                <XAxis
                                dataKey="month"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                                tickFormatter={(value) => value.slice(0, 3)}
                                />
                                <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent hideLabel />}
                                />
                                <Bar dataKey="reports" fill="var(--color-reports)" radius={8} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </aside>
        </div>
    </div>
  );
}

    