'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
import { NotesViewer } from '@/components/notes/notes-viewer';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Lock, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import type { Note } from '@/types/notes';

export default function NoteViewPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const supabase = createClient();
  const { user, loading: userLoading } = useUser();
  
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    async function fetchNote() {
      try {
        const { data, error } = await supabase
          .from('notes')
          .select(`
            *,
            subject:subjects(id, name, slug),
            topic:topics(id, name, slug),
            exam_board:exam_boards(id, name, code)
          `)
          .eq('slug', resolvedParams.slug)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            setError('Note not found');
          } else {
            throw error;
          }
          return;
        }

        // Check access based on visibility
        if (data.visibility === 'draft') {
          setAccessDenied(true);
          return;
        }

        if (data.visibility === 'registered' && !user) {
          setAccessDenied(true);
          return;
        }

        if (data.visibility === 'premium') {
          // Check user subscription
          if (!user) {
            setAccessDenied(true);
            return;
          }
          
          const { data: userData } = await supabase
            .from('users')
            .select('subscription_tier')
            .eq('id', user.id)
            .single();

          if (!userData || !['essential', 'pro'].includes(userData.subscription_tier)) {
            setAccessDenied(true);
            return;
          }
        }

        setNote(data);
      } catch (err: any) {
        console.error('Error fetching note:', err);
        setError('Failed to load note');
      } finally {
        setLoading(false);
      }
    }

    if (!userLoading) {
      fetchNote();
    }
  }, [resolvedParams.slug, user, userLoading]);

  const handleBack = () => {
    router.back();
  };

  if (loading || userLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-8" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="text-center mt-6">
          <Link href="/resources">
            <Button>Browse Resources</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center">
          <Lock className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Restricted</h1>
          <p className="text-muted-foreground mb-6">
            {!user 
              ? 'Please sign in to access this content.'
              : 'This content requires a premium subscription.'}
          </p>
          {!user ? (
            <div className="flex justify-center gap-4">
              <Link href="/login">
                <Button>Sign In</Button>
              </Link>
              <Link href="/signup">
                <Button variant="outline">Create Account</Button>
              </Link>
            </div>
          ) : (
            <Link href="/pricing">
              <Button>View Plans</Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (!note) {
    return null;
  }

  return (
    <NotesViewer
      note={note}
      userId={user?.id}
      onBack={handleBack}
      showBackButton={true}
    />
  );
}
