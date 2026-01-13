'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { useUser } from '@/firebase';
import { getInstantAdvice } from '@/ai/flows/instant-advice-flow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Send, BrainCircuit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDoc, useMemoFirebase } from '@/firebase';
import { doc, getFirestore } from 'firebase/firestore';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function AdviceClient() {
  const { user } = useUser();
  const firestore = getFirestore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isPending, startTransition] = useTransition();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const userProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile } = useDoc(userProfileRef);

  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    
    // Add a loading indicator message from the assistant
    const loadingMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "Thinking..."
    }
    setMessages((prev) => [...prev, loadingMessage]);

    startTransition(async () => {
        try {
            const advice = await getInstantAdvice({ userId: user.uid, question: input });
            const assistantMessage: Message = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: advice,
            };
            // Replace the loading message with the actual response
            setMessages((prev) => [...prev.slice(0, -1), assistantMessage]);
        } catch (error) {
            console.error('Error fetching advice:', error);
            const errorMessage: Message = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: "Sorry, I ran into an issue. Please try again.",
            };
            setMessages((prev) => [...prev.slice(0, -1), errorMessage]);
        }
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] border rounded-lg">
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-6">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground pt-10">
              <BrainCircuit className="mx-auto h-12 w-12" />
              <p className="mt-2">Ask me anything about your pets!</p>
               <p className="text-sm">e.g., "Why does my dog eat grass?" or "How can I train my cat?"</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex items-start gap-4',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {msg.role === 'assistant' && (
                  <Avatar className="h-8 w-8 border">
                    <AvatarFallback><BrainCircuit className="h-4 w-4"/></AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    'max-w-lg rounded-lg px-4 py-2',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  {msg.content === "Thinking..." ? (
                      <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin"/>
                          <span>Thinking...</span>
                      </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
                 {msg.role === 'user' && (
                  <Avatar className="h-8 w-8">
                     <AvatarImage src={userProfile?.profilePicture || user?.photoURL || undefined} alt="You" />
                     <AvatarFallback>{userProfile?.userName?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
      <div className="p-4 border-t bg-background">
        <form className="relative" onSubmit={handleSubmit}>
          <Input
            placeholder="Ask for pet advice..."
            className="pr-12"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isPending}
          />
          <Button
            type="submit"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
            disabled={!input.trim() || isPending}
          >
            {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin"/>
            ) : (
                <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
