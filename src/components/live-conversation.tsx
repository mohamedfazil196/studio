
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Mic, MicOff, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { askQuestion } from "@/ai/flows/enable-interactive-q-and-a";

type Status = "idle" | "listening" | "thinking" | "speaking" | "muted";

type Message = {
  role: "user" | "bot";
  content: string;
};

interface LiveConversationProps {
  reportSummary: string;
  onClose: () => void;
}

export function LiveConversation({ reportSummary, onClose }: LiveConversationProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const { toast } = useToast();

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const transcriptRef = useRef("");
  const isProcessingRef = useRef(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);


  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
        return;
    }
    
    stopSpeaking();
    
    // Remove markdown for cleaner speech
    const cleanText = text.replace(/\*\*/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utteranceRef.current = utterance;
    
    utterance.onstart = () => {
        setStatus("speaking");
    };
    utterance.onend = () => {
        setStatus("idle");
    };
    utterance.onerror = (e) => {
        console.error("Speech synthesis error", e);
        setStatus("idle");
        toast({
            title: "Voice Error",
            description: e.error || "Could not play audio. Your browser might not support this voice.",
            variant: "destructive"
        });
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      if (status === 'speaking') {
          setStatus("idle");
      }
    }
  }, [status]);


  const stopListening = useCallback(() => {
    if (recognitionRef.current && status === "listening") {
        try {
            recognitionRef.current.stop();
        } catch (e) {
            // Can throw if not active, which is fine
        }
    }
  }, [status]);
  
  const processAndRespond = useCallback(async (transcript: string) => {
      if (!transcript || isProcessingRef.current) {
        if (!isProcessingRef.current) setStatus("idle");
        return;
      }
  
      isProcessingRef.current = true;
      setStatus("thinking");
  
      const userMessage: Message = { role: 'user', content: transcript };
      setChatHistory(prev => [...prev, userMessage]);
  
      try {
        const questionResult = await askQuestion({
          reportSummary,
          question: transcript,
          chatHistory: [...chatHistory, userMessage],
        });
        const botMessage: Message = { role: "bot", content: questionResult.answer };
        setChatHistory(prev => [...prev, botMessage]);
  
        isProcessingRef.current = false;
        if (status === 'muted') {
            setStatus('muted');
            return;
        }
  
        speakText(botMessage.content);
  
      } catch (error) {
        console.error("Error during processing/responding:", error);
        isProcessingRef.current = false;
        setStatus("idle");
      }
    }, [chatHistory, reportSummary, status, speakText]);


  const startListening = useCallback(() => {
    if (isProcessingRef.current || (recognitionRef.current && status === "listening")) {
      return;
    }
    stopSpeaking();
    try {
      transcriptRef.current = "";
      recognitionRef.current?.start();
    } catch (e) {
      // Already started, it's fine.
    }
  }, [status, stopSpeaking]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        title: "Browser Not Supported",
        description: "Live conversation is not available on this browser.",
        variant: "destructive",
      });
      onClose();
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
        setStatus("listening");
    };

    recognition.onresult = (event) => {
        if(silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
        }
        
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = 0; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        transcriptRef.current = finalTranscript || interimTranscript;

        silenceTimerRef.current = setTimeout(() => {
           stopListening();
        }, 1000); // 1 second of silence
    };
    
    recognition.onend = () => {
      if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
      }
      if (status === 'listening' && !isProcessingRef.current) {
         const finalTranscript = transcriptRef.current.trim();
         if (finalTranscript) {
            processAndRespond(finalTranscript);
         } else {
            setStatus('idle');
         }
      }
    };
    
    recognition.onerror = (event) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted' && event.error !== 'network') {
        console.error("Speech recognition error:", event.error);
        toast({ title: "Speech Error", description: event.error, variant: 'destructive' });
      }
       if (status === "listening") {
            setStatus("idle");
       }
    };
    
    return () => {
        stopListening();
        stopSpeaking();
        if(silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    }
  }, [onClose, stopListening, stopSpeaking, status, processAndRespond, toast]);

  useEffect(() => {
    if (status === "idle" && status !== 'muted') {
      const timer = setTimeout(() => startListening(), 100);
      return () => clearTimeout(timer);
    }
  }, [status, startListening]);

  const handleMuteToggle = () => {
    if (status === "muted") {
      setStatus("idle");
    } else {
      stopSpeaking();
      stopListening();
      setStatus("muted");
    }
  };
  
  const handleClose = () => {
    stopListening();
    stopSpeaking();
    onClose();
  }

  const handleStopListening = () => {
    if (status === 'listening') {
      stopListening();
    }
  }
  
  const statusText: Record<Status, string> = {
      idle: "Listening...",
      listening: "Listening...",
      thinking: "Thinking...",
      speaking: "Speaking...",
      muted: "Muted"
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center animate-fade-in" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="w-full h-full flex flex-col items-center justify-center p-4">
        
        <div className="relative flex items-center justify-center w-64 h-64">
            <div className={cn(
                "absolute rounded-full bg-primary/20 transition-all duration-500",
                status === 'listening' && 'w-64 h-64 animate-pulse',
                status === 'speaking' && 'w-56 h-56 animate-pulse',
                status === 'thinking' && 'w-48 h-48 animate-spin-slow',
                (status === 'idle' || status === 'muted') && 'w-48 h-48',
            )}></div>
            <div className={cn(
                "absolute rounded-full bg-primary/40 transition-all duration-500",
                status === 'listening' && 'w-56 h-56 animate-pulse [animation-delay:100ms]',
                status === 'speaking' && 'w-48 h-48 animate-pulse [animation-delay:100ms]',
                status === 'thinking' && 'w-40 h-40 animate-spin-slow [animation-direction:reverse]',
                (status === 'idle' || status === 'muted') && 'w-40 h-40',
            )}></div>
            <div className="absolute rounded-full w-32 h-32 bg-primary"></div>
        </div>

        <p className="mt-8 text-xl text-white/80 h-8 transition-opacity duration-300">
          {statusText[status]}
        </p>
        
        <div className="absolute bottom-10 flex items-center justify-center w-full gap-6">
          <button
            onClick={handleMuteToggle}
            className="w-16 h-16 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            {status === "muted" ? <MicOff size={28} /> : <Mic size={28} />}
          </button>
          
          <button
            onClick={handleStopListening}
            disabled={status !== 'listening'}
            className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center bg-white text-black hover:bg-white/90 transition-all duration-300 disabled:bg-gray-400 disabled:scale-90",
                status === 'listening' ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
            )}
          >
            <Square size={32} />
          </button>

          <button
            onClick={handleClose}
            className="w-16 h-16 rounded-full flex items-center justify-center bg-red-600/80 text-white hover:bg-red-600 transition-colors"
          >
            <X size={28} />
          </button>
        </div>
      </div>
    </div>
  );
}
