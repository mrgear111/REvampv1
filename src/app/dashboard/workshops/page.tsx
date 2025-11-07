'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { School } from 'lucide-react';

export default function StudentWorkshopsPage() {

    // In a real implementation, you'd fetch available workshops from Firestore here.

    return (
        <div className="space-y-8">
             <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Workshops</h1>
                    <p className="text-muted-foreground">Discover workshops to level-up your skills.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Upcoming Workshops</CardTitle>
                    <CardDescription>No workshops available for you right now.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg">
                    <School className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Check back later for new workshops!</p>
                </CardContent>
            </Card>

        </div>
    )
}
