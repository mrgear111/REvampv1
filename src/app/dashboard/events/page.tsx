
'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import type { Event as EventType, Registration } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Calendar, Ticket, Video } from 'lucide-react';
import Image from 'next/image';
import { format, formatDistanceToNow } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface RegisteredEvent extends EventType {
    registration: Registration;
}

export default function EventsPage() {
    const [myEvents, setMyEvents] = useState<RegisteredEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();
    const lumaCalendarUrl = process.env.NEXT_PUBLIC_LUMA_CALENDAR_URL;

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        async function fetchRegisteredEvents() {
            setIsLoading(true);
            try {
                // 1. Fetch user's registrations
                const regsRef = collection(db, 'registrations');
                const regsQuery = query(regsRef, where('userId', '==', user?.uid));
                const regsSnapshot = await getDocs(regsQuery);
                const registrations = regsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as (Registration & {id: string})[];
                const registeredEventIds = registrations.map(r => r.eventId);

                // 2. Fetch event details for registered events
                const registeredEventsData: RegisteredEvent[] = [];
                if (registeredEventIds.length > 0) {
                    const eventsRef = collection(db, 'events');
                    const chunks = [];
                    for (let i = 0; i < registeredEventIds.length; i += 30) {
                        chunks.push(registeredEventIds.slice(i, i + 30));
                    }
                    for (const chunk of chunks) {
                        const eventsQuery = query(eventsRef, where('__name__', 'in', chunk));
                        const eventsSnapshot = await getDocs(eventsQuery);
                        eventsSnapshot.forEach(doc => {
                            const eventData = { id: doc.id, ...doc.data() } as EventType;
                            const registration = registrations.find(r => r.eventId === doc.id);
                            if (registration) {
                                registeredEventsData.push({ ...eventData, registration });
                            }
                        });
                    }
                }
                setMyEvents(registeredEventsData.sort((a,b) => b.date.toMillis() - a.date.toMillis()));

            } catch (err: any) {
                console.error("Error fetching registered events:", err);
                setError(err.message || 'Failed to fetch your events.');
            } finally {
                setIsLoading(false);
            }
        }
        
        fetchRegisteredEvents();
    }, [user]);

    
    const upcomingEvents = myEvents.filter(e => e.date.toDate() > new Date());
    const pastEvents = myEvents.filter(e => e.date.toDate() <= new Date());

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold font-headline">Events</h1>
            
            <Tabs defaultValue="discover" className="w-full">
                <TabsList className='grid w-full grid-cols-2'>
                    <TabsTrigger value="discover">Discover Events</TabsTrigger>
                    <TabsTrigger value="my-events">My Events</TabsTrigger>
                </TabsList>
                <TabsContent value="discover">
                    <p className="text-muted-foreground my-4">Explore and register for upcoming events from our community.</p>
                     <div className='rounded-lg overflow-hidden'>
                        {lumaCalendarUrl ? (
                            <iframe 
                                src={lumaCalendarUrl}
                                width="100%" 
                                height="800" 
                                frameBorder="0"
                                allowFullScreen
                                aria-hidden="false"
                                tabIndex={0}
                                style={{
                                    border: '1px solid #bfcbda88',
                                    borderRadius: '4px'
                                }}
                            ></iframe>
                        ) : (
                            <Alert variant="destructive">
                                <AlertTitle>Configuration Missing</AlertTitle>
                                <AlertDescription>
                                    The Luma calendar URL is not set. Please add `NEXT_PUBLIC_LUMA_CALENDAR_URL` to your `.env` file.
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                </TabsContent>
                <TabsContent value="my-events">
                     <p className="text-muted-foreground my-4">Here are the events you've registered for.</p>
                     {isLoading ? (
                         <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {[...Array(3)].map((_, i) => <EventCardSkeleton key={i} />)}
                        </div>
                     ) : error ? (
                        <Alert variant="destructive">
                            <Ticket className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                     ) : myEvents.length === 0 ? (
                        <Alert>
                            <Ticket className="h-4 w-4" />
                            <AlertTitle>No Registered Events</AlertTitle>
                            <AlertDescription>You haven't registered for any events yet. Check out the Discover tab!</AlertDescription>
                        </Alert>
                     ) : (
                        <div className='space-y-6'>
                            <div>
                                <h2 className='text-xl font-bold mb-4'>Upcoming ({upcomingEvents.length})</h2>
                                {upcomingEvents.length > 0 ? (
                                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                       {upcomingEvents.map(event => (
                                            <MyEventCard key={event.id} event={event} />
                                        ))}
                                    </div>
                                ) : <p className='text-muted-foreground text-sm'>No upcoming events.</p>}
                            </div>
                             <div>
                                <h2 className='text-xl font-bold mb-4'>Past ({pastEvents.length})</h2>
                                {pastEvents.length > 0 ? (
                                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                       {pastEvents.map(event => (
                                            <MyEventCard key={event.id} event={event} />
                                        ))}
                                    </div>
                                ) : <p className='text-muted-foreground text-sm'>No past events.</p>}
                            </div>
                        </div>
                     )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

const MyEventCard = ({ event }: { event: RegisteredEvent }) => {
    const isUpcoming = event.date.toDate() > new Date();
    const isJoinable = isUpcoming && (event.date.toDate().getTime() - new Date().getTime()) < 60 * 60 * 1000;
    
    return (
        <div className="flex flex-col overflow-hidden transition-all hover:shadow-lg rounded-lg border bg-card">
            <div className="relative aspect-video w-full">
                <Image src={event.bannerUrl} alt={event.title} fill className="object-cover" />
                 <Badge className='absolute top-2 right-2' variant={event.registration.attended ? 'default' : 'secondary'}>
                    {event.registration.attended ? 'Attended' : isUpcoming ? 'Registered' : 'Not Attended'}
                </Badge>
            </div>
            <div className="p-6 flex-grow">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Calendar className="h-4 w-4" />
                    <span>{format(event.date.toDate(), 'PPP, p')}</span>
                </div>
                <h3 className="font-headline text-xl mb-2">{event.title}</h3>
                {isUpcoming && <p className='text-sm text-primary font-semibold'>Starts {formatDistanceToNow(event.date.toDate(), { addSuffix: true })}</p>}
            </div>
            <div className="p-6 bg-muted/50">
                {isUpcoming ? (
                    <Button className='w-full' disabled={!isJoinable} asChild>
                        <a href={event.lumaUrl} target="_blank" rel="noopener noreferrer">
                            <Video className='mr-2 h-4 w-4'/> Join Event
                        </a>
                    </Button>
                ) : (
                    <Button variant='secondary' className='w-full' disabled={!event.registration.attended}>Download Certificate</Button>
                )}
            </div>
        </div>
    );
};


 const EventCardSkeleton = () => (
    <div className="flex flex-col overflow-hidden rounded-lg border bg-card">
        <Skeleton className="w-full aspect-video" />
        <div className="p-6 space-y-4">
             <Skeleton className="h-4 w-3/4" />
             <Skeleton className="h-6 w-full" />
             <div className="flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
             </div>
        </div>
        <div className="p-6 bg-muted/50 flex justify-between items-center">
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-10 w-1/3" />
        </div>
    </div>
);
    
