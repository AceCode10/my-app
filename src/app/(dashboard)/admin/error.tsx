'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[admin] route error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <AlertTriangle className="h-12 w-12 text-destructive" aria-hidden="true" />
      <div>
        <h2 className="text-2xl font-semibold">Something broke in the admin dashboard</h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {error.message || 'An unexpected error occurred.'}
        </p>
        {error.digest && (
          <p className="mt-1 text-xs text-muted-foreground">Reference: {error.digest}</p>
        )}
      </div>
      <div className="flex gap-2">
        <Button onClick={() => reset()}>Try again</Button>
        <Button variant="outline" onClick={() => (window.location.href = '/admin')}>
          Back to dashboard
        </Button>
      </div>
    </div>
  );
}
