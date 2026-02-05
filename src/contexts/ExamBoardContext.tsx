'use client';

// ============================================
// EXAM BOARD CONTEXT
// Global state management for exam board filtering
// ============================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { 
  ExamBoard, 
  ExamBoardContextValue, 
  UserExamBoardPreference 
} from '@/types/exam-board';

const ExamBoardContext = createContext<ExamBoardContextValue | undefined>(undefined);

interface ExamBoardProviderProps {
  children: React.ReactNode;
  initialExamBoards?: ExamBoard[];
}

export function ExamBoardProvider({ children, initialExamBoards = [] }: ExamBoardProviderProps) {
  const supabase = createClient();
  
  // State
  const [examBoards, setExamBoards] = useState<ExamBoard[]>(initialExamBoards);
  const [activeExamBoard, setActiveExamBoardState] = useState<ExamBoard | null>(null);
  const [showAllBoards, setShowAllBoardsState] = useState<boolean>(false);
  const [userPreference, setUserPreference] = useState<UserExamBoardPreference | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch exam boards
  const fetchExamBoards = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('exam_boards')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      if (data) {
        setExamBoards(data);
      }
    } catch (error) {
      console.error('Error fetching exam boards:', error);
    }
  }, [supabase]);

  // Fetch user preference
  const fetchUserPreference = useCallback(async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('preferred_exam_board_id, onboarding_completed, show_all_exam_boards')
        .eq('id', uid)
        .single();

      if (error) throw error;
      if (data) {
        setUserPreference({
          preferred_exam_board_id: data.preferred_exam_board_id,
          onboarding_completed: data.onboarding_completed,
          show_all_exam_boards: data.show_all_exam_boards
        });

        // Set active board based on user preference
        if (data.show_all_exam_boards) {
          setShowAllBoardsState(true);
          setActiveExamBoardState(null);
        } else if (data.preferred_exam_board_id) {
          const board = examBoards.find(b => b.id === data.preferred_exam_board_id);
          if (board) {
            setActiveExamBoardState(board);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user preference:', error);
    }
  }, [supabase, examBoards]);

  // Initialize - only fetch exam boards, auth state comes from onAuthStateChange
  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      
      // Fetch exam boards if not provided
      if (examBoards.length === 0) {
        await fetchExamBoards();
      }

      // Don't call getUser() here - let onAuthStateChange handle auth state
      // This prevents race condition with use-user hook
      // The INITIAL_SESSION event will fire if user is already logged in

      setIsLoading(false);
    };

    initialize();
  }, []);

  // Re-fetch user preference when exam boards are loaded
  useEffect(() => {
    if (userId && examBoards.length > 0 && !userPreference) {
      fetchUserPreference(userId);
    }
  }, [userId, examBoards, userPreference, fetchUserPreference]);

  // Listen for auth changes - handles INITIAL_SESSION for page loads with existing session
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        // Only fetch if userId changed to avoid duplicate fetches
        if (userId !== session.user.id) {
          setUserId(session.user.id);
          await fetchUserPreference(session.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        setUserId(null);
        setUserPreference(null);
        setActiveExamBoardState(null);
        setShowAllBoardsState(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchUserPreference, userId]);

  // Update user preference in database
  const updateUserPreference = useCallback(async (boardId: string | null) => {
    if (!userId) {
      console.warn('Cannot update preference: user not logged in');
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({
          preferred_exam_board_id: boardId,
          onboarding_completed: true,
          show_all_exam_boards: boardId === null
        })
        .eq('id', userId);

      if (error) throw error;

      // Update local state
      setUserPreference({
        preferred_exam_board_id: boardId,
        onboarding_completed: true,
        show_all_exam_boards: boardId === null
      });

      // Update active board
      if (boardId === null) {
        setShowAllBoardsState(true);
        setActiveExamBoardState(null);
      } else {
        const board = examBoards.find(b => b.id === boardId);
        if (board) {
          setActiveExamBoardState(board);
          setShowAllBoardsState(false);
        }
      }
    } catch (error) {
      console.error('Error updating user preference:', error);
      throw error;
    }
  }, [userId, supabase, examBoards]);

  // Set active exam board (for guests or temporary filter)
  const setActiveExamBoard = useCallback((board: ExamBoard | null) => {
    setActiveExamBoardState(board);
    setShowAllBoardsState(board === null);
    
    // Store in localStorage for guests
    if (!userId) {
      if (board) {
        localStorage.setItem('guest_exam_board', board.id);
      } else {
        localStorage.removeItem('guest_exam_board');
      }
    }
  }, [userId]);

  // Set show all boards
  const setShowAllBoards = useCallback((showAll: boolean) => {
    setShowAllBoardsState(showAll);
    if (showAll) {
      setActiveExamBoardState(null);
    }
    
    // Store in localStorage for guests
    if (!userId) {
      localStorage.setItem('guest_show_all_boards', showAll.toString());
    }
  }, [userId]);

  // Load guest preferences from localStorage
  useEffect(() => {
    if (!userId && examBoards.length > 0) {
      const guestBoardId = localStorage.getItem('guest_exam_board');
      const guestShowAll = localStorage.getItem('guest_show_all_boards') === 'true';
      
      if (guestShowAll) {
        setShowAllBoardsState(true);
        setActiveExamBoardState(null);
      } else if (guestBoardId) {
        const board = examBoards.find(b => b.id === guestBoardId);
        if (board) {
          setActiveExamBoardState(board);
        }
      }
    }
  }, [userId, examBoards]);

  const value: ExamBoardContextValue = {
    activeExamBoard,
    showAllBoards,
    examBoards,
    isLoading,
    setActiveExamBoard,
    setShowAllBoards,
    userPreference,
    updateUserPreference
  };

  return (
    <ExamBoardContext.Provider value={value}>
      {children}
    </ExamBoardContext.Provider>
  );
}

// Hook to use exam board context
export function useExamBoard() {
  const context = useContext(ExamBoardContext);
  if (context === undefined) {
    throw new Error('useExamBoard must be used within an ExamBoardProvider');
  }
  return context;
}

// Hook to get exam board filter for queries
export function useExamBoardFilter() {
  const { activeExamBoard, showAllBoards } = useExamBoard();
  
  return {
    exam_board_id: showAllBoards ? null : activeExamBoard?.id ?? null,
    hasFilter: !showAllBoards && activeExamBoard !== null
  };
}
