import type { PaperMeta } from '../types';
import { type BoardProfile, docTypeFromToken, monthToSession } from './types';

/**
 * The always-matches fallback.
 *
 * Used when no board could be identified. Deliberately makes no deterministic
 * assumptions: it is LLM-first for mark schemes, uses wide indent bands, and
 * accepts the union of the mark-tag conventions. Papers landing here always
 * finish — just more expensively, and flagged for review.
 */
export const genericProfile: BoardProfile = {
  id: 'generic',
  label: 'Unrecognised board',
  appExamBoardId: 'cambridge', // most likely default in this app
  dbExamBoardCode: null,

  detect: {
    filenamePatterns: [],
    // Never wins on score; the registry falls back to this explicitly.
    textSignatures: [],
  },

  filename: [
    {
      id: 'generic_doctype_year',
      re: /^(?<pre>.*?)\b(?<doc>qp|que|ms|rms|msc|sg|question[\s_-]?paper|mark[\s_-]?scheme|scoring)\b(?<post>.*)$/i,
      parse: (m): Partial<PaperMeta> => {
        const g = m.groups!;
        const whole = `${g.pre}${g.doc}${g.post}`;
        const year = whole.match(/\b(19|20)\d{2}\b/);
        const month = whole.match(
          /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i,
        );
        const paper = whole.match(/\bp(?:aper)?[\s_-]?(\d{1,2})\b/i);
        return {
          year: year ? Number(year[0]) : null,
          session: month ? monthToSession(month[1]) : 'unknown',
          paperNumber: paper ? paper[1] : null,
          docType: docTypeFromToken(g.doc),
          confidence: 0.35,
        };
      },
    },
    {
      id: 'generic_year_only',
      re: /^(?<all>.*\b(19|20)\d{2}\b.*)$/,
      parse: (m): Partial<PaperMeta> => {
        const all = m.groups!.all;
        const year = all.match(/\b(?:19|20)\d{2}\b/);
        return {
          year: year ? Number(year[0].replace(/\D/g, '')) : null,
          session: 'unknown',
          docType: 'unknown',
          confidence: 0.2,
        };
      },
    },
  ],

  headerProbe: {
    syllabus: /\b(\d{4,5})\s*\/\s*(\d{1,2})\b/,
    session: /(February\/March|May\/June|October\/November|January|June|November|Summer|Winter)\s+(\d{4})/i,
    paperVariant: /Paper\s*(\d+)/i,
    totalMarks: /(?:total|maximum)[^.\n]{0,30}?(?:mark|point)s?[^.\n]{0,20}?\b(\d{2,3})\b/i,
    msMaxMark: /(?:Maximum|Total)\s+Mark[s]?[:\s]+(\d+)/i,
    duration: /(\d+)\s*hours?\s*(\d+)?\s*minutes?|(\d+)\s*minutes/i,
  },

  structure: {
    questionStart: /^(\d{1,2})\.?$/,
    partLabel: /^\(?([a-z])\)?[.)]?$/,
    subPartLabel: /^\(?([ivxlcdm]+)\)?[.)]?$/,
    indentBands: {
      question: [20, 90],
      part: [45, 120],
      subpart: [65, 150],
    },
    partHierarchy: ['question', 'part', 'subpart'],
  },

  marks: [
    /\[(\d{1,2})\s*marks?\]/i,
    /\[(\d{1,2})\]\s*$/m,
    /\((\d{1,2})\s*marks?\)/i,
    /\((\d{1,2})\s*points?\)/i,
    /\(Total for Question \d+ = (\d+) marks?\)/i,
    /\((\d{1,2})\)\s*$/m,
  ],
  maxMarksPerQuestion: 60,

  markScheme: {
    strategies: ['plumber_table_generic', 'llm'],
    headerMatch: /(Question|Qu|Item).*(Answer|Mark|Scoring|Guidance)/i,
    qidRegex: /^\d{1,2}\.?\s*(\([a-z]\))?\s*(\([ivxlcdm]+\))?$/,
  },

  pageFurniture: [
    /^\s*Page\s+\d+(\s+of\s+\d+)?\s*$/mi,
    /^\s*Turn over\s*$/mi,
    /^\s*BLANK PAGE\s*$/mi,
    /^\s*©.*\d{4}.*$/,
  ],

  figureRefs: /\b(Fig|Figure|Diagram|Table|Graph|Image|Source)\.?\s*\d+(\.\d+)?\b/i,
};
