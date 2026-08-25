'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { FileStack, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface BatchRow {
  id: string;
  label: string | null;
  status: string;
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  created_at: string;
}

export default function IngestionBatchesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['ingestion-batches'],
    queryFn: async () => {
      const response = await fetch('/api/admin/ingestion/batches');
      if (!response.ok) throw new Error('Could not load batches');
      return response.json();
    },
  });

  const batches: BatchRow[] = data?.batches ?? [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Paper ingestion</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Automated extraction of questions and mark scheme answers from past paper PDFs.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/ingestion/new"><Plus className="mr-2 h-4 w-4" /> New batch</Link>
        </Button>
      </div>

      {isLoading ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">Loading…</Card>
      ) : batches.length === 0 ? (
        <Card className="p-10 text-center">
          <FileStack className="text-muted-foreground mx-auto h-10 w-10" />
          <p className="mt-3 font-medium">No batches yet</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Drop a folder of question papers and mark schemes to get started.
          </p>
          <Button asChild className="mt-4">
            <Link href="/admin/ingestion/new">Ingest papers</Link>
          </Button>
        </Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead className="text-muted-foreground border-b text-left text-xs uppercase">
              <tr>
                <th className="p-3">Batch</th>
                <th>Status</th>
                <th>Papers</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => (
                <tr key={batch.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{batch.label ?? batch.id.slice(0, 8)}</td>
                  <td>
                    <Badge variant={batch.failed_jobs > 0 ? 'destructive' : 'outline'}>
                      {batch.status}
                    </Badge>
                  </td>
                  <td>{batch.completed_jobs}/{batch.total_jobs}</td>
                  <td className="text-muted-foreground text-xs">
                    {new Date(batch.created_at).toLocaleString()}
                  </td>
                  <td className="pr-3 text-right">
                    <Link href={`/admin/ingestion/${batch.id}`} className="text-primary text-xs hover:underline">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
