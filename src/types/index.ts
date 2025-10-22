

export interface UserProfile {
    uid: string;
    displayName?: string;
    email?: string;
    phone?: string;
    photoURL?: string;
    role: 'admin' | 'content_editor' | 'teacher' | 'student' | Array<'admin' | 'content_editor' | 'teacher' | 'student'>;
    isVerified?: boolean;
    xp?: number;
    streak?: number;
    activeSubjects?: string[];
    createdAt: any; // Firestore Timestamp
    updatedAt: any; // Firestore Timestamp
    subscriptionTier?: 'free' | 'essential' | 'pro';
    savedNoteIds?: string[];
}

export interface Subject {
    id: string;
    name: string;
    code: string;
    slug: string;
    level: 'IGCSE' | 'A-Level' | 'GCSE' | 'Other';
    examBoard: string;
    createdAt: any;
    updatedAt: any;
}

export interface Topic {
    id: string;
    subjectId: string;
    parentTopicId: string | null;
    name: string;
    slug: string;
    order: number;
    createdAt: any;
    updatedAt: any;
}

export interface Note {
  id: string;
  topicId: string;
  subjectId: string;
  title: string;
  subtitle?: string | null;
  slug: string;
  contentRaw: string;
  contentFormat: 'markdown' | 'richTextJson';
  renderedHtml: string;
  version: number;
  authorId: string;
  visibility: 'draft' | 'public' | 'registered' | 'premium';
  tags: string[];
  attachments: Attachment[];
  createdAt: any;
  updatedAt: any;
  publishedAt?: any | null;
  subject?: string; // e.g., "Mathematics"
  topic?: string;   // e.g., "Algebra"
  viewCount?: number;
}

export interface Attachment {
    id: string;
    noteId: string;
    type: 'image' | 'pdf' | 'video' | 'audio';
    storagePath: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: any;
}

export interface NoteVersion {
    versionId: string;
    noteId: string;
    contentRaw: string;
    contentFormat: 'markdown' | 'richTextJson';
    authorId: string;
    createdAt: any;
}

export interface AnalyticsLog {
    id: string;
    userId: string | null;
    noteId: string;
    eventType: 'view' | 'download' | 'preview';
    timestamp: any;
    details: object;
}


export interface Quiz {
    id: string;
    title: string;
    subject: string;
    topic: string;
    questions?: Question[]; // This might be deprecated in favor of questionIds
    difficulty?: 'easy' | 'medium' | 'hard';
    aiGenerated?: boolean;
    visibility: 'draft' | 'published' | 'archived';
    createdBy: string;
    createdAt: any; // Firestore Timestamp
    updatedAt: any; // Firestore Timestamp
    syllabusCodes?: string[];
    questionIds?: string[];
}

export type Question = {
  id: string; // The existing Firestore document ID
  questionId: string; // New field from spec (UUID)
  type: 'mcq' | 'short_answer' | 'structured' | 'essay' | 'matching' | 'tf' | 'data_response';
  stem: string; // The question text, can include HTML/Markdown
  options?: { id: string, label: string }[]; // For MCQ/matching
  markScheme: Record<string, any>; // Structured marking guidance
  media?: string[]; // Array of storage paths or signed URLs
  tags?: string[]; // e.g., syllabusCode, topic, learningObjective
  difficulty?: 'easy' | 'medium' | 'hard';
  authorId: string; // User ID of the creator
  version: number;
  status: 'draft' | 'published' | 'archived';
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  // These are from the old model, keep for compatibility for now.
  prompt?: string;
  correctAnswer?: string | string[];
  marks?: number;
  explanation?: string;
}

export interface FlashcardDeck {
    id: string;
    title: string;
    subject: string;
    topic: string;
    description?: string;
    createdBy: string;
    createdAt: any;
    updatedAt: any;
}

export interface Flashcard {
    id: string;
    front: string;
    back: string;
    order: number;
    createdAt: any;
}

export interface Class {
    id: string;
    name: string;
    subject: string;
    description?: string;
    teacherId: string;
    studentIds: string[];
    pendingStudentIds?: string[];
    classCode: string;
    schedule?: string[];
    meetingLink?: string;
    thumbnailUrl?: string;
    createdAt: any; // Firestore Timestamp
    updatedAt: any; // Firestore Timestamp
}

export interface Media {
    id: string;
    storagePath: string;
    url: string;
    mimeType: string;
    size: number;
    uploadedBy: string;
    uploadedAt: any;
}

export interface AuditLog {
    id: string;
    action: 'create' | 'update' | 'delete' | 'publish' | 'unpublish' | 'upload';
    collection: string;
    docId: string;
    performedBy: string;
    details: object;
    createdAt: any;
}

export interface QuizAttempt {
    id: string;
    userId: string;
    quizId: string;
    classId: string | null;
    topic: string;
    score: number;
    totalQuestions: number;
    completedAt: any; // Firestore Timestamp
}

export interface Assignment {
  id: string;
  quizId: string;
  quizTitle: string;
  classId: string;
  teacherId: string;
  subjectSlug: string;
  topicSlug: string;
  questionIds: string[];
  dueDate: any; // Firestore Timestamp
  timeLimit?: number; // Time limit in minutes
  assignedAt: any; // Firestore Timestamp
}

export interface Announcement {
  id: string;
  message: string;
  authorId: string;
  authorName: string;
  createdAt: any; // Firestore Timestamp
  noteId?: string;
  noteTitle?: string;
  notePath?: string;
}
