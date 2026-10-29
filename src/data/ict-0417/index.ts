import type { Checkpoint } from './types';
import { topic01Checkpoints } from './topic-01';
import { topic02Checkpoints } from './topic-02';
import { topic03Checkpoints } from './topic-03';
import { topic04Checkpoints } from './topic-04';
import { topic05Checkpoints } from './topic-05';
import { topic06Checkpoints } from './topic-06';
import { topic07Checkpoints } from './topic-07';
import { topic08Checkpoints } from './topic-08';
import { topic09Checkpoints } from './topic-09';
import { topic10Checkpoints } from './topic-10';

export type { Checkpoint, CheckpointPart } from './types';
export { checkpointMarks } from './types';

/**
 * Every exam-standard checkpoint question embedded in the IGCSE ICT 0417 notes.
 *
 * The files are named after the past-paper topic set each question came from,
 * but a question is attached to the note section that TEACHES it — so a
 * question printed in the "effects of IT" set can end up under the systems life
 * cycle, where the student will actually have just read the content.
 */
export const ictCheckpoints: Checkpoint[] = [
  ...topic01Checkpoints,
  ...topic02Checkpoints,
  ...topic03Checkpoints,
  ...topic04Checkpoints,
  ...topic05Checkpoints,
  ...topic06Checkpoints,
  ...topic07Checkpoints,
  ...topic08Checkpoints,
  ...topic09Checkpoints,
  ...topic10Checkpoints,
];

const bySection = new Map<string, Checkpoint[]>();
for (const checkpoint of ictCheckpoints) {
  const list = bySection.get(checkpoint.section);
  if (list) list.push(checkpoint);
  else bySection.set(checkpoint.section, [checkpoint]);
}

/** Checkpoints attached to a note section id (e.g. 's1-2'), in paper order. */
export function getSectionCheckpoints(sectionId: string): Checkpoint[] {
  return bySection.get(sectionId) ?? [];
}

/** Section ids that have at least one checkpoint. */
export function sectionsWithCheckpoints(): string[] {
  return [...bySection.keys()];
}
