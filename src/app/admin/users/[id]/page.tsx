'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Trophy,
  Calendar,
  School,
  Star,
  Clock,
  BookOpen,
  Award,
  User as UserIcon
} from 'lucide-react';
import type { User, Workshop, Event as EventType, AmbassadorApplication, Badge as BadgeType } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

interface UserDetails extends User {
  id: string;
  workshops: Array<Workshop & { status: string }>;
  events: Array<EventType & { status: string }>;
  ambassadorApplication?: AmbassadorApplication;
}

export default function UserDetailsPage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState<UserDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserDetails = async () => {
      setIsLoading(true);
      try {
        // Fetch user data
        const userRef = doc(db, 'users', params.id);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          throw new Error('User not found');
        }

        const userData = { id: userSnap.id, ...userSnap.data() } as UserDetails;

        // Fetch workshop registrations
        const workshopRegsQuery = query(
          collection(db, 'workshopRegistrations'),
          where('userId', '==', params.id)
        );
        const workshopRegsSnap = await getDocs(workshopRegsQuery);
        const workshopRegistrations = workshopRegsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Fetch workshops
        const workshops: Array<Workshop & { status: string }> = [];
        for (const reg of workshopRegistrations) {
          const workshopRef = doc(db, 'workshops', reg.workshopId);
          const workshopSnap = await getDoc(workshopRef);
          if (workshopSnap.exists()) {
            workshops.push({
              id: workshopSnap.id,
              ...workshopSnap.data(),
              status: reg.attended ? 'attended' : 'registered'
            } as Workshop & { status: string });
          }
        }

        // Fetch event registrations
        const eventRegsQuery = query(
          collection(db, 'registrations'),
          where('userId', '==', params.id)
        );
        const eventRegsSnap = await getDocs(eventRegsQuery);
        const eventRegistrations = eventRegsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Fetch events
        const events: Array<EventType & { status: string }> = [];
        for (const reg of eventRegistrations) {
          const eventRef = doc(db, 'events', reg.eventId);
          const eventSnap = await getDoc(eventRef);
          if (eventSnap.exists()) {
            events.push({
              id: eventSnap.id,
              ...eventSnap.data(),
              status: reg.attended ? 'attended' : 'registered'
            } as EventType & { status: string });
          }
        }

        // Fetch ambassador application if exists
        const ambassadorAppQuery = query(
          collection(db, 'ambassadorApplications'),
          where('userId', '==', params.id)
        );
        const ambassadorAppSnap = await getDocs(ambassadorAppQuery);
        const ambassadorApp = ambassadorAppSnap.docs[0]?.data() as AmbassadorApplication | undefined;

        setUser({
          ...userData,
          workshops,
          events,
          ambassadorApplication: ambassadorApp
        });

      } catch (error) {
        console.error('Error fetching user details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchUserDetails();
    }
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-[200px]" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[200px]" />
          <Skeleton className="h-[200px]" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <div>User not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/users">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Link>
        </Button>
      </div>

      {/* User Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.photoURL} />
              <AvatarFallback>{user.name[0]}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <CardTitle className="text-2xl">{user.name}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
              <div className="flex gap-2 pt-2">
                <Badge variant="outline" className="capitalize">
                  {user.role}
                </Badge>
                <Badge className={getTierColor(user.tier)}>
                  {user.tier}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Points</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user.points}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Streak</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user.streak} days</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">College</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">{user.college}</div>
            <p className="text-xs text-muted-foreground">Year {user.year}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Member Since</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {format(user.createdAt.toDate(), 'MMM d, yyyy')}
            </div>
            <p className="text-xs text-muted-foreground">
              Last active: {user.lastActiveDate ? format(user.lastActiveDate.toDate(), 'MMM d, yyyy') : 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information Tabs */}
      <Tabs defaultValue="activities">
        <TabsList>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="domains">Domains & Skills</TabsTrigger>
          {user.role === 'ambassador' && (
            <TabsTrigger value="ambassador">Ambassador Details</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="activities" className="space-y-4">
          <h3 className="text-lg font-semibold mb-4">Events & Workshops</h3>
          
          {/* Events */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground">Events</h4>
            {user.events.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {user.events.map(event => (
                  <Card key={event.id}>
                    <CardHeader>
                      <CardTitle className="text-base">{event.title}</CardTitle>
                      <CardDescription>
                        {format(event.date.toDate(), 'MMM d, yyyy')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Badge variant={event.status === 'attended' ? 'default' : 'secondary'}>
                        {event.status}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No events registered</p>
            )}
          </div>

          {/* Workshops */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground">Workshops</h4>
            {user.workshops.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {user.workshops.map(workshop => (
                  <Card key={workshop.id}>
                    <CardHeader>
                      <CardTitle className="text-base">{workshop.title}</CardTitle>
                      <CardDescription>
                        {format(workshop.date.toDate(), 'MMM d, yyyy')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Badge variant={workshop.status === 'attended' ? 'default' : 'secondary'}>
                        {workshop.status}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No workshops registered</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="domains" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Domains & Expertise</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">Primary Domain</h4>
                <Badge variant="default">{user.primaryDomain}</Badge>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold mb-2">All Domains</h4>
                <div className="flex flex-wrap gap-2">
                  {user.domains.map(domain => (
                    <Badge key={domain} variant="secondary">{domain}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Badges Earned</h4>
                <div className="flex flex-wrap gap-2">
                  {user.badges.map(badge => (
                    <Badge key={badge} variant="outline">
                      <Award className="h-3 w-3 mr-1" />
                      {badge}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {user.role === 'ambassador' && (
          <TabsContent value="ambassador" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ambassador Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {user.ambassadorApplication ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Application Status</h4>
                      <Badge variant={
                        user.ambassadorApplication.status === 'approved' ? 'default' :
                        user.ambassadorApplication.status === 'pending' ? 'secondary' : 'destructive'
                      }>
                        {user.ambassadorApplication.status}
                      </Badge>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Why They Applied</h4>
                      <p className="text-sm text-muted-foreground">{user.ambassadorApplication.answers.why}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold mb-2">What They'll Do</h4>
                      <p className="text-sm text-muted-foreground">{user.ambassadorApplication.answers.what}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold mb-2">Leadership Experience</h4>
                      <p className="text-sm text-muted-foreground">{user.ambassadorApplication.answers.experience}</p>
                    </div>

                    {user.ambassadorApplication.videoUrl && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Video Introduction</h4>
                        <Button variant="outline" asChild>
                          <a href={user.ambassadorApplication.videoUrl} target="_blank" rel="noopener noreferrer">
                            Watch Video
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No ambassador application found</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function getTierColor(tier: string) {
  switch (tier) {
    case 'Bronze': return 'text-orange-600 bg-orange-100';
    case 'Silver': return 'text-slate-600 bg-slate-100';
    case 'Gold': return 'text-yellow-600 bg-yellow-100';
    case 'Platinum': return 'text-purple-600 bg-purple-100';
    default: return 'text-gray-600 bg-gray-100';
  }
}