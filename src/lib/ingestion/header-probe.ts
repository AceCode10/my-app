import { monthToSession, splitComponent } from './profiles/types';
import type { BoardProfile } from './profiles/types';
import type { PaperMeta, SessionCode } from './types';

/**
 * Read a paper's own front matter to confirm or correct the filename guess.
 *
 * Verified recoverable on 37/37 Cambridge ICT papers: the cover states
 * "0417/12", "Paper 1 Theory", "May/June 2023" and "The total mark for this
 * paper is 80."; mark schemes state "Maximum Mark: 80".
 *
 * The filename supplies a hypothesis; this supplies evidence. Where they
 * disagree the header wins for content fields and the conflict is recorded.
 */

export interface HeaderProbeResult {
  subjectCode: string | null;
  componentCode: string | null;
  paperNumber: string | null;
  variant: string | null;
  year: number | null;
  session: SessionCode;
  statedTotalMarks: number | null;
  durationMinutes: number | null;
  paperTitle: string | null;
}

function parseDuration(match: RegExpMatchArray | null): number | null {
  if (!match) return null;
  // "1 hour 30 minutes" | "2 hours" | "45 minutes"
  const hours = match[1] ? Number(match[1]) : 0;
  const minutesAfterHours = match[2] ? Number(match[2]) : 0;
  const bareMinutes = match[3] ? Number(match[3]) : 0;
  if (bareMinutes) return bareMinutes;
  const total = hours * 60 + minutesAfterHours;
  return total > 0 ? total : null;
}

export function probeHeader(headerText: string, profile: BoardProfile): HeaderProbeResult {
  const rules = profile.headerProbe;
  const text = headerText || '';

  const result: HeaderProbeResult = {
    subjectCode: null,
    componentCode: null,
    paperNumber: null,
    variant: null,
    year: null,
    session: 'unknown',
    statedTotalMarks: null,
    durationMinutes: null,
    paperTitle: null,
  };

  if (rules.syllabus) {
    const m = text.match(rules.syllabus);
    if (m) {
      result.subjectCode = m[1] ?? null;
      if (m[2]) {
        result.componentCode = m[2];
        const split = splitComponent(m[2]);
        result.paperNumber = split.paperNumber;
        result.variant = split.variant;
      }
    }
  }

  if (rules.session) {
    const m = text.match(rules.session);
    if (m) {
      // Group 1 is the session phrase, group 2 the year. Mapping goes through
      // the session code because the cover says "October/November" where the
      // filename says "November".
      const phrase = m[1] ?? '';
      const firstMonth = phrase.split('/')[0].trim();
      result.session = monthToSession(firstMonth);
      const year = Number(m[2]);
      if (Number.isFinite(year) && year > 1990 && year < 2100) result.year = year;
    }
  }

  // A paper number from the explicit "Paper N" line beats one inferred from the
  // component code only when the latter is absent.
  if (rules.paperVariant) {
    const m = text.match(rules.paperVariant);
    if (m) {
      if (!result.paperNumber && m[1]) result.paperNumber = m[1];
      if (m[2] && m[2].trim()) result.paperTitle = m[2].trim();
    }
  }

  if (rules.totalMarks) {
    const m = text.match(rules.totalMarks);
    if (m) result.statedTotalMarks = Number(m[1]);
  }

  // Mark schemes state the maximum differently; try that too.
  if (result.statedTotalMarks === null && rules.msMaxMark) {
    const m = text.match(rules.msMaxMark);
    if (m) result.statedTotalMarks = Number(m[1]);
  }

  if (rules.duration) {
    result.durationMinutes = parseDuration(text.match(rules.duration));
  }

  return result;
}

export interface ReconcileResult {
  meta: PaperMeta;
  conflicts: string[];
}

/**
 * Merge filename metadata with header evidence.
 *
 * Header wins on the fields it can see directly; the filename remains the only
 * source of docType (a mark scheme and its paper have near-identical covers).
 */
export function reconcileMetadata(
  fromFilename: PaperMeta,
  probe: HeaderProbeResult,
  profile: BoardProfile,
): ReconcileResult {
  const conflicts: string[] = [];
  const meta: PaperMeta = { ...fromFilename, profileId: profile.id };

  const take = <K extends keyof HeaderProbeResult & keyof PaperMeta>(
    key: K,
    label: string,
  ): void => {
    const probed = probe[key] as PaperMeta[K] | null;
    if (probed === null || probed === undefined || probed === 'unknown') return;

    const existing = meta[key];
    if (existing !== null && existing !== undefined && existing !== 'unknown' && existing !== probed) {
      conflicts.push(`${label}: filename says ${String(existing)}, paper says ${String(probed)}`);
    }
    meta[key] = probed;
  };

  take('subjectCode', 'subject code');
  take('year', 'year');
  take('session', 'session');
  take('paperNumber', 'paper number');
  take('variant', 'variant');
  take('componentCode', 'component code');

  if (probe.statedTotalMarks !== null) meta.statedTotalMarks = probe.statedTotalMarks;
  if (probe.durationMinutes !== null) meta.durationMinutes = probe.durationMinutes;
  if (probe.paperTitle && !meta.subjectName) meta.subjectName = probe.paperTitle;

  // Confidence reflects how much independent evidence agreed.
  const probedFields = [
    probe.subjectCode,
    probe.year,
    probe.session !== 'unknown' ? probe.session : null,
    probe.paperNumber,
    probe.statedTotalMarks,
  ].filter((v) => v !== null && v !== undefined).length;

  if (conflicts.length > 0) {
    meta.source = 'conflict';
    meta.confidence = Math.min(fromFilename.confidence, 0.6);
  } else if (probedFields >= 3) {
    meta.source = fromFilename.source === 'override' ? 'override' : 'header';
    meta.confidence = Math.max(fromFilename.confidence, 0.9);
  }

  return { meta, conflicts };
}
