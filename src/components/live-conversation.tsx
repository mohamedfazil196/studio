
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
  | { type: "START_THINKING"; userMessage: Message }
  | { type: "BOT_RESPONSE"; botMessage: Message }
  | { type: "START_SPEAKING" }
  | { type: "FINISH_SPEAKING" }
  | { type: "MUTE" }
  | { type: "UNMUTE" }
  | { type: "ERROR" };

const initialState: State = {
  status: "idle",
  chatHistory: [],
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "START_LISTENING":
      // Can start listening from idle, after speaking, or when unmuting
      if (["idle", "speaking", "muted"].includes(state.status)) {
        return { ...state, status: "listening" };
      }
      return state;
    case "STOP_LISTENING":
       // Go to idle to await processing. The onend handler will trigger the next step.
      if (state.status === "listening") {
        return { ...state, status: "idle" };
      }
      return state;
    case "START_THINKING":
      // Always transition to thinking after user speaks
      return {
        ...state,
        status: "thinking",
        chatHistory: [...state.chatHistory, action.userMessage],
      };
    case "BOT_RESPONSE":
       // Add the bot's message to history. Status becomes 'speaking' or stays 'muted'.
       const nextStatus = state.status === 'muted' ? 'muted' : 'speaking';
       return {
        ...state,
        status: nextStatus,
        chatHistory: [...state.chatHistory, action.botMessage],
      };
    case "START_SPEAKING":
       // This action is now handled by BOT_RESPONSE, but we keep it for clarity if needed.
       if (state.status === 'thinking') {
         return {...state, status: 'speaking'};
       }
       return state;
    case "FINISH_SPEAKING":
      // After speaking, go back to idle to start listening again
      if (state.status === "speaking") {
        return { ...state, status: "idle" };
      }
      return state;
    case "MUTE":
      return { ...state, status: "muted" };
    case "UNMUTE":
      return { ...state, status: "idle" }; // Go to idle to start listening again
    case "ERROR":
      // On error, return to idle state, ready to listen again.
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
  const finalTranscriptRef = useRef("");
  const isProcessingRef = useRef(false);

  // --- Core Actions ---

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    if (state.status === "speaking") {
      dispatch({ type: "FINISH_SPEAKING" });
    }
  }, [state.status]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && state.status !== "listening" && !isProcessingRef.current) {
      dispatch({ type: "START_LISTENING" });
      try {
        recognitionRef.current.start();
      } catch (e) {
        // Already started, which is fine
      }
    }
  }, [state.status]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && state.status === "listening") {
        try {
            recognitionRef.current.stop();
        } catch (e) {
            // Already stopped
        }
    }
  }, [state.status]);


  const processAndRespond = useCallback(async (transcript: string) => {
    if (!transcript.trim() || isProcessingRef.current) {
      dispatch({ type: "ERROR" }); // Go back to idle
      return;
    }
    
    isProcessingRef.current = true;
    const userMessage: Message = { role: "user", content: transcript };
    dispatch({ type: "START_THINKING", userMessage });

    try {
      const questionResult = await askQuestion({
        reportSummary,
        question: transcript,
        chatHistory: state.chatHistory,
      });

      const botMessage: Message = { role: "bot", content: questionResult.answer };
      // This action adds the message and sets status to 'speaking' or 'muted'
      dispatch({ type: "BOT_RESPONSE", botMessage });

      // If we are not muted, proceed to speak the response.
      if (state.status !== 'muted') {
        const ttsResult = await textToSpeech({ text: questionResult.answer });
        if (ttsResult.audioDataUri && audioRef.current) {
          audioRef.current.src = ttsResult.audioDataUri;
          await audioRef.current.play().catch(e => {
               console.error("Audio playback failed:", e);
               dispatch({ type: "ERROR" });
          });
        } else {
          // If TTS fails (e.g., rate limit), we still "finish" speaking to transition state.
          dispatch({ type: "FINISH_SPEAKING" });
        }
      }
    } catch (error) {
      console.error("AI interaction failed:", error);
      toast({
        title: "Error",
        description: "Could not get a response from the AI.",
        variant: "destructive",
      });
      dispatch({ type: "ERROR" });
    } finally {
        isProcessingRef.current = false;
        // If we were muted, the bot responds silently, then we immediately go idle.
        if(state.status === 'muted') {
            dispatch({ type: "FINISH_SPEAKING" });
        }
    }
  }, [reportSummary, state.chatHistory, state.status, toast]);

  
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
    recognitionRef.current.continuous = false; // Process after each utterance
    recognitionRef.current.interimResults = true;

    recognitionRef.current.onresult = (event) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
          finalTranscriptRef.current = finalTranscript;
          // Stop listening as soon as we have a final result
          stopListening();
      } else if (state.status === 'speaking') {
          // Barge-in: User started speaking while bot was talking
          stopSpeaking();
      }
    };
    
    recognitionRef.current.onend = () => {
        dispatch({ type: "STOP_LISTENING" });
        if (finalTranscriptRef.current) {
            processAndRespond(finalTranscriptRef.current);
            finalTranscriptRef.current = "";
        }
    };
    
    recognitionRef.current.onerror = (event) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted' && event.error !== 'network') {
            console.error("Speech recognition error:", event.error);
        }
    };
    
    audioRef.current = new Audio();
    audioRef.current.onended = () => dispatch({ type: "FINISH_SPEAKING" });

    // Initial start
    startListening();

    return () => {
      recognitionRef.current?.abort();
      if(audioRef.current) {
          audioRef.current.pause();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount


  // Effect to automatically start listening when idle
  useEffect(() => {
    if (state.status === "idle" && !isProcessingRef.current) {
        startListening();
    }
  }, [state.status, startListening])


  // --- User Actions ---
  const handleMuteToggle = () => {
    if (state.status === "muted") {
        dispatch({ type: "UNMUTE" });
    } else {
        stopSpeaking();
        stopListening();
        dispatch({ type: "MUTE" });
    }
  };

  const handleStopListening = () => {
    // This button directly triggers the recognition to stop, which then calls `onend`.
    stopListening();
  };

  const handleClose = () => {
    stopSpeaking();
    stopListening();
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

    