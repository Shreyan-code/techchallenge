'use client';
import { useCollection, useFirestore, useUser, useMemoFirebase, setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy, serverTimestamp, getDocs, doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from '@/components/ui/button';
import { Siren, X } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { formatDistanceToNow } from 'date-fns';
import { useMemo } from 'react';

export function LostPetAlertBanner() {
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    const alertsQuery = useMemoFirebase(
        () => query(collection(firestore, 'lostPetAlerts'), where('status', '==', 'active')),
        [firestore]
    );
    const { data: alerts } = useCollection(alertsQuery);
    
    const sortedAlerts = useMemo(() => {
        if (!alerts) return [];
        return [...alerts].sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
    }, [alerts]);


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
    
    const handleResolveAlert = (alertId: string) => {
        const alertRef = doc(firestore, 'lostPetAlerts', alertId);
        updateDocumentNonBlocking(alertRef, { status: 'resolved' });
    }

    if (!sortedAlerts || sortedAlerts.length === 0) {
        return null;
    }

    return (
        <div className="w-full border-b border-destructive/50 bg-destructive/10">
            <Carousel opts={{ loop: true, }} className="w-full max-w-5xl mx-auto">
                <CarouselContent>
                    {sortedAlerts.map(alert => (
                        <CarouselItem key={alert.id}>
                            <div className="p-1">
                                <Alert variant="destructive" className="border-none bg-transparent">
                                    <Siren />
                                    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 w-full">
                                        <div className="flex items-center gap-4">
                                            <Image src={alert.petImageUrl} alt={alert.petName} width={60} height={60} className="rounded-md object-cover aspect-square"/>
                                        </div>
                                        <div>
                                            <AlertTitle className="font-bold">
                                                LOST PET ALERT: Have you seen {alert.petName}?
                                            </AlertTitle>
                                            <AlertDescription>
                                                Last seen {alert.lastSeenLocation ? `near ${alert.lastSeenLocation}` : ''} {alert.createdAt ? `about ${formatDistanceToNow(alert.createdAt.toDate(), { addSuffix: true })}` : ''}.
                                            </AlertDescription>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {user && alert.ownerId !== user.uid && (
                                                <Button size="sm" onClick={() => handleStartConversation(alert.ownerId)}>Contact Owner</Button>
                                            )}
                                            {user && alert.ownerId === user.uid && (
                                                <Button size="sm" variant="secondary" onClick={() => handleResolveAlert(alert.id)}>Mark as Found</Button>
                                            )}
                                        </div>
                                    </div>
                                </Alert>
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                {sortedAlerts.length > 1 && (
                    <>
                        <CarouselPrevious className="ml-14" />
                        <CarouselNext className="mr-14"/>
                    </>
                )}
            </Carousel>
        </div>
    )
}
