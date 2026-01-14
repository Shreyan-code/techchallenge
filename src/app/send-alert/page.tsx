
'use client';

import Image from 'next/image';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Siren } from 'lucide-react';
import { LostPetAlertDialog } from '@/components/LostPetAlertDialog';


export default function SendAlertPage() {
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
    return query(
      collection(firestore, 'pets'),
      where('ownerId', '==', user.uid)
    );
  }, [firestore, user]);

  const { data: pets, isLoading: arePetsLoading } = useCollection(petsQuery);

  const isLoading = isUserLoading || isProfileLoading || arePetsLoading;
  const hasLocation = !!userProfile?.city && !!userProfile?.state;


  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline mb-2">Send a Lost Pet Alert</h1>
        <p className="text-muted-foreground">Select a pet to notify the community. This should only be used in an emergency.</p>
      </div>

       <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {pets && pets.length > 0 ? (
            pets.map((pet) => (
            <Card key={pet.id} className="flex flex-col">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="relative h-24 w-24 rounded-lg overflow-hidden">
                   <Image
                    src={pet.imageUrl || `https://picsum.photos/seed/${pet.id}/200`}
                    alt={pet.name}
                    data-ai-hint="dog portrait"
                    width={200}
                    height={200}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div>
                  <CardTitle className="font-headline">{pet.name}</CardTitle>
                  <CardDescription>
                    {pet.breed} &bull; {pet.age}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">{pet.bio}</p>
              </CardContent>
              <CardFooter>
                 <LostPetAlertDialog pet={pet} disabled={!hasLocation}>
                   <Button variant="destructive" className="w-full" disabled={!hasLocation}>
                     <Siren className="mr-2 h-4 w-4" />
                     Report {pet.name} as Lost
                   </Button>
                </LostPetAlertDialog>
              </CardFooter>
            </Card>
          ))
          ) : (
             <Card className="sm:col-span-2 lg:col-span-3 flex flex-col items-center justify-center p-12 border-dashed">
                <p className="text-muted-foreground mb-4">You don't have any pets to report.</p>
                <p className="text-sm text-muted-foreground">Add a pet from your profile page first.</p>
             </Card>
          )}
        </div>

    </div>
  );
}
