'use client';
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { School, Users, Calendar, IndianRupee, Loader2 } from "lucide-react";
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where, Timestamp, addDoc, serverTimestamp } from 'firebase/firestore';
import type { Workshop, WorkshopRegistration } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

declare global {
    interface Window {
        Razorpay: any;
    }
}

export default function StudentWorkshopsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [workshops, setWorkshops] = useState<Workshop[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPaying, setIsPaying] = useState<string | null>(null);
    const [registeredWorkshopIds, setRegisteredWorkshopIds] = useState<string[]>([]);
    
    // In a real app, this user profile data would be fetched from Firestore
    const userProfile = {
        college: 'VIT Vellore',
        year: 1,
        domains: ['web-dev', 'ai-ml'],
        id: user?.uid
    };

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        const fetchWorkshops = async () => {
            setIsLoading(true);
            try {
                // Fetch workshops user is already registered for
                const registrationQuery = query(collection(db, 'workshopRegistrations'), where('userId', '==', user.uid));
                const registrationSnapshot = await getDocs(registrationQuery);
                const registeredIds = registrationSnapshot.docs.map(doc => doc.data().workshopId);
                setRegisteredWorkshopIds(registeredIds);

                // Fetch all upcoming workshops
                const workshopsQuery = query(
                    collection(db, 'workshops'), 
                    where('registrationDeadline', '>', Timestamp.now())
                );

                const querySnapshot = await getDocs(workshopsQuery);
                const fetchedWorkshops: Workshop[] = [];
                querySnapshot.forEach((doc) => {
                    const workshop = { id: doc.id, ...doc.data() } as Workshop;

                    // Basic filtering logic
                    const isNotRegistered = !registeredIds.includes(workshop.id!);
                    const isForEveryone = workshop.clustering === 'multi-campus';
                    const isForMyCollege = workshop.collegeIds && workshop.collegeIds.includes(userProfile.college);
                    const yearMatch = workshop.targetYears.includes(userProfile.year);

                    if (isNotRegistered && yearMatch && (isForEveryone || isForMyCollege)) {
                       fetchedWorkshops.push(workshop);
                    }
                });
                setWorkshops(fetchedWorkshops);
            } catch (error) {
                console.error("Error fetching workshops: ", error);
                toast({ title: "Error", description: "Could not fetch workshops.", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };

        fetchWorkshops();
    }, [user, toast]);

    const handleRegistration = async (workshop: Workshop) => {
        if (!user || !workshop.id) return;
        
        if (workshop.isFree) {
            setIsPaying(workshop.id);
            try {
                await addDoc(collection(db, 'workshopRegistrations'), {
                    workshopId: workshop.id,
                    userId: user.uid,
                    collegeId: userProfile.college,
                    paymentStatus: 'success', // Free, so success
                    attended: false,
                    feedbackSubmitted: false,
                    registrationDate: serverTimestamp(),
                });
                toast({ title: "Success!", description: `You've registered for ${workshop.title}.` });
                setRegisteredWorkshopIds(prev => [...prev, workshop.id!]);
            } catch (error) {
                console.error("Error in free registration:", error);
                toast({ title: 'Registration Failed', description: 'Could not complete free registration.', variant: 'destructive' });
            } finally {
                setIsPaying(null);
            }
            return;
        }

        setIsPaying(workshop.id);
        try {
            const orderRes = await fetch('/api/razorpay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: workshop.price, id: workshop.id, type: 'workshop' }),
            });

            if (!orderRes.ok) throw new Error('Failed to create Razorpay order.');
            
            const { order } = await orderRes.json();
            
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onerror = () => { throw new Error('Razorpay SDK failed to load.'); };
            script.onload = () => {
                const options = {
                    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                    amount: order.amount,
                    currency: order.currency,
                    name: 'REvamp Workshops',
                    description: `Payment for ${workshop.title}`,
                    order_id: order.id,
                    handler: async (response: any) => {
                         const verifyRes = await fetch('/api/razorpay', {
                            method: 'PUT',
                            body: JSON.stringify({
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_signature: response.razorpay_signature,
                            }),
                            headers: { 'Content-Type': 'application/json' },
                        });

                        const verifyData = await verifyRes.json();
                        if (verifyData.success) {
                            await addDoc(collection(db, 'workshopRegistrations'), {
                                workshopId: workshop.id,
                                userId: user.uid,
                                collegeId: userProfile.college,
                                paymentId: response.razorpay_payment_id,
                                paymentStatus: 'success',
                                attended: false,
                                feedbackSubmitted: false,
                                registrationDate: serverTimestamp(),
                            });
                             toast({ title: "Registration Successful!", description: `You're all set for ${workshop.title}!` });
                             setRegisteredWorkshopIds(prev => [...prev, workshop.id!]);
                        } else {
                            throw new Error('Payment verification failed.');
                        }
                    },
                    prefill: { name: user.displayName, email: user.email },
                    theme: { color: '#673AB7' },
                };
                const rzp = new window.Razorpay(options);
                rzp.on('payment.failed', (resp: any) => {
                    toast({ title: 'Payment Failed', description: resp.error.description, variant: 'destructive' });
                });
                rzp.open();
            };
            document.body.appendChild(script);

        } catch (err: any) {
            console.error('Payment Error:', err);
            toast({ title: 'Payment Error', description: err.message || 'Could not initiate payment.', variant: 'destructive' });
        } finally {
            // Note: setIsPaying(null) is handled in the Razorpay handler/failure callbacks
            // because the dialog closing is async.
            // We'll set a timeout here as a fallback.
             setTimeout(() => setIsPaying(null), 5000);
        }
    };
    
    const availableWorkshops = workshops.filter(ws => !registeredWorkshopIds.includes(ws.id!));

    return (
        <div className="space-y-8">
             <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Workshops</h1>
                    <p className="text-muted-foreground">Discover workshops to level-up your skills.</p>
                </div>
            </div>
            
            {isLoading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(3)].map((_, i) => <WorkshopCardSkeleton key={i} />)}
                </div>
            ) : availableWorkshops.length === 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle>All Caught Up!</CardTitle>
                        <CardDescription>No new workshops available for you right now.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg">
                        <School className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Check back later for new workshops!</p>
                    </CardContent>
                </Card>
            ) : (
                 <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {availableWorkshops.map(workshop => (
                        <Card key={workshop.id} className="flex flex-col">
                            <CardHeader>
                                <div className="relative aspect-video mb-4 rounded-lg overflow-hidden">
                                     <Image src={workshop.bannerUrl} alt={workshop.title} fill className="object-cover" />
                                </div>
                                <CardTitle>{workshop.title}</CardTitle>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
                                    <Calendar className="h-4 w-4" />
                                    <span>{format(workshop.date.toDate(), 'PPP')}</span>
                                </div>
                                <CardDescription className="pt-2 line-clamp-3">{workshop.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-4">
                                 <div className="flex flex-wrap gap-2">
                                    {workshop.domains.map(d => <Badge key={d} variant="secondary">{d}</Badge>)}
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-semibold text-muted-foreground flex items-center gap-1"><Users className="h-4 w-4" /> Seats</span>
                                    <Badge variant="outline">{workshop.maxSeats}</Badge>
                                </div>
                                 <div className="flex items-center justify-between text-sm">
                                    <span className="font-semibold text-muted-foreground flex items-center gap-1"><IndianRupee className="h-4 w-4" /> Price</span>
                                    <Badge variant={workshop.isFree ? 'default' : 'destructive'}>
                                        {workshop.isFree ? 'Free' : `₹${workshop.price ? workshop.price / 100 : 'N/A'}`}
                                    </Badge>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full" onClick={() => handleRegistration(workshop)} disabled={isPaying === workshop.id}>
                                    {isPaying === workshop.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {isPaying === workshop.id ? 'Processing...' : workshop.isFree ? 'Register Now' : `Pay ₹${workshop.price ? workshop.price/100 : ''} to Register`}
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}

const WorkshopCardSkeleton = () => (
    <Card className="flex flex-col">
        <CardHeader>
            <Skeleton className="aspect-video w-full mb-4" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
            <Skeleton className="h-4 w-full mt-4" />
            <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent className="flex-grow space-y-4">
            <div className='flex gap-2'>
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-8 w-full" />
        </CardContent>
        <CardFooter>
            <Skeleton className="h-10 w-full" />
        </CardFooter>
    </Card>
);
