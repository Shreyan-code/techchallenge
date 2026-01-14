'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc, arrayUnion, arrayRemove, Timestamp } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { PlusCircle, Trash2, Loader2, CalendarIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const vaccinationSchema = z.object({
  vaccine: z.string().min(1, 'Vaccine name is required'),
  date: z.coerce.date({ required_error: 'A date is required.' }),
  nextDueDate: z.coerce.date().optional(),
});

const medicalNoteSchema = z.object({
  note: z.string().min(1, 'Note content is required'),
  date: z.coerce.date({ required_error: 'A date is required.' }),
});

type VaccinationFormValues = z.infer<typeof vaccinationSchema>;
type MedicalNoteFormValues = z.infer<typeof medicalNoteSchema>;

export function MedicalRecordDialog({ pet, isOwner, children }: { pet: any; isOwner: boolean; children: React.ReactNode }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('vaccinations');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const vaccinationForm = useForm<VaccinationFormValues>({ resolver: zodResolver(vaccinationSchema) });
  const medicalNoteForm = useForm<MedicalNoteFormValues>({ resolver: zodResolver(medicalNoteSchema) });
  
  const onVaccinationSubmit = async (data: VaccinationFormValues) => {
    setIsSubmitting(true);
    const petRef = doc(firestore, 'pets', pet.id);
    const newVaccination = {
      ...data,
      date: Timestamp.fromDate(data.date),
      nextDueDate: data.nextDueDate ? Timestamp.fromDate(data.nextDueDate) : null,
    };
    try {
      updateDocumentNonBlocking(petRef, { vaccinations: arrayUnion(newVaccination) });
      toast({ title: 'Vaccination Added' });
      vaccinationForm.reset();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error adding vaccination' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onMedicalNoteSubmit = async (data: MedicalNoteFormValues) => {
    setIsSubmitting(true);
    const petRef = doc(firestore, 'pets', pet.id);
    const newNote = {
      ...data,
      date: Timestamp.fromDate(data.date),
    };
     try {
      updateDocumentNonBlocking(petRef, { medicalNotes: arrayUnion(newNote) });
      toast({ title: 'Medical Note Added' });
      medicalNoteForm.reset();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error adding note' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDeleteRecord = async (type: 'vaccinations' | 'medicalNotes', record: any) => {
      const petRef = doc(firestore, 'pets', pet.id);
      try {
        updateDocumentNonBlocking(petRef, { [type]: arrayRemove(record) });
        toast({ title: 'Record Removed' });
      } catch(e) {
        toast({ variant: 'destructive', title: 'Error removing record' });
      }
  }


  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Medical Records for {pet.name}</DialogTitle>
          <DialogDescription>View and manage vaccination history and medical notes.</DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="vaccinations">Vaccinations</TabsTrigger>
            <TabsTrigger value="notes">Medical Notes</TabsTrigger>
          </TabsList>
          
          <TabsContent value="vaccinations">
            {isOwner && (
              <Form {...vaccinationForm}>
                <form onSubmit={vaccinationForm.handleSubmit(onVaccinationSubmit)} className="space-y-4 p-4 border rounded-lg mb-4">
                  <h4 className="font-semibold">Add New Vaccination</h4>
                   <FormField control={vaccinationForm.control} name="vaccine" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vaccine Name</FormLabel>
                        <FormControl><Input placeholder="e.g., Rabies" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={vaccinationForm.control} name="date" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date Given</FormLabel>
                        <FormControl><Input type="date" {...field} value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value || ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                     <FormField control={vaccinationForm.control} name="nextDueDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Next Due Date (Optional)</FormLabel>
                        <FormControl><Input type="date" {...field} value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value || ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <PlusCircle />} Add
                  </Button>
                </form>
              </Form>
            )}
             <ScrollArea className="h-64">
                <div className="space-y-2 p-1">
                    {pet.vaccinations?.length > 0 ? (
                        pet.vaccinations.sort((a:any,b:any) => b.date.seconds - a.date.seconds).map((vax: any, index: number) => (
                           <div key={index} className="flex justify-between items-center p-2 border rounded-md">
                               <div>
                                   <p className="font-semibold">{vax.vaccine}</p>
                                   <p className="text-sm text-muted-foreground">
                                       Given: {format(vax.date.toDate(), 'PPP')}
                                       {vax.nextDueDate && ` | Due: ${format(vax.nextDueDate.toDate(), 'PPP')}`}
                                   </p>
                               </div>
                               {isOwner && <Button variant="ghost" size="icon" onClick={() => handleDeleteRecord('vaccinations', vax)}><Trash2 className="h-4 w-4"/></Button>}
                           </div>
                        ))
                    ) : <p className="text-center text-muted-foreground p-4">No vaccination records yet.</p>}
                </div>
             </ScrollArea>
          </TabsContent>

          <TabsContent value="notes">
            {isOwner && (
                <Form {...medicalNoteForm}>
                  <form onSubmit={medicalNoteForm.handleSubmit(onMedicalNoteSubmit)} className="space-y-4 p-4 border rounded-lg mb-4">
                    <h4 className="font-semibold">Add New Medical Note</h4>
                    <FormField control={medicalNoteForm.control} name="date" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl><Input type="date" {...field} value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value || ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                     )} />
                     <FormField control={medicalNoteForm.control} name="note" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Note</FormLabel>
                        <FormControl><Textarea placeholder="e.g., Annual checkup, all clear." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" disabled={isSubmitting}>
                       {isSubmitting ? <Loader2 className="animate-spin" /> : <PlusCircle />} Add
                    </Button>
                  </form>
                </Form>
            )}
             <ScrollArea className="h-64">
                <div className="space-y-2 p-1">
                    {pet.medicalNotes?.length > 0 ? (
                        pet.medicalNotes.sort((a:any,b:any) => b.date.seconds - a.date.seconds).map((note: any, index: number) => (
                           <div key={index} className="flex justify-between items-start p-2 border rounded-md">
                               <div className="flex-1">
                                   <p className="text-sm text-muted-foreground">{format(note.date.toDate(), 'PPP')}</p>
                                   <p>{note.note}</p>
                               </div>
                               {isOwner && <Button variant="ghost" size="icon" onClick={() => handleDeleteRecord('medicalNotes', note)}><Trash2 className="h-4 w-4"/></Button>}
                           </div>
                        ))
                    ) : <p className="text-center text-muted-foreground p-4">No medical notes yet.</p>}
                </div>
             </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
