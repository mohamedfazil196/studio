
import { FileText, Stethoscope, HeartPulse, MessagesSquare, File as FileIcon, AlertTriangle, ShieldCheck, ShieldAlert, Pill, Languages, Play, Pause, BellRing, Loader2, Square } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type Analysis } from "@/app/types/analysis";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useState, useRef, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "./ui/scroll-area";
import Link from 'next/link';
import { QAChat } from "./qa-chat";
import { translateText } from "@/ai/flows/translate-text";
import { translateAndSpeak } from "@/ai/flows/translate-and-speak";

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
  const [isPreparingAudio, setIsPreparingAudio] = useState(false);
  const { toast } = useToast();
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleStopSpeaking = useCallback(() => {
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  }, []);

  const speakText = async (text: string, lang: string) => {
    if (lang === 'en') {
      // Use browser TTS for English for speed, as it's generally well-supported.
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      handleStopSpeaking();
      const cleanText = text.replace(/\*\*/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = lang;
      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = (e) => {
        setIsPlaying(false);
        toast({
          title: "Voice Error",
          description: "Could not play audio. Your browser might not support this language.",
          variant: "destructive"
        });
      };
      window.speechSynthesis.speak(utterance);
    } else {
      // Use server-side TTS for other languages
      setIsPreparingAudio(true);
      try {
        const result = await translateAndSpeak({ text: analysis.patientSummary, targetLanguage: lang });
        if (result.audioDataUri) {
            setTranslatedSummary(result.translatedText);
            if (audioRef.current) {
                audioRef.current.src = result.audioDataUri;
                audioRef.current.play();
                setIsPlaying(true);
            }
        } else {
             throw new Error("Text-to-speech did not return audio.");
        }
      } catch (error) {
        console.error("AI speech error:", error);
        toast({
          title: "Voice Generation Failed",
          description: "Could not generate audio, possibly due to service rate limits. Please try again in a moment.",
          variant: "destructive"
        });
        setIsPlaying(false);
      } finally {
        setIsPreparingAudio(false);
      }
    }
  };


  const handleLanguageChange = async (langCode: string) => {
      setSelectedLanguage(langCode);
      handleStopSpeaking();

      if (langCode === 'en') {
          setTranslatedSummary(analysis.patientSummary);
          return;
      }

      setIsTranslating(true);
      try {
        const result = await translateText({ text: analysis.patientSummary, targetLanguage: langCode });
        setTranslatedSummary(result.translatedText);
      } catch (error) {
          console.error('Translation error:', error);
          toast({
              title: "Translation Failed",
              description: "Could not translate the summary.",
              variant: "destructive"
          });
          setTranslatedSummary(analysis.patientSummary); // Revert on failure
      } finally {
          setIsTranslating(false);
      }
  }

  const handlePlayPause = () => {
    if (isPlaying) {
      handleStopSpeaking();
    } else {
      speakText(translatedSummary, selectedLanguage);
    }
  };

  useEffect(() => {
    // Setup audio element and its listeners
    const audio = new Audio();
    audioRef.current = audio;
    
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    
    // Cleanup on component unmount
    return () => {
      handleStopSpeaking();
      if (audio) {
        audio.removeEventListener('play', onPlay);
        audio.removeEventListener('pause', onPause);
        audio.removeEventListener('ended', onEnded);
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [handleStopSpeaking]);


  const AnalysisCard = ({ icon, title, children, className }: { icon: React.ReactNode, title: string, children: React.ReactNode, className?: string }) => (
    <Card className={cn("h-full", className)}>
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
                        <Button size="icon" variant="outline" onClick={handlePlayPause} disabled={isTranslating || isPreparingAudio}>
                            {isTranslating || isPreparingAudio ? <Loader2 className="animate-spin" /> : isPlaying ? <Pause /> : <Play />}
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
        <AnalysisCard icon={<HeartPulse />} title="Lifestyle &amp; Health Suggestions">
            <p>{analysis.lifestyleSuggestions}</p>
        </AnalysisCard>
         <AnalysisCard icon={<Pill />} title="Recommended Medicines">
            <>
              {analysis.medicines && analysis.medicines.disclaimer && (
                <p className="text-sm text-yellow-400 border border-yellow-400/50 bg-yellow-500/10 p-3 rounded-md mb-4">
                  {analysis.medicines.disclaimer}
                </p>
              )}
              {analysis.medicines && analysis.medicines.recommendations && analysis.medicines.recommendations.length > 0 ? (
                <>
                  <ul className="space-y-4">
                    {analysis.medicines.recommendations.map((med, index) => (
                        <li key={index} className="flex flex-col border-l-2 border-primary pl-4">
                            <span className="font-bold text-base">{med.medicineName}</span>
                            <span className="text-sm text-muted-foreground">{med.reason}</span>
                        </li>
                    ))}
                  </ul>
                  <div className="mt-6 text-center">
                     <Button asChild>
                        <Link href="/dashboard/reminders">
                            <BellRing className="mr-2 h-4 w-4" />
                            Set Medicine Reminders
                        </Link>
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No specific medicines were recommended based on this report.</p>
              )}
            </>
        </AnalysisCard>
        <div className="lg:col-span-2">
           <QAChat reportSummary={analysis.doctorSummary} />
        </div>
      </div>
    </div>
  );
}
