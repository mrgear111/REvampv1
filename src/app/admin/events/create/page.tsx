
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, UploadCloud, Calendar as CalendarIcon, Clock, Repeat, Bell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { createEvent } from '@/lib/firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const formSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters.'),
  description: z.string().min(20, 'Description must be at least 20 characters.'),
  banner: z.instanceof(File).refine(file => file.size <= MAX_FILE_SIZE, 'File size must be 5MB or less.')
    .refine(file => ACCEPTED_FILE_TYPES.includes(file.type), 'Only .jpg, .png, and .webp files are accepted.'),
  date: z.date({ required_error: "A date for the event is required." }),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM)."),
  location: z.string().min(5, 'Location or link is required.'),
  capacity: z.coerce.number().min(1, 'Capacity must be at least 1.').default(50),
  isRecurring: z.boolean().default(false),
  recurrencePattern: z.string().optional(),
  sendReminders: z.boolean().default(true),
  reminderTime: z.string().optional(),
  // New fields for EventCreationData
  isFree: z.boolean().default(true),
  price: z.coerce.number().min(0).default(0),
  domains: z.array(z.string()).default([]),
  targetYears: z.array(z.number()).default([1, 2, 3, 4]),
  collegeIds: z.array(z.string()).default([]),
});

export default function CreateEventPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      location: '',
      capacity: 50,
      time: '18:00',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      isRecurring: false,
      sendReminders: true,
      // New fields
      isFree: true,
      price: 0,
      domains: [],
      targetYears: [1, 2, 3, 4],
      collegeIds: [],
    },
    mode: 'onChange',
  });

  const watchIsRecurring = form.watch('isRecurring');
  const watchSendReminders = form.watch('sendReminders');

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in to create an event.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const [hours, minutes] = values.time.split(':').map(Number);
      const eventDateTime = new Date(values.date);
      eventDateTime.setHours(hours, minutes, 0, 0);

      // Destructure banner from values, as it's handled separately
      const { banner, date, time, ...eventBaseData } = values;

      const eventData = {
        ...eventBaseData,
        date: Timestamp.fromDate(eventDateTime),
        category: 'event' as 'event' | 'workshop' | 'mentorship',
        // Use form values for these fields
        isFree: values.isFree,
        price: values.price,
        domains: values.domains,
        targetYears: values.targetYears,
        collegeIds: values.collegeIds,
      };
      
      await createEvent(eventData, banner, user.uid);

      toast({
        title: 'Event Created!',
        description: `${values.title} has been successfully created.`,
      });
      router.push('/admin/events');

    } catch (error: any) {
      console.error("Event creation failed:", error);
      toast({
        title: 'Creation Failed',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline">Create a New Event</h1>
        <p className="text-muted-foreground">Fill out the details below to set up your next event.</p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader><CardTitle>Event Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Event Title</FormLabel><FormControl><Input placeholder="e.g., Tech Meetup 2025" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Describe what the event is about..." {...field} rows={5} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="location" render={({ field }) => (
                <FormItem><FormLabel>Location</FormLabel><FormControl><Input placeholder="e.g., https://meet.google.com/xyz or '123 Main St, Anytown'" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="banner" render={({ field: { onChange, value, ...rest }}) => (
                <FormItem>
                  <FormLabel>Event Banner</FormLabel>
                  <FormControl>
                    <div className="flex items-center justify-center w-full">
                      <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                          {value?.name ? (
                            <p className="font-semibold text-primary">{value.name}</p>
                          ) : (
                            <><p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p><p className="text-xs text-muted-foreground">PNG, JPG, or WEBP (MAX. 5MB)</p></>
                          )}
                        </div>
                        <Input id="dropzone-file" type="file" accept="image/*" className="hidden" onChange={(e) => onChange(e.target.files ? e.target.files[0] : null)} {...rest} />
                      </label>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Schedule & Capacity</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Event Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild><FormControl>
                        <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl></PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="time" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time (24h format)</FormLabel>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <FormControl><Input type="time" {...field} /></FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              
              <FormField control={form.control} name="capacity" render={({ field }) => (
                <FormItem>
                  <FormLabel>Maximum Capacity</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormDescription>Maximum number of attendees allowed</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              
              <div className="border-t pt-4">
                <FormField control={form.control} name="isRecurring" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        <div className="flex items-center gap-2">
                          <Repeat className="h-4 w-4" />
                          Recurring Event
                        </div>
                      </FormLabel>
                      <FormDescription>
                        Set up a recurring schedule for this event
                      </FormDescription>
                    </div>
                  </FormItem>
                )} />
                
                {watchIsRecurring && (
                  <FormField control={form.control} name="recurrencePattern" render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>Recurrence Pattern</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a recurrence pattern" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="biweekly">Bi-weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
              </div>
              
              <div className="border-t pt-4">
                <FormField control={form.control} name="sendReminders" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        <div className="flex items-center gap-2">
                          <Bell className="h-4 w-4" />
                          Send Reminders
                        </div>
                      </FormLabel>
                      <FormDescription>
                        Automatically send reminders to registered attendees
                      </FormDescription>
                    </div>
                  </FormItem>
                )} />
                
                {watchSendReminders && (
                  <FormField control={form.control} name="reminderTime" render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>Reminder Time</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="When to send reminders" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1hour">1 hour before</SelectItem>
                          <SelectItem value="3hours">3 hours before</SelectItem>
                          <SelectItem value="1day">1 day before</SelectItem>
                          <SelectItem value="2days">2 days before</SelectItem>
                          <SelectItem value="1week">1 week before</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Event
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

    