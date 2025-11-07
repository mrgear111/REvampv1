'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, Gift, BookOpen, User, Rocket, School } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/dashboard/events', label: 'My Events', icon: Calendar },
  { href: '/dashboard/workshops', label: 'Workshops', icon: School },
  { href: '/dashboard/perks', label: 'Perks', icon: Gift },
  { href: '/dashboard/resources', label: 'Resources', icon: BookOpen },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
];

const secondaryNavItems = [
    { href: '/ambassador/apply', label: 'Ambassador Program', icon: Rocket }
]

export function DashboardNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <nav className="flex flex-col gap-2">
      <div className="flex flex-row gap-2 md:flex-col md:gap-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname === item.href
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <item.icon className="h-4 w-4" />
            <span className="hidden md:inline">{item.label}</span>
          </Link>
        ))}
      </div>
       <hr className="my-2" />
       <div className="flex flex-row gap-2 md:flex-col md:gap-1">
        {secondaryNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname.startsWith(item.href)
                ? 'bg-muted text-foreground font-semibold'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <item.icon className="h-4 w-4" />
            <span className="hidden md:inline">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
