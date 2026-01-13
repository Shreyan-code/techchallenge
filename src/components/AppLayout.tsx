'use client';

import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';
import Link from 'next/link';
import {
  LayoutGrid,
  MessageSquare,
  Scan,
  User,
  PawPrint,
  Loader2,
  LogOut,
  PlusSquare,
  BrainCircuit,
} from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useUser, useDoc, useMemoFirebase, useAuth } from '@/firebase';
import { doc, getFirestore } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

const MainNav = () => {
  const pathname = usePathname();
  const menuItems = [
    { href: '/', label: 'Feed', icon: LayoutGrid },
    { href: '/create-post', label: 'Create Post', icon: PlusSquare },
    { href: '/breed-identifier', label: 'Identifier', icon: Scan },
    { href: '/messages', label: 'Messages', icon: MessageSquare },
    { href: '/advice', label: 'Advice', icon: BrainCircuit },
    { href: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <SidebarMenu>
      {menuItems.map((item) => (
        <SidebarMenuItem key={item.label}>
          <SidebarMenuButton
            asChild
            isActive={pathname === item.href}
            className="justify-start"
            tooltip={{ children: item.label, side: 'right' }}
          >
            <Link href={item.href}>
              <item.icon />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
};

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = getFirestore();

  const userProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const isAuthPage = pathname === '/login' || pathname === '/signup';
  const isOnboardingPage = pathname === '/onboarding';

  useEffect(() => {
    const isLoading = isUserLoading || (user && isProfileLoading);
    if (isLoading) return;

    if (!user && !isAuthPage) {
      router.push('/login');
    }

    if (user) {
      if (isAuthPage) {
        router.push('/');
      } else if (userProfile && !userProfile.onboardingCompleted && !isOnboardingPage) {
        router.push('/onboarding');
      } else if (userProfile && userProfile.onboardingCompleted && isOnboardingPage) {
        router.push('/');
      }
    }
  }, [user, userProfile, isUserLoading, isProfileLoading, isAuthPage, isOnboardingPage, router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const isLoading = isUserLoading || (user && isProfileLoading);

  if (isLoading && !isAuthPage) {
     return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (isAuthPage || isOnboardingPage || !user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        {children}
      </main>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0"
              asChild
            >
              <Link href="/">
                <PawPrint className="text-primary" />
              </Link>
            </Button>
            <h1 className="text-xl font-headline font-semibold text-primary group-data-[collapsible=icon]:hidden">
              PetConnect
            </h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <MainNav />
        </SidebarContent>
         <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleLogout}
                className="justify-start"
                tooltip={{ children: "Logout", side: 'right' }}
              >
                <LogOut />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6 md:hidden">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <PawPrint className="h-6 w-6 text-primary" />
            <span className="font-headline text-lg">PetConnect</span>
          </Link>
          <SidebarTrigger />
        </header>
        <div className="p-4 sm:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
