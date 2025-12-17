'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Upload,
  FileText,
  Download,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Target,
  Save,
  X,
  Eye,
  Link as LinkIcon,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { EXAM_BOARDS, QUALIFICATION_LEVELS, getLevelsForBoard, type ExamBoard } from '@/lib/exam-boards';

interface DbExamBoard {
  id: string;
  code: string;
  name: string;
  full_name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  display_order: number;
}

interface Subject {
  id: string;
  name: string;
  slug: string;
  code?: string;
  exam_board_id?: string;
  level?: string;
}

interface Topic {
  id: string;
  subject_id: string;
  name: string;
  slug: string;
  description: string | null;
  pdf_url: string | null;
  answers_pdf_url: string | null;
  estimated_time: number | null;
  status: string;
  question_count?: number;
}

interface Question {
  id: string;
  stem_markdown?: string;
  stem_md?: string;
  question_type: string;
  difficulty: string;
  marks: number;
  correct_answer: any;
  explanation: string | null;
  examiner_comment: string | null;
  question_number: string | null;
  status: string;
  topic_id: string;
}

interface MCQOption {
  label: string;
  text: string;
  is_correct: boolean;
}

const QUESTION_TYPES = [
  { value: 'short_answer', label: 'Short Answer (Written)' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True/False' },
  { value: 'numeric', label: 'Numeric' },
  { value: 'essay', label: 'Essay/Extended Response' },
];

const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard', 'very_hard'];

export default function TopicalQuestionsManagementPage() {
  const supabase = createClient();
  const { toast } = useToast();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Database exam boards
  const [dbExamBoards, setDbExamBoards] = useState<DbExamBoard[]>([]);

  // Exam board and level filters for content management
  const [selectedExamBoard, setSelectedExamBoard] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('igcse');

  // Dialog states
  const [isTopicDialogOpen, setIsTopicDialogOpen] = useState(false);
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  // Form states
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // Topic form
  const [topicForm, setTopicForm] = useState({
    name: '',
    description: '',
    pdf_url: '',
    answers_pdf_url: '',
    estimated_time: 30,
    status: 'published'
  });

  // Question form
  const [questionForm, setQuestionForm] = useState({
    stem_markdown: '',
    question_type: 'short_answer',
    difficulty: 'medium',
    marks: 2,
    correct_answer: '',
    explanation: '',
    examiner_comment: '',
    question_number: '',
    status: 'published'
  });

  const [mcqOptions, setMcqOptions] = useState<MCQOption[]>([
    { label: 'A', text: '', is_correct: false },
    { label: 'B', text: '', is_correct: false },
    { label: 'C', text: '', is_correct: false },
    { label: 'D', text: '', is_correct: false }
  ]);

  // Bulk import
  const [bulkQuestions, setBulkQuestions] = useState('');

  // File upload states
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadingAnswersPdf, setUploadingAnswersPdf] = useState(false);

  useEffect(() => {
    fetchExamBoards();
  }, []);

  // Re-fetch subjects when exam board or level changes
  useEffect(() => {
    if (selectedExamBoard) {
      fetchSubjects(selectedExamBoard, selectedLevel);
    }
  }, [selectedExamBoard, selectedLevel]);

  async function fetchExamBoards() {
    try {
      const { data, error } = await supabase
        .from('exam_boards')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setDbExamBoards(data || []);
      
      // Set first exam board as default
      if (data && data.length > 0 && !selectedExamBoard) {
        setSelectedExamBoard(data[0].id);
      }
    } catch (error: any) {
      console.error('Error fetching exam boards:', error);
    }
  }

  useEffect(() => {
    if (selectedSubject) {
      // Clear previous topic selection when subject changes
      setSelectedTopic(null);
      setQuestions([]);
      fetchTopics(selectedSubject);
    } else {
      setTopics([]);
      setSelectedTopic(null);
      setQuestions([]);
    }
  }, [selectedSubject]);

  useEffect(() => {
    if (selectedTopic) {
      fetchQuestions(selectedTopic.id);
    }
  }, [selectedTopic]);

  async function fetchSubjects(examBoardId?: string, level?: string) {
    try {
      let query = supabase
        .from('subjects')
        .select('id, name, slug, code, exam_board_id, level')
        .order('name');

      // Filter by exam board if provided
      if (examBoardId) {
        query = query.eq('exam_board_id', examBoardId);
      }
      
      // Filter by level if provided
      if (level) {
        query = query.eq('level', level);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSubjects(data || []);
      
      // Auto-select first subject if available, or clear selection
      if (data && data.length > 0) {
        setSelectedSubject(data[0].id);
      } else {
        setSelectedSubject('');
        setTopics([]);
        setSelectedTopic(null);
        setQuestions([]);
      }
    } catch (error: any) {
      console.error('Error fetching subjects:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load subjects'
      });
    } finally {
      setLoading(false);
    }
  }

  async function fetchTopics(subjectId: string) {
    try {
      console.log('Fetching topics for subject:', subjectId);
      
      // Order by display_order for proper topic sequencing
      const { data: topicsData, error } = await supabase
        .from('topics')
        .select('*')
        .eq('subject_id', subjectId)
        .order('display_order', { ascending: true });

      if (error) throw error;

      console.log('Topics fetched:', topicsData?.length || 0);

      // Handle empty or null topics
      if (!topicsData || topicsData.length === 0) {
        setTopics([]);
        setSelectedTopic(null);
        setQuestions([]);
        return;
      }

      // Get question counts for each topic
      const topicIds = topicsData.map(t => t.id);
      let counts: Record<string, number> = {};
      
      if (topicIds.length > 0) {
        const { data: questionCounts, error: countError } = await supabase
          .from('questions')
          .select('topic_id')
          .in('topic_id', topicIds);

        if (countError) {
          console.error('Error fetching question counts:', countError);
        }

        (questionCounts || []).forEach((q: any) => {
          counts[q.topic_id] = (counts[q.topic_id] || 0) + 1;
        });
      }

      const topicsWithCounts = topicsData.map(t => ({
        ...t,
        question_count: counts[t.id] || 0
      }));

      setTopics(topicsWithCounts);
      
      // Auto-select first topic if none selected
      if (!selectedTopic && topicsWithCounts.length > 0) {
        setSelectedTopic(topicsWithCounts[0]);
      }
    } catch (error: any) {
      console.error('Error fetching topics:', error);
      setTopics([]);
    }
  }

  async function fetchQuestions(topicId: string) {
    try {
      // Order by created_at (question_number ordering will work after migration)
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('topic_id', topicId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setQuestions(data || []);
    } catch (error: any) {
      console.error('Error fetching questions:', error);
    }
  }

  // File upload handler
  async function handleFileUpload(file: File, type: 'questions' | 'answers') {
    if (!selectedTopic) return;
    
    const isQuestionsPdf = type === 'questions';
    isQuestionsPdf ? setUploadingPdf(true) : setUploadingAnswersPdf(true);

    try {
      // Get subject slug for folder organization
      const subject = subjects.find(s => s.id === selectedSubject);
      const subjectSlug = subject?.slug || 'unknown';
      const topicSlug = selectedTopic.slug || selectedTopic.name.toLowerCase().replace(/\s+/g, '-');
      
      // Create unique filename
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `${subjectSlug}/${topicSlug}/${type}-${timestamp}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('topical-pdfs')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('topical-pdfs')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      // Update topic with new URL
      const updateField = isQuestionsPdf ? 'pdf_url' : 'answers_pdf_url';
      const { error: updateError } = await supabase
        .from('topics')
        .update({ [updateField]: publicUrl })
        .eq('id', selectedTopic.id);

      if (updateError) throw updateError;

      // Update local state
      if (isQuestionsPdf) {
        setTopicForm(prev => ({ ...prev, pdf_url: publicUrl }));
        setSelectedTopic(prev => prev ? { ...prev, pdf_url: publicUrl } : null);
      } else {
        setTopicForm(prev => ({ ...prev, answers_pdf_url: publicUrl }));
        setSelectedTopic(prev => prev ? { ...prev, answers_pdf_url: publicUrl } : null);
      }

      // Refresh topics list
      fetchTopics(selectedSubject);

      toast({
        title: 'Success',
        description: `${isQuestionsPdf ? 'Questions' : 'Answers'} PDF uploaded successfully`
      });
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        variant: 'destructive',
        title: 'Upload Error',
        description: error.message || 'Failed to upload PDF. Make sure the storage bucket exists.'
      });
    } finally {
      isQuestionsPdf ? setUploadingPdf(false) : setUploadingAnswersPdf(false);
    }
  }

  // Topic CRUD
  async function handleSaveTopic() {
    if (!selectedSubject) return;
    setSaving(true);

    try {
      // Get subject info for unique slug generation
      const subject = subjects.find(s => s.id === selectedSubject);
      const subjectSlug = subject?.slug || subject?.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown';
      const baseName = topicForm.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      // Include subject slug in topic slug to ensure uniqueness across subjects
      const slug = `${baseName}-${subjectSlug}`;
      
      // Build topic data with only columns that exist in the database
      const topicData: Record<string, any> = {
        subject_id: selectedSubject,
        name: topicForm.name,
        slug,
        description: topicForm.description || null,
        pdf_url: topicForm.pdf_url || null,
        answers_pdf_url: topicForm.answers_pdf_url || null,
        estimated_time: topicForm.estimated_time || 30,
        status: topicForm.status || 'published',
      };

      if (editingTopic) {
        // For updates, only change slug if name changed
        const needsNewSlug = editingTopic.name !== topicForm.name;
        if (!needsNewSlug) {
          topicData.slug = editingTopic.slug;
        }
        
        const { error } = await supabase
          .from('topics')
          .update(topicData)
          .eq('id', editingTopic.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Topic updated successfully' });
      } else {
        const { error } = await supabase
          .from('topics')
          .insert(topicData);

        if (error) throw error;
        toast({ title: 'Success', description: 'Topic created successfully' });
      }

      setIsTopicDialogOpen(false);
      setEditingTopic(null);
      resetTopicForm();
      fetchTopics(selectedSubject);
    } catch (error: any) {
      console.error('Error saving topic:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to save topic'
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTopic(topic: Topic) {
    if (!confirm(`Delete topic "${topic.name}" and all its questions?`)) return;

    try {
      // Delete questions first
      await supabase.from('questions').delete().eq('topic_id', topic.id);
      
      // Delete topic
      const { error } = await supabase.from('topics').delete().eq('id', topic.id);
      if (error) throw error;

      toast({ title: 'Success', description: 'Topic deleted successfully' });
      
      if (selectedTopic?.id === topic.id) {
        setSelectedTopic(null);
        setQuestions([]);
      }
      fetchTopics(selectedSubject);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete topic'
      });
    }
  }

  // Question CRUD
  async function handleSaveQuestion() {
    if (!selectedTopic) return;
    setSaving(true);

    try {
      let correctAnswer = questionForm.correct_answer;
      let options = null;

      if (questionForm.question_type === 'multiple_choice') {
        options = mcqOptions;
        const correctOption = mcqOptions.find(opt => opt.is_correct);
        correctAnswer = correctOption?.label || '';
      }

      // Build question data using columns that exist in the base schema
      // correct_answer must be JSONB, stem_md is required text
      const questionData: Record<string, any> = {
        topic_id: selectedTopic.id,
        subject_id: selectedSubject,
        stem_md: questionForm.stem_markdown,
        question_type: questionForm.question_type === 'multiple_choice' ? 'mcq' : questionForm.question_type,
        difficulty: questionForm.difficulty,
        marks: questionForm.marks,
        correct_answer: JSON.stringify(correctAnswer), // Must be JSONB
        options: options,
        examiner_comment: questionForm.examiner_comment || 'N/A', // Required NOT NULL field
        visibility: questionForm.status || 'published',
      };

      if (editingQuestion) {
        const { error } = await supabase
          .from('questions')
          .update(questionData)
          .eq('id', editingQuestion.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Question updated successfully' });
      } else {
        const { error } = await supabase
          .from('questions')
          .insert(questionData);

        if (error) throw error;
        toast({ title: 'Success', description: 'Question created successfully' });
      }

      setIsQuestionDialogOpen(false);
      setEditingQuestion(null);
      resetQuestionForm();
      fetchQuestions(selectedTopic.id);
      fetchTopics(selectedSubject); // Update question counts
    } catch (error: any) {
      console.error('Error saving question:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to save question'
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteQuestion(question: Question) {
    if (!confirm('Delete this question?')) return;

    try {
      const { error } = await supabase.from('questions').delete().eq('id', question.id);
      if (error) throw error;

      toast({ title: 'Success', description: 'Question deleted successfully' });
      fetchQuestions(selectedTopic!.id);
      fetchTopics(selectedSubject);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete question'
      });
    }
  }

  // Bulk import with one-at-a-time insertion for better error handling
  async function handleBulkImport() {
    if (!selectedTopic || !bulkQuestions.trim()) return;
    setSaving(true);

    try {
      // Parse JSON array of questions
      const questionsToImport = JSON.parse(bulkQuestions);
      
      if (!Array.isArray(questionsToImport)) {
        throw new Error('Input must be a JSON array of questions');
      }

      // Supports model_answer, answer, or correct_answer for the answer field
      const questionsData = questionsToImport.map((q: any, index: number) => ({
        topic_id: selectedTopic.id,
        subject_id: selectedSubject,
        stem_md: q.question || q.stem_markdown || q.stem_md || q.text,
        question_type: q.question_type || q.type || 'short_answer',
        difficulty: q.difficulty || 'medium',
        marks: q.marks || 2,
        correct_answer: JSON.stringify(q.model_answer || q.correct_answer || q.answer || ''),
        explanation: q.explanation || null,
        examiner_comment: q.examiner_comment || null,
        question_number: q.question_number || `${index + 1}`,
        visibility: 'published',
      }));

      // Insert one at a time with timeout to avoid stalling
      let successCount = 0;
      const errors: string[] = [];
      
      for (let i = 0; i < questionsData.length; i++) {
        const question = questionsData[i];
        try {
          const insertPromise = supabase.from('questions').insert(question);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 10000)
          );
          
          const { error } = await Promise.race([insertPromise, timeoutPromise]) as any;
          
          if (error) {
            console.error(`Error inserting question ${i + 1}:`, error);
            errors.push(`Q${i + 1}: ${error.message}`);
          } else {
            successCount++;
          }
        } catch (e: any) {
          console.error(`Exception inserting question ${i + 1}:`, e);
          errors.push(`Q${i + 1}: ${e.message}`);
        }
      }

      if (successCount > 0) {
        toast({ 
          title: 'Import Complete', 
          description: `Imported ${successCount} of ${questionsData.length} questions${errors.length > 0 ? `. ${errors.length} failed.` : ''}` 
        });
        setIsBulkImportOpen(false);
        setBulkQuestions('');
        fetchQuestions(selectedTopic.id);
        fetchTopics(selectedSubject);
      }
      
      if (errors.length > 0 && successCount === 0) {
        throw new Error(errors.slice(0, 3).join('; '));
      }
    } catch (error: any) {
      console.error('Error importing questions:', error);
      toast({
        variant: 'destructive',
        title: 'Import Error',
        description: error.message || 'Failed to import questions. Check JSON format.'
      });
    } finally {
      setSaving(false);
    }
  }

  // Download questions template
  function downloadQuestionsTemplate() {
    const template = [
      {
        "question": "What is the chemical formula for water?",
        "type": "short_answer",
        "difficulty": "easy",
        "marks": 2,
        "model_answer": "H2O",
        "explanation": "Water consists of two hydrogen atoms and one oxygen atom.",
        "examiner_comment": "Award 1 mark for correct formula. Accept H₂O."
      },
      {
        "question": "Which of the following is a noble gas?",
        "type": "multiple_choice",
        "difficulty": "medium",
        "marks": 1,
        "model_answer": "B",
        "options": ["Oxygen", "Argon", "Nitrogen", "Carbon"],
        "explanation": "Argon is a noble gas found in Group 18 of the periodic table.",
        "examiner_comment": "Award 1 mark for selecting option B (Argon)."
      },
      {
        "question": "Plants produce oxygen during photosynthesis.",
        "type": "true_false",
        "difficulty": "easy",
        "marks": 1,
        "model_answer": "true",
        "explanation": "During photosynthesis, plants convert CO2 and H2O into glucose and O2.",
        "examiner_comment": "Award 1 mark for correct answer."
      }
    ];
    
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions-template.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Form helpers
  function resetTopicForm() {
    setTopicForm({
      name: '',
      description: '',
      pdf_url: '',
      answers_pdf_url: '',
      estimated_time: 30,
      status: 'published'
    });
  }

  function resetQuestionForm() {
    setQuestionForm({
      stem_markdown: '',
      question_type: 'short_answer',
      difficulty: 'medium',
      marks: 2,
      correct_answer: '',
      explanation: '',
      examiner_comment: '',
      question_number: '',
      status: 'published'
    });
    setMcqOptions([
      { label: 'A', text: '', is_correct: false },
      { label: 'B', text: '', is_correct: false },
      { label: 'C', text: '', is_correct: false },
      { label: 'D', text: '', is_correct: false }
    ]);
  }

  function openEditTopic(topic: Topic) {
    setEditingTopic(topic);
    setTopicForm({
      name: topic.name,
      description: topic.description || '',
      pdf_url: topic.pdf_url || '',
      answers_pdf_url: topic.answers_pdf_url || '',
      estimated_time: topic.estimated_time || 30,
      status: topic.status
    });
    setIsTopicDialogOpen(true);
  }

  function openEditQuestion(question: Question) {
    setEditingQuestion(question);
    setQuestionForm({
      stem_markdown: (question.stem_markdown ?? question.stem_md ?? '') as string,
      question_type: question.question_type,
      difficulty: question.difficulty,
      marks: question.marks,
      correct_answer: typeof question.correct_answer === 'string' ? question.correct_answer : JSON.stringify(question.correct_answer),
      explanation: question.explanation || '',
      examiner_comment: question.examiner_comment || '',
      question_number: question.question_number || '',
      status: question.status
    });
    
    // Load MCQ options if applicable
    if (question.question_type === 'multiple_choice' && (question as any).options) {
      setMcqOptions((question as any).options);
    }
    
    setIsQuestionDialogOpen(true);
  }

  function openNewTopic() {
    setEditingTopic(null);
    resetTopicForm();
    setIsTopicDialogOpen(true);
  }

  function openNewQuestion() {
    setEditingQuestion(null);
    resetQuestionForm();
    setIsQuestionDialogOpen(true);
  }

  // MCQ helpers
  function addMCQOption() {
    const nextLabel = String.fromCharCode(65 + mcqOptions.length);
    setMcqOptions([...mcqOptions, { label: nextLabel, text: '', is_correct: false }]);
  }

  function removeMCQOption(index: number) {
    if (mcqOptions.length > 2) {
      setMcqOptions(mcqOptions.filter((_, i) => i !== index));
    }
  }

  function updateMCQOption(index: number, field: keyof MCQOption, value: any) {
    const updated = [...mcqOptions];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'is_correct' && value === true) {
      updated.forEach((opt, i) => {
        if (i !== index) opt.is_correct = false;
      });
    }
    
    setMcqOptions(updated);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96 lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Target className="h-8 w-8 text-primary" />
            Topical Questions Manager
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage PDF uploads and question bank for topical practice
          </p>
        </div>
      </div>

      {/* Exam Board, Level & Subject Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            {/* Exam Board */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Exam Board</Label>
              <Select value={selectedExamBoard} onValueChange={(value) => {
                setSelectedExamBoard(value);
                // Find the board code to get available levels
                const board = dbExamBoards.find(b => b.id === value);
                if (board) {
                  const boardCode = board.code.toLowerCase();
                  const availableLevels = getLevelsForBoard(boardCode === 'cie' ? 'cambridge' : boardCode === 'edex' ? 'edexcel' : boardCode.toLowerCase());
                  if (!availableLevels.some(l => l.id === selectedLevel)) {
                    setSelectedLevel(availableLevels[0]?.id || '');
                  }
                }
              }}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Select board" />
                </SelectTrigger>
                <SelectContent>
                  {dbExamBoards.map(board => (
                    <SelectItem key={board.id} value={board.id}>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: board.color }} />
                        {board.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Level */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Level</Label>
              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const board = dbExamBoards.find(b => b.id === selectedExamBoard);
                    const boardCode = board?.code.toLowerCase() || '';
                    const mappedCode = boardCode === 'cie' ? 'cambridge' : boardCode === 'edex' ? 'edexcel' : boardCode;
                    return getLevelsForBoard(mappedCode).map(level => (
                      <SelectItem key={level.id} value={level.id}>
                        {level.name}
                      </SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Choose a subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(subject => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name} {subject.code && `(${subject.code})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Current Selection Badge */}
            <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Managing:</span>
              <Badge variant="secondary">
                {dbExamBoards.find(b => b.id === selectedExamBoard)?.code || 'All'}
              </Badge>
              <Badge variant="secondary">
                {(() => {
                  const board = dbExamBoards.find(b => b.id === selectedExamBoard);
                  const boardCode = board?.code.toLowerCase() || '';
                  const mappedCode = boardCode === 'cie' ? 'cambridge' : boardCode === 'edex' ? 'edexcel' : boardCode;
                  return getLevelsForBoard(mappedCode).find(l => l.id === selectedLevel)?.name || selectedLevel;
                })()}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Topics Panel */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Topics</CardTitle>
              <Button size="sm" onClick={openNewTopic}>
                <Plus className="h-4 w-4 mr-1" />
                Add Topic
              </Button>
            </div>
            <CardDescription>
              Select a topic to manage its questions
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[500px] overflow-y-auto">
              {topics.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No topics yet</p>
                  <p className="text-sm">Create your first topic</p>
                </div>
              ) : (
                <div className="divide-y">
                  {topics.map(topic => (
                    <div
                      key={topic.id}
                      className={cn(
                        "p-4 cursor-pointer hover:bg-muted/50 transition-colors",
                        selectedTopic?.id === topic.id && "bg-primary/10 border-l-4 border-primary"
                      )}
                      onClick={() => setSelectedTopic(topic)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground truncate">{topic.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {topic.question_count || 0} Qs
                            </Badge>
                            {topic.pdf_url && (
                              <Badge variant="outline" className="text-xs">
                                <FileText className="h-3 w-3 mr-1" />
                                PDF
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditTopic(topic);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTopic(topic);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Questions Panel */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  {selectedTopic ? selectedTopic.name : 'Select a Topic'}
                </CardTitle>
                <CardDescription>
                  {selectedTopic 
                    ? `${questions.length} questions • ${selectedTopic.estimated_time || 30} mins estimated`
                    : 'Choose a topic from the left panel'
                  }
                </CardDescription>
              </div>
              {selectedTopic && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsBulkImportOpen(true)}>
                    <Upload className="h-4 w-4 mr-1" />
                    Bulk Import
                  </Button>
                  <Button size="sm" onClick={openNewQuestion}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Question
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedTopic ? (
              <div className="text-center py-12 text-muted-foreground">
                <Target className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg">Select a topic to view and manage questions</p>
              </div>
            ) : (
              <Tabs defaultValue="questions">
                <TabsList className="mb-4">
                  <TabsTrigger value="questions">Questions ({questions.length})</TabsTrigger>
                  <TabsTrigger value="pdfs">PDF Resources</TabsTrigger>
                </TabsList>

                <TabsContent value="questions">
                  {questions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No questions yet</p>
                      <p className="text-sm mb-4">Add questions manually or use bulk import</p>
                      <div className="flex justify-center gap-2">
                        <Button variant="outline" onClick={() => setIsBulkImportOpen(true)}>
                          <Upload className="h-4 w-4 mr-2" />
                          Bulk Import JSON
                        </Button>
                        <Button onClick={openNewQuestion}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Question
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {questions.map((question, index) => (
                        <div
                          key={question.id}
                          className="p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">
                                  Q{question.question_number || index + 1}
                                </Badge>
                                <Badge variant="secondary">
                                  {question.marks} mark{question.marks > 1 ? 's' : ''}
                                </Badge>
                                <Badge className={cn(
                                  "text-xs",
                                  question.difficulty === 'easy' && "bg-green-500/10 text-green-600",
                                  question.difficulty === 'medium' && "bg-yellow-500/10 text-yellow-600",
                                  question.difficulty === 'hard' && "bg-orange-500/10 text-orange-600",
                                  question.difficulty === 'very_hard' && "bg-red-500/10 text-red-600"
                                )}>
                                  {question.difficulty}
                                </Badge>
                              </div>
                              <p className="text-sm text-foreground line-clamp-2">
                                {question.stem_markdown || question.stem_md}
                              </p>
                              {question.correct_answer && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Answer: {String(question.correct_answer).substring(0, 50)}
                                  {String(question.correct_answer).length > 50 && '...'}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditQuestion(question)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => handleDeleteQuestion(question)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="pdfs">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Questions PDF */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Questions PDF
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {selectedTopic.pdf_url ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                <span className="text-sm text-green-700">PDF uploaded</span>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" asChild className="flex-1">
                                  <a href={selectedTopic.pdf_url} target="_blank" rel="noopener noreferrer">
                                    <Eye className="h-4 w-4 mr-1" />
                                    View
                                  </a>
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                              <AlertCircle className="h-5 w-5 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">No PDF uploaded</span>
                            </div>
                          )}
                          {/* File Upload */}
                          <div className="relative">
                            <input
                              type="file"
                              accept=".pdf"
                              id="questions-pdf-upload"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file, 'questions');
                                e.target.value = '';
                              }}
                              disabled={uploadingPdf}
                            />
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full"
                              disabled={uploadingPdf}
                            >
                              {uploadingPdf ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <Upload className="h-4 w-4 mr-2" />
                                  {selectedTopic.pdf_url ? 'Replace PDF' : 'Upload PDF'}
                                </>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Answers PDF */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Answers / Mark Scheme PDF
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {selectedTopic.answers_pdf_url ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                <span className="text-sm text-green-700">PDF uploaded</span>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" asChild className="flex-1">
                                  <a href={selectedTopic.answers_pdf_url} target="_blank" rel="noopener noreferrer">
                                    <Eye className="h-4 w-4 mr-1" />
                                    View
                                  </a>
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                              <AlertCircle className="h-5 w-5 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">No PDF uploaded</span>
                            </div>
                          )}
                          {/* File Upload */}
                          <div className="relative">
                            <input
                              type="file"
                              accept=".pdf"
                              id="answers-pdf-upload"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file, 'answers');
                                e.target.value = '';
                              }}
                              disabled={uploadingAnswersPdf}
                            />
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full"
                              disabled={uploadingAnswersPdf}
                            >
                              {uploadingAnswersPdf ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <Upload className="h-4 w-4 mr-2" />
                                  {selectedTopic.answers_pdf_url ? 'Replace PDF' : 'Upload PDF'}
                                </>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <h4 className="font-medium text-sm text-blue-700 mb-2">📁 Direct Upload</h4>
                      <p className="text-sm text-blue-600">
                        Click the upload buttons above to upload PDFs directly from your computer. 
                        Files are automatically stored in Supabase Storage and linked to this topic.
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Topic Dialog */}
      <Dialog open={isTopicDialogOpen} onOpenChange={setIsTopicDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTopic ? 'Edit Topic' : 'Create Topic'}</DialogTitle>
            <DialogDescription>
              {editingTopic ? 'Update topic details and PDF links' : 'Add a new topic for topical questions'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Topic Name *</Label>
              <Input
                value={topicForm.name}
                onChange={(e) => setTopicForm({ ...topicForm, name: e.target.value })}
                placeholder="e.g., Acids, Bases and Salts"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={topicForm.description}
                onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })}
                placeholder="Brief description of the topic"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estimated Time (mins)</Label>
                <Input
                  type="number"
                  value={topicForm.estimated_time}
                  onChange={(e) => setTopicForm({ ...topicForm, estimated_time: parseInt(e.target.value) || 30 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={topicForm.status}
                  onValueChange={(value) => setTopicForm({ ...topicForm, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Questions PDF URL
              </Label>
              <Input
                value={topicForm.pdf_url}
                onChange={(e) => setTopicForm({ ...topicForm, pdf_url: e.target.value })}
                placeholder="https://your-supabase-url.com/storage/v1/..."
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Answers PDF URL
              </Label>
              <Input
                value={topicForm.answers_pdf_url}
                onChange={(e) => setTopicForm({ ...topicForm, answers_pdf_url: e.target.value })}
                placeholder="https://your-supabase-url.com/storage/v1/..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTopicDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTopic} disabled={saving || !topicForm.name}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Topic'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question Dialog */}
      <Dialog open={isQuestionDialogOpen} onOpenChange={setIsQuestionDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? 'Edit Question' : 'Add Question'}</DialogTitle>
            <DialogDescription>
              {editingQuestion ? 'Update question details' : 'Add a new question to this topic'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Question Number</Label>
                <Input
                  value={questionForm.question_number}
                  onChange={(e) => setQuestionForm({ ...questionForm, question_number: e.target.value })}
                  placeholder="e.g., 1a, 2b"
                />
              </div>
              <div className="space-y-2">
                <Label>Marks *</Label>
                <Input
                  type="number"
                  min="1"
                  value={questionForm.marks}
                  onChange={(e) => setQuestionForm({ ...questionForm, marks: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select
                  value={questionForm.difficulty}
                  onValueChange={(value) => setQuestionForm({ ...questionForm, difficulty: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTY_LEVELS.map(level => (
                      <SelectItem key={level} value={level}>
                        {level.charAt(0).toUpperCase() + level.slice(1).replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Question Type *</Label>
              <Select
                value={questionForm.question_type}
                onValueChange={(value) => setQuestionForm({ ...questionForm, question_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Question Text *</Label>
              <Textarea
                value={questionForm.stem_markdown}
                onChange={(e) => setQuestionForm({ ...questionForm, stem_markdown: e.target.value })}
                placeholder="Enter the question text..."
                rows={4}
              />
            </div>

            {/* Answer Configuration */}
            {questionForm.question_type === 'multiple_choice' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Options (check the correct answer)</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addMCQOption}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Option
                  </Button>
                </div>
                {mcqOptions.map((option, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Checkbox
                      checked={option.is_correct}
                      onCheckedChange={(checked) => updateMCQOption(index, 'is_correct', checked)}
                    />
                    <span className="font-medium w-6">{option.label}</span>
                    <Input
                      value={option.text}
                      onChange={(e) => updateMCQOption(index, 'text', e.target.value)}
                      placeholder={`Option ${option.label}`}
                      className="flex-1"
                    />
                    {mcqOptions.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMCQOption(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : questionForm.question_type === 'true_false' ? (
              <div className="space-y-2">
                <Label>Correct Answer *</Label>
                <Select
                  value={questionForm.correct_answer}
                  onValueChange={(value) => setQuestionForm({ ...questionForm, correct_answer: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select correct answer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">True</SelectItem>
                    <SelectItem value="false">False</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Model Answer / Expected Answer *</Label>
                <Textarea
                  value={questionForm.correct_answer}
                  onChange={(e) => setQuestionForm({ ...questionForm, correct_answer: e.target.value })}
                  placeholder="Enter the expected answer or marking points..."
                  rows={3}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Explanation (shown after answering)</Label>
              <Textarea
                value={questionForm.explanation}
                onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                placeholder="Explain the answer..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Examiner Comment / Marking Guidance</Label>
              <Textarea
                value={questionForm.examiner_comment}
                onChange={(e) => setQuestionForm({ ...questionForm, examiner_comment: e.target.value })}
                placeholder="Tips for marking or common mistakes..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQuestionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveQuestion} disabled={saving || !questionForm.stem_markdown}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Question'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={isBulkImportOpen} onOpenChange={setIsBulkImportOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Import Questions</DialogTitle>
            <DialogDescription>
              Import multiple questions for <strong>{selectedTopic?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Supported types: short_answer, multiple_choice, true_false, numeric, essay
              </p>
              <Button variant="outline" size="sm" onClick={downloadQuestionsTemplate}>
                <Download className="h-4 w-4 mr-1" />
                Download Template
              </Button>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium text-sm mb-2">JSON Format Example:</h4>
              <pre className="text-xs bg-background p-3 rounded overflow-x-auto">
{`[
  {
    "question": "What is the pH of a neutral solution?",
    "type": "short_answer",
    "difficulty": "easy",
    "marks": 2,
    "model_answer": "7",
    "explanation": "A neutral solution has equal H+ and OH- ions",
    "examiner_comment": "Award 1 mark for correct answer"
  },
  {
    "question": "Is water a good conductor of electricity?",
    "type": "true_false",
    "difficulty": "medium",
    "marks": 1,
    "model_answer": "false",
    "explanation": "Pure water is a poor conductor",
    "examiner_comment": "Award 1 mark for 'false'"
  }
]`}
              </pre>
            </div>
            <div className="space-y-2">
              <Label>Paste JSON Array</Label>
              <Textarea
                value={bulkQuestions}
                onChange={(e) => setBulkQuestions(e.target.value)}
                placeholder="Paste your JSON array of questions here..."
                rows={10}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsBulkImportOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkImport} disabled={saving || !bulkQuestions.trim()}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Questions
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
