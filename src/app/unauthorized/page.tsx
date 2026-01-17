'use client';

import Link from 'next/link';
import { useUser } from '@/hooks/use-user';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';


export default function UnauthorizedPage() {
  const { user, loading } = useUser();
  
  const dashboardUrl = useMemo(() => {
    if (loading) return '/'; // Default fallback while loading
    const role = user?.role;
    // Check for super_admin, content_moderator, or teacher roles
    if (role === 'super_admin' || role === 'content_moderator') {
      return '/admin';
    }
    if (role === 'teacher') {
      return '/teacher';
    }
    return '/student';
  }, [user, loading]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="bg-card p-8 rounded-2xl shadow-lg text-center max-w-md w-full">
            <ShieldAlert className="mx-auto h-16 w-16 text-destructive mb-4" />
            <h1 className="text-4xl font-bold text-card-foreground mb-4">Access Denied</h1>
            <p className="text-muted-foreground mb-6">You do not have the required permissions to view this page.</p>
            <Button asChild>
                 <Link href={dashboardUrl}>
                    Go to My Dashboard
                </Link>
            </Button>
        </div>
    </div>
  );
}
