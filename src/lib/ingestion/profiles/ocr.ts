import type { PaperMeta } from '../types';
import { type BoardProfile, docTypeFromToken } from './types';

/**
 * OCR (Oxford Cambridge and RSA).
 *
 * Detection must run before Cambridge in the registry: OCR papers say
 * "Oxford Cambridge and RSA", which contains the word "Cambridge".
 * OCR mark schemes lead with an `Annotation | Meaning` table, not an answer
 * table, so the generic table strategy is tried before falling back to the LLM.
 */
export const ocrProfile: BoardProfile = {
  id: 'ocr',
  label: 'OCR',
  appExamBoardId: 'ocr',
  dbExamBoardCode: 'OCR',

  detect: {
    filenamePatterns: [
      /^(Specimen|Sample)-(QP|MS)-\d{2}-.*-OCR-/i,
      /\bOCR\b.*\b(H\d{3}|J\d{3})\b/i,
    ],
    textSignatures: [
      { re: /Oxford\s+Cambridge\s+and\s+RSA/i, weight: 1.0 },
      { re: /OCR\s+is\s+an\s+exempt\s+Charity/i, weight: 1.0 },
      { re: /\bocr\.org\.uk\b/i, weight: 0.9 },
      { re: /\b[HJ]\d{3}\/\d{2}\b/, weight: 0.7 },
    ],
  },

  filename: [
    {
      // Specimen-QP-02-biological-diversity-A-Level-OCR-Biology
      id: 'ocr_specimen',
      re: /^(?<kind>Specimen|Sample)-(?<doc>QP|MS)-(?<component>\d{2})-(?<title>.+?)-(?<level>A-Level|AS-Level|GCSE)-OCR-(?<subject>.+)$/i,
      parse: (m): Partial<PaperMeta> => {
        const g = m.groups!;
        return {
          subjectName: g.subject.replace(/-/g, ' ').trim(),
          paperNumber: String(Number(g.component)),
          variant: null,
          componentCode: g.component,
          session: 'unknown',
          docType: docTypeFromToken(g.doc),
          confidence: 0.85,
        };
      },
    },
    {
      // H420/02 style embedded in a filename
      id: 'ocr_speccode',
      re: /(?<code>[HJ]\d{3})[-_/](?<component>\d{2}).*?(?<doc>qp|ms|question|mark)/i,
      parse: (m): Partial<PaperMeta> => {
        const g = m.groups!;
        return {
          subjectCode: g.code.toUpperCase(),
          paperNumber: String(Number(g.component)),
          variant: null,
          componentCode: g.component,
          docType: docTypeFromToken(g.doc),
          confidence: 0.7,
        };
      },
    },
  ],

  headerProbe: {
    syllabus: /\b([HJ]\d{3})\/(\d{2})\b/,
    session: /(June|November|January)\s+(\d{4}|20XX)/i,
    paperVariant: /\b[HJ]\d{3}\/(\d{2})\b/,
    totalMarks: /total\s+(?:of\s+)?(\d+)\s+marks?\s+(?:is\s+)?available/i,
    msMaxMark: /(?:Maximum|Total)\s+Mark[s]?[:\s]+(\d+)/i,
    duration: /(\d+)\s*hours?\s*(\d+)?\s*minutes?|(\d+)\s*minutes/i,
  },

  structure: {
    questionStart: /^(\d{1,2})$/,
    partLabel: /^\(?([a-z])\)?$/,
    subPartLabel: /^\(?([ivxlcdm]+)\)?$/,
    indentBands: {
      question: [30, 80],
      part: [55, 105],
      subpart: [75, 130],
    },
    partHierarchy: ['question', 'part', 'subpart'],
  },

  // Measured on the H420 specimen: bare "[N]" is the printed form.
  marks: [
    /\[(\d{1,2})\]\s*$/,
    /\[(\d{1,2})\s*marks?\]/i,
    /\((\d{1,2})\s*marks?\)/i,
    /\((\d{1,2})\)\s*$/,
  ],
  maxMarksPerQuestion: 30,

  markScheme: {
    strategies: ['plumber_table_generic', 'llm'],
    headerMatch: /(Question|Qu).*(Answer|Guidance|Marks)/i,
    qidRegex: /^\d{1,2}\s*(\([a-z]\))?\s*(\([ivxlcdm]+\))?$/,
  },

  pageFurniture: [
    /©\s*OCR\s*\d{4}/i,
    /Oxford\s+Cambridge\s+and\s+RSA/i,
    /OCR\s+is\s+an\s+exempt\s+Charity/i,
    /Turn over/i,
    /^\s*BLANK PAGE\s*$/i,
    /^\s*Annotation\s*$/i,
  ],

  figureRefs: /\b(Fig|Figure|Table|Diagram)\.?\s*\d+(\.\d+)?\b/i,
};
