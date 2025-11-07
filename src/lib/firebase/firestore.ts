import { doc, setDoc, updateDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { db } from './config';
import type { User, Event, AmbassadorApplication } from '@/types';

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

export async function createEvent(eventData: Omit<Event, 'id' | 'createdAt' | 'createdBy' | 'meetLink'>, createdBy: string) {
    const eventsCollection = collection(db, 'events');
    const newEventData = {
        ...eventData,
        createdBy,
        createdAt: serverTimestamp(),
        meetLink: eventData.lumaUrl,
    };
    const eventRef = await addDoc(eventsCollection, newEventData);
    return eventRef.id;
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
