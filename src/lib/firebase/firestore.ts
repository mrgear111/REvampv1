import { doc, setDoc, updateDoc, serverTimestamp, collection, addDoc, getDoc } from 'firebase/firestore';
import { db } from './config';
import type { User, Event, AmbassadorApplication, Workshop, EventRegistration } from '@/types';
import { uploadEventBanner, uploadWorkshopBanner } from './storage';

type UserCreationData = Omit<User, 'uid' | 'createdAt' | 'verificationStatus' | 'tier' | 'streak' | 'lastActiveDate' | 'collegeIdUrl' | 'studentIdNumber' | 'role'>;

export async function createUserDocument(userId: string, data: UserCreationData) {
  const userRef = doc(db, 'users', userId);
  const newUser: Omit<User, 'uid'> = {
    ...data,
    verificationStatus: 'pending',
    tier: 'Bronze',
    streak: 0,
    points: data.points || 0,
    badges: data.badges || [],
    createdAt: serverTimestamp() as any,
    role: 'student',
  };
  await setDoc(userRef, newUser, { merge: true });
}

export async function updateUserDocument(userId: string, data: Partial<User>) {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
        ...data,
    });
}

type EventCreationData = Omit<Event, 'id' | 'bannerUrl' | 'createdAt' | 'createdBy'>;

export async function createEvent(eventData: EventCreationData, bannerFile: File, createdBy: string) {
    const eventRef = doc(collection(db, 'events'));
    const eventId = eventRef.id;

    const bannerUrl = await uploadEventBanner(eventId, bannerFile);

    const newEvent: Omit<Event, 'id'> = {
        ...eventData,
        bannerUrl,
        createdBy,
        createdAt: serverTimestamp() as any,
    };

    await setDoc(eventRef, newEvent);

    return eventId;
}


export async function createAmbassadorApplication(userId: string, data: Omit<AmbassadorApplication, 'userId' | 'status' | 'appliedAt' | 'id'>) {
    const applicationCollection = collection(db, 'ambassadorApplications');
    const newApplicationData = {
        ...data,
        userId,
        status: 'pending',
        appliedAt: serverTimestamp(),
    };
    const appRef = await addDoc(applicationCollection, newApplicationData);
    return appRef.id;
}


type WorkshopCreationData = Omit<Workshop, 'id' | 'bannerUrl' | 'createdAt' | 'createdBy'>;

export async function createWorkshop(workshopData: WorkshopCreationData, bannerFile: File, createdBy: string) {
    const workshopRef = doc(collection(db, 'workshops'));
    const workshopId = workshopRef.id;

    const bannerUrl = await uploadWorkshopBanner(workshopId, bannerFile);

    const newWorkshop: Omit<Workshop, 'id'> = {
        ...workshopData,
        bannerUrl,
        createdBy,
        createdAt: serverTimestamp() as any,
    };

    await setDoc(workshopRef, newWorkshop);
    return workshopId;
}
