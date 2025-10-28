
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { askQuestion } from "@/ai/flows/enable-interactive-q-and-a";
import { textToSpeech } from "@/ai/flows/text-to-speech";

type ConversationStatus = "idle" | "listening" | "thinking" | "speaking";

type Message = {
  role: 'user' | 'bot';
  content: string;
};

interface LiveConversationProps {
  reportSummary: string;
  onClose: () => void;
}

export function LiveConversation({ reportSummary, onClose }: LiveConversationProps) {
  const [status, setStatus] = useState<ConversationStatus>("idle");
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const { toast } = useToast();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startListening = useCallback(() => {
    if (isMuted || !recognitionRef.current) {
      setStatus("idle");
      return;
    }
    try {
      recognitionRef.current.start();
      setStatus("listening");
    } catch (e) {
      console.error("Recognition start error:", e);
      // It might already be started, which is okay.
    }
  }, [isMuted]);

  const processAndRespond = useCallback(async (transcript: string) => {
    setStatus("thinking");
    const userMessage: Message = { role: "user", content: transcript };
    const currentHistory = [...chatHistory, userMessage];
    setChatHistory(currentHistory);

    try {
      const questionResult = await askQuestion({
        reportSummary,
        question: transcript,
        chatHistory: currentHistory.map(m => ({ role: m.role, content: m.content })),
      });
      const botMessage: Message = { role: "bot", content: questionResult.answer };
      setChatHistory(prev => [...prev, botMessage]);

      const ttsResult = await textToSpeech({ text: questionResult.answer });
      if (audioRef.current) {
        setStatus("speaking");
        audioRef.current.src = ttsResult.audioDataUri;
        audioRef.current.play();
      }
    } catch (error) {
      console.error("AI interaction failed:", error);
      toast({
        title: "Error",
        description: "Could not get a response from the AI.",
        variant: "destructive",
      });
      setStatus("idle");
      setTimeout(startListening, 500); // Try to recover
    }
  }, [chatHistory, reportSummary, startListening, toast]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        title: "Browser Not Supported",
        description: "Live conversation is not available in this browser.",
        variant: "destructive",
      });
      onClose();
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = false;

    recognitionRef.current.onresult = (event) => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      const transcript = event.results[event.results.length - 1][0].transcript.trim();
      if (transcript) {
        recognitionRef.current?.stop();
        processAndRespond(transcript);
      }
    };
    
    recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        if (event.error !== 'no-speech') {
            setStatus("idle");
        }
    };

    recognitionRef.current.onend = () => {
        // If the status is 'listening', it means it ended without a result (e.g., silence)
        // so we should restart it.
        if (status === "listening") {
            startListening();
        }
    };

    audioRef.current = new Audio();
    audioRef.current.onended = () => {
      startListening();
    };

    startListening();

    return () => {
      recognitionRef.current?.abort();
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMuteToggle = () => {
    if (isMuted) {
      setIsMuted(false);
      startListening();
    } else {
      setIsMuted(true);
      recognitionRef.current?.stop();
      setStatus("idle");
    }
  };

  const statusText = {
      idle: "Tap the mic to speak",
      listening: "Listening...",
      thinking: "Thinking...",
      speaking: "Speaking..."
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center animate-fade-in" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full h-full flex flex-col items-center justify-center p-4">
        
        {/* Animated Orb */}
        <div className="relative flex items-center justify-center w-64 h-64">
            <div className={cn(
                "absolute rounded-full bg-primary/20 transition-all duration-500",
                status === 'listening' && 'w-64 h-64 animate-pulse',
                status === 'speaking' && 'w-56 h-56 animate-pulse',
                status === 'thinking' && 'w-48 h-48 animate-spin',
                (status === 'idle' || isMuted) && 'w-48 h-48',
            )}></div>
            <div className={cn(
                "absolute rounded-full bg-primary/40 transition-all duration-500",
                status === 'listening' && 'w-56 h-56 animate-pulse delay-100',
                status === 'speaking' && 'w-48 h-48 animate-pulse delay-100',
                status === 'thinking' && 'w-40 h-40 animate-spin-slow',
                (status === 'idle' || isMuted) && 'w-40 h-40',
            )}></div>
            <div className="absolute rounded-full w-32 h-32 bg-primary"></div>
        </div>

        <p className="mt-8 text-xl text-white/80 h-8 transition-opacity duration-300">
          {isMuted ? "Muted" : statusText[status]}
        </p>
        
        {/* Controls */}
        <div className="absolute bottom-10 flex items-center gap-6">
          <button
            onClick={handleMuteToggle}
            className="w-16 h-16 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
          </button>
          <button
            onClick={onClose}
            className="w-16 h-16 rounded-full flex items-center justify-center bg-red-600/80 text-white hover:bg-red-600 transition-colors"
          >
            <X size={28} />
          </button>
        </div>
      </div>
    </div>
  );
}
