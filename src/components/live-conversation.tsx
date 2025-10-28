
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Mic, MicOff, Square } from "lucide-react";
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
  const finalTranscriptRef = useRef('');

  // Main processing function
  const processAndRespond = useCallback(async (transcript: string) => {
    if (!transcript.trim()) {
      setStatus("idle"); // Go back to idle if there's nothing to process
      return;
    }

    setStatus("thinking");

    const userMessage: Message = { role: "user", content: transcript };
    const currentHistory = [...chatHistory, userMessage];
    setChatHistory(currentHistory);

    try {
      const questionResult = await askQuestion({
        reportSummary,
        question: transcript,
        chatHistory: currentHistory.slice(0, -1),
      });

      const botMessage: Message = { role: "bot", content: questionResult.answer };
      setChatHistory(prev => [...prev, botMessage]);

      if (isMuted) {
          setStatus("idle");
          return;
      }
      
      const ttsResult = await textToSpeech({ text: questionResult.answer });
      if (audioRef.current && ttsResult.audioDataUri) {
        setStatus("speaking");
        audioRef.current.src = ttsResult.audioDataUri;
        audioRef.current.play().catch(e => {
             console.error("Audio playback failed:", e);
             setStatus("idle");
        });
      } else {
        setStatus("idle");
      }
    } catch (error) {
      console.error("AI interaction failed:", error);
      toast({
        title: "Error",
        description: "Could not get a response from the AI.",
        variant: "destructive",
      });
      setStatus("idle");
    }
  }, [chatHistory, reportSummary, toast, isMuted]);

  // Effect to manage speech recognition lifecycle
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

    if (!recognitionRef.current) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;

        recognitionRef.current.onresult = (event) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscriptRef.current += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            // Barge-in: if user starts speaking while bot is speaking
            if (status === 'speaking' && (interimTranscript.length > 0 || finalTranscriptRef.current.length > 0)) {
                if (audioRef.current) {
                  audioRef.current.pause();
                }
            }
        };
        
        recognitionRef.current.onerror = (event) => {
            if (event.error !== 'no-speech' && event.error !== 'aborted' && event.error !== 'network') {
                console.error("Speech recognition error:", event.error);
            }
        };

        recognitionRef.current.onend = () => {
            if (status === 'listening') {
                 const transcriptToProcess = finalTranscriptRef.current.trim();
                 processAndRespond(transcriptToProcess);
            } else if (status !== 'thinking' && status !== 'speaking') {
                setStatus('idle');
            }
        };
    }
    
    if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.onended = () => setStatus('idle');
        audioRef.current.onpause = () => {
            // Only go to idle if we were in the speaking state
            if (status === 'speaking') {
                setStatus('idle');
            }
        };
    }

    if (status === 'idle' && !isMuted) {
      finalTranscriptRef.current = '';
      try {
        recognitionRef.current.start();
        setStatus("listening");
      } catch (e) {
        // Can happen if already started, just transition state
        if (status !== 'listening') {
          setStatus("listening");
        }
      }
    }

    // Cleanup function
    return () => {
      recognitionRef.current?.abort();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [status, isMuted, onClose, processAndRespond, toast]);

  const handleMuteToggle = () => {
    setIsMuted(prevMuted => {
        const newMutedState = !prevMuted;
        if (newMutedState) { // Muting
            recognitionRef.current?.abort();
            if (audioRef.current) {
              audioRef.current.pause();
            }
            setStatus("idle"); // force idle state
        } else { // Un-muting
            setStatus("idle"); // Transition to idle to trigger listening
        }
        return newMutedState;
    });
  };

  const handleStopListening = () => {
    if (status === 'listening' && recognitionRef.current) {
        recognitionRef.current.stop(); // This will trigger onend and processing
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
                status === 'thinking' && 'w-48 h-48 animate-spin-slow',
                (status === 'idle' || isMuted) && 'w-48 h-48',
            )}></div>
            <div className={cn(
                "absolute rounded-full bg-primary/40 transition-all duration-500",
                status === 'listening' && 'w-56 h-56 animate-pulse [animation-delay:100ms]',
                status === 'speaking' && 'w-48 h-48 animate-pulse [animation-delay:100ms]',
                status === 'thinking' && 'w-40 h-40 animate-spin-slow [animation-direction:reverse]',
                (status === 'idle' || isMuted) && 'w-40 h-40',
            )}></div>
            <div className="absolute rounded-full w-32 h-32 bg-primary"></div>
        </div>

        <p className="mt-8 text-xl text-white/80 h-8 transition-opacity duration-300">
          {isMuted ? "Muted" : statusText[status]}
        </p>
        
        {/* Controls */}
        <div className="absolute bottom-10 flex items-center justify-center w-full gap-6">
          <button
            onClick={handleMuteToggle}
            className="w-16 h-16 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
          </button>
          
          <button
            onClick={handleStopListening}
            disabled={status !== 'listening'}
            className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center bg-white text-black hover:bg-white/90 transition-all scale-100 disabled:scale-0",
                status === 'listening' ? 'opacity-100' : 'opacity-0'
            )}
          >
            <Square size={32} />
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
