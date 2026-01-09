'use client';

import { useState, useEffect, useCallback } from 'react';

export interface PracticeSessionState {
  currentIndex: number;
  questionStatuses: Record<string, QuestionStatus>;
  startedAt: string;
  lastActiveAt: string;
}

export interface QuestionStatus {
  viewed: boolean;
  assessment: 'correct' | 'incorrect' | 'flagged' | null;
  showAnswer: boolean;
  timeSpent: number; // seconds spent on this question
}

interface UsePracticeSessionOptions {
  sessionKey: string; // unique key like "topical-math-algebra"
  totalQuestions: number;
  questionIds: string[];
}

export function usePracticeSession({ sessionKey, totalQuestions, questionIds }: UsePracticeSessionOptions) {
  const storageKey = `practice-session-${sessionKey}`;
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questionStatuses, setQuestionStatuses] = useState<Record<string, QuestionStatus>>({});
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize from localStorage
  useEffect(() => {
    if (questionIds.length === 0) return;
    
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: PracticeSessionState = JSON.parse(saved);
        // Validate saved state has same questions
        const savedIds = Object.keys(parsed.questionStatuses);
        const currentIds = new Set(questionIds);
        const isValid = savedIds.every(id => currentIds.has(id));
        
        if (isValid && savedIds.length === questionIds.length) {
          setCurrentIndex(parsed.currentIndex);
          setQuestionStatuses(parsed.questionStatuses);
          setStartedAt(parsed.startedAt);
          setIsInitialized(true);
          return;
        }
      }
    } catch (e) {
      console.error('Error loading practice session:', e);
    }
    
    // Initialize new session
    const initialStatuses: Record<string, QuestionStatus> = {};
    questionIds.forEach(id => {
      initialStatuses[id] = { viewed: false, assessment: null, showAnswer: false, timeSpent: 0 };
    });
    setQuestionStatuses(initialStatuses);
    setStartedAt(new Date().toISOString());
    setIsInitialized(true);
  }, [questionIds, storageKey]);

  // Save to localStorage when state changes
  useEffect(() => {
    if (!isInitialized || !startedAt) return;
    
    const state: PracticeSessionState = {
      currentIndex,
      questionStatuses,
      startedAt,
      lastActiveAt: new Date().toISOString()
    };
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (e) {
      console.error('Error saving practice session:', e);
    }
  }, [currentIndex, questionStatuses, startedAt, storageKey, isInitialized]);

  const markViewed = useCallback((questionId: string) => {
    setQuestionStatuses(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], viewed: true }
    }));
  }, []);

  const setAssessment = useCallback((questionId: string, assessment: 'correct' | 'incorrect' | 'flagged' | null) => {
    setQuestionStatuses(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], assessment }
    }));
  }, []);

  const toggleShowAnswer = useCallback((questionId: string) => {
    setQuestionStatuses(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], showAnswer: !prev[questionId]?.showAnswer }
    }));
  }, []);

  const updateTimeSpent = useCallback((questionId: string, seconds: number) => {
    setQuestionStatuses(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], timeSpent: (prev[questionId]?.timeSpent || 0) + seconds }
    }));
  }, []);

  const goToQuestion = useCallback((index: number) => {
    if (index >= 0 && index < totalQuestions) {
      setCurrentIndex(index);
      if (questionIds[index]) {
        markViewed(questionIds[index]);
      }
    }
  }, [totalQuestions, questionIds, markViewed]);

  const goNext = useCallback(() => {
    if (currentIndex < totalQuestions - 1) {
      goToQuestion(currentIndex + 1);
    }
  }, [currentIndex, totalQuestions, goToQuestion]);

  const goPrevious = useCallback(() => {
    if (currentIndex > 0) {
      goToQuestion(currentIndex - 1);
    }
  }, [currentIndex, goToQuestion]);

  const resetSession = useCallback(() => {
    const initialStatuses: Record<string, QuestionStatus> = {};
    questionIds.forEach(id => {
      initialStatuses[id] = { viewed: false, assessment: null, showAnswer: false, timeSpent: 0 };
    });
    setQuestionStatuses(initialStatuses);
    setCurrentIndex(0);
    setStartedAt(new Date().toISOString());
    localStorage.removeItem(storageKey);
  }, [questionIds, storageKey]);

  // Calculate stats
  const stats = {
    correct: Object.values(questionStatuses).filter(s => s.assessment === 'correct').length,
    incorrect: Object.values(questionStatuses).filter(s => s.assessment === 'incorrect').length,
    flagged: Object.values(questionStatuses).filter(s => s.assessment === 'flagged').length,
    viewed: Object.values(questionStatuses).filter(s => s.viewed).length,
    unanswered: Object.values(questionStatuses).filter(s => !s.assessment).length,
    totalTimeSpent: Object.values(questionStatuses).reduce((sum, s) => sum + (s.timeSpent || 0), 0),
    isComplete: Object.values(questionStatuses).every(s => s.assessment !== null)
  };

  return {
    currentIndex,
    questionStatuses,
    stats,
    startedAt,
    isInitialized,
    markViewed,
    setAssessment,
    toggleShowAnswer,
    updateTimeSpent,
    goToQuestion,
    goNext,
    goPrevious,
    resetSession,
    setCurrentIndex
  };
}
