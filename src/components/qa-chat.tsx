
"use client";

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Bot, User, Send, Loader2, Mic, MicOff, MessagesSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { askQuestion, type InteractiveQAndAInput, type ChatMessage } from '@/ai/flows/enable-interactive-q-and-a';
import { textToSpeech } from '@/ai/flows/text-to-speech';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { doctorAvatar } from '@/lib/placeholder-images';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

type Message = {
  role: 'user' | 'bot';
  content: string;
};

type QAChatProps = {
  reportSummary: string;
};

const BotMessageContent = ({ content }: { content: string }) => {
    const renderLine = (line: string) => {
        const parts = line.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index}>{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    const lines = content.split('\n');

    return (
        <div className="text-sm space-y-2">
            {lines.map((line, index) => {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
                    return (
                        <div key={index} className="flex items-start">
                            <span className="mr-2 mt-1">&#8226;</span>
                            <span className="flex-1">{renderLine(trimmedLine.substring(2))}</span>
                        </div>
                    );
                }
                 if (/^\d+\.\s/.test(trimmedLine)) {
                     const match = trimmedLine.match(/^(\d+\.)\s(.*)/);
                     if (match) {
                        return (
                            <div key={index} className="flex items-start">
                                <span className="mr-2 mt-1">{match[1]}</span>
                                <span className="flex-1">{renderLine(match[2])}</span>
                            </div>
                        );
                     }
                }
                // Render lines that are just disclaimers or simple text
                if (trimmedLine.length > 0) {
                  return <div key={index}>{renderLine(line)}</div>;
                }
                return null;
            })}
        </div>
    );
};

export function QAChat({ reportSummary }: QAChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAvatarMode, setIsAvatarMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Voice Input State
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // Check for browser support on component mount
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        // Automatically send the message after successful transcription
        handleSendMessage(new Event('submit'), transcript);
      };
      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        toast({ title: "Voice Error", description: "Could not recognize speech. Please try again.", variant: "destructive" });
        setIsListening(false);
      };
      recognition.onend = () => {
        setIsListening(false);
      };
      recognitionRef.current = recognition;
    }
  }, [toast]);


  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages, isLoading]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleSendMessage = async (e: React.FormEvent | Event, messageContent?: string) => {
    e.preventDefault();
    const currentInput = (messageContent || input).trim();
    if (!currentInput || isLoading) return;

    const userMessage: Message = { role: 'user', content: currentInput };
    const newMessages = [...messages, userMessage];
    
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const chatHistoryForAI: ChatMessage[] = newMessages
        .filter(msg => msg.role === 'bot' || msg.role === 'user')
        .map(msg => ({
            role: msg.role,
            content: msg.content,
        }));

      const result = await askQuestion({
        reportSummary,
        question: currentInput,
        chatHistory: chatHistoryForAI,
      });

      const botMessage: Message = { role: 'bot', content: result.answer };
      setMessages((prev) => [...prev, botMessage]);

      if (isAvatarMode) {
        setIsSpeaking(true);
        try {
          const speechResult = await textToSpeech({ text: result.answer });
          if (!audioRef.current) {
            audioRef.current = new Audio();
            audioRef.current.onended = () => setIsSpeaking(false);
          }
          audioRef.current.src = speechResult.audioDataUri;
          audioRef.current.play();
        } catch (speechError) {
          console.error("TTS Error:", speechError);
          toast({ title: "Audio Error", description: "Could not generate audio for the response.", variant: "destructive" });
          setIsSpeaking(false);
        }
      }

    } catch (error) {
      console.error("Q&A Error:", error);
      toast({
        title: "Error",
        description: "Failed to get an answer. Please try again.",
        variant: "destructive",
      });
      // Revert to messages before the user's message was added
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAvatarMode = (checked: boolean) => {
    setIsAvatarMode(checked);
    if (!checked && audioRef.current) {
      audioRef.current.pause();
      setIsSpeaking(false);
    }
  }

  const handleMicClick = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  return (
    <Card className="h-full flex flex-col max-h-[80vh]">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                 <CardTitle className="font-headline text-xl text-primary flex items-center gap-2"><MessagesSquare />Interactive Q&A</CardTitle>
                 <CardDescription>Ask questions about the report summary or general medical topics.</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
                <Switch id="avatar-mode" checked={isAvatarMode} onCheckedChange={handleToggleAvatarMode} />
                <Label htmlFor="avatar-mode">Talking Avatar</Label>
            </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col gap-4 overflow-hidden">
        {isAvatarMode && (
            <div className="relative h-48 w-48 mx-auto mb-4 rounded-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-background">
                <Image 
                  src={doctorAvatar.imageUrl} 
                  alt="Doctor Avatar" 
                  width={180} 
                  height={180} 
                  className={`object-contain transition-transform duration-300 ${isSpeaking ? 'scale-105' : 'scale-100'}`} 
                  data-ai-hint={doctorAvatar.imageHint}
                  priority
                />
                 <div className={`absolute inset-0 rounded-full border-4 border-primary transition-all duration-300 ${isSpeaking ? 'animate-pulse' : 'border-transparent'}`}></div>
            </div>
        )}
        <ScrollArea className="flex-grow h-[400px] pr-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.length === 0 && !isAvatarMode ? (
                 <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                    <Bot className="w-12 h-12 mb-4" />
                    <p className="font-semibold">No questions asked yet.</p>
                    <p className="text-sm">Start the conversation by typing below!</p>
                </div>
            ) : messages.map((message, index) => (
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
                  className={`max-w-[75%] rounded-lg px-4 py-2 shadow-sm ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card-foreground/5'
                  }`}
                >
                   {message.role === 'bot' ? (
                        <BotMessageContent content={message.content} />
                    ) : (
                        <p className="text-sm whitespace-pre-line">{message.content}</p>
                    )}
                </div>
                 {message.role === 'user' && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback><User className="h-5 w-5"/></AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
             {isLoading && (
              <div className="flex items-start gap-3">
                 <Avatar className="h-8 w-8">
                    <AvatarFallback className='bg-primary text-primary-foreground'><Bot className="h-5 w-5"/></AvatarFallback>
                  </Avatar>
                <div className="bg-card-foreground/5 rounded-lg px-4 py-3 flex items-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground"/>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter>
        <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type or click the mic to talk..."
            disabled={isLoading || isListening}
            autoComplete="off"
          />
           <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button type="button" size="icon" variant="outline" onClick={handleMicClick} disabled={!speechSupported || isLoading}>
                           {isListening ? <Mic className="h-4 w-4 text-red-500 animate-pulse" /> : <Mic className="h-4 w-4" />}
                            <span className="sr-only">Use microphone</span>
                        </Button>
                    </TooltipTrigger>
                    {!speechSupported && <TooltipContent>Voice input is not supported in your browser.</TooltipContent>}
                </Tooltip>
            </TooltipProvider>

          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
