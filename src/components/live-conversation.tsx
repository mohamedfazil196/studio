
"use client";

import { useState, useEffect, useRef, useCallback, useReducer } from "react";
import { X, Mic, MicOff, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { askQuestion } from "@/ai/flows/enable-interactive-q-and-a";
import { textToSpeech } from "@/ai/flows/text-to-speech";

// --- State Machine ---

type Message = {
  role: "user" | "bot";
  content: string;
};

type State = {
  status: "idle" | "listening" | "thinking" | "speaking" | "muted";
  chatHistory: Message[];
};

type Action =
  | { type: "START_LISTENING" }
  | { type: "STOP_LISTENING" }
  | { type: "PROCESS_SPEECH"; transcript: string }
  | { type: "BOT_RESPONSE"; botMessage: Message }
  | { type: "START_SPEAKING" }
  | { type: "FINISH_SPEAKING" }
  | { type: "MUTE" }
  | { type: "UNMUTE" }
  | { type: "ERROR"; error?: any };

const initialState: State = {
  status: "idle",
  chatHistory: [],
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "START_LISTENING":
      if (["idle", "speaking", "muted"].includes(state.status)) {
        return { ...state, status: "listening" };
      }
      return state;
    case "STOP_LISTENING":
      if (state.status === "listening") {
        return { ...state, status: "idle" };
      }
      return state;
    case "PROCESS_SPEECH":
      if (!action.transcript.trim()) {
        return { ...state, status: "idle" }; // Go back to idle if transcript is empty
      }
      return {
        ...state,
        status: "thinking",
        chatHistory: [...state.chatHistory, { role: "user", content: action.transcript }],
      };
    case "BOT_RESPONSE":
       const nextStatus = state.status === 'muted' ? 'muted' : 'speaking';
       return {
        ...state,
        status: nextStatus,
        chatHistory: [...state.chatHistory, action.botMessage],
      };
    case "START_SPEAKING":
       if(state.status === 'thinking') {
          return { ...state, status: 'speaking' };
       }
       return state;
    case "FINISH_SPEAKING":
      if (state.status === "speaking" || state.status === 'muted') {
        return { ...state, status: "idle" };
      }
      return state;
    case "MUTE":
      return { ...state, status: "muted" };
    case "UNMUTE":
      // If was muted, go to idle to restart listening cycle
      return { ...state, status: "idle" };
    case "ERROR":
      console.error("An error occurred in the conversation:", action.error);
      return { ...state, status: "idle" };
    default:
      return state;
  }
}

// --- Component ---

interface LiveConversationProps {
  reportSummary: string;
  onClose: () => void;
}

export function LiveConversation({ reportSummary, onClose }: LiveConversationProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { toast } = useToast();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptRef = useRef("");
  
  // --- Core Actions ---
  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
  }, []);

  const stopListening = useCallback(() => {
     if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
    }
    if (recognitionRef.current && state.status === "listening") {
        recognitionRef.current.stop();
    }
  }, [state.status]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && state.status !== 'listening') {
      try {
        transcriptRef.current = "";
        recognitionRef.current.start();
        dispatch({ type: 'START_LISTENING' });
      } catch (e) {
        // Already started, which is fine
      }
    }
  }, [state.status]);


  // --- Effects for Setup and State Transitions ---

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
    recognitionRef.current.continuous = true; // Keep listening even after pauses
    recognitionRef.current.interimResults = true;

    recognitionRef.current.onresult = (event) => {
        if (state.status === 'speaking') {
            stopSpeaking();
            // Transition directly to listening, which will be handled by the onend of the speaking audio
            // but we can also force it here for faster response.
            dispatch({ type: 'START_LISTENING' });
        }

        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
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
    
    recognitionRef.current.onend = () => {
        if (state.status === 'listening') { // Only process if we were listening
            dispatch({ type: "STOP_LISTENING" });
            if (transcriptRef.current) {
                dispatch({ type: 'PROCESS_SPEECH', transcript: transcriptRef.current });
            }
        }
    };
    
    recognitionRef.current.onerror = (event) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted' && event.error !== 'network') {
            dispatch({ type: 'ERROR', error: event.error });
        }
    };
    
    audioRef.current = new Audio();
    audioRef.current.onended = () => dispatch({ type: "FINISH_SPEAKING" });

    // Initial start
    startListening();

    return () => {
      stopListening();
      stopSpeaking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount


  // Effect to automatically start listening when idle
  useEffect(() => {
    if (state.status === "idle") {
      startListening();
    }
  }, [state.status, startListening])

  // Effect to process the response when 'thinking'
  useEffect(() => {
      if (state.status !== 'thinking') return;
      
      const process = async () => {
        const lastUserMessage = state.chatHistory[state.chatHistory.length - 1];
        if (lastUserMessage.role !== 'user') return;
        
        try {
            const questionResult = await askQuestion({
                reportSummary,
                question: lastUserMessage.content,
                chatHistory: state.chatHistory.slice(0, -1),
            });

            const botMessage: Message = { role: "bot", content: questionResult.answer };
            dispatch({ type: "BOT_RESPONSE", botMessage });
            
        } catch (error) {
            dispatch({type: 'ERROR', error });
        }
      };

      process();

  }, [state.status, state.chatHistory, reportSummary]);


  // Effect to speak when status becomes 'speaking'
  useEffect(() => {
    if (state.status !== 'speaking') return;

    const speak = async () => {
        const lastBotMessage = state.chatHistory[state.chatHistory.length-1];
        if (lastBotMessage.role !== 'bot' || !lastBotMessage.content) {
            dispatch({ type: 'FINISH_SPEAKING' });
            return;
        }

        try {
            const ttsResult = await textToSpeech({ text: lastBotMessage.content });
            if (ttsResult.audioDataUri && audioRef.current) {
                audioRef.current.src = ttsResult.audioDataUri;
                await audioRef.current.play();
            } else {
                 dispatch({ type: "FINISH_SPEAKING" });
            }
        } catch (error) {
            dispatch({type: 'ERROR', error});
        }
    }
    speak();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, state.chatHistory]);


  // --- User Actions ---
  const handleMuteToggle = () => {
    if (state.status === "muted") {
        dispatch({ type: "UNMUTE" });
    } else {
        stopSpeaking();
        stopListening(); // Stop current listening session before muting
        dispatch({ type: "MUTE" });
    }
  };

  const handleStopListening = () => {
    stopListening();
  };

  const handleClose = () => {
    stopListening();
    stopSpeaking();
    onClose();
  }
  
  // --- UI ---

  const statusText = {
      idle: "Tap the mic to speak",
      listening: "Listening...",
      thinking: "Thinking...",
      speaking: "Speaking...",
      muted: "Muted"
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center animate-fade-in" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="w-full h-full flex flex-col items-center justify-center p-4">
        
        {/* Animated Orb */}
        <div className="relative flex items-center justify-center w-64 h-64">
            <div className={cn(
                "absolute rounded-full bg-primary/20 transition-all duration-500",
                state.status === 'listening' && 'w-64 h-64 animate-pulse',
                state.status === 'speaking' && 'w-56 h-56 animate-pulse',
                state.status === 'thinking' && 'w-48 h-48 animate-spin-slow',
                (state.status === 'idle' || state.status === 'muted') && 'w-48 h-48',
            )}></div>
            <div className={cn(
                "absolute rounded-full bg-primary/40 transition-all duration-500",
                state.status === 'listening' && 'w-56 h-56 animate-pulse [animation-delay:100ms]',
                state.status === 'speaking' && 'w-48 h-48 animate-pulse [animation-delay:100ms]',
                state.status === 'thinking' && 'w-40 h-40 animate-spin-slow [animation-direction:reverse]',
                (state.status === 'idle' || state.status === 'muted') && 'w-40 h-40',
            )}></div>
            <div className="absolute rounded-full w-32 h-32 bg-primary"></div>
        </div>

        <p className="mt-8 text-xl text-white/80 h-8 transition-opacity duration-300">
          {statusText[state.status]}
        </p>
        
        {/* Controls */}
        <div className="absolute bottom-10 flex items-center justify-center w-full gap-6">
          <button
            onClick={handleMuteToggle}
            className="w-16 h-16 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            {state.status === "muted" ? <MicOff size={28} /> : <Mic size={28} />}
          </button>
          
          <button
            onClick={handleStopListening}
            disabled={state.status !== 'listening'}
            className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center bg-white text-black hover:bg-white/90 transition-all duration-300 disabled:bg-gray-400 disabled:scale-90",
                state.status === 'listening' ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
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

    