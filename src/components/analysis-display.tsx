import { FileText, Stethoscope, HeartPulse, MessagesSquare, File as FileIcon, AlertTriangle, ShieldCheck, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QAChat } from "./qa-chat";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type Analysis } from "@/app/page";

type AnalysisDisplayProps = {
  fileName: string;
  analysis: Analysis;
};

const severityConfig = {
    'Normal': {
        icon: ShieldCheck,
        color: 'bg-green-500',
        text: 'text-green-50',
        label: 'Normal'
    },
    'Needs Attention': {
        icon: ShieldAlert,
        color: 'bg-yellow-500',
        text: 'text-yellow-50',
        label: 'Needs Attention'
    },
    'Immediate Action': {
        icon: AlertTriangle,
        color: 'bg-red-600',
        text: 'text-red-50',
        label: 'Immediate Action Required'
    }
}

export function AnalysisDisplay({ fileName, analysis }: AnalysisDisplayProps) {
  const severity = analysis.severity || 'Normal';
  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <div className="w-full max-w-6xl mx-auto animate-fade-in">
      <header className="mb-6 px-1 space-y-3">
        <div className="flex items-center gap-3">
          <FileIcon className="w-8 h-8 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Analysis for</p>
            <h2 className="text-2xl font-bold font-headline text-foreground">{fileName}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <Badge className={cn("flex items-center gap-2 text-base px-3 py-1 border-none", config.color, config.text)}>
                <Icon className="w-5 h-5" />
                <span>{config.label}</span>
            </Badge>
        </div>
      </header>
      
      <Tabs defaultValue="patient-summary" className="w-full">
        <TabsList className="grid w-full h-auto grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="patient-summary" className="py-2"><FileText className="w-4 h-4 mr-2" />Patient Summary</TabsTrigger>
          <TabsTrigger value="doctor-summary" className="py-2"><Stethoscope className="w-4 h-4 mr-2" />Doctor Summary</TabsTrigger>
          <TabsTrigger value="suggestions" className="py-2"><HeartPulse className="w-4 h-4 mr-2" />Suggestions</TabsTrigger>
          <TabsTrigger value="q-and-a" className="py-2"><MessagesSquare className="w-4 h-4 mr-2" />Q&amp;A</TabsTrigger>
        </TabsList>
        
        <div className="mt-4">
            <TabsContent value="patient-summary">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle className="font-headline text-xl text-primary flex items-center gap-2"><FileText />Patient-Friendly Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[50vh] pr-4">
                            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{analysis.patientSummary}</p>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="doctor-summary">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle className="font-headline text-xl text-primary flex items-center gap-2"><Stethoscope />Doctor-Style Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[50vh] pr-4">
                            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{analysis.doctorSummary}</p>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="suggestions">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle className="font-headline text-xl text-primary flex items-center gap-2"><HeartPulse />Lifestyle &amp; Health Suggestions</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <ScrollArea className="h-[50vh] pr-4">
                            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{analysis.lifestyleSuggestions}</p>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="q-and-a">
                <QAChat reportSummary={analysis.patientSummary} />
            </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
