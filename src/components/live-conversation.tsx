
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Mic, MicOff, Square, Bot, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { askQuestion } from "@/ai/flows/enable-interactive-q-and-a";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar, AvatarFallback } from "./ui/avatar";

type Status = "idle" | "listening" | "thinking" | "speaking" | "muted" | "error";

type Message = {
  role: "user" | "bot";
  content: string;
};

interface LiveConversationProps {
  reportSummary: string;
  onClose: () => void;
}

const statusText: Record<Status, string> = {
    idle: "Press the mic to start",
    listening: "Listening...",
    thinking: "Thinking...",
    speaking: "Speaking...",
    muted: "Muted",
    error: "An error occurred. Please try again."
}

export function LiveConversation({ reportSummary, onClose }: LiveConversationProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const { toast } = useToast();

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  const speakText = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    
    window.speechSynthesis.cancel();
    
    const cleanText = text.replace(/\*\*/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    utterance.onstart = () => setStatus("speaking");
    utterance.onend = () => setStatus("idle");
    utterance.onerror = (e) => {
        setStatus("idle");
        toast({
            title: "Voice Error",
            description: e.error || "Could not play audio. Your browser might not support this voice.",
            variant: "destructive"
        });
    };
    window.speechSynthesis.speak(utterance);
  }, [toast]);

  const processAndRespond = useCallback(async (transcript: string) => {
      if (!transcript) {
        setStatus("idle");
        return;
      }
  
      setStatus("thinking");
      const userMessage: Message = { role: 'user', content: transcript };
      const updatedHistory = [...chatHistory, userMessage];
      setChatHistory(updatedHistory);
  
      try {
        const result = await askQuestion({
          reportSummary,
          question: transcript,
          chatHistory: updatedHistory, 
        });

        if (!result || !result.answer) {
             throw new Error("AI did not return an answer.");
        }

        const botMessage: Message = { role: "bot", content: result.answer };
        setChatHistory(prev => [...prev, botMessage]);
        speakText(result.answer);

      } catch (error) {
        console.error("Error processing AI response:", error);
        setStatus("error");
        toast({
          title: "AI Error",
          description: "Could not get a response. Please try again.",
          variant: "destructive"
        });
        setChatHistory(prev => prev.slice(0, -1));
      }
    }, [chatHistory, reportSummary, speakText, toast]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
        recognitionRef.current.stop();
    }
  }, []);

  const startListening = useCallback(() => {
    if (status === 'listening' || !recognitionRef.current) {
      return;
    }
    window.speechSynthesis.cancel();
    try {
      recognitionRef.current.start();
    } catch(e) {
      // Already started, ignore
    }
  }, [status]);
  
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
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setStatus("listening");
    recognition.onend = () => {
        // This check prevents moving to 'idle' if we are already 'thinking'
        setStatus(currentStatus => currentStatus === 'listening' ? 'idle' : currentStatus);
    }
    recognition.onerror = (event) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.error("Speech recognition error:", event.error);
        setStatus("error");
      }
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      if (transcript) {
        processAndRespond(transcript);
      }
    };

    return () => {
      recognition.stop();
      window.speechSynthesis.cancel();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processAndRespond]); 

  useEffect(() => {
    if (status === "idle") {
      const timer = setTimeout(() => startListening(), 100);
      return () => clearTimeout(timer);
    }
  }, [status, startListening]);

  const handleMuteToggle = () => {
    if (status === "muted") {
      setStatus("idle");
    } else {
      stopListening();
      window.speechSynthesis.cancel();
      setStatus("muted");
    }
  };
  
  const handleClose = () => {
    stopListening();
    window.speechSynthesis.cancel();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center animate-fade-in" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="w-full h-full max-w-4xl flex flex-col items-center justify-center p-4">
        
        <div className="w-full h-1/2 flex-shrink-0">
          <ScrollArea className="h-full pr-4">
              <div className="space-y-4">
                {chatHistory.map((message, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
                  >
                    {message.role === 'bot' && (
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className='bg-primary text-primary-foreground'><Bot className="h-5 w-5"/></AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`max-w-[75%] rounded-lg px-4 py-2 shadow-sm text-white ${
                        message.role === 'user'
                          ? 'bg-primary/80'
                          : 'bg-white/10'
                      }`}
                    >
                       <p className="text-sm whitespace-pre-line">{message.content}</p>
                    </div>
                    {message.role === 'user' && (
                      <Avatar className="h-8 w-8">
                        <AvatarFallback><User className="h-5 w-5"/></AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
              </div>
          </ScrollArea>
        </div>

        <div className="relative flex items-center justify-center w-64 h-64 my-4">
            <div className={cn(
                "absolute rounded-full bg-primary/20 transition-all duration-500",
                status === 'listening' && 'w-64 h-64 animate-pulse',
                status === 'speaking' && 'w-56 h-56 animate-pulse',
                status === 'thinking' && 'w-48 h-48',
                (status === 'idle' || status === 'muted' || status === 'error') && 'w-48 h-48',
            )}></div>
            <div className={cn(
                "absolute rounded-full bg-primary/40 transition-all duration-500",
                status === 'listening' && 'w-56 h-56 animate-pulse [animation-delay:100ms]',
                status === 'speaking' && 'w-48 h-48 animate-pulse [animation-delay:100ms]',
                status === 'thinking' && 'w-40 h-40',
                (status === 'idle' || status === 'muted' || status === 'error') && 'w-40 h-40',
            )}></div>
            <div className="absolute rounded-full w-32 h-32 bg-primary flex items-center justify-center">
              {status === 'thinking' && <Loader2 className="w-12 h-12 text-primary-foreground animate-spin" />}
            </div>
        </div>

        <p className="text-xl text-white/80 h-8 transition-opacity duration-300">
          {statusText[status]}
        </p>
        
        <div className="absolute bottom-10 flex items-center justify-center w-full gap-6">
          <button
            onClick={handleMuteToggle}
            aria-label={status === 'muted' ? 'Unmute' : 'Mute'}
            className="w-16 h-16 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            {status === "muted" ? <MicOff size={28} /> : <Mic size={28} />}
          </button>
          
          <button
            onClick={startListening}
            disabled={status === 'listening' || status === 'thinking' || status === 'speaking'}
            aria-label="Start Listening"
            className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center bg-white text-black hover:bg-white/90 transition-all duration-300 disabled:bg-gray-400 disabled:scale-90",
            )}
          >
            <Mic size={32} />
          </button>

          <button
            onClick={handleClose}
            aria-label="Close Conversation"
            className="w-16 h-16 rounded-full flex items-center justify-center bg-red-600/80 text-white hover:bg-red-600 transition-colors"
          >
            <X size={28} />
          </button>
        </div>
      </div>
    </div>
  );
}
