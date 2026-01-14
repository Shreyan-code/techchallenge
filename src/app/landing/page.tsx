'use client';

import { Button } from "@/components/ui/button";
import { PawPrint } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
    return (
        <div className="w-full max-w-4xl mx-auto text-center py-16">
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

            <div className="mt-16 relative aspect-[16/9] w-full rounded-xl overflow-hidden shadow-2xl">
                 <Image
                    src="https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwzfHxkb2dzJTIwYW5kJTIwY2F0cyUyMHBsYXlpbmd8ZW58MHx8fHwxNzY4MzEwMjcxfDA&ixlib=rb-4.1.0&q=80&w=1080"
                    alt="Happy pets"
                    fill
                    className="object-cover"
                    data-ai-hint="happy pets"
                    priority
                />
            </div>
        </div>
    )
}
