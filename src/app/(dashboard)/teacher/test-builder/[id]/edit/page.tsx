'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { testBuilderService } from '@/lib/test-builder/test-builder-service';
import { QuestionBankBrowser } from '@/components/test-builder/QuestionBankBrowser';
import { TestComposer } from '@/components/test-builder/TestComposer';
import { TestConfiguration } from '@/components/test-builder/TestConfiguration';
import { TestPreview } from '@/components/test-builder/TestPreview';
import { Save, Eye, Send, ArrowLeft } from 'lucide-react';
import type { Assessment, Question, AssessmentQuestion } from '@/types/assessment';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditTestBuilderPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { user } = useUser();
  
  const assessmentId = params.id as string;
  
  const [activeTab, setActiveTab] = useState('compose');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [testConfig, setTestConfig] = useState<Partial<Assessment>>({
    title: '',
    description: '',
    instructions: '',
    duration_minutes: null,
    max_attempts: 1,
    show_results: 'immediately',
    calculator_allowed: false,
    randomize_questions: false,
    randomize_answers: false,
    is_template: false
  });

  const [selectedQuestions, setSelectedQuestions] = useState<(AssessmentQuestion & { question: Question })[]>([]);

  // Load existing test data
  useEffect(() => {
    if (assessmentId && user) {
      loadTest();
    }
  }, [assessmentId, user]);

  const loadTest = async () => {
    setLoading(true);
    try {
      const { assessment, questions, error } = await testBuilderService.getTestWithQuestions(assessmentId);

      if (error || !assessment) {
        throw error || new Error('Test not found');
      }

      // Load test configuration
      setTestConfig({
        title: assessment.title,
        description: assessment.description,
        instructions: assessment.instructions,
        subject_id: assessment.subject_id,
        exam_board_id: assessment.exam_board_id,
        topic_id: assessment.topic_id,
        duration_minutes: assessment.duration_minutes,
        passing_marks: assessment.passing_marks,
        calculator_allowed: assessment.calculator_allowed,
        max_attempts: assessment.max_attempts,
        show_results: assessment.show_results,
        randomize_questions: assessment.randomize_questions,
        randomize_answers: assessment.randomize_answers,
        is_template: assessment.is_template
      });

      // Load questions
      setSelectedQuestions(questions);

      toast({
        title: 'Test loaded',
        description: 'You can now edit your test'
      });
    } catch (error) {
      console.error('Error loading test:', error);
      toast({
        title: 'Error',
        description: 'Failed to load test',
        variant: 'destructive'
      });
      router.push('/teacher/tests');
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = (question: Question) => {
    if (selectedQuestions.some(q => q.question_id === question.id)) {
      toast({
        title: 'Question already added',
        description: 'This question is already in your test',
        variant: 'destructive'
      });
      return;
    }

    const newAssessmentQuestion: AssessmentQuestion & { question: Question } = {
      id: `temp-${Date.now()}`,
      assessment_id: assessmentId,
      question_id: question.id,
      question_order: selectedQuestions.length + 1,
      section_name: null,
      section_instructions: null,
      custom_question_text: null,
      custom_marks: null,
      custom_mark_scheme: null,
      question: question,
      created_at: new Date().toISOString()
    };

    setSelectedQuestions(prev => [...prev, newAssessmentQuestion]);
    
    toast({
      title: 'Question added',
      description: 'Question has been added to your test'
    });
  };

  const handleRemoveQuestion = async (questionId: string) => {
    // If it's a real question (not temp), delete from database
    if (!questionId.startsWith('temp-')) {
      const { error } = await testBuilderService.removeQuestionFromTest(questionId, assessmentId);
      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to remove question',
          variant: 'destructive'
        });
        return;
      }
    }

    setSelectedQuestions(prev => 
      prev.filter(q => q.id !== questionId)
        .map((q, idx) => ({ ...q, question_order: idx + 1 }))
    );
  };

  const handleReorderQuestions = async (reordered: (AssessmentQuestion & { question: Question })[]) => {
    setSelectedQuestions(reordered);
    
    // Update order in database
    const questionOrders = reordered.map(q => ({
      id: q.id,
      order: q.question_order
    }));
    
    await testBuilderService.reorderQuestions(assessmentId, questionOrders);
  };

  const handleEditMarks = (questionId: string, marks: number) => {
    setSelectedQuestions(prev =>
      prev.map(q => q.id === questionId ? { ...q, custom_marks: marks } : q)
    );
  };

  const handleConfigChange = (updates: Partial<Assessment>) => {
    setTestConfig(prev => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    if (!testConfig.title) {
      toast({
        title: 'Title required',
        description: 'Please enter a test title',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      // Update assessment
      await testBuilderService.updateTest(assessmentId, testConfig);

      // Add new questions
      for (const aq of selectedQuestions) {
        if (aq.id.startsWith('temp-')) {
          await testBuilderService.addQuestionToTest({
            assessment_id: assessmentId,
            question_id: aq.question_id,
            question_order: aq.question_order,
            section_name: aq.section_name || undefined,
            custom_marks: aq.custom_marks || undefined
          });
        }
      }

      toast({
        title: 'Test updated',
        description: 'Your changes have been saved'
      });

      // Reload test to get updated data
      await loadTest();
    } catch (error) {
      console.error('Error saving test:', error);
      toast({
        title: 'Error',
        description: 'Failed to save test',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const { error } = await testBuilderService.publishTest(assessmentId);

      if (error) {
        throw error;
      }

      toast({
        title: 'Test published',
        description: 'Your test is now available to assign to students'
      });

      router.push('/teacher/tests');
    } catch (error) {
      console.error('Error publishing test:', error);
      toast({
        title: 'Error',
        description: 'Failed to publish test',
        variant: 'destructive'
      });
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const selectedQuestionIds = new Set(selectedQuestions.map(q => q.question_id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/teacher/tests">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Test</h1>
            <p className="text-muted-foreground">{testConfig.title || 'Untitled Test'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={saving || publishing}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button
            onClick={handlePublish}
            disabled={saving || publishing || selectedQuestions.length === 0}
          >
            <Send className="h-4 w-4 mr-2" />
            {publishing ? 'Publishing...' : 'Publish Test'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="configure">Configure</TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="questions" className="relative">
            Questions
            {selectedQuestions.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                {selectedQuestions.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-300px)]">
            <QuestionBankBrowser
              onAddQuestion={handleAddQuestion}
              selectedQuestionIds={selectedQuestionIds}
              subjectId={testConfig.subject_id || undefined}
              examBoardId={testConfig.exam_board_id || undefined}
            />
            <TestComposer
              questions={selectedQuestions}
              onReorder={handleReorderQuestions}
              onRemove={handleRemoveQuestion}
              onEditMarks={handleEditMarks}
              onAddSection={() => {
                toast({
                  title: 'Coming soon',
                  description: 'Section management will be available soon'
                });
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="configure">
          <TestConfiguration
            config={testConfig}
            onChange={handleConfigChange}
          />
        </TabsContent>

        <TabsContent value="preview">
          <TestPreview
            assessment={testConfig}
            questions={selectedQuestions}
          />
        </TabsContent>

        <TabsContent value="questions">
          <TestComposer
            questions={selectedQuestions}
            onReorder={handleReorderQuestions}
            onRemove={handleRemoveQuestion}
            onEditMarks={handleEditMarks}
            onAddSection={() => {
              toast({
                title: 'Coming soon',
                description: 'Section management will be available soon'
              });
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
