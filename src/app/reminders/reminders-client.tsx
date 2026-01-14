'use client';

import { useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, isPast, isToday, addDays, addWeeks, addMonths, getDay, setDay, startOfDay } from 'date-fns';
import {
  useCollection,
  useFirestore,
  useUser,
  useMemoFirebase,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase';
import { collection, query, orderBy, doc, Timestamp } from 'firebase/firestore';
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
import {
  Loader2,
  PlusCircle,
  Trash2,
  CheckCircle2,
  Circle,
  Repeat,
} from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';


const reminderSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  notes: z.string().optional(),
  date: z.coerce.date({ required_error: 'A date is required.' }),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Please enter a valid time in HH:MM format."),
  recurrence: z.object({
    frequency: z.enum(['once', 'daily', 'weekly', 'monthly']),
    dayOfWeek: z.array(z.string()).optional(),
  })
});

type ReminderFormValues = z.infer<typeof reminderSchema>;

const daysOfWeek = [
  { value: 'SU', label: 'S', dayIndex: 0 },
  { value: 'MO', label: 'M', dayIndex: 1 },
  { value: 'TU', label: 'T', dayIndex: 2 },
  { value: 'WE', label: 'W', dayIndex: 3 },
  { value: 'TH', label: 'T', dayIndex: 4 },
  { value: 'FR', label: 'F', dayIndex: 5 },
  { value: 'SA', label: 'S', dayIndex: 6 },
];

export function RemindersClient() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const remindersQuery = useMemoFirebase(
    () => user ? query(collection(firestore, 'reminders')) : null,
    [firestore, user]
  );
  const { data: allReminders, isLoading } = useCollection(remindersQuery);
  
  const reminders = useMemo(() => {
    if (!allReminders || !user) return [];
    return allReminders.filter(r => r.userId === user.uid);
  }, [allReminders, user]);


  const form = useForm<ReminderFormValues>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      title: '',
      notes: '',
      time: '09:00',
      recurrence: { frequency: 'once', dayOfWeek: [] },
    },
  });

  const frequency = form.watch('recurrence.frequency');

  const onSubmit = async (data: ReminderFormValues) => {
    if (!user) return;
    if (data.recurrence.frequency === 'weekly' && (!data.recurrence.dayOfWeek || data.recurrence.dayOfWeek.length === 0)) {
        form.setError('recurrence.dayOfWeek', { type: 'manual', message: 'Please select at least one day for weekly reminders.' });
        return;
    }

    setIsSubmitting(true);
    
    const [hours, minutes] = data.time.split(':').map(Number);
    const combinedDateTime = new Date(data.date);
    combinedDateTime.setHours(hours, minutes, 0, 0);

    const remindersCol = collection(firestore, 'reminders');
    addDocumentNonBlocking(remindersCol, {
      userId: user.uid,
      title: data.title,
      notes: data.notes || '',
      dateTime: Timestamp.fromDate(combinedDateTime),
      completed: false,
      recurrence: data.recurrence,
    });
    
    toast({ title: 'Reminder Set!', description: `We'll help you remember to ${data.title}.` });
    form.reset({
      title: '',
      notes: '',
      time: '09:00',
      recurrence: { frequency: 'once', dayOfWeek: [] },
    });
    setIsSubmitting(false);
  };
  
  const toggleComplete = (reminder: any) => {
    if (!user) return;
  
    const reminderRef = doc(firestore, 'reminders', reminder.id);
  
    // If it's a recurring reminder and we're marking it complete
    if (reminder.recurrence?.frequency !== 'once' && !reminder.completed) {
      const currentDateTime = reminder.dateTime.toDate();
      let nextDateTime: Date | null = null;
  
      switch (reminder.recurrence.frequency) {
        case 'daily':
          nextDateTime = addDays(currentDateTime, 1);
          break;
        case 'weekly':
          const selectedDays = reminder.recurrence.dayOfWeek
            .map((dayValue: string) => daysOfWeek.find(d => d.value === dayValue)?.dayIndex)
            .filter((d: number | undefined) => d !== undefined)
            .sort();
            
          if (selectedDays.length > 0) {
              const currentDay = getDay(currentDateTime);
              let nextDayIndex = -1;

              // Find the next scheduled day in the week
              for(const day of selectedDays) {
                  if (day > currentDay) {
                      nextDayIndex = day;
                      break;
                  }
              }
              
              if (nextDayIndex !== -1) {
                  // Next occurrence is in the same week
                  nextDateTime = setDay(currentDateTime, nextDayIndex, { weekStartsOn: 0 });
              } else {
                  // Next occurrence is in the next week (wrap around)
                  nextDateTime = setDay(addWeeks(currentDateTime, 1), selectedDays[0], { weekStartsOn: 0 });
              }
          }
          break;
        case 'monthly':
          nextDateTime = addMonths(currentDateTime, 1);
          break;
      }
  
      if (nextDateTime) {
        // Create the next reminder instance
        const remindersCol = collection(firestore, 'reminders');
        addDocumentNonBlocking(remindersCol, {
          ...reminder,
          id: undefined, // Let firestore generate a new ID
          dateTime: Timestamp.fromDate(nextDateTime),
          completed: false, // The new one is not completed
        });
      }
  
      // Mark the current one as complete and make it non-recurring
      updateDocumentNonBlocking(reminderRef, { 
        completed: true,
        recurrence: { ...reminder.recurrence, frequency: 'once' } 
      });
  
    } else {
      // For non-recurring reminders or un-completing any reminder
      updateDocumentNonBlocking(reminderRef, { completed: !reminder.completed });
    }
  };
  
  const deleteReminder = (reminderId: string) => {
    const reminderRef = doc(firestore, 'reminders', reminderId);
    deleteDocumentNonBlocking(reminderRef);
    toast({ title: 'Reminder Removed' });
  };

  const sortedReminders = useMemo(() => {
    if (!reminders) return [];
    return [...reminders].sort((a, b) => a.dateTime.seconds - b.dateTime.seconds);
  }, [reminders]);

  const upcomingReminders = useMemo(() => sortedReminders.filter(r => !r.completed) || [], [sortedReminders]);
  const completedReminders = useMemo(() => sortedReminders.filter(r => r.completed) || [], [sortedReminders]);


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline mb-2">My Reminders</h1>
        <p className="text-muted-foreground">
          Stay on top of your pet's needs. Never miss a thing.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Reminder</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Give flea medication" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., With food, in the morning" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                 <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                         <Input 
                            type="date" 
                            {...field}
                            value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value || ''}
                            />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="space-y-2">
                 <FormField
                  control={form.control}
                  name="recurrence.frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Repeats</FormLabel>
                       <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="once">Once</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {frequency === 'weekly' && (
                    <FormField
                      control={form.control}
                      name="recurrence.dayOfWeek"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>On</FormLabel>
                          <FormControl>
                            <ToggleGroup
                              type="multiple"
                              variant="outline"
                              value={field.value}
                              onValueChange={field.onChange}
                              className="justify-start gap-1"
                            >
                              {daysOfWeek.map(day => (
                                <ToggleGroupItem key={day.value} value={day.value} className="w-9 h-9">
                                  {day.label}
                                </ToggleGroupItem>
                              ))}
                            </ToggleGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                )}
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Setting...</>
                  ) : (
                    <><PlusCircle className="mr-2 h-4 w-4"/> Set Reminder</>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold font-headline mb-4">Upcoming</h2>
           {isLoading && <Loader2 className="animate-spin" />}
           {!isLoading && upcomingReminders.length === 0 && <p className="text-muted-foreground">No upcoming reminders.</p>}
          <div className="space-y-3">
            {upcomingReminders.map(reminder => (
                <ReminderItem key={reminder.id} reminder={reminder} onToggle={toggleComplete} onDelete={deleteReminder}/>
            ))}
          </div>
        </div>

        {completedReminders.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold font-headline mb-4">Completed</h2>
            <div className="space-y-3">
              {completedReminders.map(reminder => (
                  <ReminderItem key={reminder.id} reminder={reminder} onToggle={toggleComplete} onDelete={deleteReminder}/>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

function formatRecurrence(recurrence: ReminderFormValues['recurrence']) {
    if (!recurrence || recurrence.frequency === 'once') return null;

    const base = `Repeats ${recurrence.frequency}`;
    if (recurrence.frequency === 'weekly' && recurrence.dayOfWeek && recurrence.dayOfWeek.length > 0) {
        const sortedDays = recurrence.dayOfWeek
            .map(dayValue => daysOfWeek.find(d => d.value === dayValue)?.label || '')
            .filter(Boolean)
            .join(', ');
        return `${base} on ${sortedDays}`;
    }
    return base;
}


function ReminderItem({ reminder, onToggle, onDelete }: { reminder: any, onToggle: (r: any) => void, onDelete: (id: string) => void}) {
    const dateTime = reminder.dateTime.toDate();
    const isOverdue = !reminder.completed && isPast(dateTime);
    const recurrenceText = formatRecurrence(reminder.recurrence);
    
    return (
        <div className={cn(
            "flex items-start gap-4 p-4 border rounded-lg transition-colors",
            reminder.completed ? "bg-muted/50" : "bg-card",
            isOverdue && "border-destructive/50"
        )}>
           <button onClick={() => onToggle(reminder)} className="mt-1">
             {reminder.completed ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
           </button>
           <div className="flex-1">
                <p className={cn("font-medium", reminder.completed && "line-through text-muted-foreground")}>
                    {reminder.title}
                </p>
                <div className={cn("text-sm", reminder.completed ? "text-muted-foreground/80" : "text-muted-foreground")}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={cn(isOverdue && "text-destructive font-semibold")}>
                          {isToday(dateTime) ? `Today at ${format(dateTime, 'p')}` : format(dateTime, 'MMM d, yyyy @ p')}
                      </p>
                      {recurrenceText && (
                        <div className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted capitalize">
                          <Repeat className="h-3 w-3" />
                          <span>{recurrenceText}</span>
                        </div>
                      )}
                    </div>
                    {reminder.notes && <p className="mt-1">{reminder.notes}</p>}
                </div>
           </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                 <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <Trash2 className="h-4 w-4"/>
                 </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the reminder for "{reminder.title}".
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(reminder.id)}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
