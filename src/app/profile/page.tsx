'use client';

import Image from 'next/image';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Edit, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { ProfileEditDialog } from './ProfileEditDialog';
import { PetDialog } from './PetDialog';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
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
} from "@/components/ui/alert-dialog"

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const petsQuery = useMemoFirebase(() => {
    if (!firestore || !user) {
      return null;
    }
    // This query now fetches pets where the ownerId matches the current user's UID.
    // This aligns with the new security rule.
    return query(
      collection(firestore, 'pets'),
      where('ownerId', '==', user.uid)
    );
  }, [firestore, user]);

  const { data: pets, isLoading: arePetsLoading } = useCollection(petsQuery);

  const handleDeletePet = (petId: string) => {
    if (!user || !firestore) return;
    const petRef = doc(firestore, 'pets', petId);
    deleteDocumentNonBlocking(petRef);
    
    // Also remove from user's petIds array
    const userRef = doc(firestore, 'users', user.uid);
    const updatedPetIds = userProfile?.petIds?.filter(id => id !== petId) || [];
    updateDocumentNonBlocking(userRef, { petIds: updatedPetIds });
  };
  
  const isLoading = isUserLoading || isProfileLoading || arePetsLoading;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!userProfile) {
    return <div>No profile found.</div>;
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
       <div>
        <h1 className="text-3xl font-bold font-headline mb-6">Profile</h1>
      </div>
      <Card className="overflow-hidden">
        <div className="h-32 bg-secondary" />
        <CardHeader className="flex flex-col sm:flex-row items-center gap-4 -mt-16 p-6">
          <Avatar className="h-32 w-32 border-4 border-background">
            <AvatarImage src={userProfile.profilePicture} alt={userProfile.userName} />
            <AvatarFallback>{userProfile.userName?.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center sm:text-left">
            <CardTitle className="text-2xl font-headline">{userProfile.firstName} {userProfile.lastName}</CardTitle>
            <CardDescription>@{userProfile.userName}</CardDescription>
            <p className="mt-2 text-sm text-muted-foreground">{userProfile.bio}</p>
          </div>
          <ProfileEditDialog userProfile={userProfile}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" /> Edit Profile
            </Button>
          </ProfileEditDialog>
        </CardHeader>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold font-headline">My Pets</h2>
           <PetDialog>
             <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Pet
            </Button>
          </PetDialog>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {pets && pets.length > 0 ? (
            pets.map((pet) => (
            <Card key={pet.id} className="relative group">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="relative h-24 w-24 rounded-lg overflow-hidden">
                   <Image
                    src={pet.imageUrl || `https://picsum.photos/seed/${pet.id}/200`}
                    alt={pet.name}
                    data-ai-hint="dog portrait"
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <CardTitle className="font-headline">{pet.name}</CardTitle>
                  <CardDescription>
                    {pet.breed} &bull; {pet.age}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{pet.bio}</p>
              </CardContent>
               <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <PetDialog pet={pet}>
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <Edit className="h-4 w-4" />
                  </Button>
                </PetDialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                     <Button variant="destructive" size="icon" className="h-8 w-8">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete {pet.name}'s profile.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeletePet(pet.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </Card>
          ))
          ) : (
             <Card className="sm:col-span-2 flex flex-col items-center justify-center p-12 border-dashed">
                <p className="text-muted-foreground">You haven&apos;t added any pets yet.</p>
             </Card>
          )}
        </div>
      </div>
    </div>
  );
}
