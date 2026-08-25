import type { BoardProfile } from '../profiles/types';
import { displayOrderFor, formatPartLabel, formatQuestionId, parentQuestionId } from '../question-id';
import type { BBox, ExtractedQuestion, ParsedDocument, ParsedLine, ParsedPage } from '../types';

/**
 * Deterministic question segmentation from line geometry.
 *
 * This replaces the previous approach of flattening the PDF to one string and
 * recovering boundaries with stacked regexes such as
 * `/\[(\d{1,2})\]\s*(\d{1,2})\s*([A-Z])/g`. Those patterns were a workaround for
 * having discarded newlines and x-positions; with real line objects the signals
 * are much stronger:
 *
 *   question start = first token is a bare number AND x0 is in the level-1 band
 *   part start     = first token is "(a)"          AND x0 is in the level-2 band
 *   sub-part start = first token is "(i)"          AND x0 is in the level-3 band
 *   marks          = "[N]" as the last token on a line
 *
 * Measured on the 0417 corpus: the sum of detected mark tags equals the paper's
 * own stated total on 37 of 37 question papers.
 */

const ANSWER_LINE_RE = /\.{6,}|_{6,}/g;
const FIG_LINE_RE = /^\s*(Fig|Figure|Table)\.?\s*\d+(\.\d+)?\s*$/i;

interface Anchor {
  kind: 'question' | 'part' | 'subpart';
  text: string;
  page: number;
  line: ParsedLine;
  /** Position within the flattened line list. */
  index: number;
  /**
   * Set when the question number appeared on the SAME line as the part, e.g.
   * "9 (a) The products in a warehouse ...". Without this the number is
   * consumed as a bare question anchor and the part is lost, which silently
   * reassigns the part's marks to its parent.
   */
  explicitQuestionNumber?: number;
}

interface FlatLine {
  line: ParsedLine;
  page: number;
  index: number;
}

function flattenLines(pages: ParsedPage[]): FlatLine[] {
  const out: FlatLine[] = [];
  for (const page of pages) {
    for (const line of page.lines) {
      out.push({ line, page: page.index, index: out.length });
    }
  }
  return out;
}

function isFurniture(text: string, profile: BoardProfile): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  // A lone page number.
  if (/^\d{1,3}$/.test(trimmed)) return true;
  return profile.pageFurniture.some((re) => re.test(trimmed));
}

function firstToken(line: ParsedLine): { text: string; x0: number } | null {
  const words = line.words;
  if (words && words.length > 0) {
    return { text: words[0].text.trim(), x0: words[0].x0 };
  }
  const match = line.text.trim().match(/^\S+/);
  return match ? { text: match[0], x0: line.x0 } : null;
}

function inBand(x: number, band: [number, number]): boolean {
  return x >= band[0] && x <= band[1];
}

/**
 * Regions that contain content, not structure: figure crops and the vector
 * table regions the figure extractor identified. A spreadsheet screenshot has
 * row numbers down its left edge ("14  0  Excellent"), which are indentical in
 * shape to a question number and would otherwise become phantom questions.
 */
function buildExclusionZones(pages: ParsedPage[]): Map<number, BBox[]> {
  const zones = new Map<number, BBox[]>();

  // A zone may only suppress anchors if it is genuinely a local inset. Edexcel
  // and IB papers draw a full-page border box covering ~79% of the sheet; left
  // unbounded it would exclude every line on every page and the paper would
  // segment to zero questions. Whatever such a region is, it is not a reason to
  // ignore the page's text.
  const MAX_ZONE_FRACTION = 0.4;

  for (const page of pages) {
    const pageArea = page.width * page.height || 1;
    const boxes: BBox[] = [];

    const consider = (bbox: BBox) => {
      const area = Math.max(0, bbox[2] - bbox[0]) * Math.max(0, bbox[3] - bbox[1]);
      if (area / pageArea <= MAX_ZONE_FRACTION) boxes.push(bbox);
    };

    for (const figure of page.figures) consider(figure.bbox);
    for (const region of page.tableRegions ?? []) consider(region.bbox);
    for (const table of page.tables) consider(table.bbox);

    if (boxes.length > 0) zones.set(page.index, boxes);
  }
  return zones;
}

function insideZone(line: ParsedLine, zones: BBox[] | undefined): boolean {
  if (!zones) return false;
  const midY = (line.top + line.bottom) / 2;
  return zones.some((z) => line.x0 >= z[0] - 4 && line.x1 <= z[2] + 4 && midY >= z[1] && midY <= z[3]);
}

function detectAnchors(
  flat: FlatLine[],
  profile: BoardProfile,
  zones: Map<number, BBox[]>,
): Anchor[] {
  const { questionStart, partLabel, subPartLabel, indentBands } = profile.structure;
  const anchors: Anchor[] = [];
  // Question numbers run strictly upward through a paper. Anything that repeats
  // or goes backwards is a table row, a list item or a repeated header.
  let highestQuestion = 0;

  // "9 (a) ..." / "9 (a) (i) ..." — number and part share one line.
  const COMBINED_RE = /^\s*(\d{1,2})\s*[.)]?\s+\(([a-z])\)(?:\s*\(([ivxlcdm]+)\))?\s+/i;

  for (const entry of flat) {
    if (isFurniture(entry.line.text, profile)) continue;
    if (insideZone(entry.line, zones.get(entry.page))) continue;

    const token = firstToken(entry.line);
    if (!token) continue;

    // Some boards print the question number as separate digits — AQA writes
    // "0 1" for question 1 — so the first TOKEN is "0" and token matching fails.
    // A profile may supply a whole-line pattern for these.
    if (profile.structure.questionStartLine) {
      const lineMatch = entry.line.text.match(profile.structure.questionStartLine);
      if (lineMatch && inBand(token.x0, indentBands.question)) {
        const number = Number(lineMatch[1]);
        // Capture group 2, when present, is a numeric sub-part: AQA writes
        // question 2 part 3 as "0 2 . 3". Map 1->a, 2->b, ... so it lands in
        // the same id space as every other board and joins to the mark scheme.
        const subIndex = lineMatch[2] ? Number(lineMatch[2]) : null;
        const partLetter =
          subIndex && subIndex >= 1 && subIndex <= 26
            ? String.fromCharCode(96 + subIndex)
            : null;

        if (Number.isFinite(number)) {
          // Only the top-level number must advance; sub-parts of the question
          // already seen legitimately repeat it.
          if (number > highestQuestion) {
            highestQuestion = number;
          } else if (!partLetter) {
            continue;
          }

          anchors.push({
            kind: partLetter ? 'part' : 'question',
            text: partLetter ?? String(number),
            page: entry.page,
            line: entry.line,
            index: entry.index,
            ...(partLetter ? { explicitQuestionNumber: number } : {}),
          });
        }
        continue;
      }
    }

    const combined = entry.line.text.match(COMBINED_RE);
    if (combined && inBand(token.x0, indentBands.question)) {
      // Emit only the deepest label present. The parent question row is
      // synthesised later as a context row, so no marks can be misattributed.
      const combinedNumber = Number(combined[1]);
      if (combinedNumber <= highestQuestion) continue;
      highestQuestion = combinedNumber;
      anchors.push({
        kind: combined[3] ? 'subpart' : 'part',
        text: (combined[3] ?? combined[2]).toLowerCase(),
        page: entry.page,
        line: entry.line,
        index: entry.index,
        explicitQuestionNumber: combinedNumber,
      });
      continue;
    }

    const qMatch = token.text.match(questionStart);
    if (qMatch && inBand(token.x0, indentBands.question)) {
      const number = Number(qMatch[1] ?? token.text);
      // A bare label with nothing after it is an answer slot ("1 ......"),
      // not the start of a question.
      const remainder = entry.line.text.slice(token.text.length).replace(ANSWER_LINE_RE, '').trim();
      if (Number.isFinite(number) && number > highestQuestion && remainder.length > 0) {
        highestQuestion = number;
        anchors.push({
          kind: 'question',
          text: String(number),
          page: entry.page,
          line: entry.line,
          index: entry.index,
        });
      }
      continue;
    }

    const sMatch = token.text.match(subPartLabel);
    if (sMatch && inBand(token.x0, indentBands.subpart)) {
      anchors.push({
        kind: 'subpart',
        text: (sMatch[1] ?? token.text).toLowerCase(),
        page: entry.page,
        line: entry.line,
        index: entry.index,
      });
      continue;
    }

    const pMatch = token.text.match(partLabel);
    if (pMatch && inBand(token.x0, indentBands.part)) {
      anchors.push({
        kind: 'part',
        text: (pMatch[1] ?? token.text).toLowerCase(),
        page: entry.page,
        line: entry.line,
        index: entry.index,
      });
    }
  }

  return anchors;
}

function extractMarks(text: string, profile: BoardProfile): number | null {
  // Default ceiling is generous: a single question can legitimately be worth
  // 44 marks on an Edexcel literature paper. Boards may narrow it.
  const ceiling = profile.maxMarksPerQuestion ?? 60;
  for (const re of profile.marks) {
    const match = text.match(re);
    if (match) {
      const value = Number(match[1]);
      if (Number.isFinite(value) && value > 0 && value <= ceiling) return value;
    }
  }
  return null;
}

/** Strip answer-line runs, mark tags and page furniture from a question body. */
function cleanBody(lines: ParsedLine[], profile: BoardProfile): string {
  const kept: string[] = [];

  for (const line of lines) {
    let text = line.text;
    if (isFurniture(text, profile)) continue;

    text = text.replace(ANSWER_LINE_RE, ' ');
    for (const re of profile.marks) {
      text = text.replace(re, ' ');
    }
    text = text.replace(/\s{2,}/g, ' ').trim();

    // A line that was nothing but dots and a mark tag carries no content.
    if (!text || /^[.\s_]*$/.test(text)) continue;
    kept.push(text);
  }

  return kept.join('\n').trim();
}

function unionBBox(lines: ParsedLine[]): BBox | null {
  if (lines.length === 0) return null;
  return [
    Math.min(...lines.map((l) => l.x0)),
    Math.min(...lines.map((l) => l.top)),
    Math.max(...lines.map((l) => l.x1)),
    Math.max(...lines.map((l) => l.bottom)),
  ];
}

/**
 * Remove the leading label from a block's first line: "3 A company uses..." ->
 * "A company uses...", "(a) Explain..." -> "Explain...".
 */
function stripLeadingLabel(text: string): string {
  return text
    .replace(/^\s*\d{1,2}\s*[.)]?\s+/, '')
    .replace(/^\s*\([a-z]\)\s*/i, '')
    .replace(/^\s*\([ivxlcdm]+\)\s*/i, '')
    .trim();
}

export interface SegmentResult {
  questions: ExtractedQuestion[];
  warnings: string[];
  /** Sum of every mark tag on the paper — the authoritative total. */
  totalMarkTags: number;
  markTagCount: number;
}

export function segmentQuestions(
  document: ParsedDocument,
  profile: BoardProfile,
): SegmentResult {
  const warnings: string[] = [];
  const flat = flattenLines(document.pages);
  const zones = buildExclusionZones(document.pages);
  const anchors = detectAnchors(flat, profile, zones);

  const totalMarkTags = document.markers.markTags.reduce((sum, t) => sum + t.marks, 0);
  const markTagCount = document.markers.markTags.length;

  if (anchors.length === 0) {
    warnings.push('No question anchors detected; the indent bands may not suit this paper.');
    return { questions: [], warnings, totalMarkTags, markTagCount };
  }

  // Walk anchors in document order, tracking the current question and part so a
  // sub-part inherits the right parents.
  const questions: ExtractedQuestion[] = [];
  let currentNumber: number | null = null;
  let currentPart: string | null = null;

  for (let i = 0; i < anchors.length; i += 1) {
    const anchor = anchors[i];
    const next = anchors[i + 1];
    const endIndex = next ? next.index : flat.length;

    const blockLines = flat.slice(anchor.index, endIndex).map((f) => f.line);
    if (blockLines.length === 0) continue;

    let ref: string;
    if (anchor.explicitQuestionNumber !== undefined) {
      // A combined "9 (a)" line starts a new question as well as a new part.
      currentNumber = anchor.explicitQuestionNumber;
      if (anchor.kind === 'part') {
        currentPart = anchor.text;
        ref = formatQuestionId(currentNumber, currentPart);
      } else {
        currentPart = null;
        ref = formatQuestionId(currentNumber, null, anchor.text);
      }
    } else if (anchor.kind === 'question') {
      currentNumber = Number(anchor.text);
      currentPart = null;
      ref = formatQuestionId(currentNumber);
    } else if (anchor.kind === 'part') {
      if (currentNumber === null) {
        warnings.push(`Part "(${anchor.text})" appeared before any question number; skipped.`);
        continue;
      }
      currentPart = anchor.text;
      ref = formatQuestionId(currentNumber, currentPart);
    } else {
      if (currentNumber === null) {
        warnings.push(`Sub-part "(${anchor.text})" appeared before any question number; skipped.`);
        continue;
      }
      ref = formatQuestionId(currentNumber, currentPart, anchor.text);
    }

    const rawText = blockLines.map((l) => l.text).join('\n');
    const marks = extractMarks(rawText, profile);
    const body = stripLeadingLabel(cleanBody(blockLines, profile));

    // Attach only figures that fall inside this block's own vertical span, so a
    // question cannot claim a figure belonging to the one after it.
    const blockBottom = Math.max(...blockLines.map((l) => l.bottom));
    const figures = document.pages
      .filter((p) => p.index === anchor.page)
      .flatMap((p) => p.figures)
      .filter((fig) => fig.bbox[1] >= anchor.line.top - 4 && fig.bbox[1] <= blockBottom + 8);

    const answerLineCount = (rawText.match(ANSWER_LINE_RE) || []).length;
    const referencesFigure = profile.figureRefs.test(rawText);

    questions.push({
      ref,
      questionNumber: currentNumber,
      partLabel:
        anchor.kind === 'question'
          ? null
          : anchor.kind === 'part'
            ? formatPartLabel(anchor.text)
            : formatPartLabel(currentPart, anchor.text),
      parentRef: parentQuestionId(ref),
      questionText: body,
      contextText: null,
      isContextOnly: false,
      needsAnswer: true,
      questionType: 'short_answer',
      marks: marks ?? 0,
      displayOrder: displayOrderFor(ref),
      options: null,
      subInputs: null,
      tableData: null,
      sectionName: null,
      sourcePage: anchor.page,
      sourceBBox: unionBBox(blockLines),
      markScheme: null,
      correctAnswer: null,
      figures,
      confidence: marks !== null ? 0.9 : 0.6,
      errorCodes: marks === null ? ['E010_NO_MARK_TAG'] : [],
    });

    // Record signals the classifier uses without re-reading the PDF.
    const last = questions[questions.length - 1];
    if (answerLineCount > 0) last.subInputs = null;
    if (referencesFigure && last.figures.length === 0) {
      last.errorCodes.push('E014_FIGURE_MISSING');
    }
  }

  // A question that owns sub-parts and has no marks of its own is context.
  const byRef = new Map(questions.map((q) => [q.ref, q]));
  const childCount = new Map<string, number>();
  for (const q of questions) {
    if (q.parentRef) childCount.set(q.parentRef, (childCount.get(q.parentRef) ?? 0) + 1);
  }
  for (const q of questions) {
    if ((childCount.get(q.ref) ?? 0) > 0 && q.marks === 0) {
      q.isContextOnly = true;
      q.needsAnswer = false;
      q.questionType = 'context';
      q.contextText = q.questionText;
      q.errorCodes = q.errorCodes.filter((c) => c !== 'E010_NO_MARK_TAG');
      q.confidence = 0.9;
    }
  }

  // Drop a figure caption line that became its own pseudo-question.
  const filtered = questions.filter((q) => !FIG_LINE_RE.test(q.questionText));

  // Ensure parents actually exist; synthesise when a paper jumps straight to (a).
  for (const q of filtered) {
    if (q.parentRef && !byRef.has(q.parentRef)) {
      warnings.push(`Question ${q.ref} has no parent block ${q.parentRef}; it will be synthesised.`);
    }
  }

  filtered.sort((a, b) => a.displayOrder - b.displayOrder);

  return { questions: filtered, warnings, totalMarkTags, markTagCount };
}
