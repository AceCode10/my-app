import type { PaperMeta } from '../types';
import { type BoardProfile, docTypeFromToken, expandYear, monthToSession } from './types';

/**
 * AQA, including Oxford AQA International.
 *
 * AQA numbers questions as "0 1", "0 2" with parts "0 1 . 1" in some series, and
 * as plain "1", "1 (a)" in others; both forms are matched. Mark schemes carry no
 * `Question | Answer | Marks` table, so the LLM strategy is the only one listed.
 */
export const aqaProfile: BoardProfile = {
  id: 'aqa',
  label: 'AQA',
  appExamBoardId: 'aqa',
  dbExamBoardCode: 'AQA',

  detect: {
    filenamePatterns: [
      /^AQA-\d{4,5}-(QP|MS|W-MS|SQP|INS)-[A-Z]{3}\d{2}/i,
      /^\d{4}-[A-Z]{2}\d{2}-.*(oxford|international)/i,
    ],
    textSignatures: [
      { re: /AQA\s+(Education|and\s+its\s+licensors)/i, weight: 1.0 },
      { re: /OXFORD\s+AQA/i, weight: 1.0 },
      { re: /\baqa\.org\.uk\b/i, weight: 0.9 },
      { re: /Please write clearly in block capitals/i, weight: 0.5 },
    ],
  },

  filename: [
    {
      // AQA-71323-QP-JUN24 / AQA-74021-QP-JUN24-CR
      id: 'aqa_canonical',
      re: /^AQA-(?<code>\d{4,5})-(?<doc>W-MS|QP|MS|SQP|INS)-(?<mon>[A-Z]{3})(?<yy>\d{2})(?:-(?<suffix>[A-Z]+))?$/i,
      parse: (m): Partial<PaperMeta> => {
        const g = m.groups!;
        // A trailing suffix such as -CR marks an insert / resource booklet.
        const docType = g.suffix ? 'insert' : docTypeFromToken(g.doc.replace('W-', ''));
        return {
          subjectCode: g.code,
          year: expandYear(g.yy),
          session: monthToSession(g.mon),
          // The last digit of the spec code is the paper number (71323 -> 3).
          paperNumber: g.code.slice(-1),
          variant: null,
          componentCode: g.code,
          docType,
          confidence: 0.9,
        };
      },
    },
    {
      // Oxford AQA International: 9610-BL02-international-as-biology-mark-scheme-2016-v1
      id: 'aqa_oxford_intl',
      re: /^(?<code>\d{4})-(?<comp>[A-Z]{2}\d{2})-(?<desc>.*?(?:international|oxford).*?)-(?<doc>mark-scheme|specimen-paper|question-paper)-(?<year>\d{4})/i,
      parse: (m): Partial<PaperMeta> => {
        const g = m.groups!;
        return {
          subjectCode: g.code,
          year: Number(g.year),
          session: 'unknown',
          paperNumber: String(Number(g.comp.replace(/\D/g, ''))),
          variant: null,
          componentCode: g.comp,
          docType: g.doc.toLowerCase().includes('mark') ? 'ms' : 'qp',
          confidence: 0.85,
        };
      },
    },
  ],

  headerProbe: {
    syllabus: /\b(\d{4,5})\/([A-Z0-9]{1,3})\b/,
    session: /(January|June|November|May\/June|Summer)\s+(\d{4})/i,
    paperVariant: /Paper\s*(\d+)\s*:?\s*([A-Za-z ]*)/i,
    totalMarks: /(?:total|maximum)\s+(?:mark|marks)\s+(?:for this paper\s+)?(?:is|available[:\s]+)\s*(\d+)/i,
    msMaxMark: /(?:Maximum|Total)\s+Mark[s]?[:\s]+(\d+)/i,
    duration: /(\d+)\s*hours?\s*(\d+)?\s*minutes?|(\d+)\s*minutes/i,
  },

  structure: {
    // AQA uses spaced digits for question numbers in some series: "0 1"
    questionStart: /^(\d{1,2})$/,
    questionStartLine: /^0\s+(\d{1,2})(?:\s*\.\s*\d+)?\s+\S/,
    partLabel: /^\(?([a-z])\)?$/,
    subPartLabel: /^\(?([ivxlcdm]+)\)?$/,
    indentBands: {
      question: [30, 80],
      part: [55, 105],
      subpart: [75, 130],
    },
    partHierarchy: ['question', 'part', 'subpart'],
  },

  marks: [/\[(\d{1,2})\]\s*$/, /\((\d{1,2})\s*marks?\)\s*$/i, /\((\d{1,2})\)\s*$/],

  markScheme: {
    strategies: ['plumber_table_generic', 'llm'],
    headerMatch: /(Question|Qu\.?).*(Answer|Marking\s*Guidance|Mark)/i,
    qidRegex: /^\d{1,2}\s*(\([a-z]\))?\s*(\([ivxlcdm]+\))?$/,
  },

  pageFurniture: [
    /©\s*\d{4}\s*AQA/i,
    /AQA\s+Education/i,
    /Do not write outside the box/i,
    /^\s*IB\/M\/[A-Za-z0-9/]+\s*$/,
    /Turn over/i,
    /^\s*BLANK PAGE\s*$/i,
  ],

  figureRefs: /\b(Figure|Fig|Diagram|Table|Image)\.?\s*\d+\b/i,
};
