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
  Compass,
  CalendarDays,
  Lightbulb,
  CalendarCheck,
  Siren,
  Bell,
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
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { LostPetAlertBanner } from './LostPetAlertBanner';

const MainNav = ({ userProfile }: { userProfile: any }) => {
  const pathname = usePathname();
  const hasLocation = userProfile?.city && userProfile?.state;

  const menuItems = [
    { href: '/feed', label: 'Feed', icon: LayoutGrid },
    { href: '/create-post', label: 'Create Post', icon: PlusSquare },
    {
      href: '/find',
      label: 'Find',
      icon: Compass,
      disabled: !hasLocation,
      tooltip: 'Add your location in your profile to find pet parents.',
    },
    { href: '/events', label: 'Events', icon: CalendarDays },
    { href: '/tips', label: 'Tips & Advice', icon: Lightbulb },
    { href: '/reminders', label: 'Reminders', icon: CalendarCheck },
    { href: '/messages', label: 'Messages', icon: MessageSquare },
    { href: '/profile', label: 'Profile', icon: User },
    { href: '/alerts', label: 'Active Alerts', icon: Bell, isAlert: true },
    { href: '/send-alert', label: 'Send Alert', icon: Siren, isAlert: true },
  ];

  return (
     <SidebarMenu>
      {menuItems.map((item) => (
        <SidebarMenuItem key={item.label}>
          <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild disabled={!item.disabled}>
              <div className={cn(item.disabled && "cursor-not-allowed")}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  className={cn("justify-start", item.isAlert && "text-destructive hover:bg-destructive/10 hover:text-destructive")}
                  disabled={item.disabled}
                  tooltip={{ children: item.label, side: 'right' }}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </div>
            </TooltipTrigger>
            {item.disabled && item.tooltip && (
              <TooltipContent side="right" className="ml-2">
                <p>{item.tooltip}</p>
              </TooltipContent>
            )}
          </Tooltip>
          </TooltipProvider>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
};

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userProfile, isUserLoading } = useUser();
  const auth = useAuth();
  
  const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/';
  const isOnboardingPage = pathname === '/onboarding';

  useEffect(() => {
    if (isUserLoading) return;

    if (!user && !isAuthPage) {
      router.push('/');
    }

    if (user) {
      if (isAuthPage && pathname !== '/') {
        router.push('/feed');
      } else if (userProfile && !userProfile.onboardingCompleted && !isOnboardingPage) {
        router.push('/onboarding');
      } else if (userProfile && userProfile.onboardingCompleted && isOnboardingPage) {
        router.push('/feed');
      }
    }
  }, [user, userProfile, isUserLoading, isAuthPage, isOnboardingPage, router, pathname]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  if (isUserLoading && !isAuthPage) {
     return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (isAuthPage || !user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        {children}
      </main>
    );
  }
  
  if (isOnboardingPage) {
     return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        {children}
      </main>
    );
  }


  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0"
              asChild
            >
              <Link href="/feed">
                <PawPrint className="text-primary" />
              </Link>
            </Button>
            <h1 className="text-xl font-headline font-semibold text-primary group-data-[collapsible=icon]:hidden">
              PetConnect
            </h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <MainNav userProfile={userProfile} />
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
          <Link href="/feed" className="flex items-center gap-2 font-semibold">
            <PawPrint className="h-6 w-6 text-primary" />
            <span className="font-headline text-lg">PetConnect</span>
          </Link>
          <SidebarTrigger />
        </header>
         <header className="sticky top-0 z-10 hidden h-16 items-center justify-start gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6 md:flex">
          <SidebarTrigger />
        </header>
        <div className="flex flex-col">
          <LostPetAlertBanner />
          <div className="p-4 sm:p-6">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
