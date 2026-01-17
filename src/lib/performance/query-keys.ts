/**
 * Centralized React Query keys for consistent caching
 * Using a factory pattern for type-safe query keys
 */

export const queryKeys = {
  // User related
  user: {
    all: ['user'] as const,
    current: () => [...queryKeys.user.all, 'current'] as const,
    profile: (id: string) => [...queryKeys.user.all, 'profile', id] as const,
    progress: (id: string) => [...queryKeys.user.all, 'progress', id] as const,
  },

  // Subjects and topics
  subjects: {
    all: ['subjects'] as const,
    list: () => [...queryKeys.subjects.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.subjects.all, 'detail', id] as const,
    topics: (subjectId: string) => [...queryKeys.subjects.all, 'topics', subjectId] as const,
  },

  // Questions
  questions: {
    all: ['questions'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.questions.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.questions.all, 'detail', id] as const,
    byTopic: (topicId: string) => [...queryKeys.questions.all, 'topic', topicId] as const,
  },

  // Notes
  notes: {
    all: ['notes'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.notes.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.notes.all, 'detail', id] as const,
    byTopic: (topicId: string) => [...queryKeys.notes.all, 'topic', topicId] as const,
  },

  // Classes (for teachers)
  classes: {
    all: ['classes'] as const,
    list: () => [...queryKeys.classes.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.classes.all, 'detail', id] as const,
    students: (classId: string) => [...queryKeys.classes.all, 'students', classId] as const,
  },

  // Assignments
  assignments: {
    all: ['assignments'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.assignments.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.assignments.all, 'detail', id] as const,
    forClass: (classId: string) => [...queryKeys.assignments.all, 'class', classId] as const,
  },

  // Attempts
  attempts: {
    all: ['attempts'] as const,
    list: (userId?: string) => [...queryKeys.attempts.all, 'list', userId] as const,
    detail: (id: string) => [...queryKeys.attempts.all, 'detail', id] as const,
  },

  // Notifications
  notifications: {
    all: ['notifications'] as const,
    unread: () => [...queryKeys.notifications.all, 'unread'] as const,
    list: () => [...queryKeys.notifications.all, 'list'] as const,
  },

  // Gamification
  gamification: {
    all: ['gamification'] as const,
    xp: (userId: string) => [...queryKeys.gamification.all, 'xp', userId] as const,
    streak: (userId: string) => [...queryKeys.gamification.all, 'streak', userId] as const,
    achievements: (userId: string) => [...queryKeys.gamification.all, 'achievements', userId] as const,
  },
};

// Cache time configurations (in milliseconds)
export const cacheConfig = {
  // Static data - rarely changes
  static: {
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  },
  // Semi-static data - changes occasionally
  semiStatic: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  },
  // Dynamic data - changes frequently
  dynamic: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  },
  // Real-time data - always fresh
  realtime: {
    staleTime: 0,
    gcTime: 60 * 1000, // 1 minute
  },
};
