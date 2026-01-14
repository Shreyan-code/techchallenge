'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Siren } from 'lucide-react';
import Image from 'next/image';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

const alertSchema = z.object({
  lastSeenLocation: z.string().optional(),
});

type AlertFormValues = z.infer<typeof alertSchema>;

export function LostPetAlertDialog({ pet, children, disabled }: { pet: any, children: React.ReactNode, disabled?: boolean }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AlertFormValues>({
    resolver: zodResolver(alertSchema),
    defaultValues: { lastSeenLocation: '' },
  });

  const onSubmit = async (data: AlertFormValues) => {
    if (!user) return;
    setIsSubmitting(true);
    
    try {
      const alertsCol = collection(firestore, 'lostPetAlerts');
      addDocumentNonBlocking(alertsCol, {
        petId: pet.id,
        ownerId: user.uid,
        petName: pet.name,
        petImageUrl: pet.imageUrl,
        lastSeenLocation: data.lastSeenLocation || '',
        createdAt: serverTimestamp(),
        status: 'active',
      });
      
      toast({
        title: 'Alert Sent!',
        description: `The community has been notified that ${pet.name} is missing.`,
      });
      setIsOpen(false);
    } catch (error) {
      console.error('Error sending alert:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not send the alert. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const dialogTrigger = (
    <DialogTrigger asChild disabled={disabled}>
      {children}
    </DialogTrigger>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {disabled ? (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>{dialogTrigger}</TooltipTrigger>
                <TooltipContent>
                    <p>Please add your City and State to your profile to send alerts.</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
      ) : (
        dialogTrigger
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report {pet.name} as Lost</DialogTitle>
          <DialogDescription>
            This will send an alert to the entire community. Only use this in an emergency.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-4 py-4">
          <Image src={pet.imageUrl} alt={pet.name} width={80} height={80} className="rounded-md object-cover" />
          <div>
            <p className="font-bold">{pet.name}</p>
            <p className="text-sm text-muted-foreground">{pet.breed}</p>
          </div>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="lastSeenLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Seen Location (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Near Central Park" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Siren className="mr-2 h-4 w-4" />
                    Confirm and Send Alert
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    