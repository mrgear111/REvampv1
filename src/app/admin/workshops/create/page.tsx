
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
import { Loader2, UploadCloud, Calendar as CalendarIcon, Clock, FileText, Link as LinkIcon, Users, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { createWorkshop } from '@/lib/firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const formSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters.'),
  description: z.string().min(20, 'Description must be at least 20 characters.'),
  // Make banner optional during form filling, but required before submission
  banner: z.instanceof(File)
    .refine(file => file.size <= MAX_FILE_SIZE, 'File size must be 5MB or less.')
    .refine(file => ACCEPTED_FILE_TYPES.includes(file.type), 'Only .jpg, .png, and .webp files are accepted.'),
  date: z.date({ required_error: "A date for the workshop is required." }),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM)."),
  location: z.string().min(5, 'Location or link is required.'),
  price: z.coerce.number().min(0, 'Price cannot be negative.').default(0),
  maxSeats: z.coerce.number().min(1, 'There must be at least one seat.').default(50),
  // New fields
  prerequisites: z.string().optional(),
  learningOutcomes: z.string().optional(),
  materials: z.array(z.object({
    title: z.string(),
    url: z.string().url('Please enter a valid URL'),
    type: z.enum(['slides', 'code', 'document', 'video', 'other']),
  })).optional().default([]),
  recordingEnabled: z.boolean().default(false),
  certificatesEnabled: z.boolean().default(true),
  feedbackEnabled: z.boolean().default(true),
  preAssessment: z.boolean().default(false),
  postAssessment: z.boolean().default(false),
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
            time: '15:00',
            date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            prerequisites: '',
            learningOutcomes: '',
            materials: [],
            recordingEnabled: false,
            certificatesEnabled: true,
            feedbackEnabled: true,
            preAssessment: false,
            postAssessment: false,
        },
        mode: 'onChange',
    });
    
    // State for materials management
    const [newMaterial, setNewMaterial] = useState({ title: '', url: '', type: 'slides' as const });
    const [activeTab, setActiveTab] = useState('basic');

    // Function to add a new material to the form
    const addMaterial = () => {
        if (!newMaterial.title || !newMaterial.url) return;
        
        const currentMaterials = form.getValues('materials') || [];
        form.setValue('materials', [...currentMaterials, newMaterial]);
        setNewMaterial({ title: '', url: '', type: 'slides' as const });
    };

    // Function to remove a material from the form
    const removeMaterial = (index: number) => {
        const currentMaterials = form.getValues('materials') || [];
        form.setValue('materials', currentMaterials.filter((_, i) => i !== index));
    };

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (!user) {
            toast({ title: "Authentication Error", description: "You must be logged in to create a workshop.", variant: "destructive" });
            return;
        }

        // Check if banner is provided
        if (!values.banner) {
            toast({
                title: 'Banner Required',
                description: 'Please upload a banner image for the workshop.',
                variant: 'destructive'
            });
            return;
        }

        setIsLoading(true);
        try {
            console.log("Starting workshop creation with values:", values);
            
            const [hours, minutes] = values.time.split(':').map(Number);
            const workshopDateTime = new Date(values.date);
            workshopDateTime.setHours(hours, minutes, 0, 0);

            // Destructure banner from values, as it's handled separately
            const { banner, date, time, ...workshopBaseData } = values;

            const workshopData = {
                ...workshopBaseData,
                price: workshopBaseData.price, // price is in rupees
                date: Timestamp.fromDate(workshopDateTime),
            };
            
            console.log("Workshop data to be saved:", workshopData);
            console.log("User ID:", user.uid);
            
            const workshopId = await createWorkshop(workshopData, banner, user.uid);
            console.log("Workshop created with ID:", workshopId);

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
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
                    <p className="text-amber-800 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        Fields marked with <span className="text-red-500 font-bold mx-1">*</span> are required
                    </p>
                </div>
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid grid-cols-4 mb-8">
                            <TabsTrigger value="basic">Basic Info</TabsTrigger>
                            <TabsTrigger value="content">Content & Materials</TabsTrigger>
                            <TabsTrigger value="settings">Workshop Settings</TabsTrigger>
                            <TabsTrigger value="assessment">Assessments</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="basic" className="space-y-8">
                            <Card>
                                <CardHeader><CardTitle>Workshop Details</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField control={form.control} name="title" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Workshop Title <span className="text-red-500">*</span></FormLabel>
                                            <FormControl><Input placeholder="e.g., Intro to Next.js" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="description" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Description <span className="text-red-500">*</span></FormLabel>
                                            <FormControl><Textarea placeholder="Describe what the workshop is about..." {...field} rows={5} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="location" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Location <span className="text-red-500">*</span></FormLabel>
                                            <FormControl><Input placeholder="e.g., https://meet.google.com/xyz or '123 Main St, Anytown'" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="banner" render={({ field: { onChange, value, ...rest }}) => (
                                        <FormItem>
                                            <FormLabel>
                                                Workshop Banner <span className="text-red-500">*</span>
                                                <span className="text-sm font-normal text-muted-foreground ml-2">(Required)</span>
                                            </FormLabel>
                                            <FormControl>
                                                <div className="flex items-center justify-center w-full">
                                                    <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80">
                                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                            <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                                                            {value?.name ? (
                                                                <p className="font-semibold text-primary">{value.name}</p>
                                                            ) : (
                                                                <>
                                                                  <p className="mb-2 text-sm text-muted-foreground">
                                                                    <span className="font-semibold">Click to upload</span> or drag and drop
                                                                  </p>
                                                                  <p className="text-xs text-muted-foreground">PNG, JPG, or WEBP (MAX. 5MB)</p>
                                                                  <p className="text-xs text-red-500 mt-2">A banner image is required to create a workshop</p>
                                                                </>
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
                                            <FormLabel>Workshop Date <span className="text-red-500">*</span></FormLabel>
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
                                            <FormLabel>Start Time (24h format) <span className="text-red-500">*</span></FormLabel>
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-muted-foreground" />
                                                <FormControl><Input type="time" {...field} /></FormControl>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="price" render={({ field }) => (
                                        <FormItem><FormLabel>Price (₹)</FormLabel><FormControl><Input type="number" placeholder="Enter 0 for a free workshop" {...field} /></FormControl><FormDescription>Enter 0 for a free workshop. The price should be in rupees.</FormDescription><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="maxSeats" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Max Capacity <span className="text-red-500">*</span></FormLabel>
                                            <div className="flex items-center gap-2">
                                                <Users className="h-4 w-4 text-muted-foreground" />
                                                <FormControl><Input type="number" {...field} /></FormControl>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </CardContent>
                            </Card>
                        </TabsContent>
                        
                        <TabsContent value="content" className="space-y-8">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Workshop Content</CardTitle>
                                    <CardDescription>Define prerequisites and learning outcomes for participants</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField control={form.control} name="prerequisites" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Prerequisites</FormLabel>
                                            <FormControl>
                                                <Textarea 
                                                    placeholder="What should participants already know before attending?" 
                                                    {...field} 
                                                    rows={3} 
                                                />
                                            </FormControl>
                                            <FormDescription>List any skills or knowledge participants should have</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    
                                    <FormField control={form.control} name="learningOutcomes" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Learning Outcomes</FormLabel>
                                            <FormControl>
                                                <Textarea 
                                                    placeholder="What will participants learn or be able to do after the workshop?" 
                                                    {...field} 
                                                    rows={4} 
                                                />
                                            </FormControl>
                                            <FormDescription>List outcomes in a numbered format (e.g., 1. Build a React app)</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </CardContent>
                            </Card>
                            
                            <Card>
                                <CardHeader>
                                    <CardTitle>Workshop Materials</CardTitle>
                                    <CardDescription>Add slides, code samples, and other resources</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <FormLabel>Material Title</FormLabel>
                                            <Input 
                                                placeholder="e.g., Slide Deck" 
                                                value={newMaterial.title}
                                                onChange={(e) => setNewMaterial({...newMaterial, title: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <FormLabel>URL</FormLabel>
                                            <div className="flex items-center gap-2">
                                                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                                                <Input 
                                                    placeholder="https://..." 
                                                    value={newMaterial.url}
                                                    onChange={(e) => setNewMaterial({...newMaterial, url: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-col">
                                            <FormLabel>Type</FormLabel>
                                            <div className="flex items-center gap-2">
                                                <select 
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                    value={newMaterial.type}
                                                    onChange={(e) => setNewMaterial({...newMaterial, type: e.target.value as any})}
                                                >
                                                    <option value="slides">Slides</option>
                                                    <option value="code">Code</option>
                                                    <option value="document">Document</option>
                                                    <option value="video">Video</option>
                                                    <option value="other">Other</option>
                                                </select>
                                                <Button type="button" onClick={addMaterial} className="shrink-0">Add</Button>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="border rounded-md">
                                        {form.watch('materials')?.length === 0 ? (
                                            <div className="p-4 text-center text-muted-foreground">
                                                <FileText className="mx-auto h-8 w-8 mb-2 text-muted-foreground/60" />
                                                <p>No materials added yet</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y">
                                                {form.watch('materials')?.map((material, index) => (
                                                    <div key={index} className="flex items-center justify-between p-3">
                                                        <div>
                                                            <p className="font-medium">{material.title}</p>
                                                            <p className="text-sm text-muted-foreground truncate max-w-md">{material.url}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">{material.type}</span>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                onClick={() => removeMaterial(index)}
                                                                type="button"
                                                            >
                                                                <Trash2 className="h-4 w-4 text-red-500" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                        
                        <TabsContent value="settings" className="space-y-8">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Workshop Settings</CardTitle>
                                    <CardDescription>Configure additional workshop features</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <FormField control={form.control} name="recordingEnabled" render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-base">Recording</FormLabel>
                                                <FormDescription>
                                                    Enable recording for this workshop
                                                </FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )} />
                                    
                                    <FormField control={form.control} name="certificatesEnabled" render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-base">Certificates</FormLabel>
                                                <FormDescription>
                                                    Generate certificates for participants
                                                </FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )} />
                                    
                                    <FormField control={form.control} name="feedbackEnabled" render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-base">Feedback Collection</FormLabel>
                                                <FormDescription>
                                                    Collect feedback from participants after the workshop
                                                </FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )} />
                                </CardContent>
                            </Card>
                        </TabsContent>
                        
                        <TabsContent value="assessment" className="space-y-8">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Workshop Assessments</CardTitle>
                                    <CardDescription>Configure pre and post workshop assessments</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <FormField control={form.control} name="preAssessment" render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-base">Pre-Workshop Assessment</FormLabel>
                                                <FormDescription>
                                                    Assess participant knowledge before the workshop
                                                </FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )} />
                                    
                                    <FormField control={form.control} name="postAssessment" render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-base">Post-Workshop Assessment</FormLabel>
                                                <FormDescription>
                                                    Evaluate learning outcomes after the workshop
                                                </FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )} />
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>

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
