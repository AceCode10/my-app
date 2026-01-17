'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Plus, X, Save, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { logUpdate, logPublish } from '@/lib/audit';

interface MCQOption {
  label: string;
  text: string;
  is_correct: boolean;
}

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True/False' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'numeric', label: 'Numeric' },
  { value: 'essay', label: 'Essay' },
  { value: 'fill_in_blank', label: 'Fill in the Blank' }
];

const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard', 'very_hard'];
const STATUSES = ['draft', 'pending', 'published', 'archived'];
const EXAM_BOARDS = ['IGCSE', 'Edexcel', 'Cambridge', 'IB', 'AQA', 'OCR'];

export default function EditQuestionPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const questionId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [originalQuestion, setOriginalQuestion] = useState<any>(null);
  const [topics, setTopics] = useState<any[]>([]);
  const [subtopics, setSubtopics] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    stem_markdown: '',
    question_type: 'multiple_choice',
    difficulty: 'medium',
    marks: 1,
    examiner_comment: '',
    subject_id: '',
    topic_id: '',
    subtopic_id: '',
    exam_board: 'IGCSE',
    status: 'draft',
    correct_answer: '',
    answer_tolerance: 0
  });

  const [mcqOptions, setMcqOptions] = useState<MCQOption[]>([
    { label: 'A', text: '', is_correct: false },
    { label: 'B', text: '', is_correct: false },
    { label: 'C', text: '', is_correct: false },
    { label: 'D', text: '', is_correct: false }
  ]);

  useEffect(() => {
    fetchSubjects();
    fetchQuestion();
  }, [questionId]);

  useEffect(() => {
    if (formData.subject_id) {
      fetchTopics(formData.subject_id);
    }
  }, [formData.subject_id]);

  useEffect(() => {
    if (formData.topic_id) {
      fetchSubtopics(formData.topic_id);
    }
  }, [formData.topic_id]);

  async function fetchQuestion() {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('id', questionId)
        .single();

      if (error) throw error;

      if (data) {
        // Store original question for audit logging
        setOriginalQuestion(data);
        
        setFormData({
          stem_markdown: data.stem_markdown || '',
          question_type: data.question_type || 'multiple_choice',
          difficulty: data.difficulty || 'medium',
          marks: data.marks || 1,
          examiner_comment: data.examiner_comment || '',
          subject_id: data.subject_id || '',
          topic_id: data.topic_id || '',
          subtopic_id: data.subtopic_id || '',
          exam_board: data.exam_board || 'IGCSE',
          status: data.status || 'draft',
          correct_answer: typeof data.correct_answer === 'string' ? data.correct_answer : '',
          answer_tolerance: data.answer_tolerance || 0
        });

        // Load MCQ options if applicable
        if (data.question_type === 'multiple_choice' && data.options) {
          setMcqOptions(data.options);
        }
      }
    } catch (error: any) {
      console.error('Error fetching question:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load question'
      });
      router.push('/admin/questions');
    } finally {
      setLoading(false);
    }
  }

  async function fetchSubjects() {
    const { data } = await supabase
      .from('subjects')
      .select('id, name, code')
      .eq('status', 'published')
      .order('name');
    
    setSubjects(data || []);
  }

  async function fetchTopics(subjectId: string) {
    const { data } = await supabase
      .from('topics')
      .select('id, name, display_order')
      .eq('subject_id', subjectId)
      .eq('status', 'published')
      .order('display_order');
    
    setTopics(data || []);
  }

  async function fetchSubtopics(topicId: string) {
    const { data } = await supabase
      .from('subtopics')
      .select('id, name')
      .eq('topic_id', topicId)
      .eq('status', 'published')
      .order('name');
    
    setSubtopics(data || []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const questionData: any = {
        stem_markdown: formData.stem_markdown,
        question_type: formData.question_type,
        difficulty: formData.difficulty,
        marks: formData.marks,
        examiner_comment: formData.examiner_comment,
        subject_id: formData.subject_id || null,
        topic_id: formData.topic_id || null,
        subtopic_id: formData.subtopic_id || null,
        exam_board: formData.exam_board,
        status: formData.status
      };

      // Handle different question types
      if (formData.question_type === 'multiple_choice') {
        questionData.options = mcqOptions;
        const correctOption = mcqOptions.find(opt => opt.is_correct);
        questionData.correct_answer = correctOption?.label || '';
      } else if (formData.question_type === 'true_false') {
        questionData.correct_answer = formData.correct_answer;
      } else if (formData.question_type === 'numeric') {
        questionData.correct_answer = formData.correct_answer;
        questionData.answer_tolerance = formData.answer_tolerance;
      } else {
        questionData.correct_answer = formData.correct_answer;
      }

      const { error } = await supabase
        .from('questions')
        .update(questionData)
        .eq('id', questionId);

      if (error) throw error;

      // Log the update in audit logs
      const changes: any = {};
      if (originalQuestion) {
        if (originalQuestion.difficulty !== formData.difficulty) {
          changes.difficulty = `${originalQuestion.difficulty} → ${formData.difficulty}`;
        }
        if (originalQuestion.status !== formData.status) {
          changes.status = `${originalQuestion.status} → ${formData.status}`;
          
          // Log publish action separately if status changed to published
          if (formData.status === 'published' && originalQuestion.status !== 'published') {
            await logPublish(
              'question',
              questionId,
              formData.stem_markdown.substring(0, 50) + '...'
            );
          }
        }
        if (originalQuestion.marks !== formData.marks) {
          changes.marks = `${originalQuestion.marks} → ${formData.marks}`;
        }
      }

      await logUpdate(
        'question',
        questionId,
        formData.stem_markdown.substring(0, 50) + '...',
        changes
      );

      toast({
        title: 'Success',
        description: 'Question updated successfully'
      });

      router.push('/admin/questions');
    } catch (error: any) {
      console.error('Error updating question:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update question'
      });
    } finally {
      setSaving(false);
    }
  }

  const addMCQOption = () => {
    const nextLabel = String.fromCharCode(65 + mcqOptions.length);
    setMcqOptions([...mcqOptions, { label: nextLabel, text: '', is_correct: false }]);
  };

  const removeMCQOption = (index: number) => {
    if (mcqOptions.length > 2) {
      setMcqOptions(mcqOptions.filter((_, i) => i !== index));
    }
  };

  const updateMCQOption = (index: number, field: keyof MCQOption, value: any) => {
    const updated = [...mcqOptions];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'is_correct' && value === true) {
      updated.forEach((opt, i) => {
        if (i !== index) opt.is_correct = false;
      });
    }
    
    setMcqOptions(updated);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Edit Question</h1>
          <p className="text-muted-foreground mt-1">
            Update question details
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Question Content</CardTitle>
            <CardDescription>Enter the question text and details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stem">Question Text *</Label>
              <Textarea
                id="stem"
                value={formData.stem_markdown}
                onChange={(e) => setFormData({ ...formData, stem_markdown: e.target.value })}
                placeholder="Enter the question text (supports Markdown)"
                rows={6}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Question Type *</Label>
                <Select
                  value={formData.question_type}
                  onValueChange={(value) => setFormData({ ...formData, question_type: value })}
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
                <Label htmlFor="difficulty">Difficulty *</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value) => setFormData({ ...formData, difficulty: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTY_LEVELS.map(level => (
                      <SelectItem key={level} value={level}>
                        {level.replace('_', ' ').charAt(0).toUpperCase() + level.slice(1).replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="marks">Marks *</Label>
              <Input
                id="marks"
                type="number"
                min="1"
                value={formData.marks}
                onChange={(e) => setFormData({ ...formData, marks: parseInt(e.target.value) || 1 })}
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Answer Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.question_type === 'multiple_choice' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Options</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addMCQOption}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Option
                  </Button>
                </div>
                {mcqOptions.map((option, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="flex items-center gap-2 pt-2">
                      <Checkbox
                        checked={option.is_correct}
                        onCheckedChange={(checked) => updateMCQOption(index, 'is_correct', checked)}
                      />
                      <span className="font-medium">{option.label}</span>
                    </div>
                    <Input
                      value={option.text}
                      onChange={(e) => updateMCQOption(index, 'text', e.target.value)}
                      placeholder={`Option ${option.label}`}
                      className="flex-1"
                    />
                    {mcqOptions.length > 2 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeMCQOption(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {formData.question_type === 'true_false' && (
              <div className="space-y-2">
                <Label htmlFor="tf-answer">Correct Answer *</Label>
                <Select
                  value={formData.correct_answer}
                  onValueChange={(value) => setFormData({ ...formData, correct_answer: value })}
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
            )}

            {formData.question_type === 'numeric' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numeric-answer">Correct Answer *</Label>
                  <Input
                    id="numeric-answer"
                    type="number"
                    step="any"
                    value={formData.correct_answer}
                    onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tolerance">Tolerance</Label>
                  <Input
                    id="tolerance"
                    type="number"
                    step="any"
                    value={formData.answer_tolerance}
                    onChange={(e) => setFormData({ ...formData, answer_tolerance: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            )}

            {(formData.question_type === 'short_answer' || formData.question_type === 'fill_in_blank') && (
              <div className="space-y-2">
                <Label htmlFor="text-answer">Expected Answer *</Label>
                <Input
                  id="text-answer"
                  value={formData.correct_answer}
                  onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="examiner-comment">Examiner Comment *</Label>
              <Textarea
                id="examiner-comment"
                value={formData.examiner_comment}
                onChange={(e) => setFormData({ ...formData, examiner_comment: e.target.value })}
                rows={4}
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Classification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Exam Board</Label>
              <Select
                value={formData.exam_board}
                onValueChange={(value) => setFormData({ ...formData, exam_board: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXAM_BOARDS.map(board => (
                    <SelectItem key={board} value={board}>
                      {board}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              <Select
                value={formData.subject_id}
                onValueChange={(value) => {
                  setFormData({ ...formData, subject_id: value, topic_id: '', subtopic_id: '' });
                  setTopics([]);
                  setSubtopics([]);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(subject => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}{subject.code ? ` (${subject.code})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.subject_id && (
              <div className="space-y-2">
                <Label>Topic</Label>
                <Select
                  value={formData.topic_id}
                  onValueChange={(value) => {
                    setFormData({ ...formData, topic_id: value, subtopic_id: '' });
                    setSubtopics([]);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select topic" />
                  </SelectTrigger>
                  <SelectContent>
                    {topics.map(topic => (
                      <SelectItem key={topic.id} value={topic.id}>
                        {topic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.topic_id && subtopics.length > 0 && (
              <div className="space-y-2">
                <Label>Subtopic</Label>
                <Select
                  value={formData.subtopic_id}
                  onValueChange={(value) => setFormData({ ...formData, subtopic_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subtopic" />
                  </SelectTrigger>
                  <SelectContent>
                    {subtopics.map(subtopic => (
                      <SelectItem key={subtopic.id} value={subtopic.id}>
                        {subtopic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Publication Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map(status => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-4">
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
