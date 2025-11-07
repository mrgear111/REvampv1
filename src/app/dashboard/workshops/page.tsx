'use client';
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { School, Users, Calendar, IndianRupee, Loader2, ArrowRight } from "lucide-react";
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
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
                // Fetch all upcoming workshops
                const workshopsQuery = query(
                    collection(db, 'workshops'), 
                    where('date', '>', Timestamp.now())
                );

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
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-semibold text-muted-foreground flex items-center gap-1"><Users className="h-4 w-4" /> Seats</span>
                                    <Badge variant="outline">{workshop.maxSeats}</Badge>
                                </div>
                                 <div className="flex items-center justify-between text-sm">
                                    <span className="font-semibold text-muted-foreground flex items-center gap-1"><IndianRupee className="h-4 w-4" /> Price</span>
                                    <Badge variant={workshop.price === 0 ? 'default' : 'destructive'}>
                                        {workshop.price === 0 ? 'Free' : `₹${workshop.price ? workshop.price / 100 : 'N/A'}`}
                                    </Badge>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full" asChild>
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
        <CardHeader>
            <Skeleton className="aspect-video w-full mb-4" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
            <Skeleton className="h-4 w-full mt-4" />
            <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent className="flex-grow space-y-4">
            <div className='flex justify-between'>
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
            </div>
             <div className='flex justify-between'>
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
            </div>
        </CardContent>
        <CardFooter>
            <Skeleton className="h-10 w-full" />
        </CardFooter>
    </Card>
);
