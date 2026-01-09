'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Send,
  Clock,
  Calendar,
  Users,
  FileText,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { format } from 'date-fns';

interface Test {
  id: string;
  title: string;
  description: string | null;
  total_marks: number;
  total_questions: number;
  duration_minutes: number | null;
}

interface Class {
  id: string;
  name: string;
  student_count?: number;
}

export default function AssignTestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: testId } = use(params);
  const supabase = createClient();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [test, setTest] = useState<Test | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [success, setSuccess] = useState(false);

  // Assignment settings
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | null>(null);
  const [useTestDuration, setUseTestDuration] = useState(true);
  const [allowRetakes, setAllowRetakes] = useState(false);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [showResults, setShowResults] = useState<string>('after_due');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, testId]);

  async function fetchData() {
    try {
      // Fetch ONLY from assessments table
      const { data: assessmentData, error: assessmentError } = await supabase
        .from('assessments')
        .select('id, title, description, total_marks, duration_minutes')
        .eq('id', testId)
        .single();

      if (assessmentError) {
        console.error('Error fetching assessment:', assessmentError);
        throw new Error('Test not found');
      }
      
      // Get question count
      const { count } = await supabase
        .from('assessment_questions')
        .select('*', { count: 'exact', head: true })
        .eq('assessment_id', testId);

      const testData = {
        ...assessmentData,
        total_questions: count || 0
      };
      
      setTest(testData);
      setTitle(testData.title);
      if (testData.duration_minutes) {
        setTimeLimitMinutes(testData.duration_minutes);
      }

      // Fetch teacher's classes with student count
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          enrollments(count)
        `)
        .eq('teacher_id', user?.id)
        .order('name');

      if (classesError) throw classesError;
      
      const classesWithCount = (classesData || []).map(c => ({
        id: c.id,
        name: c.name,
        student_count: (c.enrollments as any)?.[0]?.count || 0,
      }));
      setClasses(classesWithCount);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  }

  async function handleAssign() {
    if (!selectedClassId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a class' });
      return;
    }

    if (!title.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a title' });
      return;
    }

    setAssigning(true);
    try {
      // Build start and due timestamps
      const now = new Date();
      let startAt: string | null = null;
      let dueAt: string | null = null;

      if (startDate && startTime) {
        startAt = new Date(`${startDate}T${startTime}`).toISOString();
      } else if (startDate) {
        startAt = new Date(`${startDate}T00:00:00`).toISOString();
      }

      if (dueDate && dueTime) {
        dueAt = new Date(`${dueDate}T${dueTime}`).toISOString();
      } else if (dueDate) {
        dueAt = new Date(`${dueDate}T23:59:59`).toISOString();
      }

      // Ensure start_at is before due_at
      if (startAt && dueAt && new Date(startAt) >= new Date(dueAt)) {
        toast({
          variant: 'destructive',
          title: 'Invalid dates',
          description: 'Start date must be before due date'
        });
        return;
      }

      // Use ONLY assessment_id - single implementation
      const assignmentData: any = {
        assessment_id: testId,
        test_id: null, // Explicitly set to NULL to satisfy constraint
        assigned_by: user?.id,
        target_class_id: selectedClassId,
        title: title.trim(),
        allow_retakes: allowRetakes,
        max_attempts: allowRetakes ? Math.max(1, maxAttempts || 1) : 1
      };

      // Only add optional fields if they have values
      if (instructions.trim()) {
        assignmentData.instructions = instructions.trim();
      }

      // Always set start_at - use current time if not specified
      assignmentData.start_at = startAt || now.toISOString();

      if (dueAt) {
        assignmentData.due_at = dueAt;
      }

      // Only add time_limit if it's a positive number
      const timeLimit = useTestDuration ? (test?.duration_minutes || null) : (timeLimitMinutes || null);
      if (timeLimit && timeLimit > 0) {
        assignmentData.time_limit_minutes = timeLimit;
      }

      console.log('Creating assignment with data:', JSON.stringify(assignmentData, null, 2));
      
      // Validate required fields before insert
      const requiredFields = ['assessment_id', 'assigned_by', 'target_class_id', 'title'];
      const missingFields = requiredFields.filter(field => !assignmentData[field]);
      
      if (missingFields.length > 0) {
        console.error('Missing required fields:', missingFields);
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Ensure we're not accidentally setting test_id
      if (assignmentData.test_id) {
        console.error('ERROR: test_id should not be set when using assessment_id');
        delete assignmentData.test_id;
      }

      console.log('Final assignment data to insert:', JSON.stringify(assignmentData, null, 2));

      const { data, error } = await supabase
        .from('assignments')
        .insert(assignmentData)
        .select()
        .single();

      if (error) {
        console.error('Assignment insert error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        console.error('Assignment data that failed:', JSON.stringify(assignmentData, null, 2));
        
        // Try a minimal insert to see what's failing
        console.log('Trying minimal assignment insert...');
        const minimalData = {
          assessment_id: testId,
          test_id: null, // Explicitly set to NULL
          assigned_by: user?.id,
          target_class_id: selectedClassId,
          title: title.trim(),
          allow_retakes: false,
          max_attempts: 1
        };
        
        console.log('Minimal data:', JSON.stringify(minimalData, null, 2));
        
        const { data: minimalResult, error: minimalError } = await supabase
          .from('assignments')
          .insert(minimalData)
          .select()
          .single();
          
        if (minimalError) {
          console.error('Minimal insert also failed:', minimalError);
          throw minimalError;
        } else {
          console.log('Minimal insert succeeded!');
          throw error;
        }
      }

      if (!data) {
        throw new Error('No data returned from assignment creation');
      }

      // Update assessment to mark as published
      await supabase
        .from('assessments')
        .update({ is_published: true })
        .eq('id', testId);

      setSuccess(true);
      toast({ title: 'Assignment created!', description: 'Students can now access this test' });
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push('/teacher/tests');
      }, 2000);
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create assignment' });
    } finally {
      setAssigning(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!test) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-semibold mb-2">Test not found</h2>
        <p className="text-muted-foreground mb-4">The test you're looking for doesn't exist.</p>
        <Button asChild>
          <Link href="/teacher/tests">Back to Tests</Link>
        </Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Assignment Created!</h2>
        <p className="text-muted-foreground mb-4">
          Students in the selected class can now access this test.
        </p>
        <Button asChild>
          <Link href="/teacher/tests">Back to Tests</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/teacher/tests">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tests
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Assign Test</h1>
        <p className="text-muted-foreground">Assign "{test.title}" to a class</p>
      </div>

      {/* Test Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Test Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{test.total_questions}</p>
              <p className="text-sm text-muted-foreground">Questions</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{test.total_marks}</p>
              <p className="text-sm text-muted-foreground">Total Marks</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {test.duration_minutes ? (test.duration_minutes >= 60 ? `${Math.floor(test.duration_minutes / 60)}h${test.duration_minutes % 60 > 0 ? ` ${test.duration_minutes % 60}m` : ''}` : `${test.duration_minutes}m`) : '∞'}
              </p>
              <p className="text-sm text-muted-foreground">Duration</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assignment Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Assignment Details</CardTitle>
          <CardDescription>Configure how students will access this test</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Class Selection */}
          <div className="space-y-2">
            <Label htmlFor="class">Select Class *</Label>
            {classes.length === 0 ? (
              <div className="p-4 border rounded-lg text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">You don't have any classes yet</p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/teacher/classes">Create a Class</Link>
                </Button>
              </div>
            ) : (
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.student_count} students)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Assignment Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Chapter 5 Quiz - Due Friday"
            />
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <Label htmlFor="instructions">Instructions (Optional)</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Any special instructions for students..."
              rows={3}
            />
          </div>

          {/* Date/Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-28"
                />
              </div>
              <p className="text-xs text-muted-foreground">When students can start</p>
            </div>
            <div className="space-y-2">
              <Label>Due Date (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
                <Input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="w-28"
                />
              </div>
              <p className="text-xs text-muted-foreground">Submission deadline</p>
            </div>
          </div>

          {/* Time Limit */}
          <div className="space-y-3">
            <Label>Time Limit</Label>
            <div className="flex items-center gap-2">
              <Checkbox
                id="useTestDuration"
                checked={useTestDuration}
                onCheckedChange={(checked) => setUseTestDuration(checked as boolean)}
              />
              <label htmlFor="useTestDuration" className="text-sm">
                Use test duration ({test.duration_minutes ? (test.duration_minutes >= 60 ? `${Math.floor(test.duration_minutes / 60)}h ${test.duration_minutes % 60 > 0 ? `${test.duration_minutes % 60}m` : ''}` : `${test.duration_minutes} minutes`) : 'untimed'})
              </label>
            </div>
            {!useTestDuration && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={timeLimitMinutes || ''}
                  onChange={(e) => setTimeLimitMinutes(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Minutes"
                  className="w-24"
                  min={5}
                  max={240}
                />
                <span className="text-sm text-muted-foreground">minutes (leave empty for untimed)</span>
              </div>
            )}
          </div>

          {/* Retakes */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="allowRetakes"
                checked={allowRetakes}
                onCheckedChange={(checked) => setAllowRetakes(checked as boolean)}
              />
              <label htmlFor="allowRetakes" className="text-sm">Allow multiple attempts</label>
            </div>
            {allowRetakes && (
              <div className="flex items-center gap-2 ml-6">
                <Label className="text-sm">Max attempts:</Label>
                <Input
                  type="number"
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 1)}
                  className="w-20"
                  min={1}
                  max={10}
                />
              </div>
            )}
          </div>

          {/* Results Release */}
          <div className="space-y-3">
            <Label>When to show results</Label>
            <RadioGroup value={showResults} onValueChange={setShowResults}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="immediately" id="immediately" />
                <label htmlFor="immediately" className="text-sm">Immediately after submission</label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="after_submit" id="after_submit" />
                <label htmlFor="after_submit" className="text-sm">After all students submit</label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="after_due" id="after_due" />
                <label htmlFor="after_due" className="text-sm">After due date</label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="manual" />
                <label htmlFor="manual" className="text-sm">Manually release</label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href="/teacher/tests">Cancel</Link>
        </Button>
        <Button onClick={handleAssign} disabled={assigning || !selectedClassId}>
          {assigning ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Assign to Class
        </Button>
      </div>
    </div>
  );
}
