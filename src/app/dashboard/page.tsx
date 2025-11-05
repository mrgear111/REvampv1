'use client';

import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Star, Flame, Trophy, Award } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const tierConfig = {
    Bronze: { points: 0, next: 'Silver', goal: 250 },
    Silver: { points: 250, next: 'Gold', goal: 750 },
    Gold: { points: 750, next: 'Platinum', goal: 2000 },
    Platinum: { points: 2000, next: null, goal: Infinity },
};

const placeholderBadges = [
    { id: 'first-steps', name: 'First Steps', icon: Award },
    // Add more placeholder badges if needed
];


export default function DashboardPage() {
  const { user, loading } = useAuth();

  // This would come from Firestore in a real app
  const userProfile = {
      points: 75,
      tier: 'Bronze',
      streak: 1,
      badges: ['first-steps'],
  } as any;

  if (loading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-10 w-1/2 mb-4" />
        <Skeleton className="h-8 w-1/3 mb-8" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/4" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return null; // Or a message telling user to log in, though middleware should handle this.
  }

  const currentTier = tierConfig[userProfile.tier as keyof typeof tierConfig];
  const progress = currentTier.next ? (userProfile.points / currentTier.goal) * 100 : 100;
  const pointsToNextTier = currentTier.next ? currentTier.goal - userProfile.points : 0;


  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold font-headline">
        Welcome back, {user.displayName || 'User'}!
      </h1>
      <p className="text-muted-foreground mb-8">
        Here&apos;s a summary of your journey so far.
      </p>

      {user.isAdmin && (
        <Alert className="mb-8 border-primary/50 text-primary">
          <Terminal className="h-4 w-4 !text-primary" />
          <AlertTitle className="font-bold">Admin Access</AlertTitle>
          <AlertDescription>
            You have administrator privileges. You can access admin-only features.
          </AlertDescription>
        </Alert>
      )}

    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
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

    <Card>
        <CardHeader>
            <CardTitle>Your Badges</CardTitle>
             <CardDescription>A collection of your achievements.</CardDescription>
        </CardHeader>
        <CardContent>
            {userProfile.badges.length > 0 ? (
                <div className="flex flex-wrap gap-4">
                    {placeholderBadges.filter(b => userProfile.badges.includes(b.id)).map(badge => (
                        <div key={badge.id} className="flex flex-col items-center gap-2 text-center w-24">
                           <div className="p-4 rounded-full bg-secondary">
                             <badge.icon className="h-8 w-8 text-secondary-foreground" />
                           </div>
                           <span className="text-sm font-medium">{badge.name}</span>
                        </div>
                    ))}
                </div>
            ) : (
                <p className='text-muted-foreground'>You haven't earned any badges yet. Participate in events to earn them!</p>
            )}
            
        </CardContent>
    </Card>


    </div>
  );
}
