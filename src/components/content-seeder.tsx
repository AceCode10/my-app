
'use client';

import React, { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { seedDatabaseContent } from '@/lib/seed-content';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Database, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs, limit, query } from 'firebase/firestore';

type SeedState = 'idle' | 'checking' | 'ready' | 'seeding' | 'completed' | 'error';

export function ContentSeeder() {
  const [seedState, setSeedState] = useState<SeedState>('idle');
  const firestore = useFirestore();
  const { toast } = useToast();

  // Check if content exists on mount
  useEffect(() => {
    async function checkContent() {
      if (!firestore) {
        setSeedState('idle'); // Firestore is not ready yet, wait.
        return;
      }
      setSeedState('checking');
      try {
        // A simple check to see if the subjects collection is populated.
        const notesQuery = query(collection(firestore, 'notes'), limit(1));
        const notesSnapshot = await getDocs(notesQuery);

        if (notesSnapshot.empty) {
          // If no notes, assume seeding is needed.
          setSeedState('ready');
        } else {
          // If content exists, we don't need to show the seeder.
          setSeedState('completed');
        }
      } catch (error) {
        console.error("Error checking for existing content:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not check for app content.' });
        setSeedState('error');
      }
    }

    checkContent();
  }, [firestore, toast]);

  const handleSeedDatabase = async () => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Database connection is not available.' });
      return;
    }
    setSeedState('seeding');

    const result = await seedDatabaseContent(firestore);

    if (result.status === 'success') {
      toast({
        title: 'Content Seeded!',
        description: result.message,
      });
      setSeedState('completed');
    } else if (result.status === 'info') {
       toast({
        title: 'All Good!',
        description: result.message,
      });
      setSeedState('completed');
    } else {
      toast({
        variant: 'destructive',
        title: 'Seeding Failed',
        description: result.message,
      });
      setSeedState('error');
    }
  };

  const renderState = () => {
    switch (seedState) {
      case 'checking':
        return (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Checking for content...
          </>
        );
      case 'ready':
      case 'error':
        return 'Seed Database';
      case 'seeding':
        return (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Seeding... This may take a moment.
          </>
        );
      case 'completed':
        return (
          <>
            <CheckCircle className="mr-2 h-4 w-4" />
            Content Initialized
          </>
        );
      default:
        return null;
    }
  };
  
  if (seedState === 'completed' || seedState === 'idle') {
    // Don't show anything if content is already there or we are just checking/waiting for firestore
    return null;
  }

  return (
    <Alert className="mb-6 bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300">
      <Database className="h-4 w-4 !text-blue-600 dark:!text-blue-400" />
      <AlertTitle>Initialize Your App Content</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <p>Click the button to populate your database with subjects and lesson notes. This is a one-time action.</p>
        <Button 
            onClick={handleSeedDatabase} 
            disabled={seedState === 'seeding' || seedState === 'completed' || seedState === 'checking'} 
            size="sm" 
            className="ml-4 bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0"
        >
          {renderState()}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
