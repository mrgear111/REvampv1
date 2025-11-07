
'use client';
import { useState, useEffect } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import type { Workshop, WorkshopRegistration } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import Image from 'next/image';
import { format } from 'date-fns';
import { Calendar, MapPin, Users, IndianRupee, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

declare global {
    interface Window {
        Razorpay: any;
    }
}

const registrationSchema = z.object({
    name: z.string().min(2, 'Name is required.'),
    email: z.string().email('Please enter a valid email.'),
    phone: z.string().min(10, 'Please enter a valid phone number.'),
    organization: z.string().optional(),
    year: z.string().optional(),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

export default function WorkshopDetailsPage({ params }: { params: { id: string } }) {
    const { user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [workshop, setWorkshop] = useState<Workshop | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<RegistrationFormData>({
        resolver: zodResolver(registrationSchema),
        defaultValues: {
            name: user?.displayName || '',
            email: user?.email || '',
            phone: '',
            organization: '',
            year: '',
        },
    });
     
    useEffect(() => {
        form.reset({
            name: user?.displayName || '',
            email: user?.email || '',
        });
    }, [user, form]);


    useEffect(() => {
        const fetchWorkshop = async () => {
            setIsLoading(true);
            try {
                const workshopRef = doc(db, 'workshops', params.id);
                const workshopSnap = await getDoc(workshopRef);
                if (workshopSnap.exists()) {
                    setWorkshop({ id: workshopSnap.id, ...workshopSnap.data() } as Workshop);
                } else {
                    notFound();
                }
            } catch (error) {
                console.error("Error fetching workshop:", error);
                notFound();
            } finally {
                setIsLoading(false);
            }
        };
        fetchWorkshop();
    }, [params.id]);

    const handleFreeRegistration = async (data: RegistrationFormData) => {
        if (!user || !workshop?.id) return;
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'workshopRegistrations'), {
                ...data,
                workshopId: workshop.id,
                userId: user.uid,
                paymentStatus: 'success', // Free, so success
                attended: false,
                feedbackSubmitted: false,
                registrationDate: serverTimestamp(),
            });
            toast({ title: "Registration Successful!", description: `You're all set for ${workshop.title}!` });
            router.push('/dashboard/workshops'); 
        } catch (error) {
            console.error("Free registration failed:", error);
            toast({ title: "Registration Failed", description: "An unexpected error occurred.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePaidRegistration = async (data: RegistrationFormData) => {
        if (!user || !workshop?.id || !workshop.price) return;
        setIsSubmitting(true);

        try {
            const orderRes = await fetch('/api/razorpay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: workshop.price, id: workshop.id, type: 'workshop' }),
            });
            if (!orderRes.ok) throw new Error('Failed to create Razorpay order.');

            const { order } = await orderRes.json();
            
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onerror = () => { throw new Error('Razorpay SDK failed to load.'); };
            script.onload = () => {
                const options = {
                    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                    amount: order.amount,
                    currency: order.currency,
                    name: 'REvamp Workshops',
                    description: `Payment for ${workshop.title}`,
                    order_id: order.id,
                    handler: async (response: any) => {
                         const verifyRes = await fetch('/api/razorpay', {
                            method: 'PUT',
                            body: JSON.stringify({
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_signature: response.razorpay_signature,
                            }),
                            headers: { 'Content-Type': 'application/json' },
                        });

                        const verifyData = await verifyRes.json();
                        if (verifyData.success) {
                            await addDoc(collection(db, 'workshopRegistrations'), {
                                ...data,
                                workshopId: workshop.id,
                                userId: user.uid,
                                paymentId: response.razorpay_payment_id,
                                paymentStatus: 'success',
                                attended: false,
                                feedbackSubmitted: false,
                                registrationDate: serverTimestamp(),
                            });
                             toast({ title: "Registration Successful!", description: `Transaction ID: ${response.razorpay_payment_id}` });
                             router.push('/dashboard/workshops');
                        } else {
                            throw new Error('Payment verification failed.');
                        }
                    },
                    prefill: { name: data.name, email: data.email, contact: data.phone },
                    theme: { color: '#673AB7' },
                };
                const rzp = new window.Razorpay(options);
                rzp.on('payment.failed', (resp: any) => {
                    toast({ title: 'Payment Failed', description: resp.error.description, variant: 'destructive' });
                    setIsSubmitting(false);
                });
                rzp.open();
                 // This timeout is a fallback in case the modal is closed without payment
                const paymentDialogCloseFallback = setTimeout(() => setIsSubmitting(false), 5000);
                rzp.on('modal.close', () => {
                    clearTimeout(paymentDialogCloseFallback);
                    setIsSubmitting(false)
                });
            };
            document.body.appendChild(script);

        } catch (err: any) {
            console.error('Payment Error:', err);
            toast({ title: 'Payment Error', description: err.message || 'Could not initiate payment.', variant: 'destructive' });
            setIsSubmitting(false);
        }
    };

    const onSubmit = (data: RegistrationFormData) => {
        if (!workshop) return;
        if (workshop.price === 0) {
            handleFreeRegistration(data);
        } else {
            handlePaidRegistration(data);
        }
    };
    
    if (isLoading) return <WorkshopDetailsSkeleton />;
    if (!workshop) return null;

    return (
        <div className="container py-12">
            <div className="grid lg:grid-cols-2 gap-12 items-start">
                <div className="space-y-6">
                    <div className="relative aspect-video w-full rounded-lg overflow-hidden">
                        <Image src={workshop.bannerUrl} alt={workshop.title} fill className="object-cover" />
                    </div>
                    <h1 className="text-4xl font-bold font-headline">{workshop.title}</h1>
                    <div className="flex flex-wrap gap-x-6 gap-y-3 text-muted-foreground">
                        <div className="flex items-center gap-2"><Calendar className="h-4 w-4" />{format(workshop.date.toDate(), 'PPP p')}</div>
                        <div className="flex items-center gap-2"><MapPin className="h-4 w-4" />{workshop.location}</div>
                        <div className="flex items-center gap-2"><Users className="h-4 w-4" />{workshop.maxSeats} seats</div>
                    </div>
                    <p className="text-lg text-muted-foreground">{workshop.description}</p>
                </div>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Register for this Workshop</CardTitle>
                        <CardDescription>Fill in your details to secure your spot.</CardDescription>
                        <div className="flex items-baseline gap-2 pt-4">
                            <span className="text-4xl font-bold">
                                {workshop.price === 0 ? 'Free' : `₹${workshop.price / 100}`}
                            </span>
                            {workshop.price > 0 && <span className="text-muted-foreground">per person</span>}
                        </div>
                    </CardHeader>
                    <CardContent>
                         <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="email" render={({ field }) => (
                                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="phone" render={({ field }) => (
                                    <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <Separator />
                                <FormField control={form.control} name="organization" render={({ field }) => (
                                    <FormItem><FormLabel>Organization / College</FormLabel><FormControl><Input placeholder="e.g. Google, VIT Vellore" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="year" render={({ field }) => (
                                    <FormItem><FormLabel>Year / Role</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select your current status" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="First Year">First Year</SelectItem>
                                            <SelectItem value="Second Year">Second Year</SelectItem>
                                            <SelectItem value="Third Year">Third Year</SelectItem>
                                            <SelectItem value="Final Year">Final Year</SelectItem>
                                            <SelectItem value="Working Professional">Working Professional</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage /></FormItem>
                                )} />

                                <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {workshop.price === 0 ? 'Register Now' : `Register & Pay ₹${workshop.price / 100}`}
                                </Button>
                            </form>
                         </Form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

const WorkshopDetailsSkeleton = () => (
    <div className="container py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div className="space-y-6">
                <Skeleton className="aspect-video w-full rounded-lg" />
                <Skeleton className="h-10 w-3/4" />
                <div className="flex gap-6">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-5 w-32" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                </div>
            </div>
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-12 w-1/3 mt-4" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
                    <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
                    <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
                    <Skeleton className="h-12 w-full" />
                </CardContent>
            </Card>
        </div>
    </div>
);
