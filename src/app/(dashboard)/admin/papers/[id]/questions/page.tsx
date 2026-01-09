'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { convertPdfToImages, extractTextFromPdf } from '@/lib/pdf-to-images-client';

/**
 * Calculate display order from part label for consistent sorting
 */
function calculateDisplayOrder(partLabel: string): number {
  if (!partLabel) return 0;
  
  const parts = partLabel.toLowerCase().replace(/[()]/g, ' ').trim().split(/\s+/);
  let order = 0;
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    let value = 0;
    
    // Convert letter to number: a=1, b=2, etc.
    if (/^[a-z]$/.test(part)) {
      value = part.charCodeAt(0) - 96;
    }
    // Convert roman numerals
    else if (/^i+v?$/.test(part)) {
      const romanMap: Record<string, number> = {
        'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5,
        'vi': 6, 'vii': 7, 'viii': 8, 'ix': 9, 'x': 10
      };
      value = romanMap[part] || 0;
    }
    // Already a number
    else if (!isNaN(parseInt(part))) {
      value = parseInt(part);
    }
    
    // Build hierarchical order
    if (i === 0) {
      order = value * 100;
    } else if (i === 1) {
      order += value * 10;
    } else {
      order += value;
    }
  }
  
  return order;
}
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
  Image as ImageIcon,
  Sparkles,
  FileUp,
  AlertCircle
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
  const [isPdfUploadOpen, setIsPdfUploadOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<PaperQuestion | null>(null);

  // PDF upload states
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfText, setPdfText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractionStatus, setExtractionStatus] = useState<'idle' | 'reading' | 'extracting' | 'done' | 'error'>('idle');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [useVisionExtraction, setUseVisionExtraction] = useState(false);

  // Selection states for "Add to Topic" feature
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [isAddToTopicDialogOpen, setIsAddToTopicDialogOpen] = useState(false);
  const [topics, setTopics] = useState<any[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [addingToTopic, setAddingToTopic] = useState(false);

  // Mark scheme extraction states
  const [isMarkSchemeDialogOpen, setIsMarkSchemeDialogOpen] = useState(false);
  const [markSchemePdfFile, setMarkSchemePdfFile] = useState<File | null>(null);
  const [markSchemeText, setMarkSchemeText] = useState('');
  const [extractingMarkScheme, setExtractingMarkScheme] = useState(false);
  const [markSchemeStatus, setMarkSchemeStatus] = useState<'idle' | 'reading' | 'extracting' | 'done' | 'error'>('idle');
  const [markSchemeResults, setMarkSchemeResults] = useState<{
    matched: any[];
    unmatched: any[];
    total_extracted: number;
  } | null>(null);
  const [autoApplyMarkScheme, setAutoApplyMarkScheme] = useState(true);

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
    image_position: 'after_text' as 'before_text' | 'after_text' | 'inline',
    topic_tags: [] as string[],
    // Full question image mode (like SaveMyExams)
    use_image_question: false,
    question_image_url: ''
  });

  // Image upload states
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Full question image upload states
  const [questionImageFile, setQuestionImageFile] = useState<File | null>(null);
  const [questionImagePreview, setQuestionImagePreview] = useState<string | null>(null);

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
        .order('display_order', { ascending: true });

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
      image_position: 'after_text',
      topic_tags: [],
      use_image_question: false,
      question_image_url: ''
    });
    setMcqOptions([
      { label: 'A', text: '', is_correct: false },
      { label: 'B', text: '', is_correct: false },
      { label: 'C', text: '', is_correct: false },
      { label: 'D', text: '', is_correct: false }
    ]);
    // Clear image upload states
    setImageFile(null);
    setImagePreview(null);
    setQuestionImageFile(null);
    setQuestionImagePreview(null);
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
      image_position: (question as any).image_position || 'after_text',
      topic_tags: question.topic_tags || [],
      use_image_question: question.use_image_question || false,
      question_image_url: question.question_image_url || ''
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
    
    // Set image preview if question has an image
    setImageFile(null);
    setImagePreview(question.image_url || null);
    
    // Set question image preview if using image question mode
    setQuestionImageFile(null);
    setQuestionImagePreview(question.question_image_url || null);
    
    setIsQuestionDialogOpen(true);
  }

  // Handle image file selection
  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file);
  }

  // Process image file (shared by file select and paste)
  function processImageFile(file: File) {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Invalid file type',
        description: 'Please select an image file (PNG, JPG, GIF, WebP)'
      });
      return;
    }
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Image must be less than 5MB'
      });
      return;
    }
    
    setImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  // Handle paste for diagram/illustration image
  function handleImagePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          processImageFile(file);
          toast({
            title: 'Image pasted',
            description: 'Screenshot added successfully'
          });
        }
        break;
      }
    }
  }

  // Upload image to Supabase Storage
  async function uploadQuestionImage(file: File): Promise<string | null> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${paperId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('question-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) throw error;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('question-images')
        .getPublicUrl(data.path);
      
      return urlData.publicUrl;
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error.message || 'Failed to upload image'
      });
      return null;
    }
  }

  // Remove image
  function handleRemoveImage() {
    setImageFile(null);
    setImagePreview(null);
    setQuestionForm({ ...questionForm, image_url: '' });
  }

  // Process full question image file (shared by file select and paste)
  function processQuestionImageFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Invalid file type',
        description: 'Please select an image file (PNG, JPG, GIF, WebP)'
      });
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB for full question images
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Image must be less than 10MB'
      });
      return;
    }
    
    setQuestionImageFile(file);
    setQuestionForm({ ...questionForm, use_image_question: true });
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setQuestionImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  // Handle full question image file selection
  function handleQuestionImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    processQuestionImageFile(file);
  }

  // Handle paste for question image
  function handleQuestionImagePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          processQuestionImageFile(file);
          toast({
            title: 'Image pasted',
            description: 'Question screenshot added successfully'
          });
        }
        break;
      }
    }
  }

  // Remove question image
  function handleRemoveQuestionImage() {
    setQuestionImageFile(null);
    setQuestionImagePreview(null);
    setQuestionForm({ ...questionForm, use_image_question: false, question_image_url: '' });
  }

  async function handleSaveQuestion() {
    // Validate: need either question text OR question image
    if (!questionForm.use_image_question && !questionForm.question_text.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Question text is required (or upload a question image)'
      });
      return;
    }
    
    if (questionForm.use_image_question && !questionImagePreview && !questionForm.question_image_url) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please upload a question image'
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

      // Upload diagram/illustration image if a new file was selected
      let imageUrl = questionForm.image_url;
      if (imageFile) {
        setUploadingImage(true);
        const uploadedUrl = await uploadQuestionImage(imageFile);
        setUploadingImage(false);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }
      
      // Upload full question image if using image question mode
      let questionImageUrl = questionForm.question_image_url;
      if (questionImageFile) {
        setUploadingImage(true);
        const uploadedUrl = await uploadQuestionImage(questionImageFile);
        setUploadingImage(false);
        if (uploadedUrl) {
          questionImageUrl = uploadedUrl;
        }
      }

      // Calculate display_order for proper sorting
      const displayOrder = questionForm.question_number * 10000 + 
        (questionForm.part_label ? calculateDisplayOrder(questionForm.part_label) : 0);

      const questionData = {
        paper_id: paperId,
        question_number: questionForm.question_number,
        section_name: questionForm.section_name || null,
        part_label: questionForm.part_label || null,
        question_text: questionForm.use_image_question ? '' : questionForm.question_text,
        question_type: questionForm.question_type,
        marks: questionForm.marks,
        correct_answer: correctAnswer || null,
        mark_scheme: questionForm.mark_scheme || null,
        examiner_tips: questionForm.examiner_tips || null,
        options: options,
        difficulty: questionForm.difficulty || 'medium',
        image_url: imageUrl || null,
        image_position: questionForm.image_position || 'after_text',
        use_image_question: questionForm.use_image_question,
        question_image_url: questionImageUrl || null,
        display_order: displayOrder
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

  // PDF Upload and AI Extraction
  async function handlePdfUpload(file: File) {
    setPdfFile(file);
    setExtractionStatus('reading');
    setPdfText(''); // Clear any existing text
    
    toast({
      title: 'PDF Uploaded',
      description: `${file.name} ready for extraction. Click "Extract Questions" to process.`
    });
    
    setExtractionStatus('idle');
  }

  async function handleAiExtraction() {
    // Check if we have either a PDF file or pasted text
    if (!pdfFile && !pdfText.trim()) {
      toast({
        variant: 'destructive',
        title: 'No Content',
        description: 'Please upload a PDF file or paste text content.'
      });
      return;
    }

    setExtracting(true);
    setExtractionStatus('extracting');

    try {
      const formData = new FormData();
      
      // If PDF file is provided, extract text client-side first
      if (pdfFile) {
        // If vision extraction is enabled, convert PDF to images client-side
        if (useVisionExtraction) {
          console.log('Converting PDF to images for vision extraction...');
          const conversionResult = await convertPdfToImages(pdfFile, {
            scale: 2, // 2x scale for good quality
            format: 'png'
          });
          
          if (conversionResult.success && conversionResult.images.length > 0) {
            console.log(`Converted ${conversionResult.images.length} pages to images`);
            // Send images as JSON string
            formData.append('pageImages', JSON.stringify(conversionResult.images));
          } else {
            console.warn('Client-side PDF conversion failed, will try server-side');
          }
          formData.append('useVision', 'true');
        } else {
          // Use Python parser for enhanced extraction quality
          console.log('Sending PDF to Python parser for enhanced extraction...');
          formData.append('pdf', pdfFile);
          formData.append('usePython', 'true');
          formData.append('useVision', 'false');
        }
      } else {
        // Otherwise send pasted text
        formData.append('text', pdfText);
        formData.append('useVision', 'false');
      }
      
      formData.append('replace', replaceExisting.toString());

      const response = await fetch(`/api/papers/${paperId}/extract-questions`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to extract questions');
      }

      setExtractionStatus('done');
      
      // Build detailed success message
      let description = `Extracted and imported ${result.count} questions`;
      if (result.totalMarks) {
        description += ` (${result.totalMarks} total marks)`;
      }
      if (result.extractionMethod) {
        description += `. Method: ${result.extractionMethod}`;
      }
      if (result.hasImages && result.imageCount > 0) {
        description += `. ${result.imageCount} questions with images/diagrams`;
      }
      if (result.questionTypes) {
        const types = Object.entries(result.questionTypes)
          .map(([type, count]) => `${count} ${type}`)
          .join(', ');
        description += `. Types: ${types}`;
      }
      
      toast({
        title: 'Success!',
        description
      });
      
      // Show warnings if any
      if (result.warnings && result.warnings.length > 0) {
        setTimeout(() => {
          toast({
            title: 'Extraction Warnings',
            description: `${result.warnings.length} minor issues were handled automatically.`,
            variant: 'default'
          });
        }, 1000);
      }

      // Close dialog and refresh
      setIsPdfUploadOpen(false);
      setPdfText('');
      setPdfFile(null);
      setExtractionStatus('idle');
      fetchQuestions();

    } catch (error: any) {
      console.error('AI extraction error:', error);
      setExtractionStatus('error');
      
      // Check if this is an image-based PDF error and auto-enable Vision
      if (error.message && error.message.includes('No text could be extracted from this PDF') && 
          error.message.includes('image-based or scanned PDF') && !useVisionExtraction) {
        // Auto-enable Vision extraction
        setUseVisionExtraction(true);
        toast({
          variant: 'default',
          title: 'Vision Extraction Enabled',
          description: 'This PDF appears to be image-based. GPT-4 Vision has been automatically enabled. Click "Extract Questions" again to process with Vision.',
          duration: 6000
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Extraction Failed',
          description: error.message || 'Failed to extract questions with AI.'
        });
      }
    } finally {
      setExtracting(false);
    }
  }

  // Handle mark scheme PDF upload
  async function handleMarkSchemePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      toast({
        variant: 'destructive',
        title: 'Invalid File',
        description: 'Please upload a PDF file.'
      });
      return;
    }
    
    setMarkSchemePdfFile(file);
    setMarkSchemeStatus('reading');
    setMarkSchemeText('');
    setMarkSchemeResults(null);
    
    toast({
      title: 'Mark Scheme Uploaded',
      description: `${file.name} ready for extraction. Click "Extract Answers" to process.`
    });
    
    setMarkSchemeStatus('idle');
  }

  // Extract answers from mark scheme
  async function handleMarkSchemeExtraction() {
    if (!markSchemePdfFile && !markSchemeText.trim()) {
      toast({
        variant: 'destructive',
        title: 'No Content',
        description: 'Please upload a mark scheme PDF or paste text content.'
      });
      return;
    }

    if (questions.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Questions',
        description: 'Please extract questions first before extracting mark scheme answers.'
      });
      return;
    }

    setExtractingMarkScheme(true);
    setMarkSchemeStatus('extracting');
    setMarkSchemeResults(null);

    try {
      const formData = new FormData();
      
      if (markSchemePdfFile) {
        // Use Python parser for mark scheme extraction
        console.log('Sending mark scheme PDF to Python parser...');
        formData.append('pdf', markSchemePdfFile);
        formData.append('usePython', 'true');
      } else {
        formData.append('text', markSchemeText);
      }
      
      formData.append('autoApply', autoApplyMarkScheme.toString());

      const response = await fetch(`/api/papers/${paperId}/extract-answers`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to extract mark scheme');
      }

      setMarkSchemeStatus('done');
      setMarkSchemeResults(result.data);
      
      const { matched_count, unmatched_count, applied_count, total_extracted } = result.data;
      
      let description = `Extracted ${total_extracted} answers. `;
      if (autoApplyMarkScheme) {
        description += `Applied ${applied_count} to questions.`;
      } else {
        description += `Matched ${matched_count} questions.`;
      }
      if (unmatched_count > 0) {
        description += ` ${unmatched_count} could not be matched.`;
      }
      
      toast({
        title: 'Mark Scheme Extracted!',
        description
      });
      
      // Refresh questions to show updated mark schemes
      if (autoApplyMarkScheme && applied_count > 0) {
        fetchQuestions();
      }

    } catch (error: any) {
      console.error('Mark scheme extraction error:', error);
      setMarkSchemeStatus('error');
      toast({
        variant: 'destructive',
        title: 'Extraction Failed',
        description: error.message || 'Failed to extract mark scheme answers.'
      });
    } finally {
      setExtractingMarkScheme(false);
    }
  }

  // Apply a single matched answer to a question
  async function applyMarkSchemeToQuestion(questionId: string, markScheme: string) {
    try {
      const { error } = await supabase
        .from('paper_questions')
        .update({ mark_scheme: markScheme })
        .eq('id', questionId);

      if (error) throw error;

      toast({
        title: 'Applied',
        description: 'Mark scheme applied to question.'
      });

      fetchQuestions();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to apply mark scheme.'
      });
    }
  }

  // Fetch topics for the subject when opening Add to Topic dialog
  async function fetchTopicsForSubject() {
    if (!paper?.subject_id) return;
    
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('id, name, slug')
        .eq('subject_id', paper.subject_id)
        .order('name');
      
      if (error) throw error;
      setTopics(data || []);
    } catch (error: any) {
      console.error('Error fetching topics:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load topics for this subject'
      });
    }
  }

  // Toggle question selection
  function toggleQuestionSelection(questionId: string) {
    setSelectedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  }

  // Select/deselect all questions
  function toggleSelectAll() {
    if (selectedQuestions.size === questions.length) {
      setSelectedQuestions(new Set());
    } else {
      setSelectedQuestions(new Set(questions.map(q => q.id)));
    }
  }

  // Open Add to Topic dialog
  function openAddToTopicDialog() {
    fetchTopicsForSubject();
    setSelectedTopicId('');
    setIsAddToTopicDialogOpen(true);
  }

  // Add selected questions to topic (copy to questions bank)
  async function handleAddToTopic() {
    if (!selectedTopicId || selectedQuestions.size === 0) return;
    
    setAddingToTopic(true);
    
    try {
      const selectedQs = questions.filter(q => selectedQuestions.has(q.id));
      
      // Filter out questions without text (stem_markdown is NOT NULL)
      const validQuestions = selectedQs.filter(q => q.question_text && q.question_text.trim().length > 0);
      
      if (validQuestions.length === 0) {
        toast({
          variant: 'destructive',
          title: 'No Valid Questions',
          description: 'Selected questions have no text content to add.'
        });
        setAddingToTopic(false);
        return;
      }
      
      // Map paper questions to topical questions format
      // Note: questions table uses 'stem_markdown' instead of 'question_text'
      const topicalQuestions = validQuestions.map(q => {
        // Map question types to valid enum values
        let questionType = 'short_answer';
        if (q.question_type === 'mcq') questionType = 'mcq'; // Keep as mcq, not multiple_choice
        else if (q.question_type === 'true_false') questionType = 'true_false';
        else if (q.question_type === 'essay') questionType = 'essay'; // Keep as essay
        else if (q.question_type === 'calculation') questionType = 'short_answer'; // Map to short_answer
        else if (q.question_type === 'structured') questionType = 'short_answer';
        else if (q.question_type && ['mcq', 'multiple_choice', 'tf', 'true_false', 'numeric', 'short_answer', 'long_answer', 'fill_blank', 'essay'].includes(q.question_type)) {
          questionType = q.question_type; // Use original if valid
        }
        
        const questionText = q.question_text || q.stem_markdown || '';
        
        console.log('Mapping question:', {
          id: q.id,
          question_text: q.question_text,
          stem_markdown: q.stem_markdown,
          final_text: questionText,
          all_fields: Object.keys(q)
        });
        
        return {
          topic_id: selectedTopicId,
          subject_id: paper?.subject_id || null,
          exam_board_id: paper?.exam_board_id || null,
          stem_markdown: questionText.trim(), // NOT NULL - must have value
          stem_md: questionText.trim(), // Also populate stem_md for backward compatibility
          question_type: questionType,
          difficulty: q.difficulty || 'medium',
          marks: q.marks || 1,
          correct_answer: q.correct_answer || '', // Empty string instead of null for NOT NULL constraint
          explanation: q.mark_scheme || null,
          options: q.options || null,
          question_number: `${q.question_number}${q.part_label || ''}`,
          status: 'published'
        };
      });
      
      console.log('Inserting topical questions:', topicalQuestions);
      
      // Check required fields before insert
      const validTopicalQuestions = topicalQuestions.filter(q => {
        const hasRequiredFields = q.topic_id && 
          q.stem_markdown && 
          q.stem_md && 
          q.question_type && 
          q.status &&
          q.correct_answer !== null && // Ensure correct_answer is not null
          q.marks !== null; // Ensure marks is not null
          
        if (!hasRequiredFields) {
          console.error('Question missing required fields:', {
            topic_id: q.topic_id,
            stem_markdown: !!q.stem_markdown,
            stem_md: !!q.stem_md,
            question_type: q.question_type,
            status: q.status,
            correct_answer: q.correct_answer,
            marks: q.marks
          });
        }
        return hasRequiredFields;
      });
      
      if (validTopicalQuestions.length === 0) {
        throw new Error('No valid questions to insert - all missing required fields');
      }
      
      try {
        const { data, error, status, statusText } = await supabase
          .from('questions')
          .insert(validTopicalQuestions)
          .select();
        
        if (error) {
          console.error('Supabase insert error:', error);
          console.error('Full error response:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
            status: status,
            statusText: statusText
          });
          
          // Try to get more specific error info
          if (error.details) {
            console.error('Error details parsed:', JSON.parse(JSON.stringify(error.details)));
          }
          
          throw new Error(`Database error: ${error.message || 'Unknown error'}`);
        }
        
        console.log('Successfully inserted questions:', data);
        
      } catch (err: any) {
        console.error('Caught error in insert operation:', err);
        throw err;
      }
      
      toast({
        title: 'Success!',
        description: `Added ${selectedQs.length} question(s) to the topic. They are now available in the Questions Bank.`
      });
      
      setIsAddToTopicDialogOpen(false);
      setSelectedQuestions(new Set());
      
    } catch (error: any) {
      console.error('Error adding questions to topic:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to add questions to topic'
      });
    } finally {
      setAddingToTopic(false);
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
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setIsPdfUploadOpen(true)} className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30 hover:border-purple-500/50">
            <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
            AI Extract (PDF)
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setIsMarkSchemeDialogOpen(true)}
            disabled={questions.length === 0}
            className="bg-gradient-to-r from-green-500/10 to-teal-500/10 border-green-500/30 hover:border-green-500/50"
          >
            <FileText className="mr-2 h-4 w-4 text-green-500" />
            Extract Mark Scheme
          </Button>
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

      {/* Selection Actions Bar */}
      {selectedQuestions.size > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedQuestions.size} question{selectedQuestions.size > 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedQuestions(new Set())}
                >
                  Clear Selection
                </Button>
                <Button
                  size="sm"
                  onClick={openAddToTopicDialog}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add to Topic
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
              <div className="flex flex-col sm:flex-row justify-center gap-2">
                <Button onClick={() => setIsPdfUploadOpen(true)} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                  <Sparkles className="mr-2 h-4 w-4" />
                  AI Extract from PDF
                </Button>
                <Button variant="outline" onClick={() => setIsBulkImportOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Bulk Import JSON
                </Button>
                <Button variant="outline" onClick={openNewQuestion}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Manually
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedQuestions.size === questions.length && questions.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
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
                    <TableRow key={question.id} className={cn(selectedQuestions.has(question.id) && "bg-primary/5")}>
                      <TableCell>
                        <Checkbox
                          checked={selectedQuestions.has(question.id)}
                          onCheckedChange={() => toggleQuestionSelection(question.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {question.question_number}
                        {question.part_label && <span className="text-muted-foreground">{question.part_label}</span>}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-lg">
                          {/* Show cropped question image if available - this is the actual question from the PDF */}
                          {(question as any).question_image_data ? (
                            <div className="space-y-2">
                              <div className="relative group">
                                <img 
                                  src={`data:image/png;base64,${(question as any).question_image_data}`}
                                  alt={`Question ${question.question_number}${question.part_label || ''}`}
                                  className="max-w-full max-h-48 rounded-lg border-2 border-purple-200 shadow-sm cursor-pointer hover:border-purple-400 hover:shadow-md transition-all"
                                  onClick={() => {
                                    // Open full image in modal or new tab
                                    const imgSrc = `data:image/png;base64,${(question as any).question_image_data}`;
                                    const w = window.open('', '_blank');
                                    if (w) {
                                      w.document.write(`
                                        <html>
                                          <head>
                                            <title>Question ${question.question_number}${question.part_label ? ` (${question.part_label})` : ''}</title>
                                            <style>
                                              body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #1a1a2e; }
                                              img { max-width: 95%; max-height: 95vh; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
                                            </style>
                                          </head>
                                          <body>
                                            <img src="${imgSrc}" alt="Question ${question.question_number}" />
                                          </body>
                                        </html>
                                      `);
                                    }
                                  }}
                                />
                                <div className="absolute top-2 left-2 flex items-center gap-1">
                                  <Badge className="bg-purple-600 text-white text-xs">
                                    <ImageIcon className="h-3 w-3 mr-1" />
                                    Cropped from PDF
                                  </Badge>
                                </div>
                                <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                  Click to view full size
                                </span>
                              </div>
                              {/* Show extracted text below image */}
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {question.question_text}
                              </p>
                            </div>
                          ) : (
                            /* Text-only question display */
                            <div className="flex items-start gap-2">
                              {(question as any).has_image && (
                                <ImageIcon className="h-4 w-4 text-purple-500 flex-shrink-0 mt-0.5" title="Contains image/diagram" />
                              )}
                              <p className="line-clamp-3 text-sm">
                                {question.question_text}
                              </p>
                            </div>
                          )}
                          {question.section_name && (
                            <Badge variant="outline" className="mt-2 text-xs">
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

            {/* Question Content Mode Toggle */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Question Content</Label>
                <button
                  type="button"
                  onClick={() => setQuestionForm({ 
                    ...questionForm, 
                    use_image_question: !questionForm.use_image_question 
                  })}
                  className={cn(
                    "text-sm px-3 py-1.5 rounded-md border transition-colors",
                    questionForm.use_image_question 
                      ? "bg-primary text-primary-foreground border-primary" 
                      : "bg-muted hover:bg-muted/80 border-input"
                  )}
                >
                  {questionForm.use_image_question ? '📷 Image Mode' : '📝 Text Mode'}
                </button>
              </div>
              
              {/* Full Question Image Upload (SaveMyExams style) */}
              {questionForm.use_image_question ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Upload the full question as an image. Answer options will appear below.
                  </p>
                  
                  {questionImagePreview ? (
                    <div className="relative">
                      <img 
                        src={questionImagePreview} 
                        alt="Question" 
                        className="w-full max-h-96 object-contain rounded-lg border bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveQuestionImage}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div 
                      className="border-2 border-dashed border-green-500/50 rounded-lg p-8 text-center hover:border-green-500 hover:bg-green-500/5 transition-colors cursor-pointer focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-500/20"
                      tabIndex={0}
                      onPaste={handleQuestionImagePaste}
                      onClick={() => document.getElementById('full-question-image-upload')?.click()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          document.getElementById('full-question-image-upload')?.click();
                        }
                      }}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleQuestionImageSelect}
                        className="hidden"
                        id="full-question-image-upload"
                      />
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-3 bg-green-500/10 rounded-full">
                          <ImageIcon className="h-8 w-8 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-green-700">Click to upload or drag and drop</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            PNG, JPG, WebP up to 10MB
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Text Mode - Original Question Text Input */
                <Textarea
                  placeholder="Enter the question text (supports markdown)"
                  value={questionForm.question_text}
                  onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                  rows={4}
                />
              )}
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

            {/* Image Upload */}
            <div className="space-y-3">
              <Label>Question Image/Diagram (optional)</Label>
              
              {/* Image Preview */}
              {imagePreview && (
                <div className="relative inline-block">
                  <img 
                    src={imagePreview} 
                    alt="Question diagram" 
                    className="max-w-full max-h-48 rounded-lg border object-contain"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              
              {/* Upload Area - Paste-first design */}
              {!imagePreview && (
                <div 
                  className="border-2 border-dashed border-green-500/50 rounded-lg p-6 text-center hover:border-green-500 hover:bg-green-500/5 transition-colors cursor-pointer focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-500/20"
                  tabIndex={0}
                  onPaste={handleImagePaste}
                  onClick={() => document.getElementById('question-image-upload')?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      document.getElementById('question-image-upload')?.click();
                    }
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    id="question-image-upload"
                  />
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-green-600" />
                    <span className="text-sm font-medium text-green-700">
                      Click to upload or drag and drop
                    </span>
                    <span className="text-xs text-muted-foreground">
                      PNG, JPG, GIF up to 5MB
                    </span>
                  </div>
                </div>
              )}
              
              {/* Image Position Selector */}
              {imagePreview && (
                <div className="flex items-center gap-3">
                  <Label className="text-sm">Position:</Label>
                  <Select
                    value={questionForm.image_position}
                    onValueChange={(value) => setQuestionForm({ ...questionForm, image_position: value as any })}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="before_text">Before text</SelectItem>
                      <SelectItem value="after_text">After text</SelectItem>
                      <SelectItem value="inline">Inline with text</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {/* Or enter URL manually */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Or paste image URL:</span>
                <Input
                  placeholder="https://..."
                  value={questionForm.image_url}
                  onChange={(e) => {
                    setQuestionForm({ ...questionForm, image_url: e.target.value });
                    if (e.target.value && !imageFile) {
                      setImagePreview(e.target.value);
                    }
                  }}
                  className="h-7 text-xs"
                />
              </div>
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

      {/* PDF Upload & AI Extraction Dialog */}
      <Dialog open={isPdfUploadOpen} onOpenChange={setIsPdfUploadOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              AI-Powered Question Extraction
            </DialogTitle>
            <DialogDescription>
              Upload your PDF exam paper. Enable GPT-4 Vision for papers with diagrams, illustrations, or images.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">

            {/* PDF File Upload */}
            <div className="space-y-2">
              <Label>Upload PDF File (Recommended)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePdfUpload(file);
                  }}
                  className="cursor-pointer"
                />
                {pdfFile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPdfFile(null);
                      setExtractionStatus('idle');
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {pdfFile && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or paste text</span>
              </div>
            </div>

            {/* Text input area */}
            <div className="space-y-2">
              <Label>PDF Text Content (Alternative)</Label>
              <Textarea
                placeholder="Paste the text content from your PDF exam paper here...

Example:
1. What is the chemical formula for water? [2 marks]
   A) H2O
   B) CO2
   C) NaCl
   D) O2

2. Describe the process of photosynthesis. [4 marks]"
                value={pdfText}
                onChange={(e) => setPdfText(e.target.value)}
                rows={8}
                className="font-mono text-sm"
                disabled={!!pdfFile}
              />
              <p className="text-xs text-muted-foreground">
                {pdfText.length > 0 ? `${pdfText.length} characters` : pdfFile ? 'PDF file will be used' : 'No content yet'}
              </p>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="replace-existing"
                  checked={replaceExisting}
                  onCheckedChange={(checked) => setReplaceExisting(checked as boolean)}
                />
                <Label htmlFor="replace-existing" className="text-sm font-normal">
                  Replace existing questions (delete all current questions first)
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="use-vision"
                  checked={useVisionExtraction}
                  onCheckedChange={(checked) => setUseVisionExtraction(checked as boolean)}
                />
                <Label htmlFor="use-vision" className="text-sm font-normal flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-purple-500" />
                  Use GPT-4 Vision for papers with diagrams/images (recommended for visual papers)
                </Label>
              </div>
    
              {useVisionExtraction && (
                <div className="ml-6 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  
                </div>
              )}
            </div>

            {/* Status indicator */}
            {extractionStatus !== 'idle' && (
              <div className={cn(
                "flex items-center gap-2 p-3 rounded-lg",
                extractionStatus === 'extracting' && "bg-blue-500/10 text-blue-600",
                extractionStatus === 'done' && "bg-green-500/10 text-green-600",
                extractionStatus === 'error' && "bg-red-500/10 text-red-600"
              )}>
                {extractionStatus === 'extracting' && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>AI is analyzing and extracting questions...</span>
                  </>
                )}
                {extractionStatus === 'done' && (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Questions extracted successfully!</span>
                  </>
                )}
                {extractionStatus === 'error' && (
                  <>
                    <AlertCircle className="h-4 w-4" />
                    <span>Extraction failed. Please try again.</span>
                  </>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsPdfUploadOpen(false);
              setPdfText('');
              setExtractionStatus('idle');
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleAiExtraction} 
              disabled={extracting || (!pdfFile && !pdfText.trim())}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {extracting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Extract Questions
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Scheme Extraction Dialog */}
      <Dialog open={isMarkSchemeDialogOpen} onOpenChange={setIsMarkSchemeDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-500" />
              Extract Mark Scheme Answers
            </DialogTitle>
            <DialogDescription>
              Upload the mark scheme PDF to automatically extract and match answers to questions.
              {questions.length > 0 && (
                <span className="block mt-1 text-green-600">
                  Ready to match answers to {questions.length} questions.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* PDF Upload */}
            <div className="space-y-2">
              <Label>Mark Scheme PDF</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={handleMarkSchemePdfUpload}
                  className="flex-1"
                />
                {markSchemePdfFile && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
              </div>
              {markSchemePdfFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {markSchemePdfFile.name}
                </p>
              )}
            </div>

            {/* Or paste text */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or paste text
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Mark Scheme Text</Label>
              <Textarea
                placeholder="Paste mark scheme text here..."
                value={markSchemeText}
                onChange={(e) => setMarkSchemeText(e.target.value)}
                rows={6}
                className="font-mono text-sm"
              />
            </div>

            {/* Auto-apply option */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="autoApply"
                checked={autoApplyMarkScheme}
                onCheckedChange={(checked) => setAutoApplyMarkScheme(checked as boolean)}
              />
              <Label htmlFor="autoApply" className="text-sm">
                Automatically apply matched answers to questions
              </Label>
            </div>

            {/* Status indicator */}
            {markSchemeStatus !== 'idle' && (
              <div className={cn(
                "flex items-center gap-2 p-3 rounded-lg text-sm",
                markSchemeStatus === 'extracting' && "bg-blue-500/10 text-blue-600",
                markSchemeStatus === 'done' && "bg-green-500/10 text-green-600",
                markSchemeStatus === 'error' && "bg-red-500/10 text-red-600"
              )}>
                {markSchemeStatus === 'extracting' && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>AI is extracting answers from mark scheme...</span>
                  </>
                )}
                {markSchemeStatus === 'done' && (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Mark scheme extracted successfully!</span>
                  </>
                )}
                {markSchemeStatus === 'error' && (
                  <>
                    <AlertCircle className="h-4 w-4" />
                    <span>Extraction failed. Please try again.</span>
                  </>
                )}
              </div>
            )}

            {/* Results display */}
            {markSchemeResults && (
              <div className="space-y-3 border rounded-lg p-4">
                <h4 className="font-medium">Extraction Results</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center p-2 bg-muted rounded">
                    <div className="text-2xl font-bold">{markSchemeResults.total_extracted}</div>
                    <div className="text-muted-foreground">Extracted</div>
                  </div>
                  <div className="text-center p-2 bg-green-500/10 rounded">
                    <div className="text-2xl font-bold text-green-600">{markSchemeResults.matched.length}</div>
                    <div className="text-muted-foreground">Matched</div>
                  </div>
                  <div className="text-center p-2 bg-yellow-500/10 rounded">
                    <div className="text-2xl font-bold text-yellow-600">{markSchemeResults.unmatched.length}</div>
                    <div className="text-muted-foreground">Unmatched</div>
                  </div>
                </div>

                {/* Unmatched answers */}
                {markSchemeResults.unmatched.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-yellow-600 mb-2">
                      Unmatched answers (no corresponding question found):
                    </p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {markSchemeResults.unmatched.map((item: any, idx: number) => (
                        <div key={idx} className="text-xs p-2 bg-yellow-500/5 rounded">
                          Q{item.question_number}{item.part_label ? `(${item.part_label})` : ''}: {item.reason}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Matched answers (if not auto-applied) */}
                {!autoApplyMarkScheme && markSchemeResults.matched.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-green-600 mb-2">
                      Matched answers (click to apply):
                    </p>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {markSchemeResults.matched.map((item: any, idx: number) => (
                        <div key={idx} className="text-xs p-2 bg-green-500/5 rounded flex justify-between items-start gap-2">
                          <div className="flex-1">
                            <span className="font-medium">
                              Q{item.question_number}{item.part_label ? `(${item.part_label})` : ''}
                            </span>
                            <p className="text-muted-foreground mt-1 line-clamp-2">
                              {item.new_mark_scheme.slice(0, 100)}...
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => applyMarkSchemeToQuestion(item.question_id, item.new_mark_scheme)}
                          >
                            Apply
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsMarkSchemeDialogOpen(false);
              setMarkSchemeText('');
              setMarkSchemePdfFile(null);
              setMarkSchemeStatus('idle');
              setMarkSchemeResults(null);
            }}>
              {markSchemeResults ? 'Close' : 'Cancel'}
            </Button>
            {!markSchemeResults && (
              <Button 
                onClick={handleMarkSchemeExtraction} 
                disabled={extractingMarkScheme || (!markSchemePdfFile && !markSchemeText.trim())}
                className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
              >
                {extractingMarkScheme ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Extract Answers
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add to Topic Dialog */}
      <Dialog open={isAddToTopicDialogOpen} onOpenChange={setIsAddToTopicDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Questions to Topic</DialogTitle>
            <DialogDescription>
              Add {selectedQuestions.size} selected question{selectedQuestions.size > 1 ? 's' : ''} to a topic.
              They will be available in the Questions Bank and Test Builder.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Topic</Label>
              {topics.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No topics found for this subject. Please create topics first.
                </p>
              ) : (
                <Select value={selectedTopicId} onValueChange={setSelectedTopicId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a topic..." />
                  </SelectTrigger>
                  <SelectContent>
                    {topics.map((topic) => (
                      <SelectItem key={topic.id} value={topic.id}>
                        {topic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {selectedTopicId && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="font-medium mb-1">Questions to add:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  {questions
                    .filter(q => selectedQuestions.has(q.id))
                    .slice(0, 5)
                    .map(q => (
                      <li key={q.id} className="truncate">
                        Q{q.question_number}{q.part_label || ''}: {q.question_text?.slice(0, 50)}...
                      </li>
                    ))}
                  {selectedQuestions.size > 5 && (
                    <li className="text-muted-foreground">
                      ...and {selectedQuestions.size - 5} more
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddToTopicDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddToTopic}
              disabled={!selectedTopicId || addingToTopic}
              className="bg-green-600 hover:bg-green-700"
            >
              {addingToTopic ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add to Topic
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
