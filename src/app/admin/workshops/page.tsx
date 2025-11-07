'use client';

import { Button } from "@/components/ui/button";
import { PlusCircle, Users, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

// Placeholder data until Firestore fetching is implemented
const dummyWorkshops = [
    {
        id: 'ws-1',
        title: 'Intro to AI with Gemini',
        description: 'A beginner-friendly workshop on leveraging Google\'s Gemini for building AI applications.',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        domains: ['ai-ml'],
        isFree: false,
        price: 49900, // in paise
        registrations: 23,
        maxSeats: 50,
    }
];


export default function AdminWorkshopsPage() {

    // In a real implementation, you'd fetch workshops from Firestore here.

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

            {dummyWorkshops.length === 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Upcoming Workshops</CardTitle>
                        <CardDescription>No workshops have been created yet.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">Get started by creating a new workshop.</p>
                        <Button asChild className="mt-4">
                           <Link href="/admin/workshops/create">Create Workshop</Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                 <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {dummyWorkshops.map(workshop => (
                        <Card key={workshop.id}>
                            <CardHeader>
                                <CardTitle>{workshop.title}</CardTitle>
                                <CardDescription>{format(workshop.date, 'PPP')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-semibold text-muted-foreground">Registrations</span>
                                    <Badge variant="secondary">{workshop.registrations} / {workshop.maxSeats}</Badge>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-semibold text-muted-foreground">Price</span>
                                    <Badge variant={workshop.isFree ? 'default' : 'outline'}>{workshop.isFree ? 'Free' : `₹${workshop.price / 100}`}</Badge>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {workshop.domains.map(d => <Badge key={d} variant="outline">{d}</Badge>)}
                                </div>
                            </CardContent>
                            <CardFooter className="grid grid-cols-3 gap-2">
                                <Button variant="outline" size="sm"><Users className="mr-2 h-4 w-4" />View</Button>
                                <Button variant="outline" size="sm"><Edit className="mr-2 h-4 w-4" />Edit</Button>
                                <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

        </div>
    )
}
