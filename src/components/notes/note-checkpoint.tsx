'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { checkpointMarks, getSectionCheckpoints, type Checkpoint } from '@/data/ict-0417';

/**
 * Exam practice embedded in the revision notes. Each note section ends with the
 * past-paper questions that test it, so a student answers under exam conditions
 * while the section is still fresh, then self-marks against indicative marking
 * points.
 *
 * Answers and self-marks live in localStorage — this is low-stakes formative
 * practice, deliberately kept off the server so nothing a student writes here
 * is graded or visible to anyone else.
 */

const STORAGE_PREFIX = 'ict0417:checkpoint:';

interface CheckpointState {
  /** Free-text answers, keyed `${partIndex}:${slotIndex}`. */
  answers: Record<string, string>;
  /** Self-awarded marks per part index. */
  scores: Record<number, number>;
  revealed: boolean;
}

const EMPTY_STATE: CheckpointState = { answers: {}, scores: {}, revealed: false };

function readState(id: string): CheckpointState {
  if (typeof window === 'undefined') return EMPTY_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + id);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw) as Partial<CheckpointState>;
    return {
      answers: parsed.answers ?? {},
      scores: parsed.scores ?? {},
      revealed: Boolean(parsed.revealed),
    };
  } catch {
    return EMPTY_STATE;
  }
}

function writeState(id: string, state: CheckpointState) {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(state));
  } catch {
    /* private browsing or a full quota — practice still works, it just won't persist */
  }
}

/** Answer boxes grow with the marks available, mirroring the lines on the paper. */
function rowsForMarks(marks: number, slots: number): number {
  if (slots > 1) return 1;
  if (marks <= 1) return 2;
  if (marks <= 2) return 3;
  if (marks <= 4) return 5;
  return 8;
}

function QuestionCard({ checkpoint }: { checkpoint: Checkpoint }) {
  const total = useMemo(() => checkpointMarks(checkpoint), [checkpoint]);
  const [state, setState] = useState<CheckpointState>(EMPTY_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [nudged, setNudged] = useState(false);

  // Saved work is read after mount so the server and first client render match.
  useEffect(() => {
    setState(readState(checkpoint.id));
    setHydrated(true);
  }, [checkpoint.id]);

  const update = useCallback(
    (next: CheckpointState) => {
      setState(next);
      writeState(checkpoint.id, next);
    },
    [checkpoint.id]
  );

  const setAnswer = (key: string, value: string) =>
    update({ ...state, answers: { ...state.answers, [key]: value } });

  const setScore = (partIndex: number, value: number) =>
    update({ ...state, scores: { ...state.scores, [partIndex]: value } });

  const hasAttempt = Object.values(state.answers).some((value) => value.trim().length > 0);

  const reveal = () => {
    if (!hasAttempt && !nudged) {
      setNudged(true);
      return;
    }
    update({ ...state, revealed: true });
  };

  const reset = () => {
    setNudged(false);
    update({ ...EMPTY_STATE });
  };

  const awarded = checkpoint.parts.reduce((sum, _part, index) => sum + (state.scores[index] ?? 0), 0);
  const marked = checkpoint.parts.every((_part, index) => state.scores[index] !== undefined);

  return (
    <li className="cp-card">
      <div className="cp-card-head">
        <span className="cp-source">{checkpoint.source}</span>
        <span className="cp-marks">{total} {total === 1 ? 'mark' : 'marks'}</span>
      </div>

      {checkpoint.stem && <p className="cp-stem">{checkpoint.stem}</p>}

      {checkpoint.optionList && (
        <div className="cp-options">
          <span className="label">Choose from</span>
          <ul>
            {checkpoint.optionList.map((option) => (
              <li key={option}>{option}</li>
            ))}
          </ul>
        </div>
      )}

      <ol className="cp-parts">
        {checkpoint.parts.map((part, partIndex) => {
          const slots = part.answerSlots ?? 1;
          return (
            <li key={partIndex} className="cp-part">
              <p className="cp-prompt">
                {part.label && <span className="cp-part-label">({part.label})</span>}
                {part.prompt}
                <span className="cp-part-marks">[{part.marks}]</span>
              </p>

              {Array.from({ length: slots }).map((_slot, slotIndex) => {
                const key = `${partIndex}:${slotIndex}`;
                return (
                  <div key={key} className="cp-answer">
                    {slots > 1 && <span className="cp-slot-num">{slotIndex + 1}</span>}
                    <textarea
                      value={state.answers[key] ?? ''}
                      onChange={(event) => setAnswer(key, event.target.value)}
                      rows={rowsForMarks(part.marks, slots)}
                      placeholder={hydrated ? 'Write your answer…' : ''}
                      aria-label={`Answer${part.label ? ` for part ${part.label}` : ''}${
                        slots > 1 ? `, point ${slotIndex + 1}` : ''
                      }`}
                      spellCheck
                    />
                  </div>
                );
              })}

              {state.revealed && (
                <div className="cp-scheme">
                  <div className="label">Marking points — award a mark for each point you made</div>
                  <ul>
                    {part.markPoints.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                  {part.examinerTip && (
                    <p className="cp-tip">
                      <strong>Examiner tip:</strong> {part.examinerTip}
                    </p>
                  )}
                  <div className="cp-selfmark">
                    <span>Your mark</span>
                    {Array.from({ length: part.marks + 1 }).map((_value, mark) => (
                      <button
                        key={mark}
                        type="button"
                        className={state.scores[partIndex] === mark ? 'is-selected' : ''}
                        onClick={() => setScore(partIndex, mark)}
                        aria-pressed={state.scores[partIndex] === mark}
                      >
                        {mark}
                      </button>
                    ))}
                    <span className="cp-outof">/ {part.marks}</span>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="cp-actions">
        {!state.revealed ? (
          <>
            <button type="button" className="cp-btn cp-btn-primary" onClick={reveal}>
              {nudged && !hasAttempt ? 'Reveal anyway' : 'Check my answer'}
            </button>
            {nudged && !hasAttempt && (
              <span className="cp-nudge">Have a go first — even a rough attempt is worth more than reading the answer.</span>
            )}
          </>
        ) : (
          <>
            <button type="button" className="cp-btn" onClick={reset}>
              Try again
            </button>
            {marked && (
              <span className={`cp-score ${awarded === total ? 'is-full' : awarded * 2 >= total ? 'is-ok' : 'is-low'}`}>
                {awarded} / {total}
              </span>
            )}
          </>
        )}
      </div>
    </li>
  );
}

export function SectionCheckpoints({ sectionId, sectionTitle }: { sectionId: string; sectionTitle?: string }) {
  const checkpoints = useMemo(() => getSectionCheckpoints(sectionId), [sectionId]);
  const [open, setOpen] = useState(true);

  if (checkpoints.length === 0) return null;

  const totalMarks = checkpoints.reduce((sum, checkpoint) => sum + checkpointMarks(checkpoint), 0);

  return (
    <section className="cp-block" aria-label={`Exam practice for ${sectionTitle ?? sectionId}`}>
      <button type="button" className="cp-block-head" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span className="cp-block-title">
          <span className="cp-block-kicker">Exam practice</span>
          {sectionTitle ?? 'Check your understanding'}
        </span>
        <span className="cp-block-meta">
          {checkpoints.length} {checkpoints.length === 1 ? 'question' : 'questions'} · {totalMarks} marks
          <span className={`cp-chev ${open ? 'is-open' : ''}`} aria-hidden="true">
            ▾
          </span>
        </span>
      </button>

      {open && (
        <div className="cp-block-body">
          <p className="cp-block-note">
            Answer these before you move on. Questions are taken from Cambridge IGCSE ICT 0417 past papers; the
            marking points are indicative answers written against the syllabus, not the official mark scheme.
          </p>
          <ol className="cp-list">
            {checkpoints.map((checkpoint) => (
              <QuestionCard key={checkpoint.id} checkpoint={checkpoint} />
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

export default SectionCheckpoints;
