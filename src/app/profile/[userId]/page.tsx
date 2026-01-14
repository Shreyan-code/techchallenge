'use client';

import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, where, getDocs, writeBatch, serverTimestamp, and } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Loader2, MessageSquare, MapPin, PlusCircle, HeartPulse } from 'lucide-react';
import Link from 'next/link';
import { ProfileEditDialog } from '../ProfileEditDialog';
import { PetDialog } from '../PetDialog';
import { MedicalRecordDialog } from '../MedicalRecordDialog';


export default function UserProfilePage() {
  const { user: currentUser, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;


  const userProfileRef = useMemoFirebase(
    () => (userId ? doc(firestore, 'users', userId) : null),
    [userId, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const petsQuery = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return query(collection(firestore, 'pets'), where('ownerId', '==', userId));
  }, [firestore, userId]);

  const { data: pets, isLoading: arePetsLoading } = useCollection(petsQuery);

  const handleStartConversation = async () => {
    if (!currentUser || !userProfile || currentUser.uid === userProfile.id) return;

    const conversationsRef = collection(firestore, 'conversations');

    // Check if a conversation already exists
    const existingConversationQuery = query(
      conversationsRef,
      where('participants', 'array-contains', currentUser.uid)
    );

    const querySnapshot = await getDocs(existingConversationQuery);
    let existingConvo = null;
    querySnapshot.forEach(doc => {
      const convo = doc.data();
      if (convo.participants.includes(userProfile.id)) {
        existingConvo = { id: doc.id, ...convo };
      }
    });

    if (existingConvo) {
      router.push(`/messages?conversationId=${existingConvo.id}`);
      return;
    }

    // Create a new conversation
    const newConversationRef = doc(collection(firestore, 'conversations'));
    const currentUserProfileRef = doc(firestore, 'users', currentUser.uid);
    const { data: currentUserProfile } = await getDocs(query(collection(firestore, 'users'), where('id', '==', currentUser.uid))).then(snap => ({
        data: snap.docs[0]?.data()
    }));
    
    const newConversation = {
      id: newConversationRef.id,
      participants: [currentUser.uid, userProfile.id],
      participantDetails: [
        { uid: currentUser.uid, userName: currentUserProfile?.userName, profilePicture: currentUserProfile?.profilePicture },
        { uid: userProfile.id, userName: userProfile.userName, profilePicture: userProfile.profilePicture },
      ],
      lastMessage: 'Conversation started.',
      lastMessageTimestamp: serverTimestamp(),
    };

    await setDocumentNonBlocking(newConversationRef, newConversation, {});
    router.push(`/messages?conversationId=${newConversation.id}`);
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
    return <div>User not found.</div>;
  }
  
  const isOwnProfile = currentUser?.uid === userId;
  const locationString = [userProfile.city, userProfile.state, userProfile.country].filter(Boolean).join(', ');

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline mb-6">{isOwnProfile ? "My Profile" : `${userProfile.userName}'s Profile`}</h1>
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
            {locationString && (
                 <div className="flex items-center justify-center sm:justify-start gap-2 mt-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{locationString}</span>
                </div>
            )}
            <p className="mt-2 text-sm text-muted-foreground">{userProfile.bio}</p>
          </div>
          <div className="flex gap-2">
            {!isOwnProfile ? (
                 <Button variant="outline" onClick={handleStartConversation}><MessageSquare className="mr-2 h-4 w-4" /> Message</Button>
            ) : (
                <ProfileEditDialog userProfile={userProfile}>
                    <Button variant="outline">Edit Profile</Button>
                </ProfileEditDialog>
            )}
          </div>
        </CardHeader>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold font-headline">{isOwnProfile ? "My Pets" : `${userProfile.userName}'s Pets`}</h2>
           {isOwnProfile && (
            <PetDialog>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Pet
              </Button>
            </PetDialog>
          )}
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
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
                   <MedicalRecordDialog pet={pet} isOwner={isOwnProfile}>
                    <Button variant="secondary" className="w-full">
                      <HeartPulse className="mr-2 h-4 w-4" />
                      Medical Records
                    </Button>
                  </MedicalRecordDialog>
                </CardFooter>
              </Card>
            ))
          ) : (
            <Card className="sm:col-span-2 flex flex-col items-center justify-center p-12 border-dashed">
              <p className="text-muted-foreground mb-4">{isOwnProfile ? "You haven't added any pets yet." : `${userProfile.userName} hasn't added any pets yet.`}</p>
              {isOwnProfile && (
                 <PetDialog>
                  <Button variant="secondary">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Your First Pet
                  </Button>
                </PetDialog>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
