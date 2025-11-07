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
import { Loader2, UploadCloud, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { createWorkshop } from '@/lib/firebase/firestore';
import { Timestamp } from 'firebase/firestore';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const domainsList = [
    { id: 'web-dev', label: 'Web Development' },
    { id: 'mobile-dev', label: 'Mobile Development' },
    { id: 'ai-ml', label: 'AI/ML' },
    { id: 'data-science', label: 'Data Science' },
    { id: 'cybersecurity', label: 'Cybersecurity' },
    { id: 'product-management', label: 'Product Management' },
];

const formSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters.'),
  description: z.string().min(20, 'Description must be at least 20 characters.'),
  banner: z.instanceof(File).refine(file => file.size <= MAX_FILE_SIZE, 'File size must be 5MB or less.').refine(file => ACCEPTED_FILE_TYPES.includes(file.type), 'Only .jpg, .png, and .webp files are accepted.'),
  date: z.date({ required_error: "A date for the workshop is required." }),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM)."),
  duration: z.coerce.number().min(0.5, 'Duration must be at least 0.5 hours.'),
  meetLink: z.string().url('Please enter a valid Google Meet or Luma link.'),
  domains: z.array(z.string()).min(1, 'Select at least one domain.'),
  targetYears: z.array(z.number()).min(1, 'Select at least one target year.'),
  isFree: z.boolean(),
  price: z.coerce.number().optional(),
  maxSeats: z.coerce.number().min(1, 'There must be at least one seat.'),
  registrationDeadline: z.date({ required_error: "A registration deadline is required." }),
  certificate: z.boolean(),
  clustering: z.enum(['single', 'multi-campus']),
  collegeIds: z.array(z.string()), // For simplicity, we'll use a text input for now.
}).refine(data => !data.isFree ? data.price && data.price > 0 : true, {
    message: "Price must be greater than 0 for paid workshops.",
    path: ["price"],
});

export default function CreateWorkshopPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: 'Advanced React Patterns',
            description: 'Dive deep into advanced React concepts like higher-order components, render props, context API, and performance optimization techniques. This workshop is for students with a solid foundation in React.',
            duration: 2.5,
            meetLink: 'https://meet.google.com/qwe-rty-uio',
            domains: ['web-dev'],
            targetYears: [2, 3, 4],
            isFree: false,
            price: 299,
            maxSeats: 40,
            certificate: true,
            clustering: 'multi-campus',
            collegeIds: [],
            time: '14:00',
            date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
            registrationDeadline: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000), // 12 days from now
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
            workshopDateTime.setHours(hours, minutes);

            const workshopData = {
                ...values,
                date: Timestamp.fromDate(workshopDateTime),
                registrationDeadline: Timestamp.fromDate(values.registrationDeadline),
                price: values.isFree ? 0 : values.price! * 100, // Convert to paise
            };

            await createWorkshop(workshopData, user.uid);

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
                        <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <FormField control={form.control} name="title" render={({ field }) => (
                                <FormItem><FormLabel>Workshop Title</FormLabel><FormControl><Input placeholder="e.g., Intro to Next.js" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name="description" render={({ field }) => (
                                <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Describe what the workshop is about..." {...field} rows={5} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="banner" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Workshop Banner</FormLabel>
                                    <FormControl>
                                        <div className="flex items-center justify-center w-full">
                                            <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80">
                                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                    <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                                                    {field.value ? (
                                                        <p className="font-semibold text-primary">{field.value.name}</p>
                                                    ) : (
                                                        <><p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p><p className="text-xs text-muted-foreground">PNG, JPG, or WEBP (MAX. 5MB)</p></>
                                                    )}
                                                </div>
                                                <Input id="dropzone-file" type="file" accept="image/*" className="hidden" onChange={(e) => field.onChange(e.target.files ? e.target.files[0] : null)} />
                                            </label>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Schedule & Logistics</CardTitle></CardHeader>
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
                            <FormField control={form.control} name="duration" render={({ field }) => (
                               <FormItem><FormLabel>Duration (in hours)</FormLabel><FormControl><Input type="number" step="0.5" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="meetLink" render={({ field }) => (
                                <FormItem><FormLabel>Google Meet / Luma Link</FormLabel><FormControl><Input placeholder="https://meet.google.com/..." {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader><CardTitle>Target Audience</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                             <FormField control={form.control} name="domains" render={() => (
                                <FormItem>
                                    <FormLabel>Relevant Domains</FormLabel>
                                    <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
                                    {domainsList.map((item) => (
                                        <FormField key={item.id} control={form.control} name="domains" render={({ field }) => (
                                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                                <FormControl><Checkbox checked={field.value?.includes(item.id)} onCheckedChange={(checked) => { return checked ? field.onChange([...field.value, item.id]) : field.onChange(field.value?.filter((value) => value !== item.id))}} /></FormControl>
                                                <FormLabel className="font-normal">{item.label}</FormLabel>
                                            </FormItem>
                                        )} />
                                    ))}
                                    </div><FormMessage />
                                </FormItem>
                             )} />
                             <FormField control={form.control} name="targetYears" render={() => (
                                <FormItem>
                                    <FormLabel>Target Years</FormLabel>
                                    <div className='flex items-center gap-4'>
                                    {[1,2,3,4].map((year) => (
                                        <FormField key={year} control={form.control} name="targetYears" render={({ field }) => (
                                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                                <FormControl><Checkbox checked={field.value?.includes(year)} onCheckedChange={(checked) => { return checked ? field.onChange([...field.value, year]) : field.onChange(field.value?.filter((value) => value !== year))}} /></FormControl>
                                                <FormLabel className="font-normal">{year}{['st', 'nd', 'rd', 'th'][year - 1]} Year</FormLabel>
                                            </FormItem>
                                        )} />
                                    ))}
                                    </div><FormMessage />
                                </FormItem>
                             )} />
                             <FormField control={form.control} name="clustering" render={({ field }) => (
                                <FormItem><FormLabel>College Clustering</FormLabel><FormControl>
                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                                        <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="multi-campus" /></FormControl><FormLabel className="font-normal">Multi-Campus (All Colleges)</FormLabel></FormItem>
                                        <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="single" /></FormControl><FormLabel className="font-normal">Single College</FormLabel></FormItem>
                                    </RadioGroup>
                                </FormControl></FormItem>
                             )} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Registration & Payment</CardTitle></CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-6">
                             <FormField control={form.control} name="isFree" render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 col-span-2">
                                    <div className="space-y-0.5"><FormLabel>Paid Workshop?</FormLabel><FormDescription>Is this a paid workshop?</FormDescription></div>
                                    <FormControl><Checkbox checked={!field.value} onCheckedChange={(checked) => field.onChange(!checked)} /></FormControl>
                                </FormItem>
                            )} />
                             {!form.watch('isFree') && (
                                <FormField control={form.control} name="price" render={({ field }) => (
                                    <FormItem><FormLabel>Price (₹)</FormLabel><FormControl><Input type="number" placeholder="e.g., 499" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                             )}
                             <FormField control={form.control} name="maxSeats" render={({ field }) => (
                               <FormItem><FormLabel>Max Seats</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name="registrationDeadline" render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>Registration Deadline</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild><FormControl>
                                            <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                {field.value ? format(field.value, "PPP") : <span>Pick a deadline</span>}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl></PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                                    </Popover><FormMessage />
                                </FormItem>
                            )} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Completion</CardTitle></CardHeader>
                        <CardContent>
                             <FormField control={form.control} name="certificate" render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5"><FormLabel>Certificate on Completion</FormLabel><FormDescription>Award a certificate to attendees who complete the workshop.</FormDescription></div>
                                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                </FormItem>
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
    