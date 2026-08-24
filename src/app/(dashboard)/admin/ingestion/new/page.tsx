'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { useQuery } from '@tanstack/react-query';
import { FileText, Loader2, Upload, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { pairDocuments } from '@/lib/ingestion/pairing';
import { EXAM_BOARDS } from '@/lib/exam-boards';
import type { FileRef } from '@/lib/ingestion/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

/**
 * Batch ingestion — upload step.
 *
 * The pairing preview is the highest-value part of this screen: filename
 * parsing and pairing are pure functions, so they run client-side and show the
 * operator every detected question-paper / mark-scheme pair BEFORE a single
 * byte is uploaded or a single token is spent.
 */
export default function NewIngestionBatchPage() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = useMemo(() => createClient(), []);

  const [files, setFiles] = useState<File[]>([]);
  const [subjectId, setSubjectId] = useState<string>('');
  const [examBoardId, setExamBoardId] = useState<string>('');
  const [level, setLevel] = useState<string>('');
  const [profileId, setProfileId] = useState<string>('auto');
  const [submitting, setSubmitting] = useState(false);

  const { data: subjects } = useQuery({
    queryKey: ['ingestion-subjects'],
    queryFn: async () => {
      const { data } = await supabase.from('subjects').select('id, name, code, level').order('name');
      return data ?? [];
    },
  });

  const { data: boards } = useQuery({
    queryKey: ['ingestion-boards'],
    queryFn: async () => {
      const { data } = await supabase.from('exam_boards').select('id, code, name').order('display_order');
      return data ?? [];
    },
  });

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((current) => {
      const seen = new Set(current.map((f) => f.name));
      return [...current, ...accepted.filter((f) => !seen.has(f.name))];
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
  });

  // Pure, synchronous — safe to recompute on every render.
  const pairing = useMemo(() => {
    const refs: FileRef[] = files.map((f) => ({ name: f.name, path: f.name, size: f.size }));
    return pairDocuments(refs, { overrideProfile: profileId === 'auto' ? null : profileId });
  }, [files, profileId]);

  const handleSubmit = async () => {
    if (files.length === 0) return;
    if (!subjectId) {
      toast({ title: 'Pick a subject', description: 'Ingested questions need a subject to belong to.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      for (const file of files) form.append('files', file);
      form.append('subjectId', subjectId);
      if (examBoardId) form.append('examBoardId', examBoardId);
      if (level) form.append('level', level);
      if (profileId !== 'auto') form.append('profileId', profileId);
      form.append('label', `${files.length} files — ${new Date().toLocaleDateString()}`);

      const response = await fetch('/api/admin/ingestion/batches', { method: 'POST', body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Upload failed');

      router.push(`/admin/ingestion/${payload.batchId}`);
    } catch (error) {
      toast({ title: 'Could not start ingestion', description: (error as Error).message, variant: 'destructive' });
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Ingest past papers</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Drop a folder of question papers and mark schemes. They are paired automatically, questions
          and answers are extracted, and everything lands in the question bank the test builder reads.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="space-y-2">
          <Label>Subject</Label>
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
            <SelectContent>
              {(subjects ?? []).map((s: { id: string; name: string; code: string | null }) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}{s.code ? ` (${s.code})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Exam board</Label>
          <Select value={examBoardId} onValueChange={setExamBoardId}>
            <SelectTrigger><SelectValue placeholder="From the paper" /></SelectTrigger>
            <SelectContent>
              {(boards ?? []).map((b: { id: string; code: string; name: string }) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Level</Label>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
            <SelectContent>
              {['igcse', 'gcse', 'as', 'a2', 'ib-dp', 'ap'].map((l) => (
                <SelectItem key={l} value={l}>{l.toUpperCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Parser profile</Label>
          <Select value={profileId} onValueChange={setProfileId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Detect automatically</SelectItem>
              {EXAM_BOARDS.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-10 text-center transition ${
          isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="text-muted-foreground mx-auto h-8 w-8" />
        <p className="mt-3 text-sm font-medium">
          {isDragActive ? 'Drop the PDFs here' : 'Drag a folder of PDFs here, or click to choose files'}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          Question papers and mark schemes together — they are matched up for you.
        </p>
      </div>

      {files.length > 0 && (
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">
              {pairing.pairs.length} papers detected from {files.length} files
            </h2>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{pairing.stats.complete} complete pairs</Badge>
              {pairing.stats.questionPaperOnly > 0 && (
                <Badge variant="secondary">{pairing.stats.questionPaperOnly} without a mark scheme</Badge>
              )}
              {pairing.stats.markSchemeOnly > 0 && (
                <Badge variant="secondary">{pairing.stats.markSchemeOnly} mark scheme only</Badge>
              )}
              {pairing.stats.duplicates > 0 && (
                <Badge variant="destructive">{pairing.stats.duplicates} duplicates</Badge>
              )}
              <Button size="sm" variant="ghost" onClick={() => setFiles([])}>
                <X className="mr-1 h-3 w-3" /> Clear
              </Button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground sticky top-0 bg-background text-left text-xs uppercase">
                <tr>
                  <th className="py-2">Board</th>
                  <th>Subject</th>
                  <th>Year</th>
                  <th>Session</th>
                  <th>Paper</th>
                  <th>Question paper</th>
                  <th>Mark scheme</th>
                </tr>
              </thead>
              <tbody>
                {pairing.pairs.map((pair) => (
                  <tr key={pair.pairKey} className="border-t">
                    <td className="py-2"><Badge variant="outline">{pair.meta.profileId}</Badge></td>
                    <td>{pair.meta.subjectCode ?? pair.meta.subjectName ?? '—'}</td>
                    <td>{pair.meta.year ?? '—'}</td>
                    <td className="uppercase">{pair.meta.session}</td>
                    <td>
                      {pair.meta.paperNumber ?? '—'}
                      {pair.meta.variant ? `/${pair.meta.variant}` : ''}
                    </td>
                    <td className="max-w-[220px] truncate">
                      {pair.questionPaper ? (
                        <span className="inline-flex items-center gap-1">
                          <FileText className="h-3 w-3 shrink-0" />
                          <span className="truncate">{pair.questionPaper.name}</span>
                        </span>
                      ) : (
                        <span className="text-destructive">missing</span>
                      )}
                    </td>
                    <td className="max-w-[220px] truncate">
                      {pair.markScheme ? (
                        <span className="inline-flex items-center gap-1">
                          <FileText className="h-3 w-3 shrink-0" />
                          <span className="truncate">{pair.markScheme.name}</span>
                        </span>
                      ) : (
                        <span className="text-amber-600">none — questions only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pairing.unresolved.length > 0 && (
            <div className="mt-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm dark:bg-amber-950/30">
              <p className="font-medium">
                {pairing.unresolved.length} files could not be identified
              </p>
              <ul className="mt-1 list-inside list-disc text-xs">
                {pairing.unresolved.map((u) => (
                  <li key={u.file.name}>{u.file.name} — {u.reason}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push('/admin/ingestion')}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={files.length === 0 || submitting || !subjectId}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Ingest {pairing.pairs.filter((p) => p.questionPaper).length} papers
        </Button>
      </div>
    </div>
  );
}
