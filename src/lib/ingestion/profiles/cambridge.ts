import type { PaperMeta } from '../types';
import {
  type BoardProfile,
  docTypeFromToken,
  expandYear,
  monthToSession,
  seriesLetterToSession,
  splitComponent,
} from './types';

/**
 * Cambridge Assessment International Education (CIE).
 *
 * The reference profile. Verified against 37 IGCSE ICT 0417 question papers and
 * 36 mark schemes, plus 9618/9626/9700/9610 samples. On this board the pipeline
 * is fully deterministic — the happy path makes zero LLM calls.
 */
export const cambridgeProfile: BoardProfile = {
  id: 'cambridge',
  label: 'Cambridge (CIE)',
  appExamBoardId: 'cambridge',
  dbExamBoardCode: 'CIE',

  detect: {
    filenamePatterns: [
      /^\d{4}_[smwy]\d{2}_(qp|ms|in|ci|er|gt|sp|sf|rp)_\d{1,2}$/i,
      /^\d{4}\s+.+\s+(question\s*paper|mark\s*scheme)\s+\d{1,2}$/i,
    ],
    textSignatures: [
      { re: /©\s*UCLES\s*\d{4}/i, weight: 1.0 },
      { re: /Cambridge\s+(IGCSE|International\s+AS\s*&\s*A\s*Level|O\s*Level|Pre-U)/i, weight: 0.9 },
      { re: /Cambridge\s+Assessment\s+International\s+Education/i, weight: 0.8 },
      { re: /\b\d{4}\/\d{2}\b/, weight: 0.3 },
    ],
  },

  filename: [
    {
      // Canonical: 0417_s23_qp_12
      id: 'cie_canonical',
      re: /^(?<code>\d{4})_(?<series>[smwy])(?<yy>\d{2})_(?<doc>qp|ms|in|ci|er|gt|sp|sf|rp)_(?<pv>\d{1,2})$/i,
      parse: (m): Partial<PaperMeta> => {
        const g = m.groups!;
        const { paperNumber, variant } = splitComponent(g.pv);
        return {
          subjectCode: g.code,
          year: expandYear(g.yy),
          session: seriesLetterToSession(g.series),
          paperNumber,
          variant,
          componentCode: g.pv,
          docType: docTypeFromToken(g.doc),
          confidence: 0.98,
        };
      },
    },
    {
      // Human-readable, as used in the user's folder. Note the tolerated double
      // space and the "Question paper" / "Question Paper" casing drift.
      id: 'cie_human',
      re: /^(?<code>\d{4})\s+(?<name>.+?)\s+(?<month>Jan(?:uary)?|Feb(?:ruary)?|March|Mar|May|June|Jun|July|Oct(?:ober)?|Nov(?:ember)?)\s+(?<year>\d{4})\s+(?<doc>Question\s*Paper|Mark\s*Scheme|Insert|Examiner\s*Report|Grade\s*Thresholds)\s+(?<pv>\d{1,2})$/i,
      parse: (m): Partial<PaperMeta> => {
        const g = m.groups!;
        const { paperNumber, variant } = splitComponent(g.pv);
        return {
          subjectCode: g.code,
          subjectName: g.name.trim(),
          year: Number(g.year),
          session: monthToSession(g.month),
          paperNumber,
          variant,
          componentCode: g.pv,
          docType: docTypeFromToken(g.doc.replace(/\s+/g, '')),
          confidence: 0.95,
        };
      },
    },
    {
      // Specimen papers carry a year but no month: "0417 ... 2023 Specimen
      // Question Paper 2". Without this the name falls through to the generic
      // sniffer, which cannot see the component number in a mark scheme and
      // collapses every specimen mark scheme onto one key.
      id: 'cie_specimen',
      re: /^(?<code>\d{4})\s+(?<name>.+?)\s+(?<year>\d{4})\s+Specimen\s+(?<doc>Question\s*Paper|Mark\s*Scheme|Insert|Paper)\s+(?<pv>\d{1,2})$/i,
      parse: (m): Partial<PaperMeta> => {
        const g = m.groups!;
        const { paperNumber, variant } = splitComponent(g.pv);
        return {
          subjectCode: g.code,
          subjectName: g.name.trim(),
          year: Number(g.year),
          session: 'unknown',
          paperNumber,
          variant,
          componentCode: g.pv,
          docType: docTypeFromToken(g.doc.replace(/\s+/g, '')),
          confidence: 0.9,
        };
      },
    },
    {
      // Long-form specimen/mark-scheme naming: 9610-BL02-...-mark-scheme-2016-v1
      id: 'cie_longform',
      re: /^(?<code>\d{4})-(?<comp>[A-Z]{2}\d{2})-(?<desc>.+?)-(?<doc>mark-scheme|specimen-paper|question-paper)-(?<year>\d{4})/i,
      parse: (m): Partial<PaperMeta> => {
        const g = m.groups!;
        const { paperNumber, variant } = splitComponent(g.comp.replace(/\D/g, ''));
        return {
          subjectCode: g.code,
          year: Number(g.year),
          session: 'unknown',
          paperNumber,
          variant,
          componentCode: g.comp,
          docType: g.doc.toLowerCase().includes('mark') ? 'ms' : 'qp',
          confidence: 0.8,
        };
      },
    },
  ],

  headerProbe: {
    // "INFORMATION AND COMMUNICATION TECHNOLOGY 0417/12"
    syllabus: /\b(\d{4})\/(\d{2})\b/,
    session: /(February\/March|May\/June|October\/November)\s+(\d{4})/i,
    paperVariant: /Paper\s*(\d)\s*([A-Za-z ]*?)(?=\s*(?:February|May|October|\d|$))/i,
    // "The total mark for this paper is 80."
    totalMarks: /total mark for this paper is\s*(\d+)/i,
    msMaxMark: /Maximum Mark:\s*(\d+)/i,
    duration: /(\d+)\s*hours?\s*(\d+)?\s*minutes?|(\d+)\s*minutes/i,
  },

  structure: {
    questionStart: /^(\d{1,2})$/,
    partLabel: /^\(([a-z])\)$/,
    subPartLabel: /^\(([ivxlcdm]+)\)$/,
    // Measured on the 0417 corpus.
    indentBands: {
      question: [40, 72],
      part: [62, 92],
      subpart: [82, 118],
    },
    partHierarchy: ['question', 'part', 'subpart'],
  },

  // Marks are right-aligned at the end of the answer-line block: "... [4]"
  marks: [/\[(\d{1,2})\]\s*$/m, /\[(\d{1,2})\]/],

  markScheme: {
    strategies: ['plumber_table_qam', 'llm'],
    headerMatch: /Question.*(Answer|Mark)/i,
    qidRegex: /^\d{1,2}(\([a-z]\))?(\([ivxlcdm]+\))?$/,
    maxMarkRegex: /Maximum Mark:\s*(\d+)/i,
  },

  pageFurniture: [
    /©\s*UCLES\s*\d{4}/i,
    /\[?\s*Turn\s*over\s*\]?/i,
    /^\s*PUBLISHED\s*$/mi,
    /DO\s*NOT\s*WRITE\s*IN\s*THIS\s*MARGIN/i,
    /^\s*BLANK\s*PAGE\s*$/mi,
    /Page\s+\d+\s+of\s+\d+/i,
    /^\s*\*\s*[\d\s]+\*\s*$/m, // barcode digits
    /^\s*\d{2}_\d{4}_\d{2}_\d{4}_[\d.]+\s*$/m, // "06_0417_12_2023_1.13"
    /Cambridge\s+IGCSE\s*[™]?\s*$/mi,
    /^\s*(NIGRAM|SIHT|ETIRW|TON|OD|NI)\s*$/m, // reversed margin text
  ],

  figureRefs: /\b(Fig|Figure|Table)\.?\s*\d+(\.\d+)?\b/i,
};
