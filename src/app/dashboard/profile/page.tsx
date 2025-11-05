'use client';

import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Award, BarChart, Calendar, Edit } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Placeholder data
const userProfile = {
    points: 75,
    tier: 'Bronze',
    streak: 1,
    campusRank: 12,
    eventsAttended: 0,
    badges: [{ id: 'first-steps', name: 'First Steps', icon: Award }],
};

export default function ProfilePage() {
    const { user, loading } = useAuth();

    if (loading) {
        return <ProfileSkeleton />;
    }

    if (!user) {
        return <p>Please log in to view your profile.</p>;
    }
    
    const getInitials = (name?: string | null) => {
        if (!name) return 'U';
        const names = name.split(' ');
        if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`;
        }
        return name[0];
    };


    return (
        <div className="space-y-8">
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col items-center gap-4 text-center md:flex-row md:text-left">
                        <Avatar className="h-24 w-24">
                            <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? ''} />
                            <AvatarFallback className="text-3xl">{getInitials(user.displayName)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                            <h1 className="text-2xl font-bold font-headline">{user.displayName}</h1>
                            <p className="text-muted-foreground">{user.email}</p>
                            <p className="text-sm text-muted-foreground">VIT Vellore, 1st Year</p>
                        </div>
                        <Button variant="outline"><Edit className="mr-2 h-4 w-4" /> Edit Profile</Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-muted-foreground">Events Attended</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{userProfile.eventsAttended}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-muted-foreground">Campus Rank</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">#{userProfile.campusRank}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-muted-foreground">Current Tier</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{userProfile.tier}</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Badges</CardTitle>
                    <CardDescription>Your collection of achievements.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex space-x-6 overflow-x-auto pb-4">
                         {userProfile.badges.length > 0 ? (
                            userProfile.badges.map(badge => (
                                <div key={badge.id} className="flex flex-col items-center gap-2 text-center w-24 flex-shrink-0">
                                <div className="p-4 rounded-full bg-secondary">
                                    <badge.icon className="h-8 w-8 text-secondary-foreground" />
                                </div>
                                <span className="text-sm font-medium">{badge.name}</span>
                                </div>
                            ))
                        ) : (
                            <p className='text-muted-foreground'>You haven't earned any badges yet.</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function ProfileSkeleton() {
    return (
        <div className="space-y-8">
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col items-center gap-4 md:flex-row">
                        <Skeleton className="h-24 w-24 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-8 w-48" />
                            <Skeleton className="h-4 w-64" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                        <Skeleton className="h-10 w-32" />
                    </div>
                </CardContent>
            </Card>
            <div className="grid gap-6 md:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader>
                             <Skeleton className="h-4 w-24" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-12" />
                        </CardContent>
                    </Card>
                ))}
            </div>
            <Card>
                 <CardHeader>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                    <div className="flex space-x-6">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex flex-col items-center gap-2">
                                <Skeleton className="h-16 w-16 rounded-full" />
                                <Skeleton className="h-4 w-20" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
