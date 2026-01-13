'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const adviceSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(150, 'Title must be 150 characters or less'),
  content: z.string().min(20, 'Content must be at least 20 characters'),
});

type AdviceFormValues = z.infer<typeof adviceSchema>;

export default function CreateAdvicePage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AdviceFormValues>({
    resolver: zodResolver(adviceSchema),
    defaultValues: {
      title: '',
      content: '',
    },
  });

  const onSubmit = async (data: AdviceFormValues) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to share a tip.',
      });
      return;
    }
    setIsSubmitting(true);

    try {
      const adviceCol = collection(firestore, 'advicePosts');
      addDocumentNonBlocking(adviceCol, {
        authorId: user.uid,
        title: data.title,
        content: data.content,
        createdAt: serverTimestamp(),
        upvotes: [],
        downvotes: [],
        commentCount: 0,
      });

      toast({
        title: 'Tip Shared!',
        description: 'Your advice is now live for the community to see.',
      });
      router.push('/tips');
    } catch (error) {
      console.error('Error creating advice post:', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'Could not share your tip. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold font-headline mb-2">Share a Tip or Ask a Question</h1>
      <p className="text-muted-foreground mb-6">
        Contribute to the community's knowledge base.
      </p>

      <Card>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title / Question</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., How do I stop my dog from chewing furniture?" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Details</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Provide more details, what you've tried, and any other relevant information."
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end">
                <Button type="submit" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    'Post Tip'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
