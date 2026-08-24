import { PROFILES, getProfile, normalizeFilename, resolveProfile } from './profiles';
import type { BoardProfile } from './profiles/types';
import type { BoardId, DocType, PaperMeta } from './types';

/**
 * Filename -> paper metadata. Pure, no I/O, so the admin UI can run it
 * client-side and show the operator every detected pair BEFORE a single byte is
 * uploaded or a single token spent.
 *
 * The filename supplies a hypothesis; header-probe.ts confirms or overrides it.
 */

export const EMPTY_META: PaperMeta = {
  subjectCode: null,
  subjectName: null,
  year: null,
  session: 'unknown',
  paperNumber: null,
  variant: null,
  componentCode: null,
  docType: 'unknown',
  profileId: 'generic',
  statedTotalMarks: null,
  durationMinutes: null,
  confidence: 0,
  source: 'filename',
};

/** Last-resort doc-type sniff for names no profile pattern matched. */
function sniffDocType(name: string): DocType {
  const n = name.toLowerCase();
  if (/\b(ms|rms|msc|mark[\s_-]?scheme|marking[\s_-]?scheme|scoring|scoring[\s_-]?guidelines|sg)\b/.test(n)) {
    return 'ms';
  }
  if (/\b(qp|que|question[\s_-]?paper|frq|mcq|specimen[\s_-]?paper)\b/.test(n)) return 'qp';
  if (/\b(insert|ins|resource[\s_-]?booklet)\b/.test(n)) return 'insert';
  if (/\b(er|examiner[\s_-]?report)\b/.test(n)) return 'examiner_report';
  if (/\b(gt|grade[\s_-]?threshold)/.test(n)) return 'grade_thresholds';
  return 'unknown';
}

export interface FilenameParseResult extends PaperMeta {
  matchedPattern: string;
  profile: BoardProfile;
}

/**
 * Parse one filename. When `overrideProfile` is given, only that profile's
 * patterns are tried; otherwise every profile is tried in registry order and
 * the first match wins.
 */
export function parseFilename(
  filename: string,
  overrideProfile?: BoardId | string | null,
): FilenameParseResult {
  const normalized = normalizeFilename(filename);

  const detection = resolveProfile({ filename, override: overrideProfile });
  const candidates: BoardProfile[] = overrideProfile
    ? [getProfile(overrideProfile)]
    : detection.reason === 'filename'
      ? [detection.profile, ...PROFILES.filter((p) => p.id !== detection.profile.id)]
      : PROFILES;

  for (const profile of candidates) {
    for (const pattern of profile.filename) {
      const match = normalized.match(pattern.re);
      if (!match) continue;

      const parsed = pattern.parse(match);
      const docType = parsed.docType && parsed.docType !== 'unknown'
        ? parsed.docType
        : sniffDocType(normalized);

      return {
        ...EMPTY_META,
        ...parsed,
        docType,
        profileId: profile.id,
        source: overrideProfile ? 'override' : 'filename',
        matchedPattern: `${profile.id}:${pattern.id}`,
        profile,
      };
    }
  }

  // Nothing matched — hand back whatever the generic sniffers can salvage so
  // the header probe has a starting point.
  const generic = getProfile('generic');
  const year = normalized.match(/\b(19|20)\d{2}\b/);
  const paper = normalized.match(/\bp(?:aper)?[\s_-]?(\d{1,2})\b/i);

  return {
    ...EMPTY_META,
    year: year ? Number(year[0]) : null,
    paperNumber: paper ? paper[1] : null,
    docType: sniffDocType(normalized),
    profileId: 'generic',
    confidence: 0.15,
    source: 'filename',
    matchedPattern: 'none',
    profile: generic,
  };
}

/**
 * Group key for QP<->MS pairing. Built from RESOLVED metadata rather than the
 * raw filename, so "0417 ... June 2023 Question paper  12" and
 * "0417_s23_ms_12" land in the same group.
 *
 * Deliberately excludes docType.
 */
export function buildPairKey(meta: Pick<
  PaperMeta,
  'profileId' | 'subjectCode' | 'subjectName' | 'year' | 'session' | 'paperNumber' | 'variant'
>): string {
  return [
    meta.profileId,
    (meta.subjectCode ?? meta.subjectName ?? 'unknown').toLowerCase().replace(/\s+/g, '-'),
    meta.year ?? 'unknown',
    meta.session,
    meta.paperNumber ?? 'unknown',
    meta.variant ?? '-',
  ].join('|');
}

/** Stable identity for a past_papers row, so re-ingestion finds the same paper. */
export function buildIngestionKey(meta: PaperMeta): string {
  return buildPairKey(meta);
}
