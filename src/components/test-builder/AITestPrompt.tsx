'use client';

/**
 * Prompt box for AI test generation.
 *
 * Deliberately thin: it collects a sentence, posts it, and hands the teacher
 * into the existing test-builder editor. The generated test is always a draft,
 * so the editor — not this box — is where the paper gets approved.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Loader2, AlertTriangle, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const EXAMPLES = [
  'Create a 40 minute biology test for Cambridge IGCSE students',
  'A 25 mark ICT 0417 quiz on spreadsheets, mostly multiple choice',
  'Hard 1 hour chemistry paper covering the whole syllabus',
];

interface Candidate {
  id: string;
  label: string;
}

interface GenerateResponse {
  assessmentId?: string;
  editUrl?: string;
  status?: 'ok' | 'partial';
  message?: string;
  error?: string;
  field?: string;
  candidates?: Candidate[];
  diagnostics?: { achievedMarks: number; targetMarks: number };
  /** Which stage failed, for a 5xx. */
  code?: string;
  /** Short reference a teacher can quote in a bug report. */
  requestId?: string;
}

interface Failure {
  message: string;
  requestId?: string;
}

export function AITestPrompt({ classId }: { classId?: string }) {
  const router = useRouter();
  const { toast } = useToast();

  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [shortfall, setShortfall] = useState<string | null>(null);
  // A failed generation is answered in place, under the box that caused it,
  // rather than by a toast that slides away before it has been read.
  const [failure, setFailure] = useState<Failure | null>(null);

  async function generate(text: string) {
    if (!text.trim() || generating) return;

    setGenerating(true);
    setCandidates(null);
    setShortfall(null);
    setFailure(null);

    try {
      const response = await fetch('/api/v1/tests/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, classId }),
      });

      const data: GenerateResponse = await response.json();

      // An ambiguous subject is a question for the teacher, not a guess.
      if (response.status === 422 && data.candidates?.length) {
        setCandidates(data.candidates);
        return;
      }

      if (!response.ok) {
        // A 422 is a conversation about content, not a fault: it gets the amber
        // shortfall panel. Everything else is a failure.
        if (response.status === 422) {
          setShortfall(data.message ?? 'The bank could not fill that request.');
        } else {
          setFailure({
            message: data.message ?? 'Try rephrasing the request.',
            requestId: data.requestId,
          });
        }
        return;
      }

      // A partial test is still usable — say what is missing and let them edit.
      if (data.status === 'partial') {
        toast({
          title: 'Generated with gaps',
          description: data.message ?? 'The bank could not fill every mark.',
        });
      } else {
        toast({ title: 'Test generated', description: 'Review and edit before sharing.' });
      }

      if (data.editUrl) router.push(data.editUrl);
    } catch {
      setFailure({ message: 'Could not reach the generator. Check your connection and try again.' });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Card className="rounded-xl border-0 shadow-sm bg-primary/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-primary" />
          Describe the test you want
        </div>

        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generate(prompt);
          }}
          placeholder="Create a 40 minute biology test for Cambridge IGCSE students"
          rows={2}
          disabled={generating}
          className="bg-card resize-none"
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => generate(prompt)}
            disabled={generating || prompt.trim().length < 3}
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Building test...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate
              </>
            )}
          </Button>

          {!generating &&
            !prompt &&
            EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setPrompt(example)}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                {example}
              </button>
            ))}
        </div>

        {candidates && (
          <div className="rounded-lg border bg-card p-3 space-y-2">
            <p className="text-sm font-medium">Which one did you mean?</p>
            <div className="flex flex-wrap gap-2">
              {candidates.map((candidate) => (
                <Button
                  key={candidate.id}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const clarified = `${prompt} (${candidate.label})`;
                    setPrompt(clarified);
                    generate(clarified);
                  }}
                >
                  {candidate.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {failure && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
            <div className="space-y-1">
              <p>{failure.message}</p>
              {failure.requestId && (
                <p className="text-xs text-muted-foreground">
                  Reference: {failure.requestId}
                </p>
              )}
            </div>
          </div>
        )}

        {shortfall && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
            <span>{shortfall}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
