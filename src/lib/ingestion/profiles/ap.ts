import type { PaperMeta } from '../types';
import { type BoardProfile, expandYear } from './types';

/**
 * AP (College Board).
 *
 * AP free-response papers are a handful of long questions with lettered parts
 * and marks expressed as points. The "mark scheme" is a Scoring Guidelines
 * document with no answer table at all, so the LLM strategy is the only option.
 */
export const apProfile: BoardProfile = {
  id: 'ap',
  label: 'AP (College Board)',
  appExamBoardId: 'ap',
  dbExamBoardCode: 'AP',

  detect: {
    filenamePatterns: [/^ap\d{2}-(frq|sg|mcq)-/i],
    textSignatures: [
      { re: /College\s+Board/i, weight: 1.0 },
      { re: /AP®/i, weight: 1.0 },
      { re: /Free-Response\s+Questions/i, weight: 0.8 },
      { re: /Scoring\s+Guidelines/i, weight: 0.8 },
    ],
  },

  filename: [
    {
      // ap23-frq-biology / ap23-sg-biology
      id: 'ap_canonical',
      re: /^ap(?<yy>\d{2})-(?<doc>frq|sg|mcq)-(?<subject>.+)$/i,
      parse: (m): Partial<PaperMeta> => {
        const g = m.groups!;
        return {
          subjectName: g.subject.replace(/-/g, ' ').trim(),
          year: expandYear(g.yy),
          session: 'mj', // AP exams run in May
          paperNumber: g.doc.toLowerCase() === 'mcq' ? '1' : '2',
          variant: null,
          docType: g.doc.toLowerCase() === 'sg' ? 'ms' : 'qp',
          confidence: 0.9,
        };
      },
    },
  ],

  headerProbe: {
    session: /\b(20\d{2})\b/,
    paperVariant: /(Free-Response|Multiple[- ]Choice)/i,
    totalMarks: /total\s+of\s+(\d+)\s+points?/i,
    msMaxMark: /(\d+)\s+points?\s+total/i,
  },

  structure: {
    questionStart: /^(\d{1,2})\.?$/,
    partLabel: /^\(?([a-z])\)?$/,
    subPartLabel: /^\(?([ivxlcdm]+)\)?$/,
    indentBands: {
      question: [30, 90],
      part: [55, 115],
      subpart: [75, 140],
    },
    partHierarchy: ['question', 'part', 'subpart'],
  },

  marks: [/\((\d{1,2})\s*points?\)/i, /\[(\d{1,2})\]\s*$/],

  markScheme: {
    strategies: ['llm'],
    headerMatch: /(Question|Part).*(Scoring|Point|Answer)/i,
    qidRegex: /^\d{1,2}\.?\s*(\([a-z]\))?$/,
  },

  pageFurniture: [
    /©\s*\d{4}\s*College\s*Board/i,
    /College\s+Board.*(is\s+a\s+)?(trademark|registered)/i,
    /Begin your response to .* on this page/i,
    /^\s*GO ON TO THE NEXT PAGE\s*$/i,
    /^\s*-?\s*\d+\s*-?\s*$/,
  ],

  figureRefs: /\b(Figure|Fig|Graph|Table|Diagram)\s*\d+\b/i,
};
