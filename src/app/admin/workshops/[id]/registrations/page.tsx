
'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import type { WorkshopRegistration, Workshop } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Users, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function WorkshopRegistrationsPage({ params }: { params: { id: string } }) {
    const [registrations, setRegistrations] = useState<WorkshopRegistration[]>([]);
    const [workshop, setWorkshop] = useState<Workshop | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchRegistrations = async () => {
            setIsLoading(true);
            try {
                // Fetch workshop details
                const workshopRef = doc(db, 'workshops', params.id);
                const workshopSnap = await getDoc(workshopRef);
                if (!workshopSnap.exists()) {
                    throw new Error("Workshop not found.");
                }
                setWorkshop({ id: workshopSnap.id, ...workshopSnap.data() } as Workshop);

                // Fetch registrations
                const regsQuery = query(
                    collection(db, 'workshopRegistrations'),
                    where('workshopId', '==', params.id),
                    orderBy('registrationDate', 'desc')
                );
                const querySnapshot = await getDocs(regsQuery);
                const fetchedRegistrations: WorkshopRegistration[] = [];
                querySnapshot.forEach((doc) => {
                    fetchedRegistrations.push({ id: doc.id, ...doc.data() } as WorkshopRegistration);
                });
                setRegistrations(fetchedRegistrations);
            } catch (err: any) {
                console.error("Error fetching registrations:", err);
                setError(err.message || "Failed to fetch data.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchRegistrations();
    }, [params.id]);

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <Button variant="outline" asChild><Link href="/admin/workshops">← Back to Workshops</Link></Button>
                    <h1 className="text-3xl font-bold font-headline mt-4">Workshop Registrations</h1>
                    <p className="text-muted-foreground">
                        {isLoading ? <Skeleton className="h-4 w-64 mt-1" /> : `Viewing attendees for: ${workshop?.title}`}
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users />
                        Attendees ({registrations.length} / {workshop?.maxSeats})
                    </CardTitle>
                    <CardDescription>
                        List of all individuals registered for this workshop.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-2">
                            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                        </div>
                    ) : error ? (
                        <Alert variant="destructive">
                            <XCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    ) : registrations.length === 0 ? (
                        <Alert>
                            <Users className="h-4 w-4" />
                            <AlertTitle>No Registrations Yet</AlertTitle>
                            <AlertDescription>No one has registered for this workshop yet.</AlertDescription>
                        </Alert>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Organization</TableHead>
                                    <TableHead>Registered On</TableHead>
                                    <TableHead>Payment Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {registrations.map(reg => (
                                    <TableRow key={reg.id}>
                                        <TableCell className="font-medium">{reg.name}</TableCell>
                                        <TableCell>{reg.email}</TableCell>
                                        <TableCell>{reg.phone}</TableCell>
                                        <TableCell>{reg.organization || 'N/A'}</TableCell>
                                        <TableCell>{format(reg.registrationDate.toDate(), 'PPP p')}</TableCell>
                                        <TableCell className="capitalize">{reg.paymentStatus}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
