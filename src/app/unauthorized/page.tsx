'use client';

import Link from 'next/link';
import { useUser } from '@/firebase';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';


export default function UnauthorizedPage() {
  const { roles, isUserLoading } = useUser();
  
  const dashboardUrl = useMemo(() => {
    if (isUserLoading) return '/'; // Default fallback while loading
    if (roles.includes('admin')) {
      return '/admin/dashboard';
    }
    if (roles.includes('teacher')) {
      return '/teacher/dashboard';
    }
    return '/dashboard';
  }, [roles, isUserLoading]);

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
