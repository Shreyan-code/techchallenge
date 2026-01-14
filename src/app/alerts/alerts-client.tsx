'use client';

import { useCollection, useFirestore, useUser, useMemoFirebase, updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy, doc, getDocs, serverTimestamp } from 'firebase/firestore';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, Siren, MapPin } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

function AlertCard({ alert }: { alert: any }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

    const isOwner = user && alert.ownerId === user.uid;

    const handleResolveAlert = () => {
        if (!isOwner) return;
        const alertRef = doc(firestore, 'lostPetAlerts', alert.id);
        updateDocumentNonBlocking(alertRef, { status: 'resolved' });
        toast({
            title: "Alert Resolved",
            description: `${alert.petName} has been marked as found.`,
        });
    };
    
    const handleStartConversation = async (ownerId: string) => {
        if (!user || ownerId === user.uid) return;

        const conversationsRef = collection(firestore, 'conversations');
        const q = query(
            conversationsRef,
            where('participants', 'array-contains', user.uid)
        );

        const querySnapshot = await getDocs(q);
        let existingConvo: { id: string } | null = null;
        querySnapshot.forEach(doc => {
            if (doc.data().participants.includes(ownerId)) {
                existingConvo = { id: doc.id };
            }
        });

        if (existingConvo) {
            router.push(`/messages?conversationId=${existingConvo.id}`);
            return;
        }

        const newConversationRef = doc(collection(firestore, 'conversations'));
        const userProfileSnap = await getDocs(query(collection(firestore, 'users'), where('__name__', 'in', [user.uid, ownerId])));
        const participantDetails = userProfileSnap.docs.map(doc => ({
            uid: doc.id,
            userName: doc.data().userName,
            profilePicture: doc.data().profilePicture,
        }));

        const newConversation = {
            id: newConversationRef.id,
            participants: [user.uid, ownerId],
            participantDetails: participantDetails,
            lastMessage: 'Regarding the lost pet alert.',
            lastMessageTimestamp: serverTimestamp(),
        };

        setDocumentNonBlocking(newConversationRef, newConversation, {});
        router.push(`/messages?conversationId=${newConversation.id}`);
    };


    return (
        <Card className="bg-destructive/5 border-destructive/20">
             <CardHeader className="flex flex-row items-center gap-4">
                <div className="relative h-24 w-24 rounded-lg overflow-hidden">
                   <Image
                    src={alert.petImageUrl}
                    alt={alert.petName}
                    width={200}
                    height={200}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div>
                    <CardTitle className="font-headline flex items-center gap-2">
                        <Siren className="text-destructive"/>
                        Lost Pet: {alert.petName}
                    </CardTitle>
                    <CardDescription>
                        Reported {alert.createdAt ? formatDistanceToNow(alert.createdAt.toDate(), { addSuffix: true }) : 'just now'}
                    </CardDescription>
                </div>
              </CardHeader>
            <CardContent>
               <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4"/>
                    Last seen {alert.lastSeenLocation ? `near ${alert.lastSeenLocation}` : 'location not specified'}.
               </p>
            </CardContent>
            <CardFooter>
                 {isOwner ? (
                    <Button variant="secondary" onClick={handleResolveAlert}>Mark as Found</Button>
                ) : (
                    <Button onClick={() => handleStartConversation(alert.ownerId)}>Contact Owner</Button>
                )}
            </CardFooter>
        </Card>
    )
}

export function AlertsClient() {
  const firestore = useFirestore();

  const alertsQuery = useMemoFirebase(
    () => query(collection(firestore, 'lostPetAlerts'), where('status', '==', 'active'), orderBy('createdAt', 'desc')),
    [firestore]
  );
  
  const { data: alerts, isLoading } = useCollection(alertsQuery);
  
  return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-headline mb-2">Active Lost Pet Alerts</h1>
          <p className="text-muted-foreground">This is a live feed of all pets reported missing by the community. Please keep an eye out.</p>
        </div>

        {isLoading && (
            <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        )}

        {!isLoading && alerts?.length === 0 && (
            <div className="text-center p-12 border border-dashed rounded-lg">
                 <p className="text-muted-foreground">No active alerts right now. That's great news!</p>
             </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {alerts?.map(alert => (
                <AlertCard key={alert.id} alert={alert} />
            ))}
        </div>
      </div>
  )
}
