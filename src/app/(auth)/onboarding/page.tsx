'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Confetti from 'react-confetti';
import { useWindowSize } from '@uidotdev/usehooks';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { signUpWithEmail } from '@/lib/firebase/auth';
import { uploadCollegeId } from '@/lib/firebase/storage';
import { Loader2, PartyPopper, UploadCloud } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  college: z.string().min(2, 'College name is required.'),
  year: z.string().refine(val => !isNaN(parseInt(val)), 'Year is required.'),
  collegeId: z.instanceof(File).refine(file => file.size <= MAX_FILE_SIZE, 'File size must be 5MB or less.').refine(file => ACCEPTED_FILE_TYPES.includes(file.type), 'Only .jpg, .png, and .pdf files are accepted.'),
  domains: z.array(z.string()).refine(value => value.length >= 1 && value.length <= 3, {
    message: 'Please select between 1 and 3 domains.',
  }),
  primaryDomain: z.string().min(1, 'Please select your primary domain.'),
}).refine(data => data.domains.includes(data.primaryDomain), {
  message: 'Primary domain must be one of the selected domains.',
  path: ['primaryDomain'],
});

const TOTAL_STEPS = 6;

const domainsList = [
    { id: 'web-dev', label: 'Web Development' },
    { id: 'mobile-dev', label: 'Mobile Development' },
    { id: 'ai-ml', label: 'AI/ML' },
    { id: 'data-science', label: 'Data Science' },
    { id: 'cybersecurity', label: 'Cybersecurity' },
    { id: 'product-management', label: 'Product Management' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [showConfetti, setShowConfetti] = useState(false);
  const { width, height } = useWindowSize();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      name: '',
      college: '',
      domains: [],
      primaryDomain: ''
    },
    mode: 'onChange',
  });

  const watchedDomains = form.watch('domains');

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const { password, collegeId, ...userData } = values;
      const userCredential = await signUpWithEmail(password, {
        ...userData,
        year: parseInt(values.year, 10),
      });

      const userId = userCredential.user.uid;
      const collegeIdUrl = await uploadCollegeId(userId, collegeId);
      
      const { updateUserDocument } = await import('@/lib/firebase/firestore');
      // Award 25 more points for completing onboarding
      await updateUserDocument(userId, { 
          collegeIdUrl, 
          points: 75 // 50 from signup + 25 from onboarding
      });

      setShowConfetti(true);
      setTimeout(() => {
        router.push('/dashboard');
        toast({
          title: 'Welcome to the Community!',
          description: "You've earned 75 points and the 'First Steps' badge!",
        });
      }, 5000);

    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Registration Failed',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  }

  type FieldName = keyof z.infer<typeof formSchema>;

  const steps = [
    { id: 1, title: 'Welcome to REvamp!', fields: [] as FieldName[] },
    { id: 2, title: 'Let\'s get to know you', fields: ['email', 'password', 'name', 'college', 'year'] as FieldName[] },
    { id: 3, title: 'Verify your Student Status', fields: ['collegeId'] as FieldName[] },
    { id: 4, title: 'Choose Your Domains', fields: ['domains'] as FieldName[] },
    { id: 5, title: 'Select Your Primary Domain', fields: ['primaryDomain'] as FieldName[] },
    { id: 6, title: 'Onboarding Complete!', fields: [] as FieldName[] },
  ];

  const handleNext = async () => {
    const fields = steps[step - 1].fields;
    if (fields.length > 0) {
        const output = await form.trigger(fields as FieldName[], { shouldFocus: true });
        if (!output) return;
    }

    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      await form.handleSubmit(onSubmit)();
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  if (step === TOTAL_STEPS && showConfetti) {
      return (
          <Card className="w-full max-w-lg text-center p-8">
              {width && height && <Confetti width={width} height={height} recycle={false} />}
              <CardHeader>
                  <div className="mx-auto bg-green-100 rounded-full p-4 w-fit dark:bg-green-900/50">
                      <PartyPopper className="h-12 w-12 text-green-600 dark:text-green-400" />
                  </div>
                  <CardTitle className="text-2xl font-headline mt-4">You're All Set!</CardTitle>
                  <CardDescription>
                      You've earned 75 points and the "First Steps" badge. Welcome aboard! You'll be redirected to your dashboard shortly.
                  </CardDescription>
              </CardHeader>
              <CardContent>
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              </CardContent>
          </Card>
      )
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">
          {steps[step - 1].title}
        </CardTitle>
        <CardDescription>
          Join the REvamp community. Step {step} of {TOTAL_STEPS}
        </CardDescription>
        <Progress value={(step / TOTAL_STEPS) * 100} className="w-full mt-2" />
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-4 py-4 min-h-[250px]">
            {step === 1 && (
                <div className='text-center space-y-4 flex flex-col items-center justify-center h-full'>
                    <LogoIcon className="h-16 w-16 text-primary" />
                    <p className='text-muted-foreground'>
                        Welcome to the ultimate platform for college students to learn, grow, and connect. Let's get you started.
                    </p>
                </div>
            )}
            {step === 2 && (
              <>
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Personal Email</FormLabel><FormControl><Input placeholder="name@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="college" render={({ field }) => (
                  <FormItem><FormLabel>College Name</FormLabel><FormControl><Input placeholder="University of Example" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="year" render={({ field }) => (
                  <FormItem><FormLabel>Year of Study</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="1">1st Year</SelectItem>
                        <SelectItem value="2">2nd Year</SelectItem>
                        <SelectItem value="3">3rd Year</SelectItem>
                        <SelectItem value="4">4th Year</SelectItem>
                      </SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
              </>
            )}
            {step === 3 && (
                <FormField control={form.control} name="collegeId" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Upload College ID</FormLabel>
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
                                                <p className="text-xs text-muted-foreground">JPG, PNG, or PDF (MAX. 5MB)</p>
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
            )}
            {step === 4 && (
                <FormField control={form.control} name="domains" render={() => (
                    <FormItem>
                         <div className="mb-4">
                            <FormLabel className="text-base">Select Your Interests</FormLabel>
                            <FormDescription>Choose up to 3 domains you're passionate about.</FormDescription>
                        </div>
                        <div className='grid grid-cols-2 gap-4'>
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
            )}
            {step === 5 && (
                 <FormField
                    control={form.control}
                    name="primaryDomain"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                        <FormLabel>What's your primary focus?</FormLabel>
                        <FormDescription>This will help us personalize your experience.</FormDescription>
                        <FormControl>
                            <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                            >
                            {domainsList.filter(d => watchedDomains.includes(d.id)).map(domain => (
                                <FormItem className="flex items-center space-x-3 space-y-0" key={domain.id}>
                                    <FormControl>
                                        <RadioGroupItem value={domain.id} />
                                    </FormControl>
                                    <FormLabel className="font-normal">{domain.label}</FormLabel>
                                </FormItem>
                            ))}
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
            )}
          </form>
        </Form>
      </CardContent>
      {step < TOTAL_STEPS && (
        <CardFooter className="flex-col gap-4">
            <div className="flex w-full justify-between">
            <Button
                type="button"
                onClick={handlePrev}
                variant="outline"
                disabled={step === 1 || isLoading}
            >
                Back
            </Button>
            <Button type="button" onClick={handleNext} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {step === TOTAL_STEPS - 1 ? 'Finish Onboarding' : 'Next'}
            </Button>
            </div>
            <p className="pt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
                href="/login"
                className="font-semibold text-primary hover:underline"
            >
                Sign in
            </Link>
            </p>
        </CardFooter>
      )}
    </Card>
  );
}

function LogoIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}
