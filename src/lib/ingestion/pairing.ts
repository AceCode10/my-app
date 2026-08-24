import { buildPairKey, parseFilename, type FilenameParseResult } from './filename-parser';
import type { BoardId, DocType, FileRef, PaperMeta } from './types';

/**
 * Group a pile of PDFs into question-paper / mark-scheme pairs.
 *
 * Grouping is on RESOLVED metadata, not raw filenames, so
 * "0417 ... June 2023 Question paper  12" and "0417_s23_ms_12" land together.
 * Verified on the real corpus: 73 files -> 36 pairs + 1 orphan question paper.
 *
 * Pure and synchronous, so the admin UI can run it client-side and show the
 * operator every pair before a single byte is uploaded.
 */

export interface PairedPaper {
  pairKey: string;
  meta: PaperMeta;
  questionPaper: FileRef | null;
  markScheme: FileRef | null;
  extras: { file: FileRef; docType: DocType }[];
  /** More than one candidate for a slot — the operator must resolve. */
  duplicates: { docType: DocType; files: FileRef[] }[];
  issues: string[];
}

export interface PairingResult {
  pairs: PairedPaper[];
  /** Files whose metadata could not be resolved well enough to group. */
  unresolved: { file: FileRef; reason: string }[];
  stats: {
    files: number;
    complete: number;
    questionPaperOnly: number;
    markSchemeOnly: number;
    duplicates: number;
  };
}

function toMeta(parsed: FilenameParseResult): PaperMeta {
  const { profile: _profile, ...meta } = parsed;
  return meta;
}

export function pairDocuments(
  files: FileRef[],
  options: { overrideProfile?: BoardId | string | null } = {},
): PairingResult {
  const groups = new Map<string, { meta: PaperMeta; files: { file: FileRef; meta: PaperMeta }[] }>();
  const unresolved: { file: FileRef; reason: string }[] = [];

  for (const file of files) {
    const parsed = parseFilename(file.name, options.overrideProfile);
    const meta = toMeta(parsed);

    if (meta.docType === 'unknown' && meta.confidence < 0.3) {
      unresolved.push({
        file,
        reason: 'Could not tell whether this is a question paper or a mark scheme.',
      });
      continue;
    }

    const key = buildPairKey(meta);
    if (!groups.has(key)) groups.set(key, { meta, files: [] });
    groups.get(key)!.files.push({ file, meta });
  }

  const pairs: PairedPaper[] = [];

  for (const [pairKey, group] of groups) {
    const byType = new Map<DocType, FileRef[]>();
    for (const entry of group.files) {
      const list = byType.get(entry.meta.docType) ?? [];
      list.push(entry.file);
      byType.set(entry.meta.docType, list);
    }

    const qps = byType.get('qp') ?? [];
    const mss = byType.get('ms') ?? [];

    const duplicates: PairedPaper['duplicates'] = [];
    if (qps.length > 1) duplicates.push({ docType: 'qp', files: qps });
    if (mss.length > 1) duplicates.push({ docType: 'ms', files: mss });

    const extras: PairedPaper['extras'] = [];
    for (const [docType, list] of byType) {
      if (docType === 'qp' || docType === 'ms') continue;
      for (const file of list) extras.push({ file, docType });
    }

    const issues: string[] = [];
    if (qps.length === 0) {
      issues.push('No question paper for this mark scheme; it will be held as an orphan.');
    }
    if (mss.length === 0) {
      issues.push('No mark scheme; questions will be ingested without answers.');
    }
    for (const duplicate of duplicates) {
      issues.push(
        `${duplicate.files.length} files claim to be the ${duplicate.docType} for this paper.`,
      );
    }

    // Prefer the metadata of the question paper — it carries the stated total.
    const primary = group.files.find((f) => f.meta.docType === 'qp') ?? group.files[0];

    pairs.push({
      pairKey,
      meta: primary.meta,
      questionPaper: qps[0] ?? null,
      markScheme: mss[0] ?? null,
      extras,
      duplicates,
      issues,
    });
  }

  pairs.sort((a, b) => a.pairKey.localeCompare(b.pairKey));

  return {
    pairs,
    unresolved,
    stats: {
      files: files.length,
      complete: pairs.filter((p) => p.questionPaper && p.markScheme).length,
      questionPaperOnly: pairs.filter((p) => p.questionPaper && !p.markScheme).length,
      markSchemeOnly: pairs.filter((p) => !p.questionPaper && p.markScheme).length,
      duplicates: pairs.filter((p) => p.duplicates.length > 0).length,
    },
  };
}
