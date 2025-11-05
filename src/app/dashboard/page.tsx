'use client';

import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

export default function DashboardPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-10 w-1/2 mb-4" />
        <Skeleton className="h-8 w-1/3 mb-8" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/4" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return null; // Or a message telling user to log in, though middleware should handle this.
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold font-headline">
        Welcome back, {user.displayName || 'User'}!
      </h1>
      <p className="text-muted-foreground mb-8">
        Here&apos;s a summary of your account information.
      </p>

      {user.isAdmin && (
        <Alert className="mb-8 border-primary/50 text-primary">
          <Terminal className="h-4 w-4 !text-primary" />
          <AlertTitle className="font-bold">Admin Access</AlertTitle>
          <AlertDescription>
            You have administrator privileges. You can access admin-only features.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p>
              <span className="font-semibold">Email:</span> {user.email}
            </p>
            <p>
              <span className="font-semibold">User ID:</span>{' '}
              <code className="text-sm bg-muted px-1 py-0.5 rounded">
                {user.uid}
              </code>
            </p>
            <div className="flex items-center gap-2">
              <span className="font-semibold">Email Verified:</span> 
              {user.emailVerified ? (
                <Badge variant="secondary" className='bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'>Verified</Badge>
              ) : (
                <Badge variant="destructive">Not Verified</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
