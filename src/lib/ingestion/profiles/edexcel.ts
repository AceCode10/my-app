import type { PaperMeta } from '../types';
import { type BoardProfile, docTypeFromToken, monthToSession, splitComponent } from './types';

/**
 * Pearson Edexcel.
 *
 * Verified against 8et0-01/8et0-02 and 9bn0-02 samples. Edexcel mark schemes
 * expose no `Question | Answer | Marks` table — the first table header is
 * "General Marking Guidance" — so the LLM strategy is mandatory here, with the
 * generic table strategy tried first in case a given paper cooperates.
 */
export const edexcelProfile: BoardProfile = {
  id: 'edexcel',
  label: 'Pearson Edexcel',
  appExamBoardId: 'edexcel',
  dbExamBoardCode: 'EDEX',

  detect: {
    filenamePatterns: [/^\d[a-z]{2}\d-\d{2}-(que|rms|msc|pef|ai)-\d{8}$/i],
    textSignatures: [
      { re: /Pearson\s+Edexcel/i, weight: 1.0 },
      { re: /©\s*\d{4}\s*Pearson\s*Education/i, weight: 0.9 },
      { re: /Edexcel/i, weight: 0.7 },
      { re: /\(Total for Question \d+ = \d+ marks?\)/i, weight: 0.6 },
    ],
  },

  filename: [
    {
      // 9bn0-02-que-20240615 / 8et0-01-rms-20240815
      id: 'edexcel_canonical',
      re: /^(?<code>\d[a-z]{2}\d)-(?<component>\d{2})-(?<doc>que|rms|msc|pef|ai)-(?<date>\d{8})$/i,
      parse: (m): Partial<PaperMeta> => {
        const g = m.groups!;
        const year = Number(g.date.slice(0, 4));
        const month = Number(g.date.slice(4, 6));
        const monthNames = [
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
        ];
        // Mark schemes are published in August for a summer series; map the
        // series off the exam month, not the publication month.
        const session = month >= 8 && month <= 10 ? 'mj' : monthToSession(monthNames[month - 1] ?? '');
        return {
          subjectCode: g.code.toLowerCase(),
          year,
          session,
          paperNumber: String(Number(g.component)),
          variant: null,
          componentCode: g.component,
          docType: docTypeFromToken(g.doc),
          confidence: 0.92,
        };
      },
    },
    {
      id: 'edexcel_loose',
      re: /^(?<code>\d[a-z]{2}\d)[-_](?<component>\d{2})\b.*?(?<doc>que|rms|msc|question|mark)/i,
      parse: (m): Partial<PaperMeta> => {
        const g = m.groups!;
        const { paperNumber, variant } = splitComponent(g.component);
        return {
          subjectCode: g.code.toLowerCase(),
          paperNumber,
          variant,
          componentCode: g.component,
          docType: docTypeFromToken(g.doc),
          confidence: 0.6,
        };
      },
    },
  ],

  headerProbe: {
    syllabus: /Paper\s+Reference\s*([0-9A-Z]{4,6}\/?[0-9A-Z]{0,3})/i,
    session: /(Summer|Winter|Autumn|January|June|November)\s+(\d{4})/i,
    paperVariant: /Paper\s*(\d+)\s*:?\s*([A-Za-z ]*)/i,
    totalMarks: /TOTAL FOR PAPER\s*[:=]?\s*(\d+)\s*MARKS/i,
    msMaxMark: /TOTAL FOR PAPER\s*[:=]?\s*(\d+)\s*MARKS/i,
    duration: /(\d+)\s*hours?\s*(\d+)?\s*minutes?|(\d+)\s*minutes/i,
  },

  structure: {
    questionStart: /^(\d{1,2})$/,
    partLabel: /^\(([a-z])\)$/,
    subPartLabel: /^\(([ivxlcdm]+)\)$/,
    indentBands: {
      question: [30, 75],
      part: [55, 100],
      subpart: [75, 125],
    },
    partHierarchy: ['question', 'part', 'subpart'],
  },

  // Structured papers put "(3)" in the right margin; literature papers carry no
  // per-question tag at all and only state "(Total for Question 5 = 44 marks)".
  // That total IS the question's mark value, so it must not be capped at 30.
  marks: [
    /\((\d{1,2})\)\s*$/m,
    /\(Total for Question \d+ = (\d+) marks?\)/i,
    /\[(\d{1,2})\s*marks?\]/i,
    /\[(\d{1,2})\]\s*$/m,
  ],
  maxMarksPerQuestion: 60,

  markScheme: {
    strategies: ['plumber_table_qam', 'plumber_table_generic', 'llm'],
    headerMatch: /(Question\s*(Number)?).*(Answer|Mark)/i,
    qidRegex: /^\d{1,2}\s*(\([a-z]\))?\s*(\([ivxlcdm]+\))?$/,
    maxMarkRegex: /TOTAL FOR PAPER\s*[:=]?\s*(\d+)\s*MARKS/i,
  },

  pageFurniture: [
    /©\s*\d{4}\s*Pearson\s*Education/i,
    /Pearson\s+Edexcel/i,
    /^\s*DO NOT WRITE IN THIS AREA\s*$/mi,
    /Turn over/i,
    /^\s*P\d{5}A\d*\s*$/m, // Edexcel print codes
    /^\s*BLANK PAGE\s*$/mi,
  ],

  figureRefs: /\b(Figure|Fig|Diagram|Table|Photograph|Source)\.?\s*\d+\b/i,
};
