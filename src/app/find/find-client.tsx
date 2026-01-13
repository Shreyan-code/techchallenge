'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Search, Dog, Cat, Bird, Rabbit } from 'lucide-react';

const PetTypeIcons = {
  Dog: <Dog className="h-4 w-4" />,
  Cat: <Cat className="h-4 w-4" />,
  Bird: <Bird className="h-4 w-4" />,
  Rabbit: <Rabbit className="h-4 w-4" />,
};

export function FindClient() {
  const { user: currentUser } = useUser();
  const [distance, setDistance] = useState([40]);
  const [petType, setPetType] = useState('all');
  const [breed, setBreed] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const firestore = useFirestore();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setResults([]);

    try {
      const usersRef = collection(firestore, 'users');
      const q = query(
        usersRef,
        where('discoverable', '==', true)
      );

      const querySnapshot = await getDocs(q);
      const foundUsers: any[] = [];
      const petPromises: Promise<any>[] = [];

      querySnapshot.forEach((doc) => {
        // Exclude current user from results
        if (doc.id !== currentUser?.uid) {
            foundUsers.push({ id: doc.id, ...doc.data() });
        }
      });

      // Fetch pets for all found users
      for (const user of foundUsers) {
        if (user.petIds && user.petIds.length > 0) {
          const petsRef = collection(firestore, 'pets');
          const petsQuery = query(petsRef, where('__name__', 'in', user.petIds));
          petPromises.push(getDocs(petsQuery).then(petSnap => {
            user.pets = petSnap.docs.map(d => d.data());
          }));
        } else {
          user.pets = [];
        }
      }
      
      await Promise.all(petPromises);

      // Client-side filtering for pet type and breed
      let finalResults = foundUsers;
      if (petType !== 'all' || breed.trim() !== '') {
          finalResults = foundUsers.filter(user => {
              if (!user.pets || user.pets.length === 0) return false;

              return user.pets.some((pet: any) => {
                  const typeMatch = petType === 'all' || pet.breed.toLowerCase().includes(petType.toLowerCase()); // Simple check for now
                  const breedMatch = breed.trim() === '' || pet.breed.toLowerCase().includes(breed.trim().toLowerCase());
                  return typeMatch && breedMatch;
              });
          })
      }


      setResults(finalResults);
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2 col-span-1 sm:col-span-2">
              <label htmlFor="distance" className="text-sm font-medium">Distance ({distance[0]} km)</label>
              <Slider
                id="distance"
                min={1}
                max={150}
                step={1}
                value={distance}
                onValueChange={setDistance}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="pet-type" className="text-sm font-medium">Pet Type</label>
              <Select value={petType} onValueChange={setPetType}>
                <SelectTrigger id="pet-type">
                  <SelectValue placeholder="Any Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Type</SelectItem>
                  <SelectItem value="dog">Dog</SelectItem>
                  <SelectItem value="cat">Cat</SelectItem>
                  <SelectItem value="bird">Bird</SelectItem>
                  <SelectItem value="rabbit">Rabbit</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
             <div className="space-y-2">
              <label htmlFor="breed" className="text-sm font-medium">Breed</label>
              <Input id="breed" placeholder="e.g., Golden Retriever" value={breed} onChange={e => setBreed(e.target.value)} />
            </div>
            <Button type="submit" className="md:col-start-4 w-full" disabled={isSearching}>
              {isSearching ? <Loader2 className="animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <div className="space-y-4">
         <h2 className="text-2xl font-bold font-headline">Results</h2>
         {isSearching ? (
             <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
         ) : results.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.map(user => (
                    <Card key={user.id}>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4 mb-4">
                                <Avatar className="h-16 w-16">
                                    <AvatarImage src={user.profilePicture} alt={user.userName} />
                                    <AvatarFallback>{user.userName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <Link href={`/profile/${user.id}`} className="hover:underline">
                                        <h3 className="text-lg font-bold font-headline">{user.userName}</h3>
                                    </Link>
                                    <p className="text-sm text-muted-foreground line-clamp-2">{user.bio}</p>
                                    {user.city && user.state && <p className="text-xs text-muted-foreground">{user.city}, {user.state}</p>}
                                </div>
                            </div>
                            <div className="space-y-3">
                               <h4 className="text-sm font-semibold">Pets</h4>
                               {user.pets && user.pets.length > 0 ? user.pets.map((pet: any) => (
                                   <div key={pet.id || pet.name} className="flex items-center gap-3 text-sm">
                                       <div className="relative h-10 w-10 rounded-md overflow-hidden">
                                           <Image src={pet.imageUrl} alt={pet.name} fill className="object-cover" />
                                       </div>
                                       <div>
                                           <p className="font-medium">{pet.name}</p>
                                           <p className="text-muted-foreground text-xs">{pet.breed}</p>
                                       </div>
                                   </div>
                               )) : <p className="text-xs text-muted-foreground">No pets added yet.</p>}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
         ) : (
             <div className="text-center p-12 border border-dashed rounded-lg">
                 <p className="text-muted-foreground">No results found. Try adjusting your filters.</p>
             </div>
         )}
      </div>
    </div>
  );
}
