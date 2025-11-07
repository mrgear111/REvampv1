'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CalendarIcon, Loader2, UploadCloud, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { createEvent } from '@/lib/firebase/firestore';
import { uploadEventBanner } from '@/lib/firebase/storage';
import { useAuth } from '@/hooks/use-auth';
import type { College } from '@/types';
import { Timestamp } from 'firebase/firestore';

const MAX_BANNER_SIZE = 1 * 1024 * 1024; // 1MB
const ACCEPTED_BANNER_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const domainsList = [
    { id: 'web-dev', label: 'Web Development' },
    { id: 'mobile-dev', label: 'Mobile Development' },
    { id: 'ai-ml', label: 'AI/ML' },
    { id: 'data-science', label: 'Data Science' },
    { id: 'cybersecurity', label: 'Cybersecurity' },
    { id: 'product-management', label: 'Product Management' },
];

const collegesList: College[] = [
    { id: 'vit-vellore', name: 'VIT Vellore' },
    { id: 'vit-chennai', name: 'VIT Chennai' },
    { id: 'srm-ktr', name: 'SRM KTR' },
    { id: 'srm-ramapuram', name: 'SRM Ramapuram' },
]

const formSchema = z.object({
  lumaUrl: z.string().url('Please enter a valid Luma URL.').optional(),
  title: z.string().min(5, 'Title must be at least 5 characters.'),
  description: z.string().min(20, 'Description must be at least 20 characters.'),
  banner: z.instanceof(File).refine(file => file.size <= MAX_BANNER_SIZE, 'Banner size must be 1MB or less.').refine(file => ACCEPTED_BANNER_TYPES.includes(file.type), 'Only .jpg, .png, and .webp files are accepted.'),
  date: z.date({ required_error: 'A date is required.' }),
  duration: z.coerce.number().min(0.5, 'Duration must be at least 0.5 hours.'),
  isFree: z.boolean(),
  price: z.coerce.number().optional(),
  domains: z.array(z.string()).min(1, 'Select at least one domain.'),
  targetYears: z.array(z.number()).min(1, 'Select at least one target year.'),
  colleges: z.array(z.string()).min(1, 'Select at least one college.'),
}).refine(data => data.isFree || (data.price && data.price > 0), {
    message: "Price is required for paid events.",
    path: ['price']
});

export default function CreateEventPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingLuma, setIsFetchingLuma] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      lumaUrl: '',
      title: '',
      description: '',
      date: new Date(),
      duration: 1,
      isFree: true,
      price: 0,
      domains: [],
      targetYears: [],
      colleges: [],
    },
    mode: 'onChange',
  });

  const isFree = form.watch('isFree');

  const handleFetchFromLuma = async () => {
    const lumaUrl = form.getValues('lumaUrl');
    if (!lumaUrl || !z.string().url().safeParse(lumaUrl).success) {
      toast({ title: "Invalid URL", description: "Please enter a valid Luma event URL.", variant: "destructive"});
      return;
    }
    setIsFetchingLuma(true);
    // In a real implementation, you would call a Genkit flow here
    // that scrapes the Luma page and returns structured data.
    // For now, we'll just simulate a delay and a success message.
    await new Promise(resolve => setTimeout(resolve, 1500));
    toast({ title: "Luma Fetch (Simulated)", description: "In a real app, event data would now be populated from the URL." });
    setIsFetchingLuma(false);
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
        toast({ title: "Authentication Error", description: "You must be logged in to create an event.", variant: "destructive" });
        return;
    }
    setIsLoading(true);
    try {
      const eventDate = new Date(values.date);

      const tempEventId = `temp_${Date.now()}`;
      const bannerUrl = await uploadEventBanner(tempEventId, values.banner);

      const eventData = {
          ...values,
          date: Timestamp.fromDate(eventDate),
          bannerUrl,
          price: values.isFree ? 0 : values.price! * 100, // convert to paise
          meetLink: values.lumaUrl || '',
      };
      // @ts-ignore
      delete eventData.banner;

      const eventId = await createEvent(eventData, user.uid);
      
      toast({
        title: 'Event Created Successfully!',
        description: `${values.title} is now live.`,
      });
      router.push('/dashboard/events');

    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Event Creation Failed',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container py-8">
       <h1 className="text-3xl font-bold font-headline mb-2">Create New Event</h1>
       <p className="text-muted-foreground mb-8">Add a Luma link to auto-fill details or create an event manually.</p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="lumaUrl"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Luma Event Link</FormLabel>
                      <div className="flex gap-2">
                          <FormControl>
                            <Input placeholder="https://lu.ma/..." {...field} />
                          </FormControl>
                           <Button type="button" onClick={handleFetchFromLuma} disabled={isFetchingLuma}>
                                {isFetchingLuma ? <Loader2 className='h-4 w-4 animate-spin' /> : <LinkIcon className='h-4 w-4'/>}
                                Fetch
                            </Button>
                      </div>
                      <FormDescription>This will be used as the registration and meeting link.</FormDescription>
                      <FormMessage />
                      </FormItem>
                  )}
                />
            </div>
            
             <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or fill manually
                </span>
              </div>
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Intro to Next.js" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe your event in detail..." rows={5} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField control={form.control} name="banner" render={({ field }) => (
                <FormItem>
                    <FormLabel>Event Banner</FormLabel>
                    <FormControl>
                        <div className="flex items-center justify-center w-full">
                            <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                                    {field.value ? (
                                        <p className="font-semibold text-primary">{field.value.name}</p>
                                    ) : (
                                        <>
                                            <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                            <p className="text-xs text-muted-foreground">JPG, PNG, or WEBP (MAX. 1MB)</p>
                                        </>
                                    )}
                                </div>
                                <Input id="dropzone-file" type="file" className="hidden" onChange={(e) => field.onChange(e.target.files ? e.target.files[0] : null)} />
                            </label>
                        </div>
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant={"outline"}
                            className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                            )}
                            >
                            {field.value ? (
                                format(field.value, "PPP")
                            ) : (
                                <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                                date < new Date(new Date().setHours(0,0,0,0))
                            }
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
                )}
                />
                
                <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Duration (in hours)</FormLabel>
                        <FormControl>
                            <Input type="number" step="0.5" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                 <FormField
                    control={form.control}
                    name="isFree"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">Free Event</FormLabel>
                                <FormDescription>Is this a free-to-attend event?</FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />
                {!isFree && (
                     <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Price (INR)</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder='e.g., 199' {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-medium">Targeting</h3>
                <FormField control={form.control} name="domains" render={() => (
                    <FormItem>
                        <div className="mb-4">
                            <FormLabel className="text-base">Relevant Domains</FormLabel>
                            <FormDescription>Tag domains this event is relevant for.</FormDescription>
                        </div>
                        <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
                        {domainsList.map((item) => (
                            <FormField
                            key={item.id}
                            control={form.control}
                            name="domains"
                            render={({ field }) => {
                                return (
                                <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                    <Checkbox
                                        checked={field.value?.includes(item.id)}
                                        onCheckedChange={(checked) => {
                                        return checked
                                            ? field.onChange([...field.value, item.id])
                                            : field.onChange(
                                                field.value?.filter(
                                                (value) => value !== item.id
                                                )
                                            )
                                        }}
                                    />
                                    </FormControl>
                                    <FormLabel className="font-normal">{item.label}</FormLabel>
                                </FormItem>
                                )
                            }}
                            />
                        ))}
                        </div>
                        <FormMessage />
                    </FormItem>
                )} />

                <FormField control={form.control} name="targetYears" render={() => (
                    <FormItem>
                        <div className="mb-4">
                            <FormLabel className="text-base">Target Years</FormLabel>
                            <FormDescription>Which year of students should attend?</FormDescription>
                        </div>
                        <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                        {[1, 2, 3, 4].map((year) => (
                            <FormField
                            key={year}
                            control={form.control}
                            name="targetYears"
                            render={({ field }) => {
                                return (
                                <FormItem key={year} className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                    <Checkbox
                                        checked={field.value?.includes(year)}
                                        onCheckedChange={(checked) => {
                                        return checked
                                            ? field.onChange([...field.value, year])
                                            : field.onChange(
                                                field.value?.filter(
                                                (value) => value !== year
                                                )
                                            )
                                        }}
                                    />
                                    </FormControl>
                                    <FormLabel className="font-normal">{year}{year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'} Year</FormLabel>
                                </FormItem>
                                )
                            }}
                            />
                        ))}
                        </div>
                        <FormMessage />
                    </FormItem>
                )} />

                <FormField control={form.control} name="colleges" render={() => (
                    <FormItem>
                        <div className="mb-4">
                            <FormLabel className="text-base">Target Colleges</FormLabel>
                            <FormDescription>Which colleges is this event for?</FormDescription>
                        </div>
                        <div className='grid grid-cols-2 gap-4'>
                        {collegesList.map((item) => (
                            <FormField
                            key={item.id}
                            control={form.control}
                            name="colleges"
                            render={({ field }) => {
                                return (
                                <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                    <Checkbox
                                        checked={field.value?.includes(item.id)}
                                        onCheckedChange={(checked) => {
                                        return checked
                                            ? field.onChange([...field.value, item.id])
                                            : field.onChange(
                                                field.value?.filter(
                                                (value) => value !== item.id
                                                )
                                            )
                                        }}
                                    />
                                    </FormControl>
                                    <FormLabel className="font-normal">{item.name}</FormLabel>
                                </FormItem>
                                )
                            }}
                            />
                        ))}
                        </div>
                        <FormMessage />
                    </FormItem>
                )} />
            </div>

            <Button type="submit" disabled={isLoading} size="lg">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Event
            </Button>
          </form>
        </Form>
    </div>
  );
}
