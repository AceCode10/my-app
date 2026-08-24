import type { PaperMeta } from '../types';
import { type BoardProfile, monthToSession } from './types';

/**
 * International Baccalaureate.
 *
 * IB filenames are frequently opaque (the in-repo samples are
 * `practice-paper-1b-jkNaMsZl~nc-nPuk.pdf`), so this profile leans almost
 * entirely on the header probe. Papers are organised into Section A / Section B.
 */
export const ibProfile: BoardProfile = {
  id: 'ib',
  label: 'International Baccalaureate',
  appExamBoardId: 'ib',
  dbExamBoardCode: 'IB',

  detect: {
    filenamePatterns: [/\bib\b.*(hl|sl)\b/i, /^practice-paper-\d/i],
    textSignatures: [
      { re: /International\s+Baccalaureate/i, weight: 1.0 },
      { re: /Baccalaur[ée]at\s+International/i, weight: 1.0 },
      { re: /\bIB\s+(HL|SL)\b/i, weight: 0.9 },
      { re: /\b(Higher|Standard)\s+level\b.*\bPaper\s*\d\b/i, weight: 0.6 },
    ],
  },

  filename: [
    {
      id: 'ib_practice',
      re: /^practice-paper-(?<paper>\d)(?<variant>[a-z])?/i,
      parse: (m): Partial<PaperMeta> => {
        const g = m.groups!;
        return {
          paperNumber: g.paper,
          variant: g.variant ? g.variant.toLowerCase() : null,
          session: 'unknown',
          docType: 'qp',
          confidence: 0.5,
        };
      },
    },
    {
      id: 'ib_session',
      re: /(?<subject>[a-z_]+)[_-](?<level>hl|sl)[_-]paper[_-](?<paper>\d).*?(?<month>may|nov)[_-]?(?<year>\d{4})/i,
      parse: (m): Partial<PaperMeta> => {
        const g = m.groups!;
        return {
          subjectName: g.subject.replace(/[_-]/g, ' ').trim(),
          paperNumber: g.paper,
          variant: g.level.toLowerCase(),
          year: Number(g.year),
          session: monthToSession(g.month),
          docType: 'qp',
          confidence: 0.8,
        };
      },
    },
  ],

  headerProbe: {
    session: /(May|November)\s+(\d{4})/i,
    paperVariant: /Paper\s*(\d)\b/i,
    totalMarks: /\[?\s*Total\s*[:=]?\s*(\d+)\s*marks?\s*\]?/i,
    msMaxMark: /(?:Maximum|Total)\s+Mark[s]?[:\s]+(\d+)/i,
    duration: /(\d+)\s*hours?\s*(\d+)?\s*minutes?|(\d+)\s*(?:mins?|minutes)/i,
  },

  structure: {
    questionStart: /^(\d{1,2})\.?$/,
    partLabel: /^\(?([a-z])\)?$/,
    subPartLabel: /^\(?([ivxlcdm]+)\)?$/,
    indentBands: {
      question: [30, 85],
      part: [55, 110],
      subpart: [75, 135],
    },
    partHierarchy: ['question', 'part', 'subpart'],
  },

  marks: [/\[(\d{1,2})\]\s*$/, /\((\d{1,2})\)\s*$/],

  markScheme: {
    strategies: ['plumber_table_generic', 'llm'],
    headerMatch: /(Question).*(Answer|Marks)/i,
    qidRegex: /^\d{1,2}\.?\s*(\([a-z]\))?\s*(\([ivxlcdm]+\))?$/,
  },

  pageFurniture: [
    /International\s+Baccalaureate\s+Organization/i,
    /©\s*International\s+Baccalaureate/i,
    /Scan here to return to the course/i,
    /^\s*Turn over\s*$/i,
    /^\s*BLANK PAGE\s*$/i,
  ],

  figureRefs: /\b(Figure|Fig|Diagram|Table|Source)\.?\s*\d+\b/i,
};
