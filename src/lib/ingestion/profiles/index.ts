import type { BoardId } from '../types';
import { apProfile } from './ap';
import { aqaProfile } from './aqa';
import { cambridgeProfile } from './cambridge';
import { edexcelProfile } from './edexcel';
import { genericProfile } from './generic';
import { ibProfile } from './ib';
import { ocrProfile } from './ocr';
import type { BoardProfile } from './types';

export * from './types';
export {
  apProfile,
  aqaProfile,
  cambridgeProfile,
  edexcelProfile,
  genericProfile,
  ibProfile,
  ocrProfile,
};

/**
 * Detection order matters.
 *
 * OCR must be evaluated before Cambridge: OCR papers carry the phrase
 * "Oxford Cambridge and RSA", which contains "Cambridge" and would otherwise
 * score against the Cambridge profile. Likewise Oxford AQA International papers
 * mention neither Cambridge nor plain AQA branding consistently, so AQA is
 * checked before the broad Cambridge signatures too.
 */
export const PROFILES: BoardProfile[] = [
  ocrProfile,
  edexcelProfile,
  aqaProfile,
  apProfile,
  ibProfile,
  cambridgeProfile,
];

export const PROFILES_BY_ID: Record<string, BoardProfile> = Object.fromEntries(
  [...PROFILES, genericProfile].map((p) => [p.id, p]),
);

export function getProfile(id: BoardId | string | null | undefined): BoardProfile {
  if (!id) return genericProfile;
  return PROFILES_BY_ID[id] ?? genericProfile;
}

export interface ProfileDetection {
  profile: BoardProfile;
  score: number;
  reason: 'override' | 'filename' | 'text' | 'fallback';
}

/**
 * Resolve which parser profile applies.
 *
 * Precedence: explicit override > filename pattern > weighted text signature >
 * generic. `headerText` should be the first page or two of extracted text.
 */
export function resolveProfile(opts: {
  filename?: string;
  headerText?: string;
  override?: BoardId | string | null;
}): ProfileDetection {
  if (opts.override) {
    const profile = PROFILES_BY_ID[opts.override];
    if (profile) return { profile, score: 1, reason: 'override' };
  }

  if (opts.filename) {
    const stem = stripExtension(opts.filename);
    for (const profile of PROFILES) {
      if (profile.detect.filenamePatterns.some((re) => re.test(stem))) {
        return { profile, score: 0.9, reason: 'filename' };
      }
    }
  }

  if (opts.headerText) {
    // Only the top of the document carries branding; scanning further just adds
    // noise (question text mentioning "Cambridge", etc.).
    const sample = opts.headerText.slice(0, 4000);
    let best: { profile: BoardProfile; score: number } | null = null;

    for (const profile of PROFILES) {
      let score = 0;
      for (const sig of profile.detect.textSignatures) {
        if (sig.re.test(sample)) score += sig.weight;
      }
      if (score > 0 && (!best || score > best.score)) {
        best = { profile, score };
      }
    }

    if (best && best.score >= 0.8) {
      return { profile: best.profile, score: Math.min(best.score / 2, 1), reason: 'text' };
    }
  }

  return { profile: genericProfile, score: 0.2, reason: 'fallback' };
}

export function stripExtension(filename: string): string {
  return filename.replace(/\.[A-Za-z0-9]{1,5}$/, '');
}

/**
 * Normalise a filename before pattern matching: collapse runs of whitespace
 * (absorbing the double space in "Question paper  12") and trim.
 */
export function normalizeFilename(filename: string): string {
  return stripExtension(filename).replace(/[\s ]+/g, ' ').trim();
}
