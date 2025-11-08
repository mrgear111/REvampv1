'use client';
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle, Users, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import type { Workshop } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { School } from 'lucide-react';
import Image from 'next/image';

export default function AdminWorkshopsPage() {
    const [workshops, setWorkshops] = useState<Workshop[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchWorkshops = async () => {
            setIsLoading(true);
            try {
                console.log('Fetching workshops for admin panel...');
                const workshopsQuery = query(collection(db, 'workshops'), orderBy('createdAt', 'desc'));
                console.log('Workshop query:', workshopsQuery);
                
                const querySnapshot = await getDocs(workshopsQuery);
                console.log('Query snapshot:', querySnapshot);
                console.log('Number of workshops found:', querySnapshot.size);
                
                const fetchedWorkshops: Workshop[] = [];
                querySnapshot.forEach((doc) => {
                    console.log('Workshop document:', doc.id, doc.data());
                    fetchedWorkshops.push({ id: doc.id, ...doc.data() } as Workshop);
                });
                
                console.log('Fetched workshops:', fetchedWorkshops);
                setWorkshops(fetchedWorkshops);
            } catch (error) {
                console.error("Error fetching workshops:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchWorkshops();
    }, []);

    return (
        <div className="space-y-8">
             <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Manage Workshops</h1>
                    <p className="text-muted-foreground">Create, edit, and view workshop details and attendees.</p>
                </div>
                <Button asChild>
                    <Link href="/admin/workshops/create">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create Workshop
                    </Link>
                </Button>
            </div>

            {isLoading ? (
                 <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i}><CardHeader><Skeleton className='w-full h-40 rounded-md' /></CardHeader><CardContent className='space-y-2'><Skeleton className='h-5 w-3/4' /><Skeleton className='h-4 w-1/2' /></CardContent><CardFooter className='gap-2'><Skeleton className='h-9 w-full' /><Skeleton className='h-9 w-full' /></CardFooter></Card>
                    ))}
                 </div>
            ) : workshops.length === 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle>No Workshops Found</CardTitle>
                        <CardDescription>No workshops have been created yet.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg">
                        <School className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Get started by creating a new workshop.</p>
                        <Button asChild className="mt-4">
                           <Link href="/admin/workshops/create">Create Workshop</Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                 <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {workshops.map(workshop => (
                        <Card key={workshop.id} className="flex flex-col">
                             <CardHeader className="p-0">
                                <div className="relative aspect-video w-full">
                                    <Image src={workshop.bannerUrl} alt={workshop.title} fill className="object-cover rounded-t-lg" />
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow pt-6 space-y-2">
                                <CardTitle className="line-clamp-1">{workshop.title}</CardTitle>
                                <CardDescription>{format(workshop.date.toDate(), 'PPP p')}</CardDescription>
                                <div className="flex items-center justify-between text-sm pt-2">
                                    <span className="font-semibold text-muted-foreground">Price</span>
                                    <Badge variant={workshop.price === 0 ? 'default' : 'outline'}>
                                        {workshop.price === 0 ? 'Free' : `₹${workshop.price}`}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-semibold text-muted-foreground">Capacity</span>
                                    <Badge variant="secondary">0 / {workshop.maxSeats}</Badge>
                                </div>
                            </CardContent>
                            <CardFooter className="grid grid-cols-3 gap-2">
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={`/admin/workshops/${workshop.id}/registrations`}>
                                        <Users className="mr-2 h-4 w-4" />View
                                    </Link>
                                </Button>
                                <Button variant="outline" size="sm" disabled><Edit className="mr-2 h-4 w-4" />Edit</Button>
                                <Button variant="destructive" size="sm" disabled><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}

    