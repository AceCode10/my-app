'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

/**
 * Batch progress.
 *
 * The client drives the work: it POSTs to /jobs/[id]/step for up to three jobs
 * at a time. Each request advances exactly one paper, so no serverless
 * invocation has to carry the whole folder and closing the tab pauses the batch
 * rather than failing it — reopening this page resumes.
 */

const CONCURRENCY = 3;

interface GateResult {
  id: string;
  label: string;
  passed: boolean;
  hard: boolean;
  detail: string;
}

interface JobRow {
  id: string;
  pair_key: string;
  paper_id: string | null;
  status: string;
  stage: string;
  profile_id: string | null;
  subject_code: string | null;
  exam_year: number | null;
  session_code: string | null;
  paper_number: string | null;
  variant: string | null;
  questions_extracted: number;
  answers_matched: number;
  answers_unmatched: number;
  figures_extracted: number;
  questions_mirrored: number;
  marks_extracted: number | null;
  marks_stated_qp: number | null;
  confidence: number | null;
  gate_results: GateResult[] | null;
  warnings: string[] | null;
  error_message: string | null;
  degraded_mode: string | null;
  llm_calls: number;
}

const TERMINAL = ['completed', 'completed_with_warnings', 'needs_review', 'failed', 'skipped', 'cancelled'];

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') {
    return <Badge className="bg-emerald-600 hover:bg-emerald-600"><CheckCircle2 className="mr-1 h-3 w-3" />Done</Badge>;
  }
  if (status === 'needs_review') {
    return <Badge variant="secondary" className="bg-amber-500 text-white hover:bg-amber-500"><AlertTriangle className="mr-1 h-3 w-3" />Review</Badge>;
  }
  if (status === 'completed_with_warnings') {
    return <Badge variant="secondary"><AlertTriangle className="mr-1 h-3 w-3" />Warnings</Badge>;
  }
  if (status === 'failed') {
    return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Failed</Badge>;
  }
  if (status === 'running') {
    return <Badge variant="outline"><Loader2 className="mr-1 h-3 w-3 animate-spin" />Running</Badge>;
  }
  return <Badge variant="outline">{status}</Badge>;
}

export default function IngestionBatchPage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = use(params);
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const inFlight = useRef(new Set<string>());

  const { data } = useQuery({
    queryKey: ['ingestion-batch', batchId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/ingestion/batches/${batchId}`);
      if (!response.ok) throw new Error('Could not load the batch');
      return response.json();
    },
    refetchInterval: (query) => (query.state.data?.allTerminal ? false : 2500),
  });

  const jobs: JobRow[] = data?.jobs ?? [];
  const summary = data?.summary;

  const pump = useCallback(async () => {
    const pending = jobs.filter((j) => !TERMINAL.includes(j.status) && !inFlight.current.has(j.id));
    if (pending.length === 0) return;

    const slots = CONCURRENCY - inFlight.current.size;
    for (const job of pending.slice(0, Math.max(0, slots))) {
      inFlight.current.add(job.id);
      void fetch(`/api/admin/ingestion/jobs/${job.id}/step`, { method: 'POST' })
        .catch(() => undefined)
        .finally(() => {
          inFlight.current.delete(job.id);
          void queryClient.invalidateQueries({ queryKey: ['ingestion-batch', batchId] });
        });
    }
  }, [jobs, batchId, queryClient]);

  useEffect(() => {
    if (!running) return;
    if (data?.allTerminal) {
      setRunning(false);
      return;
    }
    void pump();
  }, [running, data, pump]);

  const done = jobs.filter((j) => TERMINAL.includes(j.status)).length;
  const progress = jobs.length > 0 ? Math.round((done / jobs.length) * 100) : 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Ingestion batch</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {done} of {jobs.length} papers processed
            {summary ? ` · ${summary.questions} questions · ${summary.answers} answers · ${summary.mirrored} in the question bank` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['ingestion-batch', batchId] })}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button onClick={() => setRunning(true)} disabled={running || data?.allTerminal}>
            {running && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {data?.allTerminal ? 'Finished' : running ? 'Processing…' : 'Start processing'}
          </Button>
        </div>
      </div>

      <Progress value={progress} />

      {summary && (
        <div className="grid gap-3 md:grid-cols-5">
          {[
            ['Completed', summary.completed],
            ['Needs review', summary.needsReview],
            ['Failed', summary.failed],
            ['In the bank', summary.mirrored],
            ['LLM calls', summary.llmCalls],
          ].map(([label, value]) => (
            <Card key={label as string} className="p-3">
              <p className="text-muted-foreground text-xs">{label}</p>
              <p className="text-xl font-semibold">{value as number}</p>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <table className="w-full text-sm">
          <thead className="text-muted-foreground border-b text-left text-xs uppercase">
            <tr>
              <th className="p-3">Paper</th>
              <th>Status</th>
              <th>Stage</th>
              <th>Questions</th>
              <th>Answers</th>
              <th>Marks</th>
              <th>Figures</th>
              <th>Bank</th>
              <th>Confidence</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => {
              const marksOk =
                job.marks_extracted !== null &&
                job.marks_stated_qp !== null &&
                job.marks_extracted === job.marks_stated_qp;

              return (
                <>
                  <tr key={job.id} className="border-b last:border-0">
                    <td className="p-3">
                      <div className="font-medium">
                        {job.subject_code ?? '—'} {job.exam_year ?? ''} {job.session_code?.toUpperCase() ?? ''}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        Paper {job.paper_number ?? '?'}{job.variant ? `/${job.variant}` : ''} · {job.profile_id}
                        {job.degraded_mode ? ` · degraded (${job.degraded_mode})` : ''}
                      </div>
                    </td>
                    <td><StatusBadge status={job.status} /></td>
                    <td className="text-muted-foreground text-xs">{job.stage}</td>
                    <td>{job.questions_extracted || '—'}</td>
                    <td>
                      {job.answers_matched || '—'}
                      {job.answers_unmatched > 0 && (
                        <span className="text-amber-600"> (+{job.answers_unmatched} missing)</span>
                      )}
                    </td>
                    <td className={marksOk ? '' : 'text-destructive font-medium'}>
                      {job.marks_extracted ?? '—'}/{job.marks_stated_qp ?? '—'}
                    </td>
                    <td>{job.figures_extracted || '—'}</td>
                    <td>{job.questions_mirrored || '—'}</td>
                    <td>{job.confidence !== null ? `${Math.round(job.confidence * 100)}%` : '—'}</td>
                    <td className="pr-3 text-right">
                      {job.paper_id && (
                        <Link href={`/admin/papers/${job.paper_id}/questions`} className="text-primary inline-flex items-center text-xs hover:underline">
                          Review <ExternalLink className="ml-1 h-3 w-3" />
                        </Link>
                      )}
                      {(job.gate_results?.some((g) => !g.passed) || job.error_message) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ml-2 h-6 text-xs"
                          onClick={() => setExpanded(expanded === job.id ? null : job.id)}
                        >
                          {expanded === job.id ? 'Hide' : 'Why?'}
                        </Button>
                      )}
                    </td>
                  </tr>

                  {expanded === job.id && (
                    <tr key={`${job.id}-detail`} className="bg-muted/30 border-b">
                      <td colSpan={10} className="p-3 text-xs">
                        {job.error_message && (
                          <p className="text-destructive mb-2 font-medium">{job.error_message}</p>
                        )}
                        <ul className="space-y-1">
                          {(job.gate_results ?? [])
                            .filter((g) => !g.passed)
                            .map((gate) => (
                              <li key={gate.id}>
                                <Badge variant={gate.hard ? 'destructive' : 'secondary'} className="mr-2">
                                  {gate.hard ? 'blocking' : 'advisory'}
                                </Badge>
                                <span className="font-medium">{gate.label}</span> — {gate.detail}
                              </li>
                            ))}
                        </ul>
                        {(job.warnings ?? []).length > 0 && (
                          <details className="mt-2">
                            <summary className="cursor-pointer">{job.warnings!.length} warnings</summary>
                            <ul className="mt-1 list-inside list-disc">
                              {job.warnings!.map((w, i) => <li key={i}>{w}</li>)}
                            </ul>
                          </details>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </Card>

      {(data?.orphans ?? []).length > 0 && (
        <Card className="p-4">
          <h2 className="mb-2 font-medium">Files not attached to a paper</h2>
          <ul className="text-muted-foreground list-inside list-disc text-sm">
            {data.orphans.map((o: { id: string; original_name: string; error_message: string | null }) => (
              <li key={o.id}>{o.original_name}{o.error_message ? ` — ${o.error_message}` : ''}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
