'use client';
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle, Users, Edit, Trash2, Calendar, Filter, Download, Search } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import Image from 'next/image';

// Define the Event type if not already defined in your types
interface Event {
  id: string;
  title: string;
  description: string;
  date: any; // Firestore Timestamp
  location: string;
  capacity: number;
  bannerUrl: string;
  isRecurring?: boolean;
  recurrencePattern?: string;
  sendReminders?: boolean;
  reminderTime?: string;
  createdAt: any;
  createdBy: string;
}

export default function AdminEventsPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        const fetchEvents = async () => {
            setIsLoading(true);
            try {
                const eventsQuery = query(collection(db, 'events'), orderBy('date', 'desc'));
                const querySnapshot = await getDocs(eventsQuery);
                const fetchedEvents: Event[] = [];
                querySnapshot.forEach((doc) => {
                    fetchedEvents.push({ id: doc.id, ...doc.data() } as Event);
                });
                setEvents(fetchedEvents);
                setFilteredEvents(fetchedEvents);
            } catch (error) {
                console.error("Error fetching events:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchEvents();
    }, []);

    useEffect(() => {
        let filtered = [...events];
        
        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(event => 
                event.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                event.description.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        // Apply date filter
        if (dateFilter) {
            const filterDate = new Date(dateFilter);
            filterDate.setHours(0, 0, 0, 0);
            
            filtered = filtered.filter(event => {
                const eventDate = event.date.toDate();
                eventDate.setHours(0, 0, 0, 0);
                return eventDate.getTime() === filterDate.getTime();
            });
        }
        
        // Apply status filter
        if (statusFilter !== 'all') {
            const now = new Date();
            if (statusFilter === 'upcoming') {
                filtered = filtered.filter(event => event.date.toDate() > now);
            } else if (statusFilter === 'past') {
                filtered = filtered.filter(event => event.date.toDate() < now);
            }
        }
        
        setFilteredEvents(filtered);
    }, [events, searchTerm, dateFilter, statusFilter]);

    const handleExportEvents = () => {
        // Convert events to CSV
        const headers = ['Title', 'Date', 'Location', 'Capacity', 'Recurring'];
        const csvContent = [
            headers.join(','),
            ...filteredEvents.map(event => [
                `"${event.title}"`,
                `"${format(event.date.toDate(), 'PPP p')}"`,
                `"${event.location}"`,
                event.capacity,
                event.isRecurring ? 'Yes' : 'No'
            ].join(','))
        ].join('\n');
        
        // Create and download the CSV file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `events-export-${format(new Date(), 'yyyy-MM-dd')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getEventStatusBadge = (eventDate: Date) => {
        const now = new Date();
        if (eventDate > now) {
            return <Badge>Upcoming</Badge>;
        } else {
            return <Badge variant="secondary">Past</Badge>;
        }
    };

    const clearFilters = () => {
        setSearchTerm('');
        setDateFilter(undefined);
        setStatusFilter('all');
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Manage Events</h1>
                    <p className="text-muted-foreground">Create, edit, and view event details and attendees.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExportEvents}>
                        <Download className="mr-2 h-4 w-4" />
                        Export
                    </Button>
                    <Button asChild>
                        <Link href="/admin/events/create">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Create Event
                        </Link>
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Filter Events</CardTitle>
                    <CardDescription>Narrow down the events list based on your criteria</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Search</label>
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Search by title or description" 
                                    className="pl-8"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Date</label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                                        <Calendar className="mr-2 h-4 w-4" />
                                        {dateFilter ? format(dateFilter, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <CalendarComponent
                                        mode="single"
                                        selected={dateFilter}
                                        onSelect={setDateFilter}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Status</label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Events</SelectItem>
                                    <SelectItem value="upcoming">Upcoming</SelectItem>
                                    <SelectItem value="past">Past</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    {(searchTerm || dateFilter || statusFilter !== 'all') && (
                        <div className="flex justify-end">
                            <Button variant="ghost" onClick={clearFilters}>Clear Filters</Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {isLoading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i}><CardHeader><Skeleton className='w-full h-40 rounded-md' /></CardHeader><CardContent className='space-y-2'><Skeleton className='h-5 w-3/4' /><Skeleton className='h-4 w-1/2' /></CardContent><CardFooter className='gap-2'><Skeleton className='h-9 w-full' /><Skeleton className='h-9 w-full' /></CardFooter></Card>
                    ))}
                </div>
            ) : filteredEvents.length === 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle>No Events Found</CardTitle>
                        <CardDescription>
                            {searchTerm || dateFilter || statusFilter !== 'all' ? 
                                'No events match your search criteria. Try adjusting your filters.' : 
                                'No events have been created yet.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg">
                        <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Get started by creating a new event.</p>
                        <Button asChild className="mt-4">
                            <Link href="/admin/events/create">Create Event</Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredEvents.map(event => (
                        <Card key={event.id} className="flex flex-col">
                            <CardHeader className="p-0">
                                <div className="relative aspect-video w-full">
                                    <Image src={event.bannerUrl} alt={event.title} fill className="object-cover rounded-t-lg" />
                                    <div className="absolute top-2 right-2">
                                        {getEventStatusBadge(event.date.toDate())}
                                    </div>
                                    {event.isRecurring && (
                                        <div className="absolute top-2 left-2">
                                            <Badge variant="outline" className="bg-background/80">Recurring</Badge>
                                        </div>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow pt-6 space-y-2">
                                <CardTitle className="line-clamp-1">{event.title}</CardTitle>
                                <CardDescription>{format(event.date.toDate(), 'PPP p')}</CardDescription>
                                <div className="flex items-center justify-between text-sm pt-2">
                                    <span className="font-semibold text-muted-foreground">Location</span>
                                    <span className="truncate max-w-[180px]">{event.location}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-semibold text-muted-foreground">Capacity</span>
                                    <Badge variant="secondary">0 / {event.capacity}</Badge>
                                </div>
                            </CardContent>
                            <CardFooter className="grid grid-cols-3 gap-2">
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={`/admin/events/${event.id}/attendees`}>
                                        <Users className="mr-2 h-4 w-4" />View
                                    </Link>
                                </Button>
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={`/admin/events/${event.id}/edit`}>
                                        <Edit className="mr-2 h-4 w-4" />Edit
                                    </Link>
                                </Button>
                                <Button variant="destructive" size="sm">
                                    <Trash2 className="mr-2 h-4 w-4" />Delete
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
