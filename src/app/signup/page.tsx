'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { useFirestore, useAuth } from '@/firebase';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PawPrint, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    createUserWithEmailAndPassword(auth, email, password)
      .then(async (userCredential) => {
        const user = userCredential.user;
        const [firstName, ...lastName] = fullName.split(' ');

        // Update profile and create user document in Firestore
        await updateProfile(user, {
          displayName: fullName,
        });

        const userProfile = {
          id: user.uid,
          userName: email.split('@')[0],
          email: user.email,
          firstName: firstName || '',
          lastName: lastName.join(' ') || '',
          profilePicture: user.photoURL || '',
          bio: '',
          city: '',
          state: '',
          country: '',
          petIds: [],
          onboardingCompleted: false,
          discoverable: true,
        };

        const userDocRef = doc(firestore, 'users', user.uid);
        setDocumentNonBlocking(userDocRef, userProfile, { merge: true });

        toast({
          title: 'Account Created!',
          description: "Welcome to PetConnect! Let's get you set up...",
        });

        // Redirect to onboarding after successful signup and profile creation
        router.push('/onboarding');
      })
      .catch((error: any) => {
        console.error('Signup Error:', error);
        toast({
          variant: 'destructive',
          title: 'Signup Failed',
          description:
            error.code === 'auth/email-already-in-use'
              ? 'This email is already registered. Try logging in.'
              : error.message || 'Could not create your account. Please try again.',
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <PawPrint className="w-10 h-10 text-primary" />
        </div>
        <CardTitle className="text-2xl font-headline">Join PetConnect</CardTitle>
        <CardDescription>
          Create an account to start sharing your pet&apos;s moments.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignup}>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="full-name">Full Name</Label>
              <Input
                id="full-name"
                placeholder="Alex Doe"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create an account'
              )}
            </Button>
          </div>
        </form>
        <div className="mt-4 text-center text-sm">
          Already have an account?{' '}
          <Link href="/login" className="underline">
            Login
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
