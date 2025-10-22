
'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

// Combined state for the Firebase context
export interface FirebaseContextState {
  app: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
}

// React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

interface FirebaseProviderProps {
  children: ReactNode;
  app: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

/**
 * FirebaseProvider manages and provides Firebase service instances.
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  app,
  firestore,
  auth,
}) => {
  const contextValue = useMemo((): FirebaseContextState => {
    return {
      app,
      firestore,
      auth,
    };
  }, [app, firestore, auth]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

// --- Service Hooks --- //

function useFirebaseServices(): FirebaseContextState {
    const context = useContext(FirebaseContext);
    if (context === undefined) {
      throw new Error('useFirebaseServices must be used within a FirebaseProvider.');
    }
    // We now assume that if the context exists, the services are available.
    // The client-provider ensures this at the root of the app.
    return context as FirebaseContextState;
}

/** Hook to access Firebase Auth instance. Throws an error if not ready. */
export const useAuth = (): Auth => {
  const services = useFirebaseServices();
  const auth = services?.auth;
  if (!auth) {
    throw new Error('Firebase Auth is not available. Ensure FirebaseProvider is set up correctly.');
  }
  return auth;
};

/** Hook to access Firestore instance. Throws an error if not ready. */
export const useFirestore = (): Firestore => {
  const services = useFirebaseServices();
  const firestore = services?.firestore;
   if (!firestore) {
    throw new Error('Firebase Firestore is not available. Ensure FirebaseProvider is set up correctly.');
  }
  return firestore;
};

/** Hook to access Firebase App instance. Throws an error if not ready. */
export const useFirebaseApp = (): FirebaseApp => {
  const services = useFirebaseServices();
  const app = services?.app;
  if (!app) {
    throw new Error('Firebase App is not available. Ensure FirebaseProvider is set up correctly.');
  }
  return app;
};

// --- Sidebar Hook --- //
// This seems misplaced, but to avoid circular dependencies and for simplicity,
// we can keep the useSidebar hook here if it's being used across dashboards.
// A better place might be in its own context provider if it grows.
const SidebarContext = createContext<{
  state: string;
  // Add other sidebar context properties if needed
} | null>(null);

export const useSidebar = () => {
    const context = useContext(SidebarContext);
    if (!context) {
        // Return a default or mock state if not in a provider.
        // This makes the component less brittle if used outside the context.
        return { state: 'expanded' }; 
    }
    return context;
};
