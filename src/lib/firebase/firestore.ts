
import { doc, setDoc, updateDoc, serverTimestamp, collection, addDoc, getDoc } from 'firebase/firestore';
import { db } from './config';
import type { User, Event, AmbassadorApplication } from '@/types';
import { uploadEventBanner } from './storage';

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

// Omit id, bannerUrl, createdAt, createdBy from the input data type
type EventCreationData = Omit<Event, 'id' | 'bannerUrl' | 'createdAt' | 'createdBy'> & { banner: File };

export async function createEvent(eventData: EventCreationData, createdBy: string) {
    // 1. Create a new document reference with a generated ID
    const eventRef = doc(collection(db, 'events'));
    const eventId = eventRef.id;

    // 2. Upload the banner using the new event ID
    const bannerUrl = await uploadEventBanner(eventId, eventData.banner);

    // 3. Prepare the final event data
    const { banner, ...restOfEventData } = eventData;
    const newEvent = {
        ...restOfEventData,
        bannerUrl,
        createdBy,
        createdAt: serverTimestamp(),
    };

    // 4. Set the document data with the final object
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
