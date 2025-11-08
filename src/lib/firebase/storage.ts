'use client';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './config';

// Handle CORS for Firebase Storage
const handleCORS = () => {
  if (typeof window !== 'undefined') {
    // Add metadata to storage uploads to handle CORS
    const corsMetadata = {
      metadata: {
        contentType: 'image/jpeg',
      },
      customMetadata: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    };
    
    return corsMetadata;
  }
  return {};
};

const corsSettings = handleCORS();

export async function uploadCollegeId(userId: string, file: File): Promise<string> {
    const filePath = `college-ids/${userId}/${file.name}`;
    const storageRef = ref(storage, filePath);

    // Apply CORS metadata to the upload
    const metadata = {
        contentType: file.type,
        customMetadata: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        }
    };

    const snapshot = await uploadBytes(storageRef, file, metadata);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
}

export async function uploadEventBanner(eventId: string, file: File): Promise<string> {
    const filePath = `event-banners/${eventId}/${file.name}`;
    const storageRef = ref(storage, filePath);

    // Apply CORS metadata to the upload
    const metadata = {
        contentType: file.type,
        customMetadata: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        }
    };

    const snapshot = await uploadBytes(storageRef, file, metadata);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
}

export async function uploadAmbassadorVideo(userId: string, file: File): Promise<string> {
    const filePath = `ambassador-applications/${userId}/${file.name}`;
    const storageRef = ref(storage, filePath);

    // Apply CORS metadata to the upload
    const metadata = {
        contentType: file.type,
        customMetadata: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        }
    };

    const snapshot = await uploadBytes(storageRef, file, metadata);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
}

export async function uploadWorkshopBanner(workshopId: string, file: File): Promise<string> {
    const filePath = `workshop-banners/${workshopId}/${file.name}`;
    const storageRef = ref(storage, filePath);

    // Apply CORS metadata to the upload
    const metadata = {
        contentType: file.type,
        customMetadata: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        }
    };

    const snapshot = await uploadBytes(storageRef, file, metadata);
    const downloadURL = await getDownloadURL(snapshot.ref);

    return downloadURL;
}

    