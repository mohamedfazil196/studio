import { FileText, Stethoscope, HeartPulse, MessagesSquare, File as FileIcon, AlertTriangle, ShieldCheck, ShieldAlert, Pill, Languages, Volume2, Loader2, Play, Pause, BellRing } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QAChat } from "./qa-chat";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type Analysis } from "@/app/page";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useState, useRef } from "react";
import { translateAndSpeak } from "@/ai/flows/translate-and-speak";
import { useToast } from "@/hooks/use-toast";
import { Reminders } from "./reminders";

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

const languages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'Hindi' },
    { code: 'ta', name: 'Tamil' },
    { code: 'te', name: 'Telugu' },
    { code: 'kn', name: 'Kannada' },
    { code: 'ml', name: 'Malayalam' },
    { code: 'bn', name: 'Bengali' },
    { code: 'gu', name: 'Gujarati' },
    { code: 'mr', name: 'Marathi' },
    { code: 'pa', name: 'Punjabi' },
];

export function AnalysisDisplay({ fileName, analysis }: AnalysisDisplayProps) {
  const severity = analysis.severity || 'Normal';
  const config = severityConfig[severity];
  const Icon = config.icon;

  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [translatedSummary, setTranslatedSummary] = useState(analysis.patientSummary);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const handleLanguageChange = async (langCode: string) => {
      setSelectedLanguage(langCode);
      if (langCode === 'en') {
          setTranslatedSummary(analysis.patientSummary);
          return;
      }

      setIsTranslating(true);
      try {
        const result = await translateAndSpeak({ text: analysis.patientSummary, targetLanguage: langCode });
        setTranslatedSummary(result.translatedText);
        if (audioRef.current) {
            audioRef.current.src = result.audioDataUri;
        } else {
            audioRef.current = new Audio(result.audioDataUri);
        }
      } catch (error) {
          console.error('Translation error:', error);
          toast({
              title: "Translation Failed",
              description: "Could not translate the summary.",
              variant: "destructive"
          });
          setTranslatedSummary(analysis.patientSummary);
      } finally {
          setIsTranslating(false);
      }
  }

  const handlePlayPause = async () => {
    if (!audioRef.current) {
        if (selectedLanguage === 'en') {
            audioRef.current = new Audio();
        } else {
            await handleLanguageChange(selectedLanguage);
        }
    }

    if (audioRef.current) {
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            if(!audioRef.current.src){
                await handleLanguageChange(selectedLanguage);
            }
            audioRef.current.play();
            setIsPlaying(true);
            audioRef.current.onended = () => setIsPlaying(false);
        }
    }
  };


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
        <TabsList className="grid w-full h-auto grid-cols-2 sm:grid-cols-3 md:grid-cols-6">
          <TabsTrigger value="patient-summary" className="py-2"><FileText className="w-4 h-4 mr-2" />Patient Summary</TabsTrigger>
          <TabsTrigger value="doctor-summary" className="py-2"><Stethoscope className="w-4 h-4 mr-2" />Doctor Summary</TabsTrigger>
          <TabsTrigger value="suggestions" className="py-2"><HeartPulse className="w-4 h-4 mr-2" />Suggestions</TabsTrigger>
          <TabsTrigger value="medicines" className="py-2"><Pill className="w-4 h-4 mr-2" />Medicines</TabsTrigger>
          <TabsTrigger value="q-and-a" className="py-2"><MessagesSquare className="w-4 h-4 mr-2" />Q&A</TabsTrigger>
          <TabsTrigger value="reminders" className="py-2"><BellRing className="w-4 h-4 mr-2" />Reminders</TabsTrigger>
        </TabsList>
        
        <div className="mt-4">
            <TabsContent value="patient-summary">
                <Card className="shadow-md">
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                            <CardTitle className="font-headline text-xl text-primary flex items-center gap-2"><FileText />Patient-Friendly Summary</CardTitle>
                            <div className="flex items-center gap-2">
                                <Select onValueChange={handleLanguageChange} defaultValue="en">
                                    <SelectTrigger className="w-[180px]">
                                        <Languages className="w-4 h-4 mr-2" />
                                        <SelectValue placeholder="Language" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {languages.map(lang => (
                                            <SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button size="icon" variant="outline" onClick={handlePlayPause} disabled={isTranslating}>
                                    {isTranslating ? <Loader2 className="animate-spin" /> : isPlaying ? <Pause /> : <Play />}
                                    <span className="sr-only">Play or pause summary</span>
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[50vh] pr-4">
                            {isTranslating ? (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                </div>
                            ) : (
                                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{translatedSummary}</p>
                            )}
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
                        <CardTitle className="font-headline text-xl text-primary flex items-center gap-2"><HeartPulse />Lifestyle & Health Suggestions</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <ScrollArea className="h-[50vh] pr-4">
                            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{analysis.lifestyleSuggestions}</p>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="medicines">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle className="font-headline text-xl text-primary flex items-center gap-2"><Pill />Recommended Medicines</CardTitle>
                        <CardDescription>This is not medical advice. Consult a doctor before taking any medication.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <ScrollArea className="h-[50vh] pr-4">
                            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{analysis.medicines}</p>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="q-and-a">
                <QAChat reportSummary={analysis.patientSummary} />
            </TabsContent>
            <TabsContent value="reminders">
                <Reminders />
            </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
