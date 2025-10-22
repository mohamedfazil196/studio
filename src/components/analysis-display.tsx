
import { FileText, Stethoscope, HeartPulse, MessagesSquare, File as FileIcon, AlertTriangle, ShieldCheck, ShieldAlert, Pill, Languages, Play, Pause, BellRing, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type Analysis } from "@/app/types/analysis";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useState, useRef } from "react";
import { translateAndSpeak } from "@/ai/flows/translate-and-speak";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "./ui/scroll-area";
import Link from 'next/link';

type AnalysisDisplayProps = {
  fileName: string;
  analysis: Analysis;
};

const severityConfig = {
    'Normal': {
        icon: ShieldCheck,
        color: 'bg-green-500/10 border-green-500 text-green-400',
        label: 'Normal'
    },
    'Needs Attention': {
        icon: ShieldAlert,
        color: 'bg-yellow-500/10 border-yellow-500 text-yellow-400',
        label: 'Needs Attention'
    },
    'Immediate Action': {
        icon: AlertTriangle,
        color: 'bg-red-600/10 border-red-500 text-red-500',
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
             toast({
              title: "Audio not ready",
              description: "Please select a language other than English to generate audio.",
              variant: "destructive"
          });
          return;
        }
        await handleLanguageChange(selectedLanguage);
    }

    if (audioRef.current) {
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            if(!audioRef.current.src){
                await handleLanguageChange(selectedLanguage);
            }
            audioRef.current.play().catch(e => {
                toast({ title: "Playback Error", description: "Could not play audio.", variant: "destructive" });
                console.error(e);
            });
            setIsPlaying(true);
            audioRef.current.onended = () => setIsPlaying(false);
        }
    }
  };

  const AnalysisCard = ({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) => (
    <Card className="h-full">
        <CardHeader>
            <CardTitle className="font-headline text-xl text-primary flex items-center gap-2">{icon}{title}</CardTitle>
        </CardHeader>
        <CardContent>
            <ScrollArea className="h-[40vh] pr-4">
                <div className="text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {children}
                </div>
            </ScrollArea>
        </CardContent>
    </Card>
  )


  return (
    <div className="w-full max-w-7xl mx-auto animate-fade-in space-y-6">
      <header className="mb-6 px-1 space-y-3">
        <div className="flex items-center gap-3">
          <FileIcon className="w-8 h-8 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Analysis for</p>
            <h2 className="text-2xl font-bold font-headline text-foreground">{fileName}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("flex items-center gap-2 text-base px-3 py-1", config.color)}>
                <Icon className="w-5 h-5" />
                <span>{config.label}</span>
            </Badge>
        </div>
      </header>
      
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
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
                <ScrollArea className="h-[40vh] pr-4">
                    {isTranslating ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">{translatedSummary}</p>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
        <AnalysisCard icon={<Stethoscope />} title="Doctor-Style Summary">
            <p className="font-code">{analysis.doctorSummary}</p>
        </AnalysisCard>
        <AnalysisCard icon={<HeartPulse />} title="Lifestyle & Health Suggestions">
            <p>{analysis.lifestyleSuggestions}</p>
        </AnalysisCard>
         <AnalysisCard icon={<Pill />} title="Recommended Medicines">
            <>
              <p className="text-sm text-yellow-400 border border-yellow-400/50 bg-yellow-500/10 p-3 rounded-md mb-4">
                This is not medical advice. Consult a doctor before taking any medication.
              </p>
              <p>{analysis.medicines}</p>
              <div className="mt-6 text-center">
                 <Button asChild>
                    <Link href="/dashboard/reminders">
                        <BellRing className="mr-2 h-4 w-4" />
                        Set Medicine Reminders
                    </Link>
                </Button>
              </div>
            </>
        </AnalysisCard>
      </div>
    </div>
  );
}
