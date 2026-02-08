'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Clock,
  Eye,
  FileText,
  BookOpen,
  Target,
  Calendar,
  Download,
  ExternalLink,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function TeacherPaperDetailPage() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const paperId = params.id as string;
  const { toast } = useToast();

  const [paper, setPaper] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuestions, setShowQuestions] = useState(false);
  const [showMarkScheme, setShowMarkScheme] = useState(false);

  useEffect(() => {
    fetchPaperAndQuestions();
  }, [paperId]);

  async function fetchPaperAndQuestions() {
    try {
      const [paperRes, questionsRes] = await Promise.all([
        supabase.from('past_papers').select('*, subjects(id, name, slug, code)').eq('id', paperId).single(),
        supabase.from('paper_questions').select('*').eq('paper_id', paperId)
          .order('question_number', { ascending: true })
          .order('part_label', { ascending: true }),
      ]);

      if (paperRes.error) throw paperRes.error;
      setPaper(paperRes.data);
      setQuestions(questionsRes.data || []);
    } catch (error: any) {
      console.error('Error fetching paper:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load paper details' });
    } finally {
      setLoading(false);
    }
  }

  const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);
  const mcqCount = questions.filter(q => q.question_type === 'mcq').length;
  const structuredCount = questions.filter(q => q.question_type === 'structured' || q.question_type === 'essay').length;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Paper not found</h3>
        <Button onClick={() => router.push('/teacher/papers')}>Back to Papers</Button>
      </div>
    );
  }

  const subjectCode = paper.subjects?.code || '0000';
  let pNum = paper.paper_number || '1';
  if (pNum.toLowerCase().startsWith('paper ')) pNum = pNum.substring(6).trim();
  const variant = paper.variant || '1';
  const paperTitle = `${paper.subjects?.name || 'Paper'} Paper ${pNum} (${subjectCode}/${variant}) ${paper.session || ''} ${paper.year}`;

  const formatDuration = (minutes: number | null | undefined) => {
    const m = minutes || 90;
    if (m >= 60) {
      const h = Math.floor(m / 60);
      const rem = m % 60;
      return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
    }
    return `${m} min`;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/teacher/papers')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Papers
        </Button>
      </div>

      {/* Paper Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{paperTitle}</CardTitle>
              <CardDescription className="mt-2">{paper.subjects?.name || 'General'}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline"><Calendar className="h-3 w-3 mr-1" />{paper.year}</Badge>
              {paper.session && <Badge variant="outline">{paper.session}</Badge>}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-muted rounded-lg">
              <Target className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{questions.length}</p>
              <p className="text-sm text-muted-foreground">Questions</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <BookOpen className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{totalMarks}</p>
              <p className="text-sm text-muted-foreground">Total Marks</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{formatDuration(paper.duration_minutes)}</p>
              <p className="text-sm text-muted-foreground">Duration</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <FileText className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{pNum}</p>
              <p className="text-sm text-muted-foreground">Paper</p>
            </div>
          </div>

          {/* Question Types */}
          <div className="mb-6">
            <h4 className="font-medium mb-2">Question Types</h4>
            <div className="flex flex-wrap gap-2">
              {mcqCount > 0 && <Badge variant="secondary">{mcqCount} Multiple Choice</Badge>}
              {structuredCount > 0 && <Badge variant="secondary">{structuredCount} Structured</Badge>}
              {questions.length - mcqCount - structuredCount > 0 && (
                <Badge variant="secondary">{questions.length - mcqCount - structuredCount} Other</Badge>
              )}
            </div>
          </div>

          {/* Resource Links */}
          <div className="flex flex-wrap gap-2 mb-6">
            {paper.question_paper_url && (
              <Button variant="outline" size="sm" asChild>
                <a href={paper.question_paper_url} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" /> Question Paper <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            )}
            {paper.mark_scheme_url && (
              <Button variant="outline" size="sm" asChild>
                <a href={paper.mark_scheme_url} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" /> Mark Scheme <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            )}
          </div>

          {/* Action buttons for teachers */}
          <div className="space-y-3">
            <Button
              size="lg"
              className="w-full"
              onClick={() => setShowQuestions(!showQuestions)}
            >
              <Eye className="h-5 w-5 mr-2" />
              {showQuestions ? 'Hide Questions' : 'View Questions'}
            </Button>

            {paper.mark_scheme_url && (
              <Button
                size="lg"
                variant="outline"
                className="w-full"
                onClick={() => setShowMarkScheme(!showMarkScheme)}
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                {showMarkScheme ? 'Hide Mark Scheme Answers' : 'View Mark Scheme Answers'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Questions Preview */}
      {showQuestions && questions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Questions</CardTitle>
            <CardDescription>Preview all questions in this paper</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {questions.map((q, i) => (
                <div key={q.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">
                      Q{q.question_number}{q.part_label ? ` (${q.part_label})` : ''}
                    </h4>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">{q.marks || 0} mark{(q.marks || 0) !== 1 ? 's' : ''}</Badge>
                      <Badge variant="secondary" className="text-xs">{q.question_type || 'structured'}</Badge>
                    </div>
                  </div>
                  {q.question_text && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{q.question_text}</p>
                  )}
                  {q.question_type === 'mcq' && q.options && (
                    <div className="mt-2 space-y-1">
                      {(typeof q.options === 'string' ? JSON.parse(q.options) : q.options).map((opt: any, j: number) => (
                        <div key={j} className={`text-sm p-2 rounded ${showMarkScheme && q.correct_answer === opt.label ? 'bg-green-50 border border-green-200 font-medium text-green-800' : 'bg-muted/50'}`}>
                          <span className="font-medium mr-2">{opt.label}.</span>
                          {opt.text}
                          {showMarkScheme && q.correct_answer === opt.label && (
                            <CheckCircle className="h-4 w-4 inline ml-2 text-green-600" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {showMarkScheme && q.mark_scheme && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-xs font-semibold text-green-700 mb-1">Mark Scheme:</p>
                      <p className="text-sm text-green-800 whitespace-pre-wrap">{q.mark_scheme}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
