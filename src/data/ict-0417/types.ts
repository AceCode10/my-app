/**
 * Exam-standard checkpoint questions embedded inside the IGCSE ICT 0417 theory
 * notes, so a student is tested on a section as soon as they have read it.
 *
 * Question wording is transcribed from Cambridge 0417 past papers. The marking
 * points are indicative answers written against the syllabus — they are not the
 * official Cambridge mark scheme, and the UI says so.
 */

export interface CheckpointPart {
  /** Part label as printed on the paper: 'a', 'b(i)', ... Omit for single-part questions. */
  label?: string;
  /** The question text for this part. */
  prompt: string;
  /** Marks available for this part. */
  marks: number;
  /**
   * Number of answer boxes. A "State two ..." part gives the student two
   * numbered lines rather than one free-text box. Defaults to 1.
   */
  answerSlots?: number;
  /** Indicative marking points. One bullet is worth roughly one mark. */
  markPoints: string[];
  /** Optional examiner-style hint shown with the marking points. */
  examinerTip?: string;
}

export interface Checkpoint {
  /** Stable id, e.g. 't1-q3'. Used as the localStorage key for saved answers. */
  id: string;
  /** Section id in the note HTML this checkpoint is placed after, e.g. 's1-2'. */
  section: string;
  /** Provenance, e.g. 'March 2023 · Paper 0417/12 · Q1'. */
  source: string;
  /** Scenario text shown above the parts. */
  stem?: string;
  /** Word/phrase bank for "choose from the list" questions. */
  optionList?: string[];
  parts: CheckpointPart[];
}

/** Total marks for a checkpoint. */
export function checkpointMarks(checkpoint: Checkpoint): number {
  return checkpoint.parts.reduce((total, part) => total + part.marks, 0);
}
