'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { onIdTokenChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import type { AuthUser } from '@/types';
import { Loader2 } from 'lucide-react';
import Cookies from 'js-cookie';

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const tokenResult = await firebaseUser.getIdTokenResult();
        // In production, you would manage custom claims via a backend.
        // For development, we use an environment variable for the admin email.
        const isAdmin = tokenResult.claims.admin === true || firebaseUser.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;
        
        setUser({ ...firebaseUser, isAdmin });
        
        const token = await firebaseUser.getIdToken();
        Cookies.set('session', token, { expires: 7, secure: true });

      } else {
        setUser(null);
        Cookies.remove('session');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
