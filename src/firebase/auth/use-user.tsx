
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase/provider';
import type { UserProfile } from '@/types';

export interface UserHookResult {
  user: User | null;
  profile: UserProfile | null;
  roles: string[];
  isUserLoading: boolean;
  isSubscribed: boolean;
  userError: Error | null;
}

export const useUser = (): UserHookResult => {
  const auth = useAuth(); 
  const firestore = useFirestore();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [userError, setUserError] = useState<Error | null>(null);

  useEffect(() => {
    if (!auth) {
      // This should ideally not happen if useAuth throws an error when not ready.
      // But as a safeguard:
      setIsUserLoading(false);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        if (firebaseUser) {
          setUser(firebaseUser);
          // isUserLoading will be set to false in the profile snapshot listener
        } else {
          setUser(null);
          setProfile(null);
          setRoles([]);
          setIsUserLoading(false);
        }
      },
      (error) => {
        console.error("Auth state error:", error);
        setUserError(error);
        setIsUserLoading(false);
      }
    );

    return () => unsubscribeAuth();
  }, [auth]);

  useEffect(() => {
    if (!firestore || !user) {
      if (!user) {
        setIsUserLoading(false);
      }
      // Clear profile state if user logs out or firestore is not ready
      setProfile(null);
      setRoles([]);
      return;
    }
    
    // At this point, user is authenticated, start loading profile.
    setIsUserLoading(true);
    const profileRef = doc(firestore, 'users', user.uid);
    const unsubscribeProfile = onSnapshot(
      profileRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const userProfile = docSnap.data() as UserProfile;
          setProfile(userProfile);
          
          if (Array.isArray(userProfile.role)) {
            setRoles(userProfile.role);
          } else if (typeof userProfile.role === 'string') {
            setRoles([userProfile.role]);
          } else {
            setRoles(['student']); // Default role
          }

        } else {
          // This case can happen briefly during sign-up before profile is created.
          setProfile(null);
          setRoles([]);
        }
        setIsUserLoading(false); // Finished loading profile (or confirmed it doesn't exist)
      },
      (error) => {
        console.error("Profile snapshot error:", error);
        setUserError(error);
        setProfile(null);
        setRoles([]);
        setIsUserLoading(false);
      }
    );

    return () => unsubscribeProfile();
  }, [user, firestore]);

  const isSubscribed = profile?.subscriptionTier === 'essential' || profile?.subscriptionTier === 'pro';

  return { user, profile, roles, isUserLoading, isSubscribed, userError };
};
