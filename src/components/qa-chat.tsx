
"use client";

import { useState, useRef, useEffect } from 'react';
import { Bot, User, Send, Loader2, MessagesSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { askQuestion, type InteractiveQAndAInput } from '@/ai/flows/enable-interactive-q-and-a';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

type Message = {
  role: 'user' | 'bot';
  content: string;
};

type QAChatProps = {
  reportSummary: string;
};

const BotMessageContent = ({ content }: { content: string }) => {
    const renderLine = (line: string) => {
        // Handle bolding with **text**
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
        <div className="text-sm whitespace-pre-line">
            {lines.map((line, index) => {
                const trimmedLine = line.trim();
                // Check for bullet points (*, -, or numbers like 1.)
                if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
                    return (
                        <div key={index} className="flex items-start">
                            <span className="mr-2">&#8226;</span>
                            <span className="flex-1">{renderLine(trimmedLine.substring(2))}</span>
                        </div>
                    );
                }
                 if (/^\d+\.\s/.test(trimmedLine)) {
                     const match = trimmedLine.match(/^(\d+\.)\s(.*)/);
                     if (match) {
                        return (
                            <div key={index} className="flex items-start">
                                <span className="mr-2">{match[1]}</span>
                                <span className="flex-1">{renderLine(match[2])}</span>
                            </div>
                        );
                     }
                }
                return <div key={index}>{renderLine(line)}</div>;
            })}
        </div>
    );
};

export function QAChat({ reportSummary }: QAChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const previousMessages = messages;
    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    
    setMessages(newMessages);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const chatHistoryForAI: InteractiveQAndAInput['chatHistory'] = previousMessages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'bot',
        content: msg.content,
      }));

      const result = await askQuestion({
        reportSummary,
        question: currentInput,
        chatHistory: chatHistoryForAI,
      });

      const botMessage: Message = { role: 'bot', content: result.answer };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Q&A Error:", error);
      toast({
        title: "Error",
        description: "Failed to get an answer. Please try again.",
        variant: "destructive",
      });
      setMessages(previousMessages);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="h-full flex flex-col max-h-[80vh]">
      <CardHeader>
        <CardTitle className="font-headline text-xl text-primary flex items-center gap-2"><MessagesSquare />Interactive Q&A</CardTitle>
        <CardDescription>Ask questions about the report summary or general medical topics.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col gap-4 overflow-hidden">
        <ScrollArea className="flex-grow h-[400px] pr-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.length === 0 ? (
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
            placeholder="e.g., What does 'hemoglobin' mean?"
            disabled={isLoading}
            autoComplete="off"
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
