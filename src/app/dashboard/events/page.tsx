'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, orderBy, Timestamp, addDoc, serverTimestamp, collectionGroup } from 'firebase/firestore';
import type { Event as EventType, Registration } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Calendar, Ticket, ArrowRight, Loader2, CheckCircle, Video } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

declare global {
    interface Window {
        Razorpay: any;
    }
}

interface RegisteredEvent extends EventType {
    registration: Registration;
}

export default function EventsPage() {
    const [myEvents, setMyEvents] = useState<RegisteredEvent[]>([]);
    const [allEvents, setAllEvents] = useState<EventType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPaying, setIsPaying] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();
    const { toast } = useToast();

    // This is a placeholder. In a real app, you'd fetch this from the user's profile in firestore.
    const userProfile = {
        college: 'vit-vellore',
        year: 1,
        primaryDomain: 'web-dev'
    };

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        async function fetchAllData() {
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
                    // Firestore 'in' query is limited to 10 items. For more, you'd need multiple queries.
                    const eventsQuery = query(eventsRef, where('__name__', 'in', registeredEventIds));
                    const eventsSnapshot = await getDocs(eventsQuery);
                    
                    eventsSnapshot.forEach(doc => {
                        const eventData = { id: doc.id, ...doc.data() } as EventType;
                        const registration = registrations.find(r => r.eventId === doc.id);
                        if (registration) {
                            registeredEventsData.push({ ...eventData, registration });
                        }
                    });
                }
                setMyEvents(registeredEventsData);

                // 3. Fetch all discoverable events
                const allEventsRef = collection(db, 'events');
                const allEventsQuery = query(
                    allEventsRef,
                    where('targetYears', 'array-contains', userProfile.year),
                    orderBy('date', 'asc')
                );

                const allEventsSnapshot = await getDocs(allEventsQuery);
                const fetchedEvents: EventType[] = [];
                allEventsSnapshot.forEach((doc) => {
                    const eventData = { id: doc.id, ...doc.data() } as EventType;
                    if (eventData.colleges.includes(userProfile.college) || eventData.domains.includes(userProfile.primaryDomain)) {
                       if (eventData.date.toDate() > new Date() && !registeredEventIds.includes(eventData.id!)) {
                         fetchedEvents.push(eventData);
                       }
                    }
                });
                setAllEvents(fetchedEvents);

            } catch (err: any) {
                console.error("Error fetching events:", err);
                setError(err.message || 'Failed to fetch events.');
            } finally {
                setIsLoading(false);
            }
        }
        
        fetchAllData();
    }, [user]);

    const handleRegistration = async (event: EventType) => {
        if (!user || !event.id) return;
        if (myEvents.some(e => e.id === event.id)) {
            toast({ title: "Already Registered", description: `You are already registered for ${event.title}.`});
            return;
        }

        if (event.isFree) {
             // In a real app, check for verification status before giving Luma link
            window.open(event.lumaUrl || '#', '_blank');
            return;
        }

        setIsPaying(event.id);
        try {
            const orderRes = await fetch('/api/razorpay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: event.price, eventId: event.id }),
            });

            if (!orderRes.ok) {
                const errorData = await orderRes.json();
                throw new Error(errorData.error || 'Failed to create Razorpay order.');
            }

            const { order } = await orderRes.json();

            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onerror = () => { throw new Error('Razorpay SDK failed to load.'); };
            script.onload = async () => {
                 const options = {
                    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                    amount: order.amount,
                    currency: order.currency,
                    name: 'REvamp',
                    description: `Payment for ${event.title}`,
                    order_id: order.id,
                    handler: async function (response: any) {
                        const verifyRes = await fetch('/api/razorpay', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_signature: response.razorpay_signature,
                            }),
                        });
                        
                        if (!verifyRes.ok) { throw new Error('Payment verification failed.'); }
                        
                        const verificationData = await verifyRes.json();

                        if (verificationData.success) {
                            const registrationData: Omit<Registration, 'id'> = {
                                userId: user.uid,
                                eventId: event.id!,
                                paymentId: response.razorpay_payment_id,
                                paymentStatus: "success",
                                attended: false,
                                registeredAt: serverTimestamp() as Timestamp,
                            };
                            const newRegDoc = await addDoc(collection(db, "registrations"), registrationData);

                            setMyEvents(prev => [...prev, { ...event, registration: {...registrationData, id: newRegDoc.id} as Registration & {id: string}}]);
                            setAllEvents(prev => prev.filter(e => e.id !== event.id));
                            
                            toast({ title: "Registration Successful", description: `You're all set for ${event.title}!` });
                            if (event.lumaUrl) window.open(event.lumaUrl, "_blank");
                        } else {
                            throw new Error('Payment verification failed.');
                        }
                    },
                    prefill: {
                        name: user.displayName || 'Anonymous',
                        email: user.email || '',
                    },
                    theme: { color: '#673AB7' },
                };
                
                const rzp = new window.Razorpay(options);
                rzp.on('payment.failed', function (response: any) {
                    console.error(response.error);
                    toast({ title: 'Payment Failed', description: response.error.description || 'Something went wrong.', variant: 'destructive'});
                });
                rzp.open();
            };
            document.body.appendChild(script);
        } catch (err: any) {
            console.error('Payment Error:', err);
            toast({ title: 'Payment Error', description: err.message || 'Could not initiate payment.', variant: 'destructive' });
        } finally {
            setIsPaying(null);
        }
    }
    
    const upcomingEvents = myEvents.filter(e => e.date.toDate() > new Date());
    const pastEvents = myEvents.filter(e => e.date.toDate() <= new Date());

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold font-headline">Events</h1>
            
            <Tabs defaultValue="discover" className="w-full">
                <TabsList className='grid w-full grid-cols-2'>
                    <TabsTrigger value="discover">Discover</TabsTrigger>
                    <TabsTrigger value="my-events">My Events</TabsTrigger>
                </TabsList>
                <TabsContent value="discover">
                     <p className="text-muted-foreground my-4">Find events tailored to your interests and college.</p>
                     {isLoading ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {[...Array(3)].map((_, i) => <EventCardSkeleton key={i} />)}
                        </div>
                    ) : error ? (
                        <Alert variant="destructive">
                            <Ticket className="h-4 w-4" />
                            <AlertTitle>Error Fetching Events</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    ) : allEvents.length === 0 ? (
                        <Alert>
                            <Calendar className="h-4 w-4" />
                            <AlertTitle>No New Events</AlertTitle>
                            <AlertDescription>There are no new events matching your profile right now. Check back later!</AlertDescription>
                        </Alert>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {allEvents.map(event => (
                                <EventCard key={event.id} event={event} onRegister={handleRegistration} isPaying={isPaying} />
                            ))}
                        </div>
                    )}
                </TabsContent>
                <TabsContent value="my-events">
                     <p className="text-muted-foreground my-4">Here are the events you've registered for.</p>
                     {isLoading ? (
                         <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {[...Array(3)].map((_, i) => <EventCardSkeleton key={i} />)}
                        </div>
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


const EventCard = ({ event, onRegister, isPaying }: { event: EventType, onRegister: (event: EventType) => void, isPaying: string | null }) => (
    <Card className="flex flex-col overflow-hidden transition-all hover:shadow-lg">
        <CardHeader className="p-0">
            <div className="relative aspect-video w-full">
                <Image src={event.bannerUrl} alt={event.title} fill className="object-cover" />
            </div>
        </CardHeader>
        <CardContent className="p-6 flex-grow">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Calendar className="h-4 w-4" />
                <span>{format(event.date.toDate(), 'PPP, p')}</span>
            </div>
            <CardTitle className="font-headline text-xl mb-2">{event.title}</CardTitle>
            <div className="flex flex-wrap gap-2">
                {event.domains.map(domain => <Badge key={domain} variant="secondary">{domain}</Badge>)}
            </div>
        </CardContent>
        <CardFooter className="p-6 bg-muted/50 flex justify-between items-center">
             <div>
                <span className="font-bold text-lg">{event.isFree ? 'Free' : `₹${event.price / 100}`}</span>
            </div>
            <Button onClick={() => onRegister(event)} disabled={isPaying === event.id}>
                {isPaying === event.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isPaying === event.id ? 'Processing...' : event.isFree ? 'Register' : 'Pay & Register'} 
                {!isPaying && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
        </CardFooter>
    </Card>
);

const MyEventCard = ({ event }: { event: RegisteredEvent }) => {
    const isUpcoming = event.date.toDate() > new Date();
    const isJoinable = isUpcoming && (event.date.toDate().getTime() - new Date().getTime()) < 60 * 60 * 1000;
    
    return (
        <Card className="flex flex-col overflow-hidden">
            <CardHeader className="p-0">
                <div className="relative aspect-video w-full">
                    <Image src={event.bannerUrl} alt={event.title} fill className="object-cover" />
                     <Badge className='absolute top-2 right-2' variant={event.registration.attended ? 'default' : 'secondary'}>
                        {event.registration.attended ? 'Attended' : isUpcoming ? 'Registered' : 'Not Attended'}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-6 flex-grow">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Calendar className="h-4 w-4" />
                    <span>{format(event.date.toDate(), 'PPP, p')}</span>
                </div>
                <CardTitle className="font-headline text-xl mb-2">{event.title}</CardTitle>
                {isUpcoming && <p className='text-sm text-primary font-semibold'>Starts {formatDistanceToNow(event.date.toDate(), { addSuffix: true })}</p>}
            </CardContent>
            <CardFooter className="p-6 bg-muted/50">
                {isUpcoming ? (
                    <Button className='w-full' disabled={!isJoinable} asChild>
                        <a href={event.meetLink} target="_blank" rel="noopener noreferrer">
                            <Video className='mr-2 h-4 w-4'/> Join Meet
                        </a>
                    </Button>
                ) : (
                    <Button variant='secondary' className='w-full' disabled={!event.registration.attended}>Download Certificate</Button>
                )}
            </CardFooter>
        </Card>
    );
};

 const EventCardSkeleton = () => (
    <Card className="flex flex-col overflow-hidden">
        <Skeleton className="w-full aspect-video" />
        <CardContent className="p-6 space-y-4">
             <Skeleton className="h-4 w-3/4" />
             <Skeleton className="h-6 w-full" />
             <div className="flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
             </div>
        </CardContent>
        <CardFooter className="p-6 bg-muted/50 flex justify-between items-center">
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-10 w-1/3" />
        </CardFooter>
    </Card>
);
