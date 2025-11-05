'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, orderBy, Timestamp, addDoc, serverTimestamp } from 'firebase/firestore';
import type { Event as EventType } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Calendar, Ticket, ArrowRight, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

declare global {
    interface Window {
        Razorpay: any;
    }
}

export default function EventsPage() {
    const [events, setEvents] = useState<EventType[]>([]);
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
        const fetchEvents = async () => {
            if (!user) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            try {
                const eventsRef = collection(db, 'events');
                
                const q = query(
                    eventsRef,
                    where('targetYears', 'array-contains', userProfile.year),
                    orderBy('date', 'asc')
                );

                const querySnapshot = await getDocs(q);
                const fetchedEvents: EventType[] = [];
                querySnapshot.forEach((doc) => {
                    const eventData = { id: doc.id, ...doc.data() } as EventType;
                    if (eventData.colleges.includes(userProfile.college) || eventData.domains.includes(userProfile.primaryDomain)) {
                       if (eventData.date.toDate() > new Date()) {
                         fetchedEvents.push(eventData);
                       }
                    }
                });
                setEvents(fetchedEvents);
            } catch (err: any) {
                console.error("Error fetching events:", err);
                setError(err.message || 'Failed to fetch events.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchEvents();
    }, [user]);

    const handleRegistration = async (event: EventType) => {
        if (!user || !event.id) return;

        if (event.isFree) {
            window.open(event.lumaUrl || '#', '_blank');
            return;
        }

        setIsPaying(event.id);
        try {
            // 1. Create Razorpay order
            const orderRes = await fetch('/api/razorpay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: event.price, eventId: event.id }),
            });

            if (!orderRes.ok) {
                throw new Error('Failed to create Razorpay order.');
            }

            const { order } = await orderRes.json();

            // 2. Load Razorpay script
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onerror = () => {
                throw new Error('Razorpay SDK failed to load.');
            };
            script.onload = async () => {
                 const options = {
                    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                    amount: order.amount,
                    currency: order.currency,
                    name: 'REvamp',
                    description: `Payment for ${event.title}`,
                    order_id: order.id,
                    handler: async function (response: any) {
                        // 3. Verify payment
                        const verifyRes = await fetch('/api/razorpay', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_signature: response.razorpay_signature,
                            }),
                        });
                        
                        if (!verifyRes.ok) {
                             throw new Error('Payment verification failed.');
                        }

                        // 4. Create registration document
                        await addDoc(collection(db, 'registrations'), {
                            userId: user.uid,
                            eventId: event.id,
                            paymentId: response.razorpay_payment_id,
                            paymentStatus: 'success',
                            attended: false,
                            registeredAt: serverTimestamp(),
                        });
                        
                        toast({
                            title: 'Payment Successful!',
                            description: "You're registered for the event.",
                        });

                        window.open(event.lumaUrl || '#', '_blank');
                    },
                    prefill: {
                        name: user.displayName || 'Anonymous',
                        email: user.email || '',
                    },
                    theme: {
                        color: '#673AB7',
                    },
                };
                
                const rzp = new window.Razorpay(options);
                rzp.on('payment.failed', function (response: any) {
                    console.error(response.error);
                    toast({
                        title: 'Payment Failed',
                        description: response.error.description || 'Something went wrong.',
                        variant: 'destructive',
                    });
                });

                rzp.open();
            };

            document.body.appendChild(script);

        } catch (err: any) {
            console.error('Payment Error:', err);
            toast({
                title: 'Payment Error',
                description: err.message || 'Could not initiate payment.',
                variant: 'destructive',
            });
        } finally {
            setIsPaying(null);
        }
    }

    const EventCard = ({ event }: { event: EventType }) => (
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
                <Button onClick={() => handleRegistration(event)} disabled={isPaying === event.id}>
                    {isPaying === event.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isPaying === event.id ? 'Processing...' : event.isFree ? 'Register' : 'Pay & Register'} 
                    {!isPaying && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
            </CardFooter>
        </Card>
    );

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

    return (
        <div className="container py-8">
            <h1 className="text-3xl font-bold font-headline mb-2">Discover Events</h1>
            <p className="text-muted-foreground mb-8">
                Find events tailored to your interests and college.
            </p>

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
            ) : events.length === 0 ? (
                 <Alert>
                    <Calendar className="h-4 w-4" />
                    <AlertTitle>No Events Found</AlertTitle>
                    <AlertDescription>There are no upcoming events matching your profile right now. Check back later!</AlertDescription>
                </Alert>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {events.map(event => (
                        <EventCard key={event.id} event={event} />
                    ))}
                </div>
            )}
        </div>
    );
}
