'use client';
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { School, Users, Calendar, IndianRupee, ArrowRight } from "lucide-react";
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where, Timestamp, orderBy } from 'firebase/firestore';
import type { Workshop } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import Link from 'next/link';

export default function StudentWorkshopsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [workshops, setWorkshops] = useState<Workshop[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        const fetchWorkshops = async () => {
            setIsLoading(true);
            try {
                console.log('Fetching workshops for dashboard...');
                // Fetch all workshops, not just upcoming ones
                const workshopsQuery = query(
                    collection(db, 'workshops'), 
                    orderBy('date', 'desc')
                );
                
                // For debugging
                const workshopsCollection = collection(db, 'workshops');
                console.log('Workshops collection reference:', workshopsCollection);

                const querySnapshot = await getDocs(workshopsQuery);
                const fetchedWorkshops: Workshop[] = [];
                querySnapshot.forEach((doc) => {
                    fetchedWorkshops.push({ id: doc.id, ...doc.data() } as Workshop);
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
            ) : workshops.length === 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle>All Caught Up!</CardTitle>
                        <CardDescription>No new workshops available right now.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg">
                        <School className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Check back later for new workshops!</p>
                    </CardContent>
                </Card>
            ) : (
                 <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {workshops.map(workshop => (
                        <Card key={workshop.id} className="flex flex-col">
                            <CardHeader className="p-0">
                                <div className="relative aspect-video w-full rounded-t-lg overflow-hidden">
                                     <Image src={workshop.bannerUrl} alt={workshop.title} fill className="object-cover" />
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow pt-6 space-y-2">
                                <CardTitle className="line-clamp-2">{workshop.title}</CardTitle>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
                                    <Calendar className="h-4 w-4" />
                                    <span>{format(workshop.date.toDate(), 'PPP')}</span>
                                </div>
                                <CardDescription className="pt-2 line-clamp-3">{workshop.description}</CardDescription>
                            </CardContent>
                            <CardFooter className="flex-col items-start gap-4 pt-4">
                                <div className="flex justify-between w-full text-sm">
                                    <div className="font-semibold text-muted-foreground flex items-center gap-1.5"><Users className="h-4 w-4" /> Seats</div>
                                    <Badge variant="outline">{workshop.maxSeats}</Badge>
                                </div>
                                <div className="flex justify-between w-full text-sm">
                                    <div className="font-semibold text-muted-foreground flex items-center gap-1.5"><IndianRupee className="h-4 w-4" /> Price</div>
                                    <Badge variant={workshop.price === 0 ? 'default' : 'destructive'}>
                                        {workshop.price === 0 ? 'Free' : `₹${workshop.price}`}
                                    </Badge>
                                </div>
                                <Button className="w-full mt-2" asChild>
                                  <Link href={`/workshops/${workshop.id}`}>
                                    View Details <ArrowRight className="ml-2 h-4 w-4" />
                                  </Link>
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
        <CardHeader className="p-0">
            <Skeleton className="aspect-video w-full rounded-t-lg" />
        </CardHeader>
        <CardContent className="flex-grow pt-6 space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full mt-2" />
            <Skeleton className="h-4 w-5/6" />
        </CardContent>
        <CardFooter className="flex-col items-start gap-4 pt-4">
             <div className='flex justify-between w-full'>
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
            </div>
             <div className='flex justify-between w-full'>
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-10 w-full mt-2" />
        </CardFooter>
    </Card>
);

    