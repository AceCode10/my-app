'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';

const supabase = createClient();
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Search,
  Plus,
  Trash2,
  GripVertical,
  Save,
  Download,
  FileText,
  Clock,
  Calculator,
  Shuffle,
  Filter,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  BookOpen,
  GripHorizontal,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { TestPDFExport } from '@/components/teacher/test-pdf-export';
import { ExamQuestionCard } from '@/components/teacher/exam-question-card';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Question {
  id: string;
  stem_md: string;
  stem_markdown?: string;
  question_type: string;
  marks: number;
  difficulty: string;
  topic_id: string;
  subject_id: string;
  exam_board_id?: string;
  options?: any;
  correct_answer?: any;
  examiner_comment?: string;
  topic?: { name: string } | { name: string }[] | null;
  subject?: { name: string } | { name: string }[] | null;
  // Multi-part question support
  parent_question_id?: string | null;
  part_label?: string | null;
  display_order?: number;
  question_number?: string;
  // Image support for image-heavy subjects
  image_url?: string | null;
  // Full question image mode (like SaveMyExams)
  question_image_url?: string | null;
  use_image_question?: boolean;
  // Source tracking
  source?: 'topical' | 'paper';
  paper_id?: string | null;
}

interface TestQuestion {
  questionId: string;
  marks: number;
  order: number;
  question?: Question;
}

interface Subject {
  id: string;
  name: string;
  slug: string;
  code?: string;
  exam_board_id?: string;
  level?: string;
}

interface ExamBoard {
  id: string;
  name: string;
  code: string;
}

interface Topic {
  id: string;
  name: string;
  subject_id: string;
}

interface TestSettings {
  title: string;
  description: string;
  subjectId: string;
  durationMinutes: number | null;
  allowCalculator: boolean;
  randomizeQuestions: boolean;
  randomizeChoices: boolean;
}

// Sortable wrapper for ExamQuestionCard
function SortableQuestionCard({
  id,
  question,
  questionNumber,
  marks,
  onMarksChange,
  onRemove,
  showAnswerKey,
}: {
  id: string;
  question: Question;
  questionNumber: number;
  marks: number;
  onMarksChange: (marks: number) => void;
  onRemove: () => void;
  showAnswerKey: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <ExamQuestionCard
        question={question}
        questionNumber={questionNumber}
        marks={marks}
        onMarksChange={onMarksChange}
        onRemove={onRemove}
        showAnswerKey={showAnswerKey}
        isDragging={isDragging}
        dragHandleProps={listeners}
      />
    </div>
  );
}

export default function TestBuilderPage() {
  const { user, loading } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingTestId = searchParams.get('id');

  // Local state for filters - load from localStorage or default to first item
  // Order: Board -> Level -> Subject -> Topic -> Difficulty -> Type
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExamBoard, setSelectedExamBoard] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('testBuilder_examBoard') || '';
    }
    return '';
  });
  const [selectedLevel, setSelectedLevel] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('testBuilder_level') || '';
    }
    return '';
  });
  const [selectedSubject, setSelectedSubject] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('testBuilder_subject') || '';
    }
    return '';
  });
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Test composition - simplified: just a flat list of questions
  const [testQuestions, setTestQuestions] = useState<TestQuestion[]>([]);

  // Test settings
  const [settings, setSettings] = useState<TestSettings>({
    title: '',
    description: '',
    subjectId: '',
    durationMinutes: null,
    allowCalculator: true,
    randomizeQuestions: false,
    randomizeChoices: false,
  });

  // UI state
  const [saving, setSaving] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showPDFExport, setShowPDFExport] = useState(false);
  const [showAnswerKey, setShowAnswerKey] = useState(false);
  const [loadingTest, setLoadingTest] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  
  // Resizable panel state (percentage width for left panel)
  const [leftPanelWidth, setLeftPanelWidth] = useState(40);

  // Load test for editing when editingTestId is present
  useEffect(() => {
    if (editingTestId && user && !loading) {
      loadTestForEditing(editingTestId);
    }
  }, [editingTestId, user, loading]);
  const [isResizing, setIsResizing] = useState(false);

  // Cached exam boards query
  const { data: examBoards = [] } = useQuery({
    queryKey: ['exam-boards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_boards')
        .select('id, name, code')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  // Fetch subjects
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name, slug, code, exam_board_id, level')
        .order('name');
      if (error) throw error;
      return data || [];
    },
    staleTime: 30 * 60 * 1000,
  });

  // Cached topics query (depends on selected subject)
  const { data: topics = [] } = useQuery({
    queryKey: ['topics', selectedSubject],
    queryFn: async () => {
      if (!selectedSubject) return [];
      const { data, error } = await supabase
        .from('topics')
        .select('id, name, subject_id, display_order')
        .eq('subject_id', selectedSubject)
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedSubject,
    staleTime: 10 * 60 * 1000,
  });

  // Cached questions query - fetches ONLY from questions table (Question Bank)
  // Paper questions must first be added to a topic to appear here
  // Optimized: Fetch all questions including context (for proper hierarchy display)
  const { data: questions = [], isLoading: loadingQuestions } = useQuery({
    queryKey: ['test-builder-questions', user?.exam_boards, selectedExamBoard, selectedSubject],
    queryFn: async () => {
      // Build optimized query with server-side filtering
      let query = supabase
        .from('questions')
        .select(`
          id,
          stem_md,
          stem_markdown,
          question_type,
          marks,
          difficulty,
          topic_id,
          subject_id,
          exam_board_id,
          level,
          options,
          correct_answer,
          examiner_comment,
          visibility,
          status,
          parent_question_id,
          part_label,
          display_order,
          question_number,
          image_url,
          topic:topics(name),
          subject:subjects(name)
        `)
        .not('topic_id', 'is', null);
      
      // Apply server-side filters for better performance
      if (selectedSubject) {
        query = query.eq('subject_id', selectedSubject);
      } else if (selectedExamBoard) {
        // Filter by exam board's subjects
        const subjectIds = subjects
          .filter(s => s.exam_board_id === selectedExamBoard)
          .map(s => s.id);
        if (subjectIds.length > 0) {
          query = query.in('subject_id', subjectIds);
        }
      }
      
      const { data: questionBankData, error: questionError } = await query
        .order('question_number', { ascending: true })
        .order('display_order', { ascending: true })
        .limit(500); // Reduced limit since we're filtering server-side
      
      if (questionError) console.error('Error fetching questions:', questionError);
      
      // Filter to only published questions
      let filteredQuestions = (questionBankData || []).filter(q => 
        q.visibility === 'published' || q.status === 'published' || 
        (!q.visibility && !q.status)
      ).map(q => ({
        ...q,
        source: 'topical' as const
      }));
      
      // Filter by user's exam boards if set
      if (user?.exam_boards && user.exam_boards.length > 0) {
        const { data: examBoardsData } = await supabase
          .from('exam_boards')
          .select('id, code')
          .in('code', user.exam_boards.map(b => b.toUpperCase()));
        
        if (examBoardsData && examBoardsData.length > 0) {
          const userExamBoardIds = new Set(examBoardsData.map(eb => eb.id));
          filteredQuestions = filteredQuestions.filter(q => 
            !q.exam_board_id || userExamBoardIds.has(q.exam_board_id)
          );
        }
      }
      
      return filteredQuestions as Question[];
    },
    enabled: !loading,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  // Set default exam board to first item when data loads
  useEffect(() => {
    if (examBoards.length > 0 && !selectedExamBoard) {
      setSelectedExamBoard(examBoards[0].id);
    }
  }, [examBoards, selectedExamBoard]);

  // Get available levels for selected exam board
  const availableLevels = useMemo(() => {
    if (!selectedExamBoard) return [];
    const levels = new Set<string>();
    subjects.forEach(s => {
      if (s.exam_board_id === selectedExamBoard && s.level) {
        levels.add(s.level);
      }
    });
    // Sort levels in a logical order
    const levelOrder = ['IGCSE', 'O Level', 'AS Level', 'A Level', 'A2 Level'];
    return Array.from(levels).sort((a, b) => {
      const aIdx = levelOrder.indexOf(a);
      const bIdx = levelOrder.indexOf(b);
      if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });
  }, [subjects, selectedExamBoard]);

  // Set default level to first available when exam board changes
  useEffect(() => {
    if (availableLevels.length > 0 && !selectedLevel) {
      setSelectedLevel(availableLevels[0]);
    }
  }, [availableLevels, selectedLevel]);

  // Filter subjects by selected exam board AND level
  const filteredSubjects = useMemo(() => {
    return subjects.filter(s => {
      if (selectedExamBoard && s.exam_board_id !== selectedExamBoard) return false;
      if (selectedLevel && s.level !== selectedLevel) return false;
      return true;
    });
  }, [subjects, selectedExamBoard, selectedLevel]);

  // Set default subject to first filtered subject when level/board changes
  useEffect(() => {
    if (filteredSubjects.length > 0 && !selectedSubject) {
      setSelectedSubject(filteredSubjects[0].id);
    }
  }, [filteredSubjects, selectedSubject]);

  // Persist filter selections to localStorage
  useEffect(() => {
    if (selectedExamBoard) {
      localStorage.setItem('testBuilder_examBoard', selectedExamBoard);
    }
  }, [selectedExamBoard]);

  useEffect(() => {
    if (selectedLevel) {
      localStorage.setItem('testBuilder_level', selectedLevel);
    }
  }, [selectedLevel]);

  useEffect(() => {
    if (selectedSubject) {
      localStorage.setItem('testBuilder_subject', selectedSubject);
    }
  }, [selectedSubject]);

  // Filter questions
  const filteredQuestions = useMemo(() => {
    // First, get the subject IDs that match the selected exam board
    const validSubjectIds = selectedExamBoard 
      ? new Set(subjects.filter(s => s.exam_board_id === selectedExamBoard).map(s => s.id))
      : null;

    // Build a set of parent IDs that have children (so we don't filter them out)
    const parentIdsWithChildren = new Set<string>();
    questions.forEach(q => {
      if (q.parent_question_id) {
        parentIdsWithChildren.add(q.parent_question_id);
      }
    });

    const filtered = questions.filter(q => {
      // Keep parent questions that have children (they're containers for multi-part questions)
      const isParentWithChildren = parentIdsWithChildren.has(q.id);
      
      // Skip context-only questions (0 marks and no part_label) UNLESS they're a parent with children
      if (q.marks === 0 && !q.part_label && !isParentWithChildren) {
        return false;
      }
      
      const searchText = (q.stem_md || q.stem_markdown || '').toLowerCase();
      if (searchQuery && !searchText.includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Exam board filter - match by exam_board_id on the question OR by subject's exam_board
      if (selectedExamBoard) {
        // If question has exam_board_id, check it directly
        if (q.exam_board_id) {
          if (q.exam_board_id !== selectedExamBoard) {
            return false;
          }
        } else if (validSubjectIds) {
          // Otherwise, check if the question's subject belongs to the selected exam board
          if (!validSubjectIds.has(q.subject_id)) {
            return false;
          }
        }
      }
      if (selectedSubject && q.subject_id !== selectedSubject) {
        return false;
      }
      if (selectedTopic !== 'all' && q.topic_id !== selectedTopic) {
        return false;
      }
      if (selectedDifficulty !== 'all' && q.difficulty !== selectedDifficulty) {
        return false;
      }
      if (selectedType !== 'all' && q.question_type !== selectedType) {
        return false;
      }
      return true;
    });
    
    return filtered;
  }, [questions, searchQuery, selectedExamBoard, selectedSubject, selectedTopic, selectedDifficulty, selectedType, subjects]);

  // Group questions by parent_question_id for display (shows parent questions with their parts)
  const groupedQuestions = useMemo(() => {
    // Separate parent questions from child questions
    const parentQuestions = filteredQuestions.filter(q => !q.parent_question_id);
    const childQuestions = filteredQuestions.filter(q => q.parent_question_id);
    
    // Create a map of parent_id -> children
    const childrenMap = new Map<string, Question[]>();
    childQuestions.forEach(q => {
      const parentId = q.parent_question_id!;
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }
      childrenMap.get(parentId)!.push(q);
    });
    
    // Build result: each parent question with its children as parts
    const result: Array<{ question: Question; parts: Question[]; totalMarks: number }> = [];
    
    parentQuestions.forEach(parent => {
      const children = childrenMap.get(parent.id) || [];
      
      // Sort children by display_order or part_label
      children.sort((a, b) => {
        if (a.display_order !== undefined && b.display_order !== undefined) {
          return a.display_order - b.display_order;
        }
        const partA = a.part_label || '';
        const partB = b.part_label || '';
        return partA.localeCompare(partB);
      });
      
      // If parent has children, include ALL children (context + answerable parts)
      // This ensures context questions and nested children are displayed
      if (children.length > 0) {
        // Include all children - context (marks=0) and answerable parts (marks>0)
        // Also include nested children (grandchildren)
        const allParts: Question[] = [];
        const addWithDescendants = (q: Question) => {
          allParts.push(q);
          const grandchildren = childQuestions.filter(c => c.parent_question_id === q.id);
          grandchildren.sort((a, b) => {
            if (a.display_order !== undefined && b.display_order !== undefined) {
              return a.display_order - b.display_order;
            }
            return (a.part_label || '').localeCompare(b.part_label || '');
          });
          grandchildren.forEach(gc => addWithDescendants(gc));
        };
        children.forEach(c => addWithDescendants(c));
        
        const totalMarks = allParts.reduce((sum, p) => sum + (p.marks || 0), 0);
        if (totalMarks > 0 || allParts.some(p => p.stem_markdown || p.stem_md)) {
          result.push({ 
            question: parent, 
            parts: allParts, 
            totalMarks 
          });
        }
      } else {
        // Standalone question (no children) - only include if it has marks
        if (parent.marks > 0) {
          result.push({ 
            question: parent, 
            parts: [parent], 
            totalMarks: parent.marks 
          });
        }
      }
    });
    
    // Also handle orphaned child questions (children without parents in the filtered set)
    const usedChildIds = new Set<string>();
    result.forEach(r => r.parts.forEach(p => usedChildIds.add(p.id)));
    
    childQuestions.forEach(child => {
      if (!usedChildIds.has(child.id) && child.marks > 0) {
        // Check if parent exists but was filtered out
        const parentExists = questions.some(q => q.id === child.parent_question_id);
        if (!parentExists) {
          // Orphaned child - show as standalone
          result.push({ 
            question: child, 
            parts: [child], 
            totalMarks: child.marks 
          });
        }
      }
    });
    
    return result;
  }, [filteredQuestions, questions]);

  // Get all selected question IDs
  const selectedQuestionIds = useMemo(() => {
    return new Set(testQuestions.map(q => q.questionId));
  }, [testQuestions]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalMarks = testQuestions.reduce((sum, q) => sum + q.marks, 0);
    // Count unique question groups (by question_number)
    const questionGroups = new Set<string>();
    testQuestions.forEach(tq => {
      const qNum = tq.question?.question_number || tq.questionId;
      questionGroups.add(qNum);
    });
    return { totalMarks, totalQuestions: questionGroups.size };
  }, [testQuestions]);
  
  // Group test questions by question_number for display
  const groupedTestQuestions = useMemo(() => {
    const groups = new Map<string, TestQuestion[]>();
    
    testQuestions.forEach(tq => {
      if (!tq.question) return;
      const qNum = tq.question.question_number || `standalone_${tq.questionId}`;
      if (!groups.has(qNum)) {
        groups.set(qNum, []);
      }
      groups.get(qNum)!.push(tq);
    });
    
    // Sort questions within each group by parent_question_id hierarchy
    groups.forEach((questions, qNum) => {
      // Build parent-child relationships
      const questionsById = new Map(questions.map(q => [q.question!.id, q]));
      const childrenByParent = new Map<string, TestQuestion[]>();
      const rootQuestions: TestQuestion[] = [];

      questions.forEach(q => {
        const parentId = q.question?.parent_question_id;
        if (parentId && questionsById.has(parentId)) {
          if (!childrenByParent.has(parentId)) {
            childrenByParent.set(parentId, []);
          }
          childrenByParent.get(parentId)!.push(q);
        } else {
          rootQuestions.push(q);
        }
      });

      // Sort root questions: context (no part_label) first, then by part_label
      rootQuestions.sort((a, b) => {
        const labelA = a.question?.part_label || '';
        const labelB = b.question?.part_label || '';
        if (!labelA && labelB) return -1;
        if (labelA && !labelB) return 1;
        return labelA.localeCompare(labelB);
      });

      // Flatten with children after their parents
      const sorted: TestQuestion[] = [];
      const addWithChildren = (q: TestQuestion) => {
        sorted.push(q);
        const children = childrenByParent.get(q.question!.id) || [];
        children.sort((a, b) => {
          const labelA = a.question?.part_label || '';
          const labelB = b.question?.part_label || '';
          return labelA.localeCompare(labelB);
        });
        children.forEach(child => addWithChildren(child));
      };
      rootQuestions.forEach(q => addWithChildren(q));
      
      groups.set(qNum, sorted);
    });
    
    return Array.from(groups.values());
  }, [testQuestions]);

  // Add question to test (including all related parts)
  function addQuestion(question: Question) {
    if (selectedQuestionIds.has(question.id)) return;
    
    // Find all related parts of this question
    const relatedParts = getRelatedQuestionParts(question);
    
    // Filter out any parts that are already in the test
    const partsToAdd = relatedParts.filter(q => !selectedQuestionIds.has(q.id));
    
    if (partsToAdd.length === 0) return;
    
    // Add all parts as a group
    const newQuestions: TestQuestion[] = partsToAdd.map((q, idx) => ({
      questionId: q.id,
      marks: q.marks,
      order: testQuestions.length + idx + 1,
      question: q,
    }));

    setTestQuestions([...testQuestions, ...newQuestions]);
    
    const partCount = partsToAdd.length;
    toast({ 
      title: 'Question added', 
      description: partCount > 1 
        ? `Added ${partCount} parts (Q${question.question_number}) to your test` 
        : 'Added to your test' 
    });
  }
  
  // Get all related parts of a question (same question_number from same source, or parent-child relationship)
  // This includes context questions, all children, and nested children (level 3)
  function getRelatedQuestionParts(question: Question): Question[] {
    // Helper to recursively get all descendants
    const getAllDescendants = (parentId: string): Question[] => {
      const children = questions.filter(q => q.parent_question_id === parentId);
      const descendants: Question[] = [...children];
      children.forEach(child => {
        descendants.push(...getAllDescendants(child.id));
      });
      return descendants;
    };
    
    // If question has no question_number or part_label, and no parent_question_id, it's standalone
    if (!question.question_number && !question.parent_question_id) {
      // But check if this question IS a parent with children (including grandchildren)
      const descendants = getAllDescendants(question.id);
      if (descendants.length > 0) {
        return [question, ...descendants].sort((a, b) => {
          if (a.display_order !== undefined && b.display_order !== undefined) {
            return a.display_order - b.display_order;
          }
          const partA = a.part_label || '';
          const partB = b.part_label || '';
          return partA.localeCompare(partB);
        });
      }
      return [question];
    }
    
    // Find all questions with the same question_number from the same source
    const relatedParts = questions.filter(q => {
      // Check parent-child relationship first
      if (question.parent_question_id) {
        // This question is a child - find root parent first
        let rootParentId = question.parent_question_id;
        let rootParent = questions.find(p => p.id === rootParentId);
        while (rootParent?.parent_question_id) {
          rootParentId = rootParent.parent_question_id;
          rootParent = questions.find(p => p.id === rootParentId);
        }
        
        // Include root parent, self, and all descendants of root parent
        if (q.id === rootParentId) return true;
        if (q.id === question.id) return true;
        
        // Check if q is a descendant of root parent
        let current = q;
        while (current.parent_question_id) {
          if (current.parent_question_id === rootParentId) return true;
          const parent = questions.find(p => p.id === current.parent_question_id);
          if (!parent) break;
          current = parent;
        }
        return false;
      }
      
      // Check if q is this question itself
      if (q.id === question.id) {
        return true;
      }
      
      // Check if q is a descendant of this question (any level)
      let current = q;
      while (current.parent_question_id) {
        if (current.parent_question_id === question.id) return true;
        const parent = questions.find(p => p.id === current.parent_question_id);
        if (!parent) break;
        current = parent;
      }
      
      // Must have the same question_number
      if (q.question_number !== question.question_number) return false;
      
      // Must be from the same source (paper or topical)
      if (q.source !== question.source) return false;
      
      // For paper questions, must be from the same paper
      if (question.source === 'paper' && q.paper_id !== question.paper_id) return false;
      
      // For topical questions, must be from the same subject/topic
      if (question.source === 'topical') {
        if (q.subject_id !== question.subject_id) return false;
      }
      
      return true;
    });
    
    // Sort by display_order or part_label to maintain proper order
    // Parent questions (no parent_question_id) should come first
    return relatedParts.sort((a, b) => {
      // Parent comes before children
      if (!a.parent_question_id && b.parent_question_id) return -1;
      if (a.parent_question_id && !b.parent_question_id) return 1;
      
      // Then sort by display_order if available
      if (a.display_order !== undefined && b.display_order !== undefined) {
        return a.display_order - b.display_order;
      }
      // Then by part_label (a, b, c, etc.)
      const partA = a.part_label || '';
      const partB = b.part_label || '';
      return partA.localeCompare(partB);
    });
  }

  // Remove question from test (removes all related parts)
  function removeQuestion(questionId: string) {
    // Find the question being removed
    const questionToRemove = testQuestions.find(q => q.questionId === questionId);
    if (!questionToRemove?.question) {
      // Fallback to simple removal if question data not available
      setTestQuestions(
        testQuestions
          .filter(q => q.questionId !== questionId)
          .map((q, idx) => ({ ...q, order: idx + 1 }))
      );
      return;
    }
    
    // Get all related parts that should be removed together
    const relatedParts = getRelatedQuestionParts(questionToRemove.question);
    const relatedIds = new Set(relatedParts.map(q => q.id));
    
    setTestQuestions(
      testQuestions
        .filter(q => !relatedIds.has(q.questionId))
        .map((q, idx) => ({ ...q, order: idx + 1 }))
    );
    
    if (relatedParts.length > 1) {
      toast({ 
        title: 'Question removed', 
        description: `Removed ${relatedParts.length} parts (Q${questionToRemove.question.question_number})` 
      });
    }
  }

  // Update question marks
  function updateQuestionMarks(questionId: string, newMarks: number) {
    setTestQuestions(
      testQuestions.map(q =>
        q.questionId === questionId ? { ...q, marks: newMarks } : q
      )
    );
  }

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end for reordering questions
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = testQuestions.findIndex(q => q.questionId === active.id);
      const newIndex = testQuestions.findIndex(q => q.questionId === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(testQuestions, oldIndex, newIndex)
          .map((q, idx) => ({ ...q, order: idx + 1 }));
        setTestQuestions(reordered);
      }
    }
  }

  // Load test for editing - loads from assessments table
  async function loadTestForEditing(testId: string) {
    setLoadingTest(true);
    try {
      // First try assessments table (new tests)
      const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', testId)
        .eq('created_by', user?.id)
        .single();

      if (assessmentError && assessmentError.code !== 'PGRST116') {
        throw assessmentError;
      }

      if (assessment) {
        // Load from assessments table
        setSettings({
          title: assessment.title || '',
          description: assessment.description || '',
          subjectId: assessment.subject_id || '',
          durationMinutes: assessment.duration_minutes,
          allowCalculator: assessment.calculator_allowed ?? true,
          randomizeQuestions: assessment.randomize_questions ?? false,
          randomizeChoices: assessment.randomize_answers ?? false,
        });

        // Load questions from assessment_questions table
        const { data: aqData, error: aqError } = await supabase
          .from('assessment_questions')
          .select('*')
          .eq('assessment_id', testId)
          .order('question_order', { ascending: true });

        if (aqError) throw aqError;

        if (aqData && aqData.length > 0) {
          const questionIds = aqData.map(aq => aq.question_id).filter(Boolean);
          
          const { data: questionsData, error: questionsError } = await supabase
            .from('questions')
            .select('*')
            .in('id', questionIds);

          if (questionsError) throw questionsError;

          const loadedQuestions: TestQuestion[] = aqData.map((aq: any) => {
            const questionData = questionsData?.find(qd => qd.id === aq.question_id);
            return {
              questionId: aq.question_id,
              marks: aq.custom_marks || questionData?.marks || 1,
              order: aq.question_order || 0,
              question: questionData ? {
                ...questionData,
                stem_md: questionData.stem_markdown || questionData.stem_md,
              } : undefined,
            };
          }).filter((q: TestQuestion) => q.question !== undefined);

          setTestQuestions(loadedQuestions);
        }

        toast({ title: 'Test loaded', description: 'You can now edit your test' });
        return;
      }

      // Fallback: try legacy tests table
      const { data: test, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .eq('created_by', user?.id)
        .single();

      if (testError) throw testError;

      if (!test) {
        toast({ variant: 'destructive', title: 'Error', description: 'Test not found' });
        router.push('/teacher/tests');
        return;
      }

      // Load from legacy tests table
      setSettings({
        title: test.title || '',
        description: test.description || '',
        subjectId: test.subject_id || '',
        durationMinutes: test.duration_minutes,
        allowCalculator: test.allow_calculator ?? true,
        randomizeQuestions: test.randomize_questions ?? false,
        randomizeChoices: test.randomize_choices ?? false,
      });

      // Load test questions from sections JSON
      if (test.sections && Array.isArray(test.sections) && test.sections.length > 0) {
        const section = test.sections[0];
        if (section.questions && Array.isArray(section.questions)) {
          const questionIds = section.questions.map((q: any) => q.questionId);
          
          const { data: questionsData, error: questionsError } = await supabase
            .from('questions')
            .select('*')
            .in('id', questionIds);

          if (questionsError) throw questionsError;

          const loadedQuestions: TestQuestion[] = section.questions.map((q: any) => {
            const questionData = questionsData?.find(qd => qd.id === q.questionId);
            return {
              questionId: q.questionId,
              marks: q.marks || questionData?.marks || 1,
              order: q.order || 0,
              question: questionData ? {
                ...questionData,
                stem_md: questionData.stem_markdown || questionData.stem_md,
              } : undefined,
            };
          }).filter((q: TestQuestion) => q.question !== undefined);

          setTestQuestions(loadedQuestions);
        }
      }

      toast({ title: 'Test loaded', description: 'You can now edit your test' });
    } catch (error) {
      console.error('Error loading test:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load test' });
      router.push('/teacher/tests');
    } finally {
      setLoadingTest(false);
    }
  }

  // Save test - NOW SAVES TO ASSESSMENTS TABLE
  async function saveTest() {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in' });
      return;
    }

    if (!settings.title.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a test title' });
      setShowSettingsDialog(true);
      return;
    }

    if (testQuestions.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please add at least one question' });
      return;
    }

    setSaving(true);
    
    // Add timeout to prevent indefinite loading
    const timeoutId = setTimeout(() => {
      setSaving(false);
      toast({ 
        variant: 'destructive', 
        title: 'Timeout', 
        description: 'Save operation timed out. Please try again.' 
      });
    }, 30000); // 30 second timeout
    
    try {
      console.log('=== saveTest called ===');
      
      // Get assessment type ID for custom_test
      const { data: assessmentType, error: typeError } = await supabase
        .from('assessment_types')
        .select('id')
        .eq('code', 'custom_test')
        .single();

      console.log('Assessment type:', assessmentType, typeError);

      if (typeError) {
        console.error('Error fetching assessment type:', typeError);
        throw new Error(`Failed to fetch assessment type: ${typeError.message}`);
      }

      if (!assessmentType) {
        throw new Error('Assessment type not found. Please ensure the database is properly configured.');
      }

      // Calculate total marks
      const totalMarks = testQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);

      if (editingTestId) {
        // Update existing assessment
        const { error: updateError } = await supabase
          .from('assessments')
          .update({
            title: settings.title,
            description: settings.description || null,
            duration_minutes: settings.durationMinutes || null,
            calculator_allowed: settings.allowCalculator ?? true,
            randomize_questions: settings.randomizeQuestions ?? false,
            randomize_answers: settings.randomizeChoices ?? false,
            total_marks: totalMarks,
            subject_id: settings.subjectId || null
          })
          .eq('id', editingTestId)
          .eq('created_by', user.id);

        if (updateError) throw updateError;

        // Delete existing questions and re-add
        await supabase
          .from('assessment_questions')
          .delete()
          .eq('assessment_id', editingTestId);

        // Add questions
        if (testQuestions.length > 0) {
          // Deduplicate questions by questionId (keep first occurrence)
          const seenIds = new Set<string>();
          const uniqueQuestions = testQuestions.filter(q => {
            if (seenIds.has(q.questionId)) return false;
            seenIds.add(q.questionId);
            return true;
          });

          const questionsToInsert = uniqueQuestions.map((q, idx) => ({
            assessment_id: editingTestId,
            question_id: q.questionId,
            question_order: idx + 1,
            custom_marks: q.marks
          }));

          const { error: qError } = await supabase
            .from('assessment_questions')
            .insert(questionsToInsert);

          if (qError) {
            console.error('Error inserting questions:', qError);
            throw qError;
          }
        }

        toast({ title: 'Test updated!', description: 'Your changes have been saved' });
      } else {
        // Create new assessment
        const { data: newAssessment, error: insertError } = await supabase
          .from('assessments')
          .insert({
            assessment_type_id: assessmentType.id,
            created_by: user.id,
            title: settings.title,
            description: settings.description || null,
            duration_minutes: settings.durationMinutes || null,
            calculator_allowed: settings.allowCalculator ?? true,
            randomize_questions: settings.randomizeQuestions ?? false,
            randomize_answers: settings.randomizeChoices ?? false,
            total_marks: totalMarks,
            subject_id: settings.subjectId || null,
            is_published: false
          })
          .select()
          .single();

        console.log('New assessment created:', newAssessment, insertError);

        if (insertError) {
          console.error('Assessment insert error:', insertError);
          throw insertError;
        }

        if (!newAssessment) {
          throw new Error('Failed to create assessment - no data returned');
        }

        // Add questions to assessment_questions table
        if (testQuestions.length > 0 && newAssessment) {
          // Deduplicate questions by questionId (keep first occurrence)
          const seenIds = new Set<string>();
          const uniqueQuestions = testQuestions.filter(q => {
            if (seenIds.has(q.questionId)) return false;
            seenIds.add(q.questionId);
            return true;
          });

          const questionsToInsert = uniqueQuestions.map((q, idx) => ({
            assessment_id: newAssessment.id,
            question_id: q.questionId,
            question_order: idx + 1,
            custom_marks: q.marks
          }));

          console.log('Inserting questions:', questionsToInsert);
          console.log('Assessment ID:', newAssessment.id);
          console.log('Sample question IDs:', uniqueQuestions.slice(0, 2).map(q => q.questionId));

          // Insert questions for new assessment
          const { error: qError, data: insertedData } = await supabase
            .from('assessment_questions')
            .insert(questionsToInsert)
            .select();

          if (qError) {
            console.error('Error inserting questions:', qError);
            console.error('Error details:', JSON.stringify(qError, null, 2));
            throw qError;
          }

          console.log('Questions inserted successfully:', insertedData?.length);

          console.log('Questions inserted successfully');
        }

        toast({ title: 'Test saved!', description: 'Your test has been saved to your library' });
      }

      router.push('/teacher/tests');
    } catch (error: any) {
      console.error('Error saving test:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: error?.message || 'Failed to save test' 
      });
    } finally {
      clearTimeout(timeoutId);
      setSaving(false);
    }
  }

  // Export as PDF
  function exportPDF() {
    if (testQuestions.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please add questions first' });
      return;
    }
    if (!settings.title.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please set a test title first' });
      setShowSettingsDialog(true);
      return;
    }
    setShowPDFExport(true);
  }

  // Prepare test data for PDF export
  const testDataForPDF = {
    id: editingTestId || 'preview', // Use editing ID or 'preview' for unsaved tests
    title: settings.title || 'Untitled Test',
    description: settings.description,
    duration_minutes: settings.durationMinutes,
    total_marks: totals.totalMarks,
    total_questions: totals.totalQuestions,
    allow_calculator: settings.allowCalculator,
    sections: [{
      name: 'Questions',
      questions: testQuestions,
    }],
  };

  // Get question type badge color
  function getTypeBadgeColor(type: string) {
    switch (type) {
      case 'mcq': 
      case 'multiple_choice':
      case 'Multiple Choice':
        return 'bg-blue-500';
      case 'short_answer': return 'bg-green-500';
      case 'long_answer': 
      case 'essay':
        return 'bg-purple-500';
      case 'numeric': return 'bg-orange-500';
      case 'tf': 
      case 'true_false':
        return 'bg-pink-500';
      case 'structured': return 'bg-indigo-500';
      default: return 'bg-gray-500';
    }
  }
  
  // Format question type for display
  function formatQuestionType(type: string): string {
    const types: Record<string, string> = {
      mcq: 'MCQ',
      multiple_choice: 'MCQ',
      'Multiple Choice': 'MCQ',
      short_answer: 'Short Answer',
      long_answer: 'Long Answer',
      essay: 'Essay',
      numeric: 'Numeric',
      tf: 'True/False',
      true_false: 'True/False',
      structured: 'Structured',
    };
    return types[type] || type;
  }

  // Get difficulty badge color
  function getDifficultyColor(difficulty: string) {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Test Builder</h1>
          <p className="text-muted-foreground">Create custom tests from the question bank</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowSettingsDialog(true)}>
            <FileText className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button variant="outline" onClick={exportPDF}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button onClick={saveTest} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Test
          </Button>
        </div>
      </div>

      {/* Compact Filters Bar */}
      <div className="flex items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filters Popover */}
        <Popover open={showFilters} onOpenChange={setShowFilters}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {(selectedTopic !== 'all' || selectedDifficulty !== 'all' || selectedType !== 'all') && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {[selectedTopic !== 'all', selectedDifficulty !== 'all', selectedType !== 'all'].filter(Boolean).length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filter Questions</h4>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setSelectedTopic('all');
                    setSelectedDifficulty('all');
                    setSelectedType('all');
                  }}
                  className="h-8 text-xs"
                >
                  Reset
                </Button>
              </div>
              
              {/* Exam Board */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Exam Board</label>
                <Select value={selectedExamBoard} onValueChange={(v) => {
                  setSelectedExamBoard(v);
                  setSelectedLevel('');
                  setSelectedSubject('');
                  setSelectedTopic('all');
                }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select board" />
                  </SelectTrigger>
                  <SelectContent>
                    {examBoards.map(eb => (
                      <SelectItem key={eb.id} value={eb.id}>{eb.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Level */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Level</label>
                <Select value={selectedLevel} onValueChange={(v) => {
                  setSelectedLevel(v);
                  setSelectedSubject('');
                  setSelectedTopic('all');
                }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLevels.map(level => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject</label>
                <Select value={selectedSubject} onValueChange={(v) => {
                  setSelectedSubject(v);
                  setSelectedTopic('all');
                }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSubjects.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.code && `${s.code} - `}{s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Topic */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Topic</label>
                <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Topics" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Topics</SelectItem>
                    {topics.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Difficulty */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Difficulty</label>
                <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Difficulties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Difficulties</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Question Type</label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="multiple_choice">MCQ</SelectItem>
                    <SelectItem value="short_answer">Short Answer</SelectItem>
                    <SelectItem value="essay">Long Answer</SelectItem>
                    <SelectItem value="numeric">Numeric</SelectItem>
                    <SelectItem value="tf">True/False</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                className="w-full" 
                onClick={() => setShowFilters(false)}
              >
                Apply Filters
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Question count */}
        <div className="ml-auto text-sm text-muted-foreground">
          {loadingQuestions ? 'Loading...' : `${groupedQuestions.length} questions`}
          {groupedQuestions.length > 0 && !loadingQuestions && (
            <span className="ml-2">• {groupedQuestions.reduce((sum, g) => sum + g.totalMarks, 0)} marks</span>
          )}
        </div>
      </div>

      {/* Main content - Resizable panels */}
      <div 
        className="flex-1 flex min-h-0"
        onMouseMove={(e) => {
          if (!isResizing) return;
          const container = e.currentTarget;
          const rect = container.getBoundingClientRect();
          const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
          // Clamp between 25% and 60%
          setLeftPanelWidth(Math.min(60, Math.max(25, newWidth)));
        }}
        onMouseUp={() => setIsResizing(false)}
        onMouseLeave={() => setIsResizing(false)}
      >
        {/* Left Panel - Question Bank */}
        <div 
          className="flex flex-col min-h-0 pr-1"
          style={{ width: `${leftPanelWidth}%` }}
        >
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Question Bank</CardTitle>
              <CardDescription>Click + to add questions to your test</CardDescription>
            </CardHeader>

            <CardContent className="flex-1 min-h-0 p-0">
              <ScrollArea className="h-full px-4 pb-4">
                {loadingQuestions ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : groupedQuestions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Filter className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No questions found</p>
                    <p className="text-sm">Try adjusting your filters</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {groupedQuestions.map(({ question, parts, totalMarks }) => {
                      // Check if any part of this question group is already selected
                      const isAnyPartSelected = parts.some(p => selectedQuestionIds.has(p.id));
                      const hasImage = !!question.image_url;
                      const questionText = question.stem_markdown || question.stem_md || '';
                      const hasMultipleParts = parts.length > 1;
                      return (
                        <div
                          key={question.id}
                          className={`p-3 border rounded-lg transition-colors ${
                            isAnyPartSelected ? 'bg-primary/5 border-primary/30' : 'hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              {/* Parts indicator - no question numbers in question bank */}
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                {hasMultipleParts && (
                                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                    {parts.length} parts ({parts.map(p => p.part_label || 'main').join(', ')})
                                  </Badge>
                                )}
                                {question.source === 'paper' && (
                                  <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                    Past Paper
                                  </Badge>
                                )}
                              </div>
                              {/* Show image thumbnail if available */}
                              {(question.image_url || question.question_image_url) && (
                                <div className="mb-2 relative">
                                  <img 
                                    src={question.question_image_url || question.image_url} 
                                    alt="Question" 
                                    className="max-h-20 rounded border object-contain"
                                    onError={(e) => {
                                      console.error('Failed to load image:', question.question_image_url || question.image_url);
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                </div>
                              )}
                              {/* Show text if available */}
                              {questionText && (
                                <p className="text-sm line-clamp-3">
                                  {questionText}
                                </p>
                              )}
                              {/* Show parts preview for multi-part questions */}
                              {hasMultipleParts && (
                                <div className="mt-2 pl-3 border-l-2 border-muted space-y-1">
                                  {parts.slice(0, 3).map((part, idx) => (
                                    <p key={part.id} className="text-xs text-muted-foreground line-clamp-1">
                                      <span className="font-medium">({part.part_label || idx + 1})</span>{' '}
                                      {part.stem_markdown || part.stem_md || '[No text]'}
                                    </p>
                                  ))}
                                  {parts.length > 3 && (
                                    <p className="text-xs text-muted-foreground">
                                      +{parts.length - 3} more parts...
                                    </p>
                                  )}
                                </div>
                              )}
                              {/* Show placeholder if no text and no image */}
                              {!questionText && !question.image_url && !question.question_image_url && !hasMultipleParts && (
                                <p className="text-sm text-muted-foreground italic">
                                  [Question content not available]
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <Badge variant="secondary" className={`text-xs ${getTypeBadgeColor(question.question_type)} text-white`}>
                                  {formatQuestionType(question.question_type)}
                                </Badge>
                                <Badge variant="outline" className={`text-xs ${getDifficultyColor(question.difficulty)}`}>
                                  {question.difficulty}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {totalMarks} mark{totalMarks !== 1 ? 's' : ''}
                                </span>
                                {question.topic && (
                                  <span className="text-xs text-muted-foreground truncate">
                                    • {(question.topic as any).name}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1 flex-shrink-0">
                              {/* Preview Button */}
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setPreviewQuestion(question)}
                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                title="Preview question"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {/* Add Button */}
                              <Button
                                size="icon"
                                variant={isAnyPartSelected ? "secondary" : "default"}
                                onClick={() => !isAnyPartSelected && addQuestion(question)}
                                disabled={isAnyPartSelected}
                                className={`h-8 w-8 ${!isAnyPartSelected ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                              >
                                {isAnyPartSelected ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : (
                                  <Plus className="h-5 w-5" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Resize Handle */}
        <div
          className={`w-2 flex-shrink-0 cursor-col-resize flex items-center justify-center group hover:bg-primary/10 transition-colors ${isResizing ? 'bg-primary/20' : ''}`}
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
          }}
        >
          <div className={`w-1 h-16 rounded-full bg-border group-hover:bg-primary/50 transition-colors ${isResizing ? 'bg-primary' : ''}`} />
        </div>

        {/* Right Panel - Test Preview */}
        <div className="flex-1 flex flex-col min-h-0 pl-1">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {settings.title || 'Untitled Test'}
                  </CardTitle>
                  <CardDescription>
                    {totals.totalQuestions} questions • {totals.totalMarks} marks
                    {settings.durationMinutes && ` • ${settings.durationMinutes} minutes`}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowAnswerKey(!showAnswerKey)}
                  >
                    {showAnswerKey ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                    {showAnswerKey ? 'Hide Answers' : 'Show Answers'}
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={exportPDF}
                    disabled={testQuestions.length === 0}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Preview Test
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 min-h-0 p-0">
              <ScrollArea className="h-full">
                {testQuestions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground px-4">
                    <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="font-medium">No questions added yet</p>
                    <p className="text-sm">Add questions from the bank on the left</p>
                    <p className="text-xs mt-2 text-muted-foreground/70">
                      Questions will appear here in exam document format
                    </p>
                  </div>
                ) : (
                  <div className="p-4 space-y-4">
                    {/* Exam Header Preview */}
                    <div className="border-b-2 border-slate-200 pb-4 mb-6">
                      <div className="text-center space-y-1">
                        <h2 className="text-xl font-bold uppercase tracking-wide">
                          {settings.title || 'Untitled Test'}
                        </h2>
                        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground mt-2">
                          {settings.durationMinutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {settings.durationMinutes} minutes
                            </span>
                          )}
                          <span className="font-semibold">
                            Total Marks: {totals.totalMarks}
                          </span>
                          {settings.allowCalculator && (
                            <span className="flex items-center gap-1">
                              <Calculator className="h-4 w-4" />
                              Calculator Allowed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Questions - Grouped by question_number */}
                    <div className="space-y-6">
                      {groupedTestQuestions.map((groupQuestions, groupIndex) => {
                        const firstQuestion = groupQuestions[0]?.question;
                        const totalGroupMarks = groupQuestions.reduce((sum, q) => sum + q.marks, 0);
                        const isMultiPart = groupQuestions.length > 1;
                        
                        return (
                          <div 
                            key={groupQuestions[0]?.questionId || groupIndex}
                            className="border-2 rounded-lg bg-white shadow-md border-slate-400 hover:border-primary hover:shadow-lg transition-all ring-1 ring-slate-200"
                          >
                            {/* Question Group Header */}
                            <div className="flex items-start gap-3 p-4 border-b bg-slate-50/50">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <GripVertical className="h-5 w-5" />
                              </div>
                              
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <span className="font-bold text-lg">{groupIndex + 1}.</span>
                                    {isMultiPart && (
                                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                        {groupQuestions.length} parts
                                      </Badge>
                                    )}
                                    <Badge variant="outline" className="text-xs">
                                      {formatQuestionType(firstQuestion?.question_type || '')}
                                    </Badge>
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs ${getDifficultyColor(firstQuestion?.difficulty || '')}`}
                                    >
                                      {firstQuestion?.difficulty}
                                    </Badge>
                                  </div>
                                  
                                  {/* Total Marks */}
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">Total:</span>
                                    <div className="w-8 h-8 border-2 border-slate-300 rounded flex items-center justify-center font-bold text-slate-600">
                                      [{totalGroupMarks}]
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => removeQuestion(groupQuestions[0]?.questionId)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            
                            {/* Question Parts */}
                            <div className="p-4 space-y-4">
                              {groupQuestions.map((tq, partIndex) => {
                                const question = tq.question;
                                if (!question) return null;
                                
                                const isContext = tq.marks === 0 && !question.part_label;
                                const hasParent = !!question.parent_question_id;
                                const parentQuestion = hasParent ? groupQuestions.find(q => q.question?.id === question.parent_question_id)?.question : null;
                                const isNestedPart = hasParent && parentQuestion?.part_label;
                                const questionText = question.stem_markdown || question.stem_md || '';
                                
                                return (
                                  <div 
                                    key={tq.questionId}
                                    className={`${isContext ? 'bg-muted/30 border-l-4 border-primary rounded-r-lg p-3' : isNestedPart ? 'ml-8 border-l-2 border-muted pl-4' : question.part_label ? 'ml-4 border-l-2 border-muted pl-4' : ''}`}
                                  >
                                    {/* Part label and marks */}
                                    {question.part_label && (
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="font-semibold text-sm">({question.part_label})</span>
                                        {tq.marks > 0 && (
                                          <span className="text-xs text-muted-foreground">[{tq.marks}]</span>
                                        )}
                                      </div>
                                    )}
                                    
                                    {/* Question content */}
                                    {questionText && (
                                      <div className="prose prose-sm max-w-none dark:prose-invert">
                                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                          {questionText}
                                        </ReactMarkdown>
                                      </div>
                                    )}
                                    
                                    {/* Image */}
                                    {(question.image_url || question.question_image_url) && (
                                      <img 
                                        src={question.question_image_url || question.image_url} 
                                        alt="Question" 
                                        className="max-h-40 rounded border object-contain mt-2"
                                      />
                                    )}
                                    
                                    {/* MCQ Options */}
                                    {(question.question_type === 'mcq' || question.question_type === 'multiple_choice') && question.options && (
                                      <div className="mt-2 space-y-1 pl-4">
                                        {(Array.isArray(question.options) 
                                          ? question.options 
                                          : Object.entries(question.options).map(([key, value]) => ({ label: key, text: value }))
                                        ).map((opt: any, optIdx: number) => (
                                          <div key={optIdx} className="flex items-start gap-2 text-sm">
                                            <span className="font-semibold text-muted-foreground min-w-[20px]">
                                              {opt.label || String.fromCharCode(65 + optIdx)}.
                                            </span>
                                            <span>{typeof opt === 'string' ? opt : (opt.text || opt.value || '')}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    
                                    {/* Answer lines for non-MCQ */}
                                    {!isContext && question.question_type !== 'mcq' && question.question_type !== 'multiple_choice' && tq.marks > 0 && (
                                      <div className="mt-2 space-y-1">
                                        {Array.from({ length: Math.min(tq.marks, 3) }).map((_, i) => (
                                          <div key={i} className="border-b border-dashed border-muted-foreground/30 h-5" />
                                        ))}
                                      </div>
                                    )}
                                    
                                    {/* Answer key */}
                                    {showAnswerKey && question.correct_answer && (
                                      <div className="mt-2 p-2 bg-green-50 dark:bg-green-950 rounded text-sm">
                                        <span className="font-medium text-green-700 dark:text-green-300">Answer: </span>
                                        <span className="text-green-600 dark:text-green-400">
                                          {typeof question.correct_answer === 'string' 
                                            ? question.correct_answer 
                                            : JSON.stringify(question.correct_answer)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* End of Test */}
                    <div className="text-center py-4 border-t border-dashed border-slate-300 mt-6">
                      <p className="text-sm text-muted-foreground font-medium">
                        — End of Test —
                      </p>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Test Settings</DialogTitle>
            <DialogDescription>Configure your test settings</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Test Title *</Label>
              <Input
                id="title"
                value={settings.title}
                onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                placeholder="e.g., Chapter 5 Quiz"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={settings.durationMinutes || ''}
                onChange={(e) => setSettings({ 
                  ...settings, 
                  durationMinutes: e.target.value ? parseInt(e.target.value) : null 
                })}
                placeholder="Leave empty for untimed"
                min={5}
                max={240}
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="calculator">Allow Calculator</Label>
                </div>
                <Checkbox
                  id="calculator"
                  checked={settings.allowCalculator}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, allowCalculator: checked as boolean })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shuffle className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="randomize">Randomize Questions</Label>
                </div>
                <Checkbox
                  id="randomize"
                  checked={settings.randomizeQuestions}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, randomizeQuestions: checked as boolean })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shuffle className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="randomizeChoices">Randomize MCQ Choices</Label>
                </div>
                <Checkbox
                  id="randomizeChoices"
                  checked={settings.randomizeChoices}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, randomizeChoices: checked as boolean })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowSettingsDialog(false)}>
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Export Dialog */}
      <TestPDFExport
        test={testDataForPDF}
        open={showPDFExport}
        onOpenChange={setShowPDFExport}
      />

      {/* Question Preview Modal - Shows full question with all parts */}
      <Dialog open={!!previewQuestion} onOpenChange={(open) => !open && setPreviewQuestion(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Question Preview
            </DialogTitle>
            <DialogDescription>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className={`text-xs ${getTypeBadgeColor(previewQuestion?.question_type || '')} text-white`}>
                  {formatQuestionType(previewQuestion?.question_type || '')}
                </Badge>
                <Badge variant="outline" className={`text-xs ${getDifficultyColor(previewQuestion?.difficulty || '')}`}>
                  {previewQuestion?.difficulty || 'medium'}
                </Badge>
                {(() => {
                  // Calculate total marks for the question group
                  if (!previewQuestion) return null;
                  const relatedParts = getRelatedQuestionParts(previewQuestion);
                  const totalMarks = relatedParts.reduce((sum, p) => sum + (p.marks || 0), 0);
                  return (
                    <span className="text-xs">
                      {totalMarks} mark{totalMarks !== 1 ? 's' : ''} total
                    </span>
                  );
                })()}
              </div>
            </DialogDescription>
          </DialogHeader>
          
          {previewQuestion && (
            <div className="space-y-4">
              {/* Get all related parts including context */}
              {(() => {
                const relatedParts = getRelatedQuestionParts(previewQuestion);
                // Find context/parent question (marks=0 or no part_label among multi-part)
                const contextPart = relatedParts.find(p => 
                  (p.marks === 0 && !p.part_label) || 
                  (!p.parent_question_id && relatedParts.length > 1 && relatedParts.some(r => r.parent_question_id === p.id))
                );
                const answerableParts = relatedParts.filter(p => p.marks > 0 || p.part_label);
                
                return (
                  <>
                    {/* Context/Stem (if exists) */}
                    {contextPart && (
                      <div className="p-4 bg-muted/30 border-l-4 border-primary rounded-r-lg">
                        {contextPart.image_url && (
                          <div className="mb-3 rounded-lg border overflow-hidden">
                            <img 
                              src={contextPart.image_url} 
                              alt="Question context" 
                              className="max-w-full max-h-[300px] object-contain mx-auto"
                            />
                          </div>
                        )}
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {contextPart.stem_markdown || contextPart.stem_md || ''}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                    
                    {/* Question Parts */}
                    {answerableParts.map((part, idx) => (
                      <div key={part.id} className="border rounded-lg overflow-hidden">
                        {/* Part header */}
                        <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b">
                          <div className="flex items-center gap-2">
                            {part.part_label && (
                              <span className="text-sm font-semibold">({part.part_label})</span>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {formatQuestionType(part.question_type)}
                            </Badge>
                          </div>
                          {part.marks > 0 && (
                            <span className="text-sm text-muted-foreground">
                              [{part.marks} mark{part.marks !== 1 ? 's' : ''}]
                            </span>
                          )}
                        </div>
                        
                        {/* Part content */}
                        <div className="p-4">
                          {part.image_url && !contextPart?.image_url && (
                            <div className="mb-3 rounded-lg border overflow-hidden">
                              <img 
                                src={part.image_url} 
                                alt="Question" 
                                className="max-w-full max-h-[300px] object-contain mx-auto"
                              />
                            </div>
                          )}
                          
                          {(part.stem_markdown || part.stem_md) && (
                            <div className="prose prose-sm max-w-none dark:prose-invert mb-4">
                              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                {part.stem_markdown || part.stem_md || ''}
                              </ReactMarkdown>
                            </div>
                          )}
                          
                          {/* MCQ Options */}
                          {(part.question_type === 'mcq' || part.question_type === 'multiple_choice') && part.options && (
                            <div className="space-y-2 pl-4">
                              {(Array.isArray(part.options) 
                                ? part.options 
                                : Object.entries(part.options).map(([key, value]) => ({ label: key, text: value }))
                              ).map((opt: any, optIdx: number) => (
                                <div key={optIdx} className="flex items-start gap-2">
                                  <span className="font-semibold text-muted-foreground min-w-[24px]">
                                    {opt.label || String.fromCharCode(65 + optIdx)}.
                                  </span>
                                  <span>{typeof opt === 'string' ? opt : (opt.text || opt.value || '')}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Answer lines placeholder */}
                          {part.question_type !== 'mcq' && part.question_type !== 'multiple_choice' && (
                            <div className="mt-3 space-y-2">
                              {Array.from({ length: Math.min(part.marks || 2, 4) }).map((_, i) => (
                                <div key={i} className="border-b border-dashed border-muted-foreground/30 h-6" />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* Answer Key */}
                    {answerableParts.some(p => p.correct_answer) && (
                      <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                        <p className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">Answers:</p>
                        {answerableParts.filter(p => p.correct_answer).map((p, i) => (
                          <p key={i} className="text-sm text-green-700 dark:text-green-300">
                            {p.part_label && <span className="font-medium">({p.part_label}) </span>}
                            {typeof p.correct_answer === 'string' 
                              ? p.correct_answer 
                              : JSON.stringify(p.correct_answer)}
                          </p>
                        ))}
                      </div>
                    )}
                    
                    {/* Examiner Comment */}
                    {answerableParts.some(p => p.examiner_comment) && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <p className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-1">Examiner Notes:</p>
                        {answerableParts.filter(p => p.examiner_comment).map((p, i) => (
                          <p key={i} className="text-sm text-blue-700 dark:text-blue-300">
                            {p.part_label && <span className="font-medium">({p.part_label}) </span>}
                            {p.examiner_comment}
                          </p>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewQuestion(null)}>
              Close
            </Button>
            <Button 
              onClick={() => {
                if (previewQuestion && !selectedQuestionIds.has(previewQuestion.id)) {
                  addQuestion(previewQuestion);
                }
                setPreviewQuestion(null);
              }}
              disabled={!previewQuestion || selectedQuestionIds.has(previewQuestion?.id || '')}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              {selectedQuestionIds.has(previewQuestion?.id || '') ? 'Already Added' : 'Add to Test'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
