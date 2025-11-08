import { storage } from './config';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

// This function adds CORS headers to Firebase Storage requests
export const setupStorageCORS = () => {
  // In a production environment, CORS should be configured on the server side
  // This is a client-side workaround for development purposes
  
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    // Add a global fetch interceptor for Firebase Storage requests
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await originalFetch(input, init);
      
      // Clone the response to avoid consuming it
      const clonedResponse = response.clone();
      
      // Check if this is a Firebase Storage request
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : '';
      const isFirebaseStorageRequest = url.includes('firebasestorage.googleapis.com');
      
      if (isFirebaseStorageRequest) {
        // Create a new response with CORS headers
        return new Response(await clonedResponse.blob(), {
          status: clonedResponse.status,
          statusText: clonedResponse.statusText,
          headers: {
            ...Object.fromEntries(clonedResponse.headers.entries()),
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, Content-Length, X-Requested-With',
          },
        });
      }
      
      return response;
    };
  }
};

export default storage;
