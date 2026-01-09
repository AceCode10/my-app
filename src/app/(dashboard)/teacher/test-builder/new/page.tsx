'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
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

export default function NewTestBuilderPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  
  const [activeTab, setActiveTab] = useState('compose');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  
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
  const [assessmentId, setAssessmentId] = useState<string | null>(null);

  const handleAddQuestion = (question: Question) => {
    // Check if already added
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
      assessment_id: assessmentId || '',
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

  const handleRemoveQuestion = (questionId: string) => {
    setSelectedQuestions(prev => 
      prev.filter(q => q.id !== questionId)
        .map((q, idx) => ({ ...q, question_order: idx + 1 }))
    );
  };

  const handleReorderQuestions = (reordered: (AssessmentQuestion & { question: Question })[]) => {
    setSelectedQuestions(reordered);
  };

  const handleEditMarks = (questionId: string, marks: number) => {
    setSelectedQuestions(prev =>
      prev.map(q => q.id === questionId ? { ...q, custom_marks: marks } : q)
    );
  };

  const handleConfigChange = (updates: Partial<Assessment>) => {
    setTestConfig(prev => ({ ...prev, ...updates }));
  };

  const handleSaveDraft = async () => {
    if (!testConfig.title) {
      toast({
        title: 'Title required',
        description: 'Please enter a test title',
        variant: 'destructive'
      });
      return;
    }

    if (selectedQuestions.length === 0) {
      toast({
        title: 'No questions',
        description: 'Please add at least one question',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      let currentAssessmentId = assessmentId;

      // Create assessment if not exists
      if (!currentAssessmentId) {
        const { assessment, error } = await testBuilderService.createTest({
          assessment_type_code: 'custom_test',
          title: testConfig.title,
          description: testConfig.description || undefined,
          instructions: testConfig.instructions || undefined,
          duration_minutes: testConfig.duration_minutes || undefined,
          passing_marks: testConfig.passing_marks || undefined,
          calculator_allowed: testConfig.calculator_allowed,
          max_attempts: testConfig.max_attempts,
          show_results: testConfig.show_results,
          randomize_questions: testConfig.randomize_questions,
          randomize_answers: testConfig.randomize_answers,
          is_template: testConfig.is_template
        });

        if (error || !assessment) {
          throw error || new Error('Failed to create test');
        }

        currentAssessmentId = assessment.id;
        setAssessmentId(currentAssessmentId);
      } else {
        // Update existing assessment
        await testBuilderService.updateTest(currentAssessmentId, testConfig);
      }

      // Add questions
      const addedQuestionIds = new Map<string, string>();
      for (const aq of selectedQuestions) {
        if (aq.id.startsWith('temp-')) {
          const { id: newId } = await testBuilderService.addQuestionToTest({
            assessment_id: currentAssessmentId,
            question_id: aq.question_id,
            question_order: aq.question_order,
            section_name: aq.section_name || undefined,
            custom_marks: aq.custom_marks || undefined
          });
          if (newId) {
            addedQuestionIds.set(aq.id, newId);
          }
        }
      }

      // Update selected questions with real IDs
      setSelectedQuestions(prev => 
        prev.map(q => {
          const realId = addedQuestionIds.get(q.id);
          return realId ? { ...q, id: realId } : q;
        })
      );

      toast({
        title: 'Draft saved',
        description: 'Your test has been saved as a draft'
      });

      router.push(`/teacher/test-builder/${currentAssessmentId}/edit`);
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: 'Error',
        description: 'Failed to save test draft',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!assessmentId) {
      await handleSaveDraft();
      return;
    }

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
            <h1 className="text-3xl font-bold">Create New Test</h1>
            <p className="text-muted-foreground">Build a custom test from the question bank</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={saving || publishing}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Draft'}
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
