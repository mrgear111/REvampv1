'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  ArrowLeft, 
  Download, 
  Mail, 
  Search, 
  UserCheck, 
  UserX, 
  Filter,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface UserData {
  displayName?: string;
  name?: string;
  email?: string;
  photoURL?: string;
  photoUrl?: string;
}

interface Attendee {
  id: string;
  userId: string;
  eventId: string;
  status: 'registered' | 'attended' | 'no-show';
  registeredAt: any;
  user: {
    name: string;
    email: string;
    photoUrl?: string;
  };
}

interface Event {
  id: string;
  title: string;
  date: any;
  capacity: number;
}

export default function EventAttendeesPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const eventId = params.id;
  
  const [event, setEvent] = useState<Event | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [filteredAttendees, setFilteredAttendees] = useState<Attendee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    const fetchEventAndAttendees = async () => {
      setIsLoading(true);
      try {
        // Fetch event details
        const eventDoc = await getDoc(doc(db, 'events', eventId));
        if (!eventDoc.exists()) {
          console.error("Event not found");
          router.push('/admin/events');
          return;
        }
        
        setEvent({ id: eventDoc.id, ...eventDoc.data() } as Event);
        
        // Fetch attendees
        const attendeesQuery = query(collection(db, 'eventRegistrations'), where('eventId', '==', eventId));
        const attendeesSnapshot = await getDocs(attendeesQuery);
        
        const attendeesList: Attendee[] = [];
        const userPromises: Promise<any>[] = [];
        
        attendeesSnapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          userPromises.push(getDoc(doc(db, 'users', data.userId)).then(userDoc => {
            if (userDoc.exists()) {
              const userData = userDoc.data() as UserData;
              attendeesList.push({
                id: docSnapshot.id,
                userId: data.userId,
                eventId: data.eventId,
                status: data.status || 'registered',
                registeredAt: data.registeredAt,
                user: {
                  name: userData.displayName || userData.name || 'Unknown',
                  email: userData.email || 'No email',
                  photoUrl: userData.photoURL || userData.photoUrl
                }
              });
            }
          }));
        });
        
        await Promise.all(userPromises);
        setAttendees(attendeesList);
        setFilteredAttendees(attendeesList);
      } catch (error) {
        console.error("Error fetching event and attendees:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEventAndAttendees();
  }, [eventId, router]);

  useEffect(() => {
    let filtered = [...attendees];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(attendee => 
        attendee.user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        attendee.user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(attendee => attendee.status === statusFilter);
    }
    
    setFilteredAttendees(filtered);
  }, [attendees, searchTerm, statusFilter]);

  useEffect(() => {
    if (selectAll) {
      setSelectedAttendees(filteredAttendees.map(a => a.id));
    } else if (selectedAttendees.length === filteredAttendees.length) {
      // If we uncheck "select all" but all items were selected, deselect all
      setSelectedAttendees([]);
    }
  }, [selectAll, filteredAttendees]);

  const handleSelectAttendee = (attendeeId: string) => {
    setSelectedAttendees(prev => {
      if (prev.includes(attendeeId)) {
        return prev.filter(id => id !== attendeeId);
      } else {
        return [...prev, attendeeId];
      }
    });
  };

  const handleExportAttendees = () => {
    // Export attendees to CSV
    const headers = ['Name', 'Email', 'Status', 'Registration Date'];
    const csvContent = [
      headers.join(','),
      ...filteredAttendees.map(attendee => [
        `"${attendee.user.name}"`,
        `"${attendee.user.email}"`,
        `"${attendee.status}"`,
        `"${format(attendee.registeredAt.toDate(), 'PPP p')}"`
      ].join(','))
    ].join('\n');
    
    // Create and download the CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${event?.title}-attendees-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleMarkAttended = () => {
    // In a real implementation, this would update the status in Firestore
    setAttendees(prev => 
      prev.map(attendee => 
        selectedAttendees.includes(attendee.id) 
          ? { ...attendee, status: 'attended' } 
          : attendee
      )
    );
    setSelectedAttendees([]);
    setSelectAll(false);
  };

  const handleMarkNoShow = () => {
    // In a real implementation, this would update the status in Firestore
    setAttendees(prev => 
      prev.map(attendee => 
        selectedAttendees.includes(attendee.id) 
          ? { ...attendee, status: 'no-show' } 
          : attendee
      )
    );
    setSelectedAttendees([]);
    setSelectAll(false);
  };

  const handleSendEmail = () => {
    // In a real implementation, this would trigger an email to selected attendees
    alert(`Email would be sent to ${selectedAttendees.length} attendees`);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'registered':
        return <Badge variant="outline">Registered</Badge>;
      case 'attended':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Attended</Badge>;
      case 'no-show':
        return <Badge variant="destructive">No-show</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/events">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-headline">{event?.title}</h1>
            <p className="text-muted-foreground">
              {event?.date && format(event.date.toDate(), 'PPP p')} • {filteredAttendees.length} of {event?.capacity} attendees
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportAttendees}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendee Management</CardTitle>
          <CardDescription>View and manage event attendees</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by name or email" 
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <SelectValue placeholder="Filter by status" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="registered">Registered</SelectItem>
                  <SelectItem value="attended">Attended</SelectItem>
                  <SelectItem value="no-show">No-show</SelectItem>
                </SelectContent>
              </Select>
              {(searchTerm || statusFilter !== 'all') && (
                <Button variant="ghost" onClick={clearFilters}>Clear Filters</Button>
              )}
            </div>
            
            <div className="flex gap-2">
              {selectedAttendees.length > 0 && (
                <>
                  <Button variant="outline" size="sm" onClick={handleMarkAttended}>
                    <UserCheck className="mr-2 h-4 w-4" />
                    Mark Attended
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleMarkNoShow}>
                    <UserX className="mr-2 h-4 w-4" />
                    Mark No-show
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSendEmail}>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Email
                  </Button>
                </>
              )}
            </div>
          </div>
          
          {filteredAttendees.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No attendees found matching your criteria.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={selectAll} 
                        onCheckedChange={() => setSelectAll(!selectAll)}
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Registration Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttendees.map((attendee) => (
                    <TableRow key={attendee.id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedAttendees.includes(attendee.id)}
                          onCheckedChange={() => handleSelectAttendee(attendee.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{attendee.user.name}</TableCell>
                      <TableCell>{attendee.user.email}</TableCell>
                      <TableCell>{getStatusBadge(attendee.status)}</TableCell>
                      <TableCell>{format(attendee.registeredAt.toDate(), 'PPP')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleSelectAttendee(attendee.id)}>
                            {attendee.status !== 'attended' ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
