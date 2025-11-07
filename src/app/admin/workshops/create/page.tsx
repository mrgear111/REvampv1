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
import { Loader2, UploadCloud, Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { createWorkshop } from '@/lib/firebase/firestore';
import { Timestamp } from 'firebase/firestore';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const formSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters.'),
  description: z.string().min(20, 'Description must be at least 20 characters.'),
  banner: z.instanceof(File).refine(file => file.size <= MAX_FILE_SIZE, 'File size must be 5MB or less.').refine(file => ACCEPTED_FILE_TYPES.includes(file.type), 'Only .jpg, .png, and .webp files are accepted.'),
  date: z.date({ required_error: "A date for the workshop is required." }),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM)."),
  location: z.string().min(5, 'Location or link is required.'),
  price: z.coerce.number().min(0, 'Price cannot be negative.').default(0),
  maxSeats: z.coerce.number().min(1, 'There must be at least one seat.'),
});

export default function CreateWorkshopPage() {
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
            price: 0,
            maxSeats: 50,
            time: '14:00',
        },
        mode: 'onChange',
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (!user) {
            toast({ title: "Authentication Error", description: "You must be logged in to create a workshop.", variant: "destructive" });
            return;
        }

        setIsLoading(true);
        try {
            const [hours, minutes] = values.time.split(':').map(Number);
            const workshopDateTime = new Date(values.date);
            workshopDateTime.setHours(hours, minutes, 0, 0); // Set hours and minutes, reset seconds/ms

            // Destructure banner from values, as it's handled separately
            const { banner, date, time, ...workshopBaseData } = values;

            const workshopData = {
                ...workshopBaseData,
                price: workshopBaseData.price * 100, // Convert to paise
                date: Timestamp.fromDate(workshopDateTime),
            };
            
            await createWorkshop(workshopData, banner, user.uid);

            toast({
                title: 'Workshop Created!',
                description: `${values.title} has been successfully created.`,
            });
            router.push('/admin/workshops');

        } catch (error: any) {
            console.error("Workshop creation failed:", error);
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
                <h1 className="text-3xl font-bold font-headline">Create a New Workshop</h1>
                <p className="text-muted-foreground">Fill out the details below to set up your next workshop.</p>
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <Card>
                        <CardHeader><CardTitle>Workshop Details</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <FormField control={form.control} name="title" render={({ field }) => (
                                <FormItem><FormLabel>Workshop Title</FormLabel><FormControl><Input placeholder="e.g., Intro to Next.js" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name="description" render={({ field }) => (
                                <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Describe what the workshop is about..." {...field} rows={5} /></FormControl><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name="location" render={({ field }) => (
                                <FormItem><FormLabel>Location</FormLabel><FormControl><Input placeholder="e.g., https://meet.google.com/xyz or '123 Main St, Anytown'" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="banner" render={({ field: { onChange, value, ...rest }}) => (
                                <FormItem>
                                    <FormLabel>Workshop Banner</FormLabel>
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
                        <CardContent className="grid md:grid-cols-2 gap-6">
                             <FormField control={form.control} name="date" render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Workshop Date</FormLabel>
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
                                <FormItem><FormLabel>Start Time (24h format)</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name="price" render={({ field }) => (
                                    <FormItem><FormLabel>Price (₹)</FormLabel><FormControl><Input type="number" placeholder="Enter 0 for a free workshop" {...field} /></FormControl><FormDescription>Enter 0 for a free workshop.</FormDescription><FormMessage /></FormItem>
                                )} />
                             <FormField control={form.control} name="maxSeats" render={({ field }) => (
                               <FormItem><FormLabel>Max Capacity</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-4">
                        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Workshop
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
