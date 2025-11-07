import type { User as FirebaseUser } from 'firebase/auth';
import type { Timestamp } from 'firebase/firestore';

export type User = {
  uid: string;
  email: string;
  name: string;
  college: string;
  year: number;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  createdAt: Timestamp;
  collegeIdUrl?: string;
  studentIdNumber?: string;
  primaryDomain: string;
  domains: string[];
  points: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  badges: string[];
  streak: number;
  lastActiveDate?: Timestamp;
  role: 'student' | 'ambassador' | 'admin';
  photoURL?: string;
};

export interface AuthUser extends FirebaseUser {
  isAdmin?: boolean;
}

export type Event = {
  id?: string;
  title: string;
  description: string;
  bannerUrl: string;
  date: Timestamp;
  duration: number; // hours
  meetLink?: string;
  isFree: boolean;
  price: number; // in paise
  domains: string[];
  targetYears: number[];
  colleges: string[];
  createdAt: Timestamp;
  createdBy: string; // userId
  lumaUrl?: string;
};

export type LumaEvent = {
  eventId: string; // reference to events
  lumaEventId: string; // Luma's ID
  lumaUrl: string;
  collegeId?: string; // nullable for multi-campus
};

export type Registration = {
  id: string;
  userId: string;
  eventId: string;
  paymentId?: string;
  paymentStatus: 'pending' | 'success' | 'failed';
  attended: boolean;
  registeredAt: Timestamp;
};

export type College = {
  id: string;
  name: string;
};

export type Badge = {
    id?: string;
    name: string;
    description: string;
    iconUrl: string;
    category: 'milestone' | 'skill' | 'social' | 'special';
}

export type Payment = {
    id?: string;
    userId: string;
    eventId: string;
    amount: number; // in paise
    razorpayOrderId: string;
    razorpayPaymentId: string;
    status: 'pending' | 'success' | 'failed';
    createdAt: Timestamp;
}

export type AmbassadorApplication = {
    id?: string;
    userId: string;
    answers: {
        why: string;
        what: string;
        experience: string;
    };
    videoUrl: string;
    status: 'pending' | 'approved' | 'rejected';
    appliedAt: Timestamp;
};

export type Ambassador = {
    id?: string;
    userId: string;
    college: string;
    tier: 'Campus' | 'Senior' | 'Lead';
    semester: string;
    stipend: number;
    studentsRecruited: number;
    eventsHosted: number;
    startDate: Timestamp;
};

export type Notification = {
    id?: string;
    userId: string;
    title: string;
    message: string;
    type: 'event' | 'badge' | 'payment' | 'general';
    read: boolean;
    createdAt: Timestamp;
};
