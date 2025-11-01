'use client';

// ============================================
// EXAM BOARD ONBOARDING PAGE
// First-time user exam board selection
// ============================================

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ExamBoardOnboarding } from '@/components/exam-board';
import { Loader2 } from 'lucide-react';

export default function ExamBoardOnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Not authenticated, redirect to login
        router.push('/login?redirect=/onboarding/exam-board');
        return;
      }

      setIsAuthenticated(true);

      // Check if onboarding already completed
      const { data: userRecord } = await supabase
        .from('users')
        .select('onboarding_completed, role')
        .eq('id', user.id)
        .single();

      if (userRecord?.onboarding_completed) {
        // Already completed, redirect to appropriate dashboard
        const redirectPath = userRecord.role === 'teacher' ? '/teacher' : '/student';
        router.push(redirectPath);
        return;
      }

      setIsLoading(false);
    };

    checkAuth();
  }, [router, supabase]);

  const handleComplete = async (boardId: string | null) => {
    // Get user role and redirect to appropriate dashboard
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: userRecord } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      const redirectPath = userRecord?.role === 'teacher' ? '/teacher' : '/student';
      router.push(redirectPath);
    }
  };

  const handleSkip = async () => {
    // Mark onboarding as completed even if skipped
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: userRecord } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      await supabase
        .from('users')
        .update({ 
          onboarding_completed: true,
          show_all_exam_boards: true 
        })
        .eq('id', user.id);
      
      const redirectPath = userRecord?.role === 'teacher' ? '/teacher' : '/student';
      router.push(redirectPath);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <ExamBoardOnboarding
      onComplete={handleComplete}
      onSkip={handleSkip}
      allowSkip={true}
    />
  );
}
