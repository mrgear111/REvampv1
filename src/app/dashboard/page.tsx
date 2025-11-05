'use client';

import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Star, Flame, Trophy, Award, ArrowRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// This would come from firestore in a real app, including campus rank
const userProfile = {
    points: 75,
    tier: 'Bronze',
    streak: 1,
    badges: ['first-steps'],
    campusRank: 12, 
    domains: ['web-dev', 'ai-ml'],
} as any;

const tierConfig = {
    Bronze: { points: 0, next: 'Silver', goal: 250 },
    Silver: { points: 250, next: 'Gold', goal: 750 },
    Gold: { points: 750, next: 'Platinum', goal: 2000 },
    Platinum: { points: 2000, next: null, goal: Infinity },
};

const placeholderBadges = [
    { id: 'first-steps', name: 'First Steps', icon: Award, description: "Completed onboarding" },
];

const recommendedEvents = [
    { id: '1', title: 'Intro to React Hooks', date: new Date(), domains: ['web-dev'] },
    { id: '2', title: 'Advanced State Management', date: new Date(), domains: ['web-dev'] },
];

const perks = [
    { id: '1', title: 'Free Domain Name', tier: 'Silver' },
    { id: '2', title: 'T-shirt', tier: 'Gold' },
]


export default function DashboardPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!user) {
    return null; // Or a message telling user to log in, though middleware should handle this.
  }

  const currentTier = tierConfig[userProfile.tier as keyof typeof tierConfig];
  const progress = currentTier.next ? (userProfile.points / currentTier.goal) * 100 : 100;
  const pointsToNextTier = currentTier.next ? currentTier.goal - userProfile.points : 0;


  return (
    <div className="space-y-8">
      <div className='space-y-2'>
        <h1 className="text-3xl font-bold font-headline">
          Welcome back, {user.displayName?.split(' ')[0] || 'User'}!
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s a summary of your journey so far. Keep up the great work!
        </p>
      </div>

      {user.isAdmin && (
        <Alert className="border-primary/50 text-primary">
          <Terminal className="h-4 w-4 !text-primary" />
          <AlertTitle className="font-bold">Admin Access</AlertTitle>
          <AlertDescription>
            You have administrator privileges. You can access admin-only features.
          </AlertDescription>
        </Alert>
      )}

    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Points</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{userProfile.points}</div>
                <p className="text-xs text-muted-foreground">You're doing great, keep it up!</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Tier</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                 <div className="text-2xl font-bold">{userProfile.tier}</div>
                <p className="text-xs text-muted-foreground">{pointsToNextTier > 0 ? `${pointsToNextTier} points to ${currentTier.next}`: "You've reached the top tier!"}</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Activity Streak</CardTitle>
                <Flame className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{userProfile.streak} {userProfile.streak > 0 && '🔥'}</div>
                 <p className="text-xs text-muted-foreground">Keep the fire burning!</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Campus Rank</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">#{userProfile.campusRank}</div>
                 <p className="text-xs text-muted-foreground">Top 10% on campus</p>
            </CardContent>
        </Card>
    </div>

    <Card className='mb-6'>
        <CardHeader>
            <CardTitle>Your Progress</CardTitle>
            <CardDescription>You are currently a {userProfile.tier} member.</CardDescription>
        </CardHeader>
        <CardContent>
            <Progress value={progress} className='mb-2'/>
            <p className='text-sm text-muted-foreground text-center'>
               {currentTier.next ? `Next milestone: ${currentTier.next} Tier at ${currentTier.goal} points` : "You are at the highest tier!"}
            </p>
        </CardContent>
    </Card>

    <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <Card className='lg:col-span-2'>
            <CardHeader>
                <CardTitle>Recommended Events</CardTitle>
                <CardDescription>Events tailored to your interests.</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
                {recommendedEvents.map(event => (
                    <div key={event.id} className='flex items-center justify-between p-2 rounded-md border'>
                        <div>
                            <h4 className='font-semibold'>{event.title}</h4>
                            <p className='text-sm text-muted-foreground'>{event.date.toLocaleDateString()}</p>
                        </div>
                        <Button variant='ghost' size='sm' asChild>
                            <Link href={`/dashboard/events`}>View <ArrowRight className='ml-2 h-4 w-4'/></Link>
                        </Button>
                    </div>
                ))}
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Perks Preview</CardTitle>
                 <CardDescription>Rewards for your hard work.</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
                {perks.map(perk => (
                    <div key={perk.id} className='flex items-center justify-between p-2 rounded-md bg-muted/50'>
                         <div>
                            <h4 className='font-semibold'>{perk.title}</h4>
                            <p className='text-sm text-muted-foreground'>Unlock at {perk.tier} Tier</p>
                        </div>
                        <Badge variant={userProfile.tier === perk.tier ? 'default' : 'secondary'}>
                            {userProfile.tier === perk.tier ? 'Unlocked' : 'Locked'}
                        </Badge>
                    </div>
                ))}
            </CardContent>
             <CardFooter>
                <Button className='w-full' asChild>
                    <Link href='/dashboard/perks'>View all perks</Link>
                </Button>
            </CardFooter>
        </Card>
    </div>
    </div>
  );
}

function DashboardSkeleton() {
    return (
         <div className="space-y-8">
            <div className='space-y-2'>
                <Skeleton className="h-10 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
            </div>
            <Skeleton className="h-40 w-full" />
            <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
                 <Skeleton className="h-48 w-full lg:col-span-2" />
                 <Skeleton className="h-48 w-full" />
            </div>
        </div>
    )
}
