'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ChevronLeft, 
  Clock, 
  FileText, 
  CheckCircle,
  Download,
  RotateCcw,
  Home,
  BookOpen,
  Trophy,
  Save,
  Edit3,
  History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Paper {
  id: string;
  title: string;
  year: number;
  session?: string;
  paper_number?: string;
  variant?: string;
  paper_url?: string;
  question_paper_url?: string;
  mark_scheme_url?: string;
  examiner_report_url?: string;
  duration_minutes?: number;
  total_marks?: number;
  exam_board?: string;
  level?: string;
  subject_id?: string;
  subjects?: {
    id: string;
    name: string;
    slug: string;
  };
}

export default function ExamResultsPage({ 
  params 
}: { 
  params: Promise<{ paperId: string }>
}) {
  const { paperId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { toast } = useToast();
  
  const [paper, setPaper] = useState<Paper | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selfScore, setSelfScore] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [showScoreInput, setShowScoreInput] = useState(false);
  const [scoreSaved, setScoreSaved] = useState(false);
  
  const timeSpent = parseInt(searchParams.get('time') || '0');
  const attemptId = searchParams.get('attempt');

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch paper
        const { data: paperData } = await supabase
          .from('past_papers')
          .select(`
            *,
            subjects:subject_id(id, name, slug)
          `)
          .eq('id', paperId)
          .single();
        
        setPaper(paperData);
        
        // Fetch attempt if exists
        if (attemptId) {
          const { data: attemptData } = await supabase
            .from('assessment_attempts')
            .select('self_score, notes')
            .eq('id', attemptId)
            .single();
          
          if (attemptData) {
            if (attemptData.self_score) {
              setSelfScore(attemptData.self_score.toString());
              setScoreSaved(true);
            }
            if (attemptData.notes) {
              setNotes(attemptData.notes);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, [paperId, attemptId]);

  const handleSaveScore = async () => {
    if (!attemptId) {
      toast({
        variant: 'destructive',
        title: 'Cannot Save',
        description: 'No attempt record found. Please log in to track your scores.'
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      const scoreValue = parseFloat(selfScore);
      
      if (isNaN(scoreValue) || scoreValue < 0) {
        throw new Error('Please enter a valid score');
      }
      
      if (paper?.total_marks && scoreValue > paper.total_marks) {
        throw new Error(`Score cannot exceed ${paper.total_marks} marks`);
      }
      
      const percentage = paper?.total_marks 
        ? (scoreValue / paper.total_marks) * 100 
        : null;
      
      const { error } = await supabase
        .from('assessment_attempts')
        .update({
          self_score: scoreValue,
          score: scoreValue,
          percentage,
          notes,
          status: 'graded'
        })
        .eq('id', attemptId);
      
      if (error) throw error;
      
      setScoreSaved(true);
      setShowScoreInput(false);
      
      toast({
        title: 'Score Saved',
        description: `Your score of ${scoreValue}/${paper?.total_marks || '?'} has been recorded.`
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to save score'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  if (isLoading) {
    return (
      <div className="py-12">
        <div className="max-w-2xl mx-auto">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="py-12">
      <div className="max-w-2xl mx-auto">
        {/* Success Card */}
        <Card className="mb-8">
          <CardHeader className="text-center pb-2">
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-10 h-10 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Exam Completed!</CardTitle>
            <CardDescription>
              You have successfully completed the practice exam
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Paper Info */}
            <div className="text-center mb-6 pb-6 border-b">
              <h3 className="font-semibold text-foreground">{paper?.title}</h3>
              <p className="text-sm text-muted-foreground">
                {paper?.subjects?.name} • {paper?.exam_board} • {paper?.year}
              </p>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-muted/50 p-4 rounded-lg text-center">
                <Clock className="w-6 h-6 text-primary mx-auto mb-2" />
                <div className="text-xl font-bold text-foreground">
                  {formatTime(timeSpent)}
                </div>
                <div className="text-xs text-muted-foreground">Time Spent</div>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg text-center">
                <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
                <div className="text-xl font-bold text-foreground">
                  {paper?.total_marks || '—'}
                </div>
                <div className="text-xs text-muted-foreground">Total Marks</div>
              </div>
            </div>
            
            {/* Self-Scoring Section */}
            {attemptId && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-foreground">Record Your Score</h4>
                  {scoreSaved && !showScoreInput && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowScoreInput(true)}
                    >
                      <Edit3 className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
                
                {scoreSaved && !showScoreInput ? (
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold text-foreground">
                      {selfScore}/{paper?.total_marks || '?'}
                    </div>
                    <Badge variant="secondary">
                      {paper?.total_marks 
                        ? `${Math.round((parseFloat(selfScore) / paper.total_marks) * 100)}%`
                        : 'Scored'}
                    </Badge>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Use the mark scheme to check your answers, then enter your score below.
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Label htmlFor="score" className="sr-only">Your Score</Label>
                        <Input
                          id="score"
                          type="number"
                          min="0"
                          max={paper?.total_marks || 100}
                          placeholder="Enter your score"
                          value={selfScore}
                          onChange={(e) => setSelfScore(e.target.value)}
                        />
                      </div>
                      <span className="text-muted-foreground">/ {paper?.total_marks || '?'}</span>
                    </div>
                    <div>
                      <Label htmlFor="notes" className="text-sm text-muted-foreground mb-1 block">
                        Notes (optional)
                      </Label>
                      <Textarea
                        id="notes"
                        placeholder="Add notes about areas to improve..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                      />
                    </div>
                    <Button 
                      onClick={handleSaveScore} 
                      disabled={isSaving || !selfScore}
                      className="w-full"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isSaving ? 'Saving...' : 'Save Score'}
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {/* Self-Assessment Note for guests */}
            {!attemptId && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-foreground mb-2">Self-Assessment</h4>
                <p className="text-sm text-muted-foreground">
                  Use the mark scheme below to check your answers and calculate your score. 
                  <Link href="/login" className="text-primary hover:underline ml-1">
                    Log in
                  </Link> to track your scores over time.
                </p>
              </div>
            )}
            
            {/* Resources */}
            <div className="space-y-3">
              <h4 className="font-medium text-foreground">Review Materials</h4>
              
              {paper?.mark_scheme_url && (
                <a
                  href={paper.mark_scheme_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors"
                >
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div className="flex-1">
                    <div className="font-medium text-foreground">Mark Scheme</div>
                    <div className="text-xs text-muted-foreground">Check your answers</div>
                  </div>
                  <Download className="w-4 h-4 text-muted-foreground" />
                </a>
              )}
              
              {paper?.examiner_report_url && (
                <a
                  href={paper.examiner_report_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <BookOpen className="w-5 h-5 text-purple-500" />
                  <div className="flex-1">
                    <div className="font-medium text-foreground">Examiner Report</div>
                    <div className="text-xs text-muted-foreground">Learn from common mistakes</div>
                  </div>
                  <Download className="w-4 h-4 text-muted-foreground" />
                </a>
              )}
              
              {(paper?.question_paper_url || paper?.paper_url) && (
                <a
                  href={paper.question_paper_url || paper.paper_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <FileText className="w-5 h-5 text-blue-500" />
                  <div className="flex-1">
                    <div className="font-medium text-foreground">Question Paper</div>
                    <div className="text-xs text-muted-foreground">Review the questions</div>
                  </div>
                  <Download className="w-4 h-4 text-muted-foreground" />
                </a>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => router.push(`/practice/paper/${paperId}`)}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          
          {paper?.subjects?.slug && (
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => router.push(`/resources/past-papers/${paper.subjects?.slug}`)}
            >
              <FileText className="w-4 h-4 mr-2" />
              More Papers
            </Button>
          )}
          
          <Button 
            className="flex-1"
            onClick={() => router.push('/practice')}
          >
            <Home className="w-4 h-4 mr-2" />
            Practice Hub
          </Button>
        </div>
        
        {/* View History Link */}
        {attemptId && (
          <div className="mt-4 text-center">
            <Link href="/practice/history" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
              <History className="w-4 h-4" />
              View all practice history
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
