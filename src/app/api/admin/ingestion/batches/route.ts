import { NextRequest, NextResponse } from 'next/server';
import { pairDocuments } from '@/lib/ingestion/pairing';
import type { FileRef } from '@/lib/ingestion/types';
import { PAST_PAPERS_BUCKET, requireAdmin, storagePathFor } from '../_lib';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/admin/ingestion/batches
 *
 * Accepts a folder's worth of PDFs, pairs them into question-paper /
 * mark-scheme sittings, uploads the sources, and creates one job per pair.
 *
 * This endpoint only creates rows — it deliberately does no extraction, so it
 * cannot exceed the serverless time limit no matter how many files arrive. The
 * client then drives /jobs/[jobId]/step, one stage per request.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  try {
    const form = await request.formData();
    const files = form.getAll('files').filter((f): f is File => f instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: 'No PDFs were uploaded' }, { status: 400 });
    }

    const subjectId = (form.get('subjectId') as string) || null;
    const examBoardId = (form.get('examBoardId') as string) || null;
    const level = (form.get('level') as string) || null;
    const profileId = (form.get('profileId') as string) || null;
    const label = (form.get('label') as string) || null;

    const options = {
      mirror: form.get('mirror') !== 'false',
      figures: form.get('figures') !== 'false',
      autoPublish: form.get('autoPublish') !== 'false',
      confidenceGate: Number(form.get('confidenceGate') ?? 0.92),
    };

    // --- pair on filenames, exactly as the preview did client-side ----------
    const refs: FileRef[] = files.map((file) => ({ name: file.name, path: file.name, size: file.size }));
    const pairing = pairDocuments(refs, { overrideProfile: profileId });

    const { data: batch, error: batchError } = await ctx.service
      .from('ingestion_batches')
      .insert({
        label,
        source: 'admin_ui',
        created_by: ctx.userId,
        subject_id: subjectId,
        exam_board_id: examBoardId,
        level,
        profile_id: profileId,
        options,
        total_jobs: pairing.pairs.filter((p) => p.questionPaper).length,
        status: 'pending',
      })
      .select('id')
      .single();

    if (batchError) throw new Error(`Creating the batch failed: ${batchError.message}`);

    const byName = new Map(files.map((file) => [file.name, file]));
    const uploadWarnings: string[] = [];

    for (const pair of pairing.pairs) {
      const { data: job, error: jobError } = await ctx.service
        .from('ingestion_jobs')
        .insert({
          batch_id: batch.id,
          pair_key: pair.pairKey,
          profile_id: pair.meta.profileId,
          subject_code: pair.meta.subjectCode,
          exam_year: pair.meta.year,
          session_code: pair.meta.session,
          paper_number: pair.meta.paperNumber,
          variant: pair.meta.variant,
          metadata_source: pair.meta.source,
          metadata_confidence: pair.meta.confidence,
          status: pair.questionPaper ? 'pending' : 'skipped',
          stage: 'discover',
          warnings: pair.issues,
        })
        .select('id')
        .single();

      if (jobError) {
        uploadWarnings.push(`Creating a job for ${pair.pairKey} failed: ${jobError.message}`);
        continue;
      }

      const members: { file: File; docType: string }[] = [];
      if (pair.questionPaper) {
        const file = byName.get(pair.questionPaper.name);
        if (file) members.push({ file, docType: 'qp' });
      }
      if (pair.markScheme) {
        const file = byName.get(pair.markScheme.name);
        if (file) members.push({ file, docType: 'ms' });
      }
      for (const extra of pair.extras) {
        const file = byName.get(extra.file.name);
        if (file) members.push({ file, docType: extra.docType });
      }

      for (const member of members) {
        const path = storagePathFor(pair.meta, member.docType, member.file.name);
        let storagePath: string | null = null;
        let publicUrl: string | null = null;

        try {
          const bytes = new Uint8Array(await member.file.arrayBuffer());
          const { error } = await ctx.service.storage
            .from(PAST_PAPERS_BUCKET)
            .upload(path, bytes, { contentType: 'application/pdf', upsert: true });
          if (error) throw new Error(error.message);

          storagePath = path;
          publicUrl = ctx.service.storage.from(PAST_PAPERS_BUCKET).getPublicUrl(path).data.publicUrl;
        } catch (error) {
          uploadWarnings.push(`Uploading ${member.file.name} failed: ${(error as Error).message}`);
        }

        await ctx.service.from('ingestion_files').insert({
          job_id: job.id,
          batch_id: batch.id,
          original_name: member.file.name,
          doc_type: member.docType,
          storage_bucket: PAST_PAPERS_BUCKET,
          storage_path: storagePath,
          public_url: publicUrl,
          file_size: member.file.size,
          status: storagePath ? 'uploaded' : 'failed',
        });
      }
    }

    // Files we could not even classify are recorded so nothing goes missing.
    for (const item of pairing.unresolved) {
      const file = byName.get(item.file.name);
      await ctx.service.from('ingestion_files').insert({
        batch_id: batch.id,
        original_name: item.file.name,
        doc_type: 'unknown',
        file_size: file?.size ?? null,
        status: 'orphan',
        error_message: item.reason,
      });
    }

    return NextResponse.json({
      batchId: batch.id,
      pairs: pairing.pairs.length,
      stats: pairing.stats,
      unresolved: pairing.unresolved.map((u) => ({ name: u.file.name, reason: u.reason })),
      warnings: uploadWarnings,
    });
  } catch (error) {
    console.error('[ingestion] batch creation failed', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

/** GET /api/admin/ingestion/batches — recent batches. */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.ctx.service
    .from('ingestion_batches')
    .select('id, label, status, total_jobs, completed_jobs, failed_jobs, created_at, completed_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ batches: data ?? [] });
}
