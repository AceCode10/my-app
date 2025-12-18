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
import {
  Plus,
  ArrowLeft,
  Edit,
  Trash2,
  Save,
  X,
  GripVertical,
  Upload,
  Download,
  FileText,
  CheckCircle,
  Loader2,
  Image as ImageIcon
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
import { useToast } from '@/hooks/use-toast';
import { useRouter, useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { PaperQuestion, MCQOption, PaperQuestionType, PastPaper } from '@/types/paper-practice';

const QUESTION_TYPES: { value: PaperQuestionType; label: string }[] = [
  { value: 'mcq', label: 'Multiple Choice' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'structured', label: 'Structured Question' },
  { value: 'essay', label: 'Essay/Extended Response' },
  { value: 'calculation', label: 'Calculation' },
  { value: 'true_false', label: 'True/False' },
];

const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'];

export default function PaperQuestionsPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const paperId = params.id as string;

  const [paper, setPaper] = useState<PastPaper | null>(null);
  const [questions, setQuestions] = useState<PaperQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialog states
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<PaperQuestion | null>(null);

  // Question form
  const [questionForm, setQuestionForm] = useState({
    question_number: 1,
    section_name: '',
    part_label: '',
    question_text: '',
    question_type: 'short_answer' as PaperQuestionType,
    marks: 2,
    correct_answer: '',
    mark_scheme: '',
    examiner_tips: '',
    difficulty: 'medium',
    image_url: '',
    topic_tags: [] as string[]
  });

  // MCQ options
  const [mcqOptions, setMcqOptions] = useState<MCQOption[]>([
    { label: 'A', text: '', is_correct: false },
    { label: 'B', text: '', is_correct: false },
    { label: 'C', text: '', is_correct: false },
    { label: 'D', text: '', is_correct: false }
  ]);

  // Bulk import
  const [bulkQuestions, setBulkQuestions] = useState('');

  useEffect(() => {
    fetchPaper();
    fetchQuestions();
  }, [paperId]);

  async function fetchPaper() {
    try {
      const { data, error } = await supabase
        .from('past_papers')
        .select('*, subjects(id, name, slug)')
        .eq('id', paperId)
        .single();

      if (error) throw error;
      setPaper(data as any);
    } catch (error: any) {
      console.error('Error fetching paper:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load paper details'
      });
    }
  }

  async function fetchQuestions() {
    try {
      const { data, error } = await supabase
        .from('paper_questions')
        .select('*')
        .eq('paper_id', paperId)
        .order('question_number', { ascending: true });

      if (error) throw error;
      setQuestions((data || []) as PaperQuestion[]);
    } catch (error: any) {
      console.error('Error fetching questions:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load questions'
      });
    } finally {
      setLoading(false);
    }
  }

  function resetQuestionForm() {
    const nextQuestionNumber = questions.length > 0 
      ? Math.max(...questions.map(q => q.question_number)) + 1 
      : 1;
    
    setQuestionForm({
      question_number: nextQuestionNumber,
      section_name: '',
      part_label: '',
      question_text: '',
      question_type: 'short_answer',
      marks: 2,
      correct_answer: '',
      mark_scheme: '',
      examiner_tips: '',
      difficulty: 'medium',
      image_url: '',
      topic_tags: []
    });
    setMcqOptions([
      { label: 'A', text: '', is_correct: false },
      { label: 'B', text: '', is_correct: false },
      { label: 'C', text: '', is_correct: false },
      { label: 'D', text: '', is_correct: false }
    ]);
  }

  function openNewQuestion() {
    setEditingQuestion(null);
    resetQuestionForm();
    setIsQuestionDialogOpen(true);
  }

  function openEditQuestion(question: PaperQuestion) {
    setEditingQuestion(question);
    setQuestionForm({
      question_number: question.question_number,
      section_name: question.section_name || '',
      part_label: question.part_label || '',
      question_text: question.question_text || '',
      question_type: question.question_type,
      marks: question.marks,
      correct_answer: question.correct_answer || '',
      mark_scheme: question.mark_scheme || '',
      examiner_tips: question.examiner_tips || '',
      difficulty: question.difficulty || 'medium',
      image_url: question.image_url || '',
      topic_tags: question.topic_tags || []
    });
    
    if (question.question_type === 'mcq' && question.options) {
      setMcqOptions(question.options);
    } else {
      setMcqOptions([
        { label: 'A', text: '', is_correct: false },
        { label: 'B', text: '', is_correct: false },
        { label: 'C', text: '', is_correct: false },
        { label: 'D', text: '', is_correct: false }
      ]);
    }
    
    setIsQuestionDialogOpen(true);
  }

  async function handleSaveQuestion() {
    if (!questionForm.question_text.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Question text is required'
      });
      return;
    }

    setSaving(true);

    try {
      let options = null;
      let correctAnswer = questionForm.correct_answer;

      if (questionForm.question_type === 'mcq') {
        options = mcqOptions;
        const correctOption = mcqOptions.find(opt => opt.is_correct);
        correctAnswer = correctOption?.label || '';
      }

      const questionData = {
        paper_id: paperId,
        question_number: questionForm.question_number,
        section_name: questionForm.section_name || null,
        part_label: questionForm.part_label || null,
        question_text: questionForm.question_text,
        question_type: questionForm.question_type,
        marks: questionForm.marks,
        correct_answer: correctAnswer || null,
        mark_scheme: questionForm.mark_scheme || null,
        examiner_tips: questionForm.examiner_tips || null,
        options: options,
        difficulty: questionForm.difficulty || 'medium',
        image_url: questionForm.image_url || null
      };

      if (editingQuestion) {
        const { error } = await supabase
          .from('paper_questions')
          .update(questionData)
          .eq('id', editingQuestion.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Question updated successfully' });
      } else {
        const { error } = await supabase
          .from('paper_questions')
          .insert(questionData);

        if (error) throw error;
        toast({ title: 'Success', description: 'Question added successfully' });
      }

      setIsQuestionDialogOpen(false);
      setEditingQuestion(null);
      resetQuestionForm();
      fetchQuestions();
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

  async function handleDeleteQuestion(question: PaperQuestion) {
    if (!confirm(`Delete Question ${question.question_number}${question.part_label ? question.part_label : ''}?`)) return;

    try {
      const { error } = await supabase
        .from('paper_questions')
        .delete()
        .eq('id', question.id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Question deleted successfully' });
      fetchQuestions();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete question'
      });
    }
  }

  async function handleBulkImport() {
    if (!bulkQuestions.trim()) return;
    setSaving(true);

    try {
      console.log('Step 1: Starting import...');
      
      let questionsToImport;
      try {
        questionsToImport = JSON.parse(bulkQuestions);
        console.log('Step 2: JSON parsed successfully, count:', questionsToImport?.length);
      } catch (parseError: any) {
        console.error('JSON parse error:', parseError);
        throw new Error('Invalid JSON format. Please check your input.');
      }
      
      if (!Array.isArray(questionsToImport)) {
        throw new Error('Input must be a JSON array of questions');
      }

      if (questionsToImport.length === 0) {
        throw new Error('No questions found in the input');
      }

      console.log('Step 3: Validation passed');

      const startingNumber = questions.length > 0 
        ? Math.max(...questions.map(q => q.question_number)) + 1 
        : 1;

      console.log('Step 4: Starting number:', startingNumber);

      // Validate and transform questions - make all optional fields truly optional
      let questionsData: any[] = [];
      questionsData = questionsToImport.map((q: any, index: number) => {
        // Get question text from various possible field names
        const questionText = q.question_text || q.question || q.stem || q.text || '';
        
        if (!questionText.trim()) {
          throw new Error(`Question ${index + 1} has no question text`);
        }

        // Determine question type - map common aliases to valid types
        let questionType = q.question_type || q.type || 'short_answer';
        // Map common aliases to valid database types
        const typeAliases: Record<string, string> = {
          'multiple_choice': 'mcq',
          'multiplechoice': 'mcq',
          'multiple-choice': 'mcq',
          'mc': 'mcq',
          'numeric': 'short_answer',
          'number': 'short_answer',
          'text': 'short_answer',
          'long_answer': 'essay',
          'extended': 'essay',
          'extended_response': 'essay',
          'free_response': 'essay',
          'calc': 'calculation',
          'math': 'calculation',
          'tf': 'true_false',
          'truefalse': 'true_false',
          'true-false': 'true_false',
          'struct': 'structured',
        };
        // Normalize to lowercase and check aliases
        const normalizedType = questionType.toLowerCase().trim();
        if (typeAliases[normalizedType]) {
          questionType = typeAliases[normalizedType];
        } else {
          // Check if it's already a valid type
          const validTypes = ['mcq', 'short_answer', 'essay', 'calculation', 'true_false', 'structured'];
          if (!validTypes.includes(normalizedType)) {
            questionType = 'short_answer'; // Default fallback
          } else {
            questionType = normalizedType;
          }
        }

        // Handle marks - ensure it's a valid number
        let marks = parseInt(q.marks) || 1;
        if (marks < 1) marks = 1;

        // Handle difficulty - ensure it's valid or default to null
        let difficulty = q.difficulty || null;
        if (difficulty && !['easy', 'medium', 'hard'].includes(difficulty)) {
          difficulty = null;
        }

        // Handle options for MCQ - ensure proper format
        let options = null;
        if (questionType === 'mcq' && q.options && Array.isArray(q.options)) {
          options = q.options.map((opt: any, optIdx: number) => ({
            label: opt.label || String.fromCharCode(65 + optIdx),
            text: opt.text || opt.option || '',
            is_correct: Boolean(opt.is_correct || opt.correct || false)
          }));
        }

        // Handle topic_tags - ensure it's an array or null
        let topicTags = null;
        if (q.topic_tags && Array.isArray(q.topic_tags)) {
          topicTags = q.topic_tags;
        } else if (q.topics && Array.isArray(q.topics)) {
          topicTags = q.topics;
        }

        return {
          paper_id: paperId,
          question_number: parseInt(q.question_number) || startingNumber + index,
          section_name: q.section_name || q.section || null,
          part_label: q.part_label || q.part || null,
          question_text: questionText,
          question_type: questionType,
          marks: marks,
          correct_answer: q.correct_answer || q.answer || q.model_answer || null,
          mark_scheme: q.mark_scheme || q.marking_scheme || null,
          examiner_tips: q.examiner_tips || q.examiner_comment || null,
          options: options,
          difficulty: difficulty,
          image_url: q.image_url || null
        };
      });

      console.log('Importing', questionsData.length, 'questions to paper_questions table');

      // Bulk insert into paper_questions table
      const { data: bulkData, error: bulkError } = await supabase
        .from('paper_questions')
        .insert(questionsData)
        .select();

      if (!bulkError) {
        toast({ 
          title: 'Import Complete', 
          description: `Successfully imported ${questionsData.length} questions` 
        });
        setIsBulkImportOpen(false);
        setBulkQuestions('');
        fetchQuestions();
        return;
      }

      // If bulk insert failed, try one-by-one
      console.log('Bulk insert failed:', bulkError.message);
      
      let successCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < questionsData.length; i++) {
        const question = questionsData[i];
        const { error } = await supabase.from('paper_questions').insert(question);
        if (error) {
          errors.push(`Q${question.question_number}: ${error.message}`);
        } else {
          successCount++;
        }
      }

      if (successCount > 0) {
        toast({ 
          title: 'Import Partially Complete', 
          description: `Imported ${successCount} of ${questionsData.length} questions. ${errors.length} failed.` 
        });
        setIsBulkImportOpen(false);
        setBulkQuestions('');
        fetchQuestions();
      } else {
        // All failed
        throw new Error(`All imports failed. First error: ${errors[0] || bulkError.message}`);
      }

      if (errors.length > 0) {
        console.error('Import errors:', errors);
      }
    } catch (error: any) {
      console.error('Error importing questions - full error:', error);
      console.error('Error type:', typeof error);
      console.error('Error keys:', error ? Object.keys(error) : 'null');
      
      // Provide more detailed error message
      let errorMessage = 'Failed to import questions.';
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.code) {
        errorMessage = `Database error: ${error.code}`;
      } else if (error?.details) {
        errorMessage = error.details;
      } else if (error?.hint) {
        errorMessage = error.hint;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && Object.keys(error).length > 0) {
        errorMessage = JSON.stringify(error);
      }
      
      // Check if table doesn't exist
      if (errorMessage.includes('does not exist') || errorMessage.includes('42P01')) {
        errorMessage = 'The paper_questions table does not exist. Please run the migration first.';
      }
      
      toast({
        variant: 'destructive',
        title: 'Import Error',
        description: errorMessage
      });
    } finally {
      setSaving(false);
    }
  }

  function downloadTemplate() {
    const template = [
      {
        "_comment": "MINIMAL EXAMPLE - only question_text is required, all other fields are optional",
        "question_number": 1,
        "question_text": "What is the chemical formula for water?",
        "marks": 1,
        "correct_answer": "H2O"
      },
      {
        "_comment": "MCQ EXAMPLE - include 'options' array for multiple choice",
        "question_number": 2,
        "question_text": "Which of the following is a noble gas?",
        "question_type": "mcq",
        "marks": 1,
        "correct_answer": "B",
        "options": [
          { "label": "A", "text": "Oxygen", "is_correct": false },
          { "label": "B", "text": "Argon", "is_correct": true },
          { "label": "C", "text": "Nitrogen", "is_correct": false },
          { "label": "D", "text": "Carbon", "is_correct": false }
        ]
      },
      {
        "_comment": "FULL EXAMPLE - all optional fields shown",
        "question_number": 3,
        "section_name": "Section B",
        "part_label": "a",
        "question_text": "Describe the process of photosynthesis.",
        "question_type": "structured",
        "marks": 4,
        "correct_answer": "Model answer here...",
        "mark_scheme": "1 mark: Plants absorb light energy\n1 mark: CO2 + H2O → glucose + O2",
        "examiner_tips": "Common mistakes to avoid...",
        "difficulty": "medium",
        "topic_tags": ["biology", "photosynthesis"],
        "image_url": "https://example.com/diagram.png"
      }
    ];
    
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'paper-questions-template.json';
    a.click();
    URL.revokeObjectURL(url);
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

  // Calculate total marks
  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/admin/papers/${paperId}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Paper
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Paper Questions</h1>
          <p className="text-muted-foreground mt-1">
            {paper?.title || 'Loading...'}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline">{questions.length} Questions</Badge>
            <Badge variant="secondary">{totalMarks} / {paper?.total_marks || '?'} Marks</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsBulkImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Bulk Import
          </Button>
          <Button onClick={openNewQuestion}>
            <Plus className="mr-2 h-4 w-4" />
            Add Question
          </Button>
        </div>
      </div>

      {/* Questions List */}
      <Card>
        <CardContent className="pt-6">
          {questions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No questions yet</h3>
              <p className="text-muted-foreground mb-4">
                Add questions to this paper for students to practice
              </p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => setIsBulkImportOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Bulk Import
                </Button>
                <Button onClick={openNewQuestion}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Question
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Q#</TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead className="w-24">Type</TableHead>
                    <TableHead className="w-20">Marks</TableHead>
                    <TableHead className="w-24">Difficulty</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.map((question) => (
                    <TableRow key={question.id}>
                      <TableCell className="font-medium">
                        {question.question_number}
                        {question.part_label && <span className="text-muted-foreground">{question.part_label}</span>}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-md">
                          <p className="line-clamp-2 text-sm">
                            {question.question_text}
                          </p>
                          {question.section_name && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              {question.section_name}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {QUESTION_TYPES.find(t => t.value === question.question_type)?.label || question.question_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{question.marks}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={cn(
                            'text-xs',
                            question.difficulty === 'easy' && 'border-green-500 text-green-600',
                            question.difficulty === 'medium' && 'border-yellow-500 text-yellow-600',
                            question.difficulty === 'hard' && 'border-red-500 text-red-600'
                          )}
                        >
                          {question.difficulty || 'medium'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditQuestion(question)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteQuestion(question)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Question Dialog */}
      <Dialog open={isQuestionDialogOpen} onOpenChange={setIsQuestionDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? 'Edit Question' : 'Add Question'}
            </DialogTitle>
            <DialogDescription>
              {editingQuestion 
                ? 'Update the question details below' 
                : 'Fill in the question details to add it to this paper'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Question Number & Section */}
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Question #</Label>
                <Input
                  type="number"
                  min="1"
                  value={questionForm.question_number}
                  onChange={(e) => setQuestionForm({ ...questionForm, question_number: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Part Label</Label>
                <Input
                  placeholder="e.g., a, b, i, ii"
                  value={questionForm.part_label}
                  onChange={(e) => setQuestionForm({ ...questionForm, part_label: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Section</Label>
                <Input
                  placeholder="e.g., Section A"
                  value={questionForm.section_name}
                  onChange={(e) => setQuestionForm({ ...questionForm, section_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Marks</Label>
                <Input
                  type="number"
                  min="1"
                  value={questionForm.marks}
                  onChange={(e) => setQuestionForm({ ...questionForm, marks: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            {/* Question Type & Difficulty */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select
                  value={questionForm.question_type}
                  onValueChange={(value) => setQuestionForm({ ...questionForm, question_type: value as PaperQuestionType })}
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
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Question Text */}
            <div className="space-y-2">
              <Label>Question Text *</Label>
              <Textarea
                placeholder="Enter the question text (supports markdown)"
                value={questionForm.question_text}
                onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                rows={4}
              />
            </div>

            {/* MCQ Options */}
            {questionForm.question_type === 'mcq' && (
              <div className="space-y-3">
                <Label>Answer Options</Label>
                {mcqOptions.map((option, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Checkbox
                      checked={option.is_correct}
                      onCheckedChange={(checked) => updateMCQOption(index, 'is_correct', checked)}
                    />
                    <span className="font-medium w-6">{option.label}.</span>
                    <Input
                      placeholder={`Option ${option.label}`}
                      value={option.text}
                      onChange={(e) => updateMCQOption(index, 'text', e.target.value)}
                      className="flex-1"
                    />
                    {mcqOptions.length > 2 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMCQOption(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {mcqOptions.length < 6 && (
                  <Button variant="outline" size="sm" onClick={addMCQOption}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Option
                  </Button>
                )}
              </div>
            )}

            {/* Correct Answer (for non-MCQ) */}
            {questionForm.question_type !== 'mcq' && (
              <div className="space-y-2">
                <Label>Correct Answer / Model Answer</Label>
                <Textarea
                  placeholder="Enter the correct or model answer"
                  value={questionForm.correct_answer}
                  onChange={(e) => setQuestionForm({ ...questionForm, correct_answer: e.target.value })}
                  rows={3}
                />
              </div>
            )}

            {/* Mark Scheme */}
            <div className="space-y-2">
              <Label>Mark Scheme</Label>
              <Textarea
                placeholder="Enter the marking criteria"
                value={questionForm.mark_scheme}
                onChange={(e) => setQuestionForm({ ...questionForm, mark_scheme: e.target.value })}
                rows={3}
              />
            </div>

            {/* Examiner Tips */}
            <div className="space-y-2">
              <Label>Examiner Tips</Label>
              <Textarea
                placeholder="Tips for students or common mistakes to avoid"
                value={questionForm.examiner_tips}
                onChange={(e) => setQuestionForm({ ...questionForm, examiner_tips: e.target.value })}
                rows={2}
              />
            </div>

            {/* Image URL */}
            <div className="space-y-2">
              <Label>Image URL (optional)</Label>
              <Input
                placeholder="https://..."
                value={questionForm.image_url}
                onChange={(e) => setQuestionForm({ ...questionForm, image_url: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQuestionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveQuestion} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingQuestion ? 'Update Question' : 'Add Question'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={isBulkImportOpen} onOpenChange={setIsBulkImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Import Questions</DialogTitle>
            <DialogDescription>
              Paste a JSON array of questions to import them all at once
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                <p><strong>Required:</strong> question_text</p>
                <p><strong>Optional:</strong> question_number, marks, question_type, correct_answer, mark_scheme, section_name, part_label, options (for MCQ), difficulty, topic_tags</p>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Download Template
              </Button>
            </div>
            <Textarea
              placeholder={`[
  {
    "question_number": 1,
    "question_text": "Your question here...",
    "marks": 2,
    "correct_answer": "The answer"
  }
]`}
              value={bulkQuestions}
              onChange={(e) => setBulkQuestions(e.target.value)}
              rows={12}
              className="font-mono text-sm"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkImportOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkImport} disabled={saving || !bulkQuestions.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import Questions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
