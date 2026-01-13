'use client';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy, addDoc, serverTimestamp, doc, updateDoc, getDocs, writeBatch, limit } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { SendHorizonal, Search, Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

function ConversationList({ onSelectConversation, activeConversationId }: { onSelectConversation: (id: string) => void, activeConversationId: string | null }) {
  const { user } = useUser();
  const firestore = useFirestore();

  const conversationsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, 'conversations'),
      where('participants', 'array-contains', user.uid),
      orderBy('lastMessageTimestamp', 'desc')
    );
  }, [user, firestore]);
  
  const { data: conversations, isLoading } = useCollection(conversationsQuery);


  const getOtherParticipant = (convo: any) => {
    if (!user) return null;
    return convo.participantDetails.find((p: any) => p.uid !== user.uid);
  }

  if (isLoading) {
    return <div className="p-4"><Loader2 className="animate-spin" /></div>;
  }
  
  if (!conversations || conversations.length === 0) {
    return <div className="p-4 text-center text-sm text-muted-foreground">No conversations yet.</div>
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-2">
        {conversations.map((convo) => {
          const otherParticipant = getOtherParticipant(convo);
          if (!otherParticipant) return null;
          
          return (
            <button
              key={convo.id}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-all hover:bg-accent',
                activeConversationId === convo.id && 'bg-accent'
              )}
              onClick={() => onSelectConversation(convo.id)}
            >
              <Avatar>
                <AvatarImage src={otherParticipant.profilePicture} alt={otherParticipant.userName} />
                <AvatarFallback>{otherParticipant.userName?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <div className="flex items-baseline justify-between">
                  <p className="font-semibold truncate">{otherParticipant.userName}</p>
                  <p className="text-xs text-muted-foreground">
                    {convo.lastMessageTimestamp ? new Date(convo.lastMessageTimestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {convo.lastMessage}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </ScrollArea>
  );
}

function ChatView({ conversationId, onConversationChange }: { conversationId: string | null, onConversationChange: (id: string | null) => void }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [newMessage, setNewMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const conversationRef = useMemoFirebase(() => conversationId ? doc(firestore, 'conversations', conversationId) : null, [conversationId, firestore]);
  const { data: conversation } = useDoc(conversationRef);

  const messagesQuery = useMemoFirebase(() => 
    conversationId ? query(
      collection(firestore, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'asc')
    ) : null
  , [conversationId, firestore]);

  const { data: messages, isLoading } = useCollection(messagesQuery);

  const otherParticipant = conversation?.participantDetails.find((p: any) => p.uid !== user?.uid);

  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !conversationId) return;

    const messagesCol = collection(firestore, 'conversations', conversationId, 'messages');
    await addDoc(messagesCol, {
      senderId: user.uid,
      content: newMessage,
      createdAt: serverTimestamp()
    });

    const convoDoc = doc(firestore, 'conversations', conversationId);
    await updateDoc(convoDoc, {
        lastMessage: newMessage,
        lastMessageTimestamp: serverTimestamp()
    });

    setNewMessage('');
  };
  
  if (!conversationId) {
    return <div className="flex h-full items-center justify-center text-muted-foreground">Select a conversation to start chatting.</div>
  }
  
  if (isLoading || !conversation) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin" /></div>
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b">
        <Avatar>
           <AvatarImage src={otherParticipant?.profilePicture} alt={otherParticipant?.userName} />
           <AvatarFallback>{otherParticipant?.userName?.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <h2 className="text-lg font-semibold font-headline">{otherParticipant?.userName}</h2>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages?.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex items-end gap-2',
                msg.senderId === user?.uid ? 'justify-end' : 'justify-start'
              )}
            >
              {msg.senderId !== user?.uid && (
                <Avatar className="h-8 w-8">
                   <AvatarImage src={otherParticipant?.profilePicture} alt={otherParticipant?.userName} />
                   <AvatarFallback>{otherParticipant?.userName?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  'max-w-xs lg:max-w-md rounded-lg px-4 py-2',
                  msg.senderId === user?.uid
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                <p className="text-sm">{msg.content}</p>
                 <p className="text-xs text-right mt-1 opacity-70">
                    {msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                  </p>
              </div>
               {msg.senderId === user?.uid && (
                <Avatar className="h-8 w-8">
                   <AvatarImage src={user?.photoURL || undefined} alt="You" />
                   <AvatarFallback>Y</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <form className="relative" onSubmit={handleSendMessage}>
          <Input
            placeholder="Type a message..."
            className="pr-12"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <Button
            type="submit"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
            disabled={!newMessage.trim()}
          >
            <SendHorizonal className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}


function MessagesPageContent() {
  const searchParams = useSearchParams();
  const conversationIdFromUrl = searchParams.get('conversationId');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(conversationIdFromUrl);
  
  useEffect(() => {
    setActiveConversationId(conversationIdFromUrl);
  }, [conversationIdFromUrl]);

  return (
    <div className="h-[calc(100vh-4rem-1px)] grid md:grid-cols-[300px_1fr] lg:grid-cols-[350px_1fr]">
      {/* Conversation List */}
      <div className="hidden md:flex flex-col border-r h-full">
        <div className="p-4 border-b">
          <h1 className="text-2xl font-bold font-headline">Messages</h1>
          <div className="relative mt-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search messages..." className="pl-8" />
          </div>
        </div>
        <ConversationList 
          onSelectConversation={setActiveConversationId}
          activeConversationId={activeConversationId}
        />
      </div>

      {/* Chat View */}
      <ChatView 
        conversationId={activeConversationId}
        onConversationChange={setActiveConversationId}
      />
    </div>
  );
}

export default function MessagesPage() {
  return (
    <React.Suspense fallback={<div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <MessagesPageContent />
    </React.Suspense>
  )
}
