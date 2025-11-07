
'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { UserNav } from '@/components/user-nav';
import { LogoIcon } from '@/components/icons';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Bell, Gift } from 'lucide-react';
import { Badge } from './ui/badge';

// Mock data for notifications
const notifications = [
  { id: 1, title: "New Badge Unlocked!", message: "You earned the 'Streak Starter' badge.", read: false, type: 'badge' },
  { id: 2, title: "Event Reminder", message: "Your event 'Intro to AI' starts in 24 hours.", read: false, type: 'event' },
  { id: 3, title: "Payment Successful", message: "Your payment for 'Advanced React' was successful.", read: true, type: 'payment' },
];

export function Header() {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <LogoIcon className="h-6 w-6 text-primary" />
            <span className="font-bold font-headline sm:inline-block">
              REvamp
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm md:flex">
            {user && (
              <Link
                href="/dashboard"
                className={cn(
                  'transition-colors hover:text-foreground/80',
                  pathname.startsWith('/dashboard')
                    ? 'text-foreground font-semibold'
                    : 'text-foreground/60'
                )}
              >
                Dashboard
              </Link>
            )}
             {user?.isAdmin && (
               <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      'gap-1 px-2 text-foreground/60 hover:text-foreground/80',
                      pathname.startsWith('/admin') && 'text-foreground font-semibold'
                    )}
                  >
                    Admin
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Management</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/admin/workshops')}>
                    Workshops
                  </DropdownMenuItem>
                   <DropdownMenuItem onClick={() => router.push('/admin/events/create')}>
                    Events
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/admin/verifications')}>
                    Verifications
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/admin/ambassadors')}>
                    Ambassadors
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          {user ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    {unreadCount > 0 && (
                      <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 justify-center rounded-full p-0 text-xs">
                        {unreadCount}
                      </Badge>
                    )}
                    <Bell className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-80" align="end">
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {notifications.length > 0 ? (
                    notifications.map(notification => (
                      <DropdownMenuItem key={notification.id} className={cn("flex items-start gap-3", !notification.read && "bg-muted")}>
                        <div className='mt-1'>
                          {notification.type === 'badge' ? <Gift className="h-4 w-4 text-primary" /> : <Bell className="h-4 w-4" />}
                        </div>
                        <div className="flex flex-col">
                          <p className="text-sm font-medium">{notification.title}</p>
                          <p className="text-xs text-muted-foreground">{notification.message}</p>
                        </div>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <p className="p-2 text-center text-sm text-muted-foreground">No new notifications</p>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <UserNav />
            </>
          ) : (
            <Button asChild>
              <Link href="/login">Get Started</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

