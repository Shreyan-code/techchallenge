'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, PawPrint, Users, Calendar, Lightbulb } from 'lucide-react';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function LandingPage() {
    return (
        <div className="w-full max-w-5xl mx-auto text-center py-16 px-4">
             <div className="flex justify-center mb-6">
                <PawPrint className="w-16 h-16 text-primary" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold font-headline mb-4">
                Welcome to PetConnect
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                The social network for pet owners. Share moments, connect with others, and celebrate your furry, feathery, or scaly friends.
            </p>
            <div className="flex justify-center gap-4">
                <Button size="lg" asChild>
                    <Link href="/signup">Get Started</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                    <Link href="/login">Login</Link>
                </Button>
            </div>

            <div className="mt-20 text-left">
                <h2 className="text-3xl font-bold font-headline text-center mb-10">What You'll Find Inside</h2>
                <div className="grid md:grid-cols-3 gap-8">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-center mb-4">
                                <Users className="w-12 h-12 text-accent" />
                            </div>
                            <CardTitle className="text-center font-headline">Community Feed</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="aspect-video relative rounded-md overflow-hidden mb-4">
                                 <Image src="https://images.unsplash.com/photo-1505628346881-b72b27e84530?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw0fHxkb2clMjBoaWtpbmd8ZW58MHx8fHwxNzY4MzA0MDUyfDA&ixlib=rb-4.1.0&q=80&w=1080" alt="Dog on a walk" layout="fill" objectFit="cover" data-ai-hint="dog walk" />
                            </div>
                            <p className="text-sm text-muted-foreground">Share photos and updates about your pets, see what others are up to, and connect with fellow pet lovers.</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                             <div className="flex justify-center mb-4">
                                <Calendar className="w-12 h-12 text-accent" />
                            </div>
                            <CardTitle className="text-center font-headline">Local Events</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <div className="aspect-video relative rounded-md overflow-hidden mb-4">
                                <Image src="https://images.unsplash.com/photo-1541364983171-a8ba01e95cfc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxkb2dzJTIwZWF0aW5nJTIwaWNlJTIwY3JlYW18ZW58MHx8fHwxNzY4MzA0MDU0fDA&ixlib=rb-4.1.0&q=80&w=1080" alt="Dogs at a park" layout="fill" objectFit="cover" data-ai-hint="dogs park" />
                            </div>
                            <p className="text-sm text-muted-foreground">Find or create local pet meetups, park playdates, and other community events for you and your companion.</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                             <div className="flex justify-center mb-4">
                                <Lightbulb className="w-12 h-12 text-accent" />
                            </div>
                            <CardTitle className="text-center font-headline">Tips & Advice</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <div className="aspect-video relative rounded-md overflow-hidden mb-4">
                                <Image src="https://images.unsplash.com/photo-1592652426689-4e4f12c4aef5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwzfHxzaWFtZXNlJTIwY2F0fGVufDB8fHx8MTc2ODIwNzEyOXww&ixlib=rb-4.1.0&q=80&w=1080" alt="Cat looking at camera" layout="fill" objectFit="cover" data-ai-hint="curious cat" />
                            </div>
                            <p className="text-sm text-muted-foreground">Ask questions and share your own wisdom on everything from training and nutrition to the best pet-friendly spots.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

export default function HomePage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && user) {
      router.replace('/feed');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
      return <LandingPage />;
  }

  return (
     <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
