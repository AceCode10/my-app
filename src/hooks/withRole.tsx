'use client';

import { useUser } from '@/hooks/use-user';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const FullPageLoader = () => (
    <div className="flex h-screen w-full items-center justify-center bg-background">
        <p className="text-muted-foreground animate-pulse">Loading component...</p>
    </div>
);

/**
 * [Temporary Pass-Through] This component currently allows any user to access the wrapped component for testing purposes.
 * The original role-based security logic has been temporarily disabled.
 */
const withRole = (WrappedComponent: React.ComponentType<any>, allowedRoles: string[]) => {
  const Wrapper = (props: any) => {
    const { loading } = useUser();

    // Render a loader while authenticating, then render the component.
    if (loading) {
      return <FullPageLoader />;
    }

    return <WrappedComponent {...props} />;
  };

  Wrapper.displayName = `withRole(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return Wrapper;
};

export default withRole;
