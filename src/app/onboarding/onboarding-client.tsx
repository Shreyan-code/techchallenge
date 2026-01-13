'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useFirestore } from '@/firebase';
import { doc, writeBatch, collection } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Loader2, PartyPopper, User as UserIcon, Upload, X } from 'lucide-react';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { identifyPetBreedFromImage } from '@/ai/flows/identify-pet-breed-from-image';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const fileToDataUri = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const petSchema = z.object({
  name: z.string().min(1, 'Pet name is required'),
  breed: z.string().min(1, 'Pet breed is required'),
  age: z.string().min(1, 'Pet age is required'),
  bio: z.string().max(200, 'Bio must be 200 characters or less').optional(),
  imageUrl: z.string().optional(),
});

const onboardingSchema = z.object({
  userName: z.string().min(3, 'Username must be at least 3 characters'),
  bio: z.string().max(200, 'Bio must be 200 characters or less').optional(),
  profilePicture: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  discoverable: z.boolean(),
  pets: z.array(petSchema),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;
type PetFormValues = z.infer<typeof petSchema>;


export function OnboardingClient() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [petImagePreviews, setPetImagePreviews] = useState<(string | null)[]>([]);
  const [isIdentifying, setIsIdentifying] = useState<boolean[]>([]);


  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      userName: '',
      bio: '',
      profilePicture: '',
      city: '',
      state: '',
      country: '',
      discoverable: true,
      pets: [{ name: '', breed: '', age: '', bio: '', imageUrl: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'pets',
  });

  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const dataUri = await fileToDataUri(file);
      setProfileImagePreview(dataUri);
      form.setValue('profilePicture', dataUri);
    }
  };

  const handlePetImageChange = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newIdentifying = [...isIdentifying];
      newIdentifying[index] = true;
      setIsIdentifying(newIdentifying);
      try {
        const dataUri = await fileToDataUri(file);
        const newPreviews = [...petImagePreviews];
        newPreviews[index] = dataUri;
        setPetImagePreviews(newPreviews);
        form.setValue(`pets.${index}.imageUrl`, dataUri);

        const result = await identifyPetBreedFromImage({ photoDataUri: dataUri });
        if (result.identifiedBreed) {
          form.setValue(`pets.${index}.breed`, result.identifiedBreed);
          toast({ title: 'Breed Identified!', description: `We think it's a ${result.identifiedBreed}.` });
        }
      } catch (error) {
        console.error("Error identifying breed:", error);
        toast({ variant: 'destructive', title: 'Could not identify breed.' });
      } finally {
        const newIdentifying = [...isIdentifying];
        newIdentifying[index] = false;
        setIsIdentifying(newIdentifying);
      }
    }
  };
  
  const removePetImage = (index: number) => {
      const newPreviews = [...petImagePreviews];
      newPreviews[index] = null;
      setPetImagePreviews(newPreviews);
      form.setValue(`pets.${index}.imageUrl`, '');
  }


  const onSubmit = async (data: OnboardingFormValues) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to complete onboarding.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const batch = writeBatch(firestore);
      const userProfileRef = doc(firestore, 'users', user.uid);
      const petIds: string[] = [];

      // Create pet documents
      data.pets.forEach((petData: PetFormValues) => {
        if (petData.name && petData.breed && petData.age) {
          const petRef = doc(collection(firestore, 'pets'));
          batch.set(petRef, {
            ...petData,
            ownerId: user.uid,
            id: petRef.id,
            imageUrl: petData.imageUrl || `https://picsum.photos/seed/${petRef.id}/200`
          });
          petIds.push(petRef.id);
        }
      });
      
      // Update user profile
      batch.update(userProfileRef, {
        userName: data.userName,
        bio: data.bio,
        profilePicture: data.profilePicture,
        city: data.city,
        state: data.state,
        country: data.country,
        discoverable: data.discoverable,
        onboardingCompleted: true,
        petIds: petIds
      });
      
      await batch.commit();

      toast({
        title: 'Profile Complete!',
        description: 'Welcome to the PetConnect community!',
        icon: <PartyPopper className="h-5 w-5 text-primary" />,
      });

      router.push('/');
    } catch (error) {
      console.error('Onboarding error:', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'Could not save your profile. Please try again.',
      });
      setIsSubmitting(false);
    }
  };

  if (isUserLoading) {
    return <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />;
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
            <CardDescription>Tell us a little about yourself.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="profilePicture"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profile Picture</FormLabel>
                   <div className="flex items-center gap-4">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={profileImagePreview || undefined} />
                      <AvatarFallback>
                        <UserIcon className="h-12 w-12" />
                      </AvatarFallback>
                    </Avatar>
                     <FormControl>
                        <Input 
                          type="file" 
                          accept="image/png, image/jpeg, image/webp"
                          onChange={handleProfileImageChange}
                        />
                      </FormControl>
                   </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="userName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="Your cool username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Share something about yourself, your love for pets, etc."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., San Francisco" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., CA" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., USA" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            <FormField
              control={form.control}
              name="discoverable"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Discoverability
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Allow other pet parents to find your profile.
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Pets</CardTitle>
            <CardDescription>Add your furry, scaly, or feathery friends.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {fields.map((field, index) => (
              <div key={field.id} className="space-y-4 rounded-lg border p-4 relative">
                 <FormField
                  control={form.control}
                  name={`pets.${index}.imageUrl`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pet Photo</FormLabel>
                      {petImagePreviews[index] ? (
                         <div className="relative group w-full aspect-video border-2 border-dashed rounded-lg flex items-center justify-center">
                            <Image
                                src={petImagePreviews[index]!}
                                alt="Pet preview"
                                fill
                                className="object-contain rounded-md"
                            />
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                onClick={() => removePetImage(index)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                      ) : (
                        <label
                            htmlFor={`pet-image-${index}`}
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
                                    id={`pet-image-${index}`}
                                    type="file"
                                    className="hidden"
                                    accept="image/png, image/jpeg, image/webp"
                                    onChange={(e) => handlePetImageChange(index, e)}
                                    disabled={isIdentifying[index]}
                                />
                             </FormControl>
                        </label>
                      )}
                      {isIdentifying[index] && <p className="text-sm text-muted-foreground flex items-center gap-2 pt-2"><Loader2 className="h-4 w-4 animate-spin"/> Identifying breed...</p>}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name={`pets.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pet's Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Buddy" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`pets.${index}.breed`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Breed</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Golden Retriever" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`pets.${index}.age`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Age</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 2 years" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name={`pets.${index}.bio`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pet's Bio</FormLabel>
                      <FormControl>
                        <Textarea placeholder="A little about your pet's personality..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {fields.length > 1 && (
                    <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute -top-3 -right-3 h-7 w-7 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => remove(index)}
                    >
                    <Trash2 className="h-4 w-4" />
                    </Button>
                )}
              </div>
            ))}
             <Button
              type="button"
              variant="outline"
              onClick={() => {
                append({ name: '', breed: '', age: '', bio: '', imageUrl: '' });
                setIsIdentifying([...isIdentifying, false]);
              }}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Another Pet
            </Button>
          </CardContent>
        </Card>
        
        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={isSubmitting}>
             {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Complete Profile'
              )}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
