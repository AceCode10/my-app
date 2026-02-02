'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Loader2, Wrench } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fixContextQuestions, getContextQuestionStats, fixParentQuestionIds, fixQuestionBankParentIds } from './actions';

export default function FixQuestionsPage() {
  const [isFixing, setIsFixing] = useState(false);
  const [isFixingParents, setIsFixingParents] = useState(false);
  const [isFixingBankParents, setIsFixingBankParents] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [results, setResults] = useState<any>(null);
  const [parentResults, setParentResults] = useState<any>(null);
  const [bankParentResults, setBankParentResults] = useState<any>(null);
  const { toast } = useToast();

  async function checkStats() {
    setIsChecking(true);
    try {
      const data = await getContextQuestionStats();
      if (data.error) {
        throw new Error(data.error);
      }
      setStats(data);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to check stats'
      });
    } finally {
      setIsChecking(false);
    }
  }

  async function runFix() {
    setIsFixing(true);
    try {
      const data = await fixContextQuestions();
      
      if (data.success && data.results) {
        setResults(data.results);
        toast({
          title: 'Fix Complete',
          description: `Fixed ${data.results.paper_questions_fixed} paper questions and ${data.results.questions_fixed} bank questions`
        });
        // Refresh stats after fix
        setTimeout(() => checkStats(), 1000);
      } else {
        throw new Error(data.error || 'Fix failed');
      }
    } catch (error: any) {
      console.error('Fix error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to run fix'
      });
    } finally {
      setIsFixing(false);
    }
  }

  async function runFixParents() {
    setIsFixingParents(true);
    try {
      const data = await fixParentQuestionIds();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setParentResults(data);
      toast({
        title: 'Parent IDs Fixed',
        description: data.message || `Fixed ${data.fixed} questions`
      });
    } catch (error: any) {
      console.error('Fix parents error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to fix parent IDs'
      });
    } finally {
      setIsFixingParents(false);
    }
  }

  async function runFixBankParents() {
    setIsFixingBankParents(true);
    try {
      const data = await fixQuestionBankParentIds();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setBankParentResults(data);
      toast({
        title: 'Question Bank Parent IDs Fixed',
        description: data.message || `Fixed ${data.fixed} questions`
      });
    } catch (error: any) {
      console.error('Fix bank parents error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to fix question bank parent IDs'
      });
    } finally {
      setIsFixingBankParents(false);
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Fix Context-Only Questions</h1>
        <p className="text-muted-foreground">
          This tool fixes questions that are context-only (parent questions with children) 
          but incorrectly have marks assigned. It will set their marks to 0 and mark them as not needing answers.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Check Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              Step 1: Check for Issues
            </CardTitle>
            <CardDescription>
              First, check how many questions might be affected
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={checkStats} disabled={isChecking}>
              {isChecking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                'Check Stats'
              )}
            </Button>

            {stats && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="font-medium mb-2">
                  Found {stats.total_potential_context} potential context-only questions with marks
                </p>
                {stats.samples?.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-muted-foreground">Sample questions:</p>
                    {stats.samples.map((s: any, idx: number) => (
                      <div key={idx} className="text-sm p-2 bg-background rounded border">
                        <span className="font-mono text-xs">{s.text}...</span>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline">Marks: {s.marks}</Badge>
                          {s.has_children && <Badge variant="secondary">Has children</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fix Parent IDs Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-blue-500" />
              Step 2: Fix Parent Question IDs
            </CardTitle>
            <CardDescription>
              This sets up parent/child relationships for multi-part questions based on question_number and part_label.
              Run this FIRST to establish the hierarchical structure.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={runFixParents} disabled={isFixingParents} variant="default">
              {isFixingParents ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Fixing Parent IDs...
                </>
              ) : (
                <>
                  <Wrench className="w-4 h-4 mr-2" />
                  Fix Parent Question IDs
                </>
              )}
            </Button>

            {parentResults && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-800 dark:text-blue-200">Parent IDs Fixed</span>
                </div>
                <ul className="text-sm space-y-1 text-blue-700 dark:text-blue-300">
                  <li>• Questions fixed: {parentResults.fixed}</li>
                  <li>• Total checked: {parentResults.total_checked}</li>
                  {parentResults.errors?.length > 0 && (
                    <li className="text-orange-600">• Errors: {parentResults.errors.length}</li>
                  )}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fix Question Bank Parent IDs Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-green-500" />
              Step 2b: Fix Question Bank Parent IDs
            </CardTitle>
            <CardDescription>
              This fixes parent/child relationships for questions already in the Question Bank.
              Run this after fixing paper_questions parent IDs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={runFixBankParents} disabled={isFixingBankParents} variant="default">
              {isFixingBankParents ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Fixing Question Bank...
                </>
              ) : (
                <>
                  <Wrench className="w-4 h-4 mr-2" />
                  Fix Question Bank Parent IDs
                </>
              )}
            </Button>

            {bankParentResults && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-800 dark:text-green-200">Question Bank Parent IDs Fixed</span>
                </div>
                <ul className="text-sm space-y-1 text-green-700 dark:text-green-300">
                  <li>• Questions fixed: {bankParentResults.fixed}</li>
                  <li>• Total checked: {bankParentResults.total_checked}</li>
                  {bankParentResults.errors?.length > 0 && (
                    <li className="text-orange-600">• Errors: {bankParentResults.errors.length}</li>
                  )}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Run Fix Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-primary" />
              Step 3: Fix Context Questions
            </CardTitle>
            <CardDescription>
              This will update the database to fix context-only questions (set marks=0, needs_answer=false)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={runFix} disabled={isFixing} variant="default">
              {isFixing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Fixing...
                </>
              ) : (
                <>
                  <Wrench className="w-4 h-4 mr-2" />
                  Run Fix
                </>
              )}
            </Button>

            {results && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-800 dark:text-green-200">Fix Complete</span>
                </div>
                <ul className="text-sm space-y-1 text-green-700 dark:text-green-300">
                  <li>• Paper questions fixed: {results.paper_questions_fixed}</li>
                  <li>• Question bank fixed: {results.questions_fixed}</li>
                  {results.errors?.length > 0 && (
                    <li className="text-orange-600">• Errors: {results.errors.length}</li>
                  )}
                </ul>
                
                {results.debug && (
                  <details className="mt-3">
                    <summary className="text-sm cursor-pointer text-blue-600 hover:text-blue-800">Debug Information</summary>
                    <div className="mt-2 text-xs space-y-1">
                      <p><strong>Total paper_questions:</strong> {results.debug.paper_questions_total}</p>
                      <p><strong>Total questions:</strong> {results.debug.questions_total}</p>
                      <p><strong>Paper children found:</strong> {results.debug.paper_children_found}</p>
                      <p><strong>Questions children found:</strong> {results.debug.questions_children_found}</p>
                      
                      {results.debug.sample_paper_questions && results.debug.sample_paper_questions.length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer">Sample paper_questions</summary>
                          <pre className="mt-1 bg-white p-2 rounded border overflow-auto max-h-32">
                            {JSON.stringify(results.debug.sample_paper_questions, null, 2)}
                          </pre>
                        </details>
                      )}
                      
                      {results.debug.sample_questions && results.debug.sample_questions.length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer">Sample questions</summary>
                          <pre className="mt-1 bg-white p-2 rounded border overflow-auto max-h-32">
                            {JSON.stringify(results.debug.sample_questions, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </details>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>What this fixes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>This tool identifies and fixes questions that:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Are parent questions with child parts (a, b, c...)</li>
              <li>Have marks incorrectly assigned (should be 0)</li>
              <li>Contain context patterns like "consists of both", "has been the victim", etc.</li>
            </ul>
            <p className="mt-4">After running this fix:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Context questions will have marks = 0</li>
              <li>Context questions will have needs_answer = false</li>
              <li>Context questions will not show answer input fields</li>
              <li>Only the actual answerable parts will count towards totals</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
