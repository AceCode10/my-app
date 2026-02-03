'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Users, BookOpen, CheckCircle, XCircle, LogIn } from 'lucide-react';
import Link from 'next/link';

const supabase = createClient();

interface ClassInfo {
  id: string;
  name: string;
  join_code: string;
  subjects?: { name: string };
  users?: { display_name: string };
}

export default function JoinClassPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();
  
  const code = params.code as string;
  
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [joinStatus, setJoinStatus] = useState<'idle' | 'success' | 'already_enrolled' | 'pending' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchClassInfo() {
      if (!code) {
        setError('Invalid class code');
        setIsLoading(false);
        return;
      }

      try {
        // Try both uppercase and original case for the join code
        const joinCode = code.toUpperCase();
        
        // First try to get class with relationships
        let { data, error: fetchError } = await supabase
          .from('classes')
          .select(`
            id,
            name,
            join_code,
            subjects(name),
            users!classes_teacher_id_fkey(display_name)
          `)
          .eq('join_code', joinCode)
          .single();

        // If that fails, try without the user relationship (might be RLS issue)
        if (fetchError || !data) {
          const { data: basicData, error: basicError } = await supabase
            .from('classes')
            .select(`
              id,
              name,
              join_code,
              subjects(name)
            `)
            .eq('join_code', joinCode)
            .single();
          
          if (!basicError && basicData) {
            data = basicData;
            fetchError = null;
          }
        }

        // If still not found, try with original case
        if (fetchError || !data) {
          const { data: origCaseData, error: origCaseError } = await supabase
            .from('classes')
            .select(`
              id,
              name,
              join_code,
              subjects(name)
            `)
            .eq('join_code', code)
            .single();
          
          if (!origCaseError && origCaseData) {
            data = origCaseData;
            fetchError = null;
          }
        }

        if (fetchError || !data) {
          setError('Class not found. Please check the invite link.');
          setIsLoading(false);
          return;
        }

        setClassInfo(data as ClassInfo);
      } catch (err) {
        console.error('Error fetching class:', err);
        setError('Failed to load class information');
      } finally {
        setIsLoading(false);
      }
    }

    fetchClassInfo();
  }, [code]);

  useEffect(() => {
    async function checkEnrollment() {
      if (!user || !classInfo) return;

      const { data: existingEnrollment } = await supabase
        .from('enrollments')
        .select('status')
        .eq('user_id', user.id)
        .eq('class_id', classInfo.id)
        .single();

      if (existingEnrollment) {
        if (existingEnrollment.status === 'active') {
          setJoinStatus('already_enrolled');
        } else if (existingEnrollment.status === 'pending') {
          setJoinStatus('pending');
        }
      }
    }

    checkEnrollment();
  }, [user, classInfo]);

  const handleJoinClass = async () => {
    if (!user || !classInfo) return;
    
    setIsJoining(true);
    try {
      // Check if already enrolled
      const { data: existingEnrollment } = await supabase
        .from('enrollments')
        .select('*')
        .eq('user_id', user.id)
        .eq('class_id', classInfo.id)
        .single();

      if (existingEnrollment) {
        if (existingEnrollment.status === 'active') {
          setJoinStatus('already_enrolled');
          toast({ title: 'Already Enrolled', description: `You are already in ${classInfo.name}.` });
        } else if (existingEnrollment.status === 'pending') {
          setJoinStatus('pending');
          toast({ title: 'Request Pending', description: `Your request to join ${classInfo.name} is already pending approval.` });
        }
        setIsJoining(false);
        return;
      }

      // Create enrollment request - pending status, teacher must approve
      const { error: enrollError } = await supabase
        .from('enrollments')
        .insert({
          user_id: user.id,
          class_id: classInfo.id,
          status: 'pending',
          enrolled_at: new Date().toISOString()
        });

      if (enrollError) throw enrollError;

      setJoinStatus('success');
      toast({ 
        title: 'Request Sent!', 
        description: `Your request to join ${classInfo.name} has been sent to the teacher for approval.` 
      });
    } catch (err) {
      console.error('Error joining class:', err);
      setJoinStatus('error');
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: 'Could not request to join the class. Please try again.' 
      });
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading || userLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Loading class information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <XCircle className="h-12 w-12 mx-auto text-destructive mb-2" />
            <CardTitle>Invalid Invite Link</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/">Go to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!classInfo) {
    return null;
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Join Class</CardTitle>
          <CardDescription>You&apos;ve been invited to join a class</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Class Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-lg">{classInfo.name}</h3>
            {classInfo.subjects && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BookOpen className="h-4 w-4" />
                <span>{(classInfo.subjects as any).name}</span>
              </div>
            )}
            {classInfo.users && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Teacher: {(classInfo.users as any).display_name}</span>
              </div>
            )}
          </div>

          {/* Action Section */}
          {!user ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Please sign in to join this class
              </p>
              <div className="flex flex-col gap-2">
                <Button asChild className="w-full">
                  <Link href={`/login?redirect=/join/${code}`}>
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In to Join
                  </Link>
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <Link href={`/signup?redirect=/join/${code}`}>
                    Create an Account
                  </Link>
                </Button>
              </div>
            </div>
          ) : joinStatus === 'success' ? (
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
              <div>
                <p className="font-semibold text-green-700 dark:text-green-400">Request Sent!</p>
                <p className="text-sm text-muted-foreground">
                  Your request has been sent to the teacher. You&apos;ll be notified when approved.
                </p>
              </div>
              <Button asChild className="w-full">
                <Link href="/student/classes">Go to My Classes</Link>
              </Button>
            </div>
          ) : joinStatus === 'already_enrolled' ? (
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
              <div>
                <p className="font-semibold text-green-700 dark:text-green-400">Already Enrolled!</p>
                <p className="text-sm text-muted-foreground">
                  You&apos;re already a member of this class.
                </p>
              </div>
              <Button asChild className="w-full">
                <Link href={`/student/classes/${classInfo.id}`}>Go to Class</Link>
              </Button>
            </div>
          ) : joinStatus === 'pending' ? (
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 mx-auto text-yellow-500" />
              <div>
                <p className="font-semibold text-yellow-700 dark:text-yellow-400">Request Pending</p>
                <p className="text-sm text-muted-foreground">
                  Your join request is awaiting teacher approval.
                </p>
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link href="/student/classes">Go to My Classes</Link>
              </Button>
            </div>
          ) : (
            <Button 
              onClick={handleJoinClass} 
              disabled={isJoining}
              className="w-full"
              size="lg"
            >
              {isJoining ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending Request...
                </>
              ) : (
                'Request to Join Class'
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
