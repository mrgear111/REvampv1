'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { UserNav } from '@/components/user-nav';
import { LogoIcon } from '@/components/icons';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function Header() {
  const { user } = useAuth();
  const pathname = usePathname();

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', loggedIn: true },
    { href: '/admin/verifications', label: 'Verifications', admin: true },
    { href: '/admin/events/create', label: 'Create Event', admin: true },
  ];

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
              <Link
                href="/admin/verifications"
                className={cn(
                  'transition-colors hover:text-foreground/80',
                  pathname.startsWith('/admin')
                    ? 'text-foreground font-semibold'
                    : 'text-foreground/60'
                )}
              >
                Admin Panel
              </Link>
            )}
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          {user ? (
            <UserNav />
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
