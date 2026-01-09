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
} from 'lucide-react';
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

  // Local state for filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExamBoard, setSelectedExamBoard] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
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
      if (selectedSubject === 'all') return [];
      const { data, error } = await supabase
        .from('topics')
        .select('id, name, subject_id')
        .eq('subject_id', selectedSubject)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: selectedSubject !== 'all',
    staleTime: 10 * 60 * 1000,
  });

  // Cached questions query - fetches from both questions and paper_questions tables
  const { data: questions = [], isLoading: loadingQuestions } = useQuery({
    queryKey: ['test-builder-questions', user?.exam_boards],
    queryFn: async () => {
      // Fetch topical questions
      const { data: topicalData, error: topicalError } = await supabase
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
        .order('created_at', { ascending: false })
        .limit(500);
      
      if (topicalError) console.error('Error fetching topical questions:', topicalError);
      
      // Fetch paper questions
      const { data: paperData, error: paperError } = await supabase
        .from('paper_questions')
        .select(`
          id,
          question_text,
          question_type,
          question_number,
          part_label,
          marks,
          mark_scheme,
          examiner_tips,
          image_url,
          question_image_url,
          use_image_question,
          options,
          paper_id,
          past_papers!inner(
            id,
            subject_id,
            exam_board_id,
            subjects(name)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(300);
      
      if (paperError) console.error('Error fetching paper questions:', paperError);
      
      // Filter topical questions to only published
      let filteredTopical = (topicalData || []).filter(q => 
        q.visibility === 'published' || q.status === 'published' || 
        (!q.visibility && !q.status)
      ).map(q => ({
        ...q,
        source: 'topical' as const
      }));
      
            
      // Transform paper questions to match Question interface
      const transformedPaper = (paperData || []).map((pq: any) => {
        // Determine if this is an image-based question
        const hasImageQuestion = pq.use_image_question && pq.question_image_url;
        // Use question text, or indicate image question if no text but has image
        const questionContent = pq.question_text || (hasImageQuestion ? '[Image Question]' : '');
        
        return {
          id: pq.id,
          stem_md: questionContent,
          stem_markdown: questionContent,
          question_type: pq.question_type || 'short_answer',
          marks: pq.marks || 1,
          difficulty: pq.difficulty || 'medium',
          topic_id: '',
          subject_id: pq.past_papers?.subject_id || '',
          exam_board_id: pq.past_papers?.exam_board_id || '',
          options: pq.options || null,
          correct_answer: pq.mark_scheme || '',
          examiner_comment: pq.examiner_tips || '',
          topic: null,
          subject: pq.past_papers?.subjects || null,
          parent_question_id: null,
          part_label: pq.part_label || null,
          display_order: 0,
          question_number: pq.question_number || '',
          image_url: pq.image_url || null,
          question_image_url: pq.question_image_url || null,
          use_image_question: pq.use_image_question || false,
          source: 'paper' as const,
          paper_id: pq.paper_id
        };
      });
      
      // Combine both sources
      let allQuestions = [...filteredTopical, ...transformedPaper];
      
      // Filter by user's exam boards if set
      if (user?.exam_boards && user.exam_boards.length > 0) {
        const { data: examBoardsData } = await supabase
          .from('exam_boards')
          .select('id, code')
          .in('code', user.exam_boards.map(b => b.toUpperCase()));
        
        if (examBoardsData && examBoardsData.length > 0) {
          const userExamBoardIds = examBoardsData.map(eb => eb.id);
          allQuestions = allQuestions.filter(q => 
            !q.exam_board_id || userExamBoardIds.includes(q.exam_board_id)
          );
        }
      }
      
      return allQuestions as Question[];
    },
    enabled: !loading,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filter subjects by selected exam board
  const filteredSubjects = useMemo(() => {
    if (selectedExamBoard === 'all') return subjects;
    return subjects.filter(s => !s.exam_board_id || s.exam_board_id === selectedExamBoard);
  }, [subjects, selectedExamBoard]);

  // Filter questions
  const filteredQuestions = useMemo(() => {
    // First, get the subject IDs that match the selected exam board
    const validSubjectIds = selectedExamBoard === 'all' 
      ? null 
      : new Set(subjects.filter(s => s.exam_board_id === selectedExamBoard).map(s => s.id));

    const filtered = questions.filter(q => {
      const searchText = (q.stem_md || q.stem_markdown || '').toLowerCase();
      if (searchQuery && !searchText.includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Exam board filter - match by exam_board_id on the question OR by subject's exam_board
      if (selectedExamBoard !== 'all') {
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
      if (selectedSubject !== 'all' && q.subject_id !== selectedSubject) {
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

  // Get all selected question IDs
  const selectedQuestionIds = useMemo(() => {
    return new Set(testQuestions.map(q => q.questionId));
  }, [testQuestions]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalMarks = testQuestions.reduce((sum, q) => sum + q.marks, 0);
    return { totalMarks, totalQuestions: testQuestions.length };
  }, [testQuestions]);

  // Add question to test
  function addQuestion(question: Question) {
    if (selectedQuestionIds.has(question.id)) return;
    
    const newQuestion: TestQuestion = {
      questionId: question.id,
      marks: question.marks,
      order: testQuestions.length + 1,
      question,
    };

    setTestQuestions([...testQuestions, newQuestion]);
    toast({ title: 'Question added', description: 'Added to your test' });
  }

  // Remove question from test
  function removeQuestion(questionId: string) {
    setTestQuestions(
      testQuestions
        .filter(q => q.questionId !== questionId)
        .map((q, idx) => ({ ...q, order: idx + 1 }))
    );
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

  // Load test for editing
  async function loadTestForEditing(testId: string) {
    setLoadingTest(true);
    try {
      const { data: test, error } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .eq('created_by', user?.id)
        .single();

      if (error) throw error;

      if (!test) {
        toast({ variant: 'destructive', title: 'Error', description: 'Test not found' });
        router.push('/teacher/tests');
        return;
      }

      // Load test settings
      setSettings({
        title: test.title || '',
        description: test.description || '',
        subjectId: test.subject_id || '',
        durationMinutes: test.duration_minutes,
        allowCalculator: test.allow_calculator ?? true,
        randomizeQuestions: test.randomize_questions ?? false,
        randomizeChoices: test.randomize_choices ?? false,
      });

      // Load test questions
      if (test.sections && Array.isArray(test.sections) && test.sections.length > 0) {
        const section = test.sections[0];
        if (section.questions && Array.isArray(section.questions)) {
          const questionIds = section.questions.map((q: any) => q.questionId);
          
          // Fetch full question data
          const { data: questionsData, error: questionsError } = await supabase
            .from('questions')
            .select('*')
            .in('id', questionIds);

          if (questionsError) throw questionsError;

          // Map questions with their marks and order
          const loadedQuestions: TestQuestion[] = section.questions.map((q: any) => {
            const questionData = questionsData?.find(qd => qd.id === q.questionId);
            return {
              questionId: q.questionId,
              marks: q.marks || 1,
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
    try {
      console.log('=== saveTest called ===');
      
      // Get assessment type ID for custom_test
      const { data: assessmentType, error: typeError } = await supabase
        .from('assessment_types')
        .select('id')
        .eq('code', 'custom_test')
        .single();

      console.log('Assessment type:', assessmentType, typeError);

      if (!assessmentType) {
        throw new Error('Assessment type not found');
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
          const questionsToInsert = testQuestions.map((q, idx) => ({
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

        if (insertError) throw insertError;

        // Add questions to assessment_questions table
        if (testQuestions.length > 0 && newAssessment) {
          const questionsToInsert = testQuestions.map((q, idx) => ({
            assessment_id: newAssessment.id,
            question_id: q.questionId,
            question_order: idx + 1,
            custom_marks: q.marks
          }));

          console.log('Inserting questions:', questionsToInsert);

          const { error: qError } = await supabase
            .from('assessment_questions')
            .insert(questionsToInsert);

          if (qError) {
            console.error('Error inserting questions:', qError);
            throw qError;
          }

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

      {/* Filters Bar - Moved to top */}
      <Card className="mb-4">
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filters */}
            <Select value={selectedExamBoard} onValueChange={(v) => {
              setSelectedExamBoard(v);
              setSelectedSubject('all');
              setSelectedTopic('all');
            }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Exam Board" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Boards</SelectItem>
                {examBoards.map(eb => (
                  <SelectItem key={eb.id} value={eb.id}>{eb.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSubject} onValueChange={(v) => {
              setSelectedSubject(v);
              setSelectedTopic('all');
            }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {filteredSubjects.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.code && `${s.code} - `}{s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedTopic} onValueChange={setSelectedTopic}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Topic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Topics</SelectItem>
                {topics.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
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

            {/* Question count */}
            <div className="ml-auto text-sm text-muted-foreground">
              {loadingQuestions ? 'Loading...' : `${filteredQuestions.length} questions`}
              {filteredQuestions.length > 0 && !loadingQuestions && (
                <span className="ml-2">• {filteredQuestions.reduce((sum, q) => sum + (q.marks || 0), 0)} marks</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main content */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        {/* Left Panel - Question Bank */}
        <div className="col-span-4 flex flex-col min-h-0">
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
                ) : filteredQuestions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Filter className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No questions found</p>
                    <p className="text-sm">Try adjusting your filters</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredQuestions.map(question => {
                      const isSelected = selectedQuestionIds.has(question.id);
                      const hasImage = !!question.image_url;
                      const questionText = question.stem_markdown || question.stem_md || '';
                      return (
                        <div
                          key={question.id}
                          className={`p-3 border rounded-lg transition-colors ${
                            isSelected ? 'bg-primary/5 border-primary/30' : 'hover:bg-muted/50'
                          } ${question.part_label ? 'ml-4 border-l-2 border-l-primary/30' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              {/* Question number/part label and source */}
                              <div className="flex items-center gap-2 mb-1">
                                {(question.question_number || question.part_label) && (
                                  <span className="text-xs font-semibold text-primary">
                                    {question.question_number && `Q${question.question_number}`}
                                    {question.part_label && ` (${question.part_label})`}
                                  </span>
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
                                <p className="text-sm line-clamp-2">
                                  {questionText}
                                </p>
                              )}
                              {/* Show placeholder if no text and no image */}
                              {!questionText && !question.image_url && !question.question_image_url && (
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
                                  {question.marks} mark{question.marks !== 1 ? 's' : ''}
                                </span>
                                {question.topic && (
                                  <span className="text-xs text-muted-foreground truncate">
                                    • {(question.topic as any).name}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant={isSelected ? "secondary" : "default"}
                              onClick={() => !isSelected && addQuestion(question)}
                              disabled={isSelected}
                            >
                              {isSelected ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : (
                                <Plus className="h-4 w-4" />
                              )}
                            </Button>
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

        {/* Right Panel - Test Preview */}
        <div className="col-span-8 flex flex-col min-h-0">
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
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAnswerKey(!showAnswerKey)}
                >
                  {showAnswerKey ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                  {showAnswerKey ? 'Hide Answers' : 'Show Answers'}
                </Button>
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
                        {settings.description && (
                          <p className="text-sm text-muted-foreground">{settings.description}</p>
                        )}
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

                    {/* Questions with Drag & Drop */}
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={testQuestions.map(q => q.questionId)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-4">
                          {testQuestions.map((tq, index) => (
                            <SortableQuestionCard
                              key={tq.questionId}
                              id={tq.questionId}
                              question={tq.question!}
                              questionNumber={index + 1}
                              marks={tq.marks}
                              onMarksChange={(newMarks) => updateQuestionMarks(tq.questionId, newMarks)}
                              onRemove={() => removeQuestion(tq.questionId)}
                              showAnswerKey={showAnswerKey}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>

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
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={settings.description}
                onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                placeholder="Optional description or instructions"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Select
                value={settings.subjectId}
                onValueChange={(v) => setSettings({ ...settings, subjectId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
    </div>
  );
}
