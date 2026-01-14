'use client';

import { useState, type ReactNode, useEffect } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useFirestore, updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { doc, collection, arrayUnion } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, X } from 'lucide-react';

const petSchema = z.object({
  name: z.string().min(1, 'Pet name is required'),
  breed: z.string().min(1, 'Pet breed is required'),
  age: z.string().min(1, 'Pet age is required'),
  bio: z.string().max(200, 'Bio must be 200 characters or less').optional(),
  imageUrl: z.string().optional(),
  vaccinations: z.array(z.any()).optional(),
  medicalNotes: z.array(z.any()).optional(),
});

type PetFormValues = z.infer<typeof petSchema>;

interface PetDialogProps {
  pet?: PetFormValues & { id: string };
  children: ReactNode;
}

const fileToDataUri = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export function PetDialog({ pet, children }: PetDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);


  const form = useForm<PetFormValues>({
    resolver: zodResolver(petSchema),
    defaultValues: pet || { name: '', breed: '', age: '', bio: '', imageUrl: '', vaccinations: [], medicalNotes: [] },
  });
  
  useEffect(() => {
    if (isOpen) {
      form.reset(pet || { name: '', breed: '', age: '', bio: '', imageUrl: '', vaccinations: [], medicalNotes: [] });
      setImagePreview(pet?.imageUrl || null);
    }
  }, [isOpen, pet, form]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const dataUri = await fileToDataUri(file);
        setImagePreview(dataUri);
        form.setValue('imageUrl', dataUri);
      } catch (error) {
        console.error("Error setting image:", error);
        toast({ variant: 'destructive', title: 'Could not upload image.' });
      }
    }
  };
  
  const removePetImage = () => {
      setImagePreview(null);
      form.setValue('imageUrl', '');
  }


  const onSubmit = async (data: PetFormValues) => {
    if (!user) return;
    setIsSubmitting(true);

    try {
      const finalData = {
        ...data,
        imageUrl: form.getValues('imageUrl') || (pet ? '' : `https://picsum.photos/seed/${crypto.randomUUID()}/200`),
        vaccinations: data.vaccinations || [],
        medicalNotes: data.medicalNotes || [],
      };

      if (pet) {
        // Update existing pet
        const petRef = doc(firestore, 'pets', pet.id);
        updateDocumentNonBlocking(petRef, finalData);
        toast({ title: 'Pet Updated!', description: `${data.name}'s profile has been updated.` });
      } else {
        // Add new pet
        const petRef = doc(collection(firestore, 'pets'));
        const newPet = { ...finalData, id: petRef.id, ownerId: user.uid };
        setDocumentNonBlocking(petRef, newPet, {});

        // Update user's petIds
        const userRef = doc(firestore, 'users', user.uid);
        updateDocumentNonBlocking(userRef, {
            petIds: arrayUnion(petRef.id)
        });

        toast({ title: 'Pet Added!', description: `${data.name} has joined your family.` });
      }
      setIsOpen(false);
    } catch (error) {
      console.error('Error saving pet:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not save pet details.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{pet ? 'Edit Pet' : 'Add a New Pet'}</DialogTitle>
          <DialogDescription>
            {pet ? `Update the details for ${pet.name}.` : 'Enter the details for your new companion.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Buddy" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <div className="grid grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="breed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Breed</FormLabel>
                    <FormControl>
                      <Input placeholder="Golden Retriever" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Age</FormLabel>
                    <FormControl>
                      <Input placeholder="2 years" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Loves long walks..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormItem>
              <FormLabel>Photo</FormLabel>
              {imagePreview ? (
                <div className="relative group w-full aspect-video border-2 border-dashed rounded-lg flex items-center justify-center">
                    <Image
                        src={imagePreview}
                        alt="Pet preview"
                        fill
                        className="object-contain rounded-md"
                    />
                    <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        onClick={removePetImage}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
              ) : (
                <label
                    htmlFor="pet-image"
                    className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-3 text-muted-foreground" />
                    <p className="mb-2 text-sm text-muted-foreground">
                        <span className="font-semibold">Upload an image</span>
                    </p>
                    </div>
                      <FormControl>
                        <Input
                            id="pet-image"
                            type="file"
                            className="hidden"
                            accept="image/png, image/jpeg, image/webp"
                            onChange={handleFileChange}
                        />
                      </FormControl>
                </label>
              )}
            </FormItem>

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
