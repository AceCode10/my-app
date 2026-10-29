import { describe, expect, it, vi } from 'vitest';

// assessment-utils builds a browser Supabase client at import; grading never uses it.
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }));

import { autoGradeAnswer } from '@/lib/assessment-utils';
import type { Question } from '@/types/assessment';

function calculation(correct_answer: string): Question {
  return { question_type: 'calculation', correct_answer, marks: 2 } as Question;
}

describe('autoGradeAnswer - calculation', () => {
  it('awards the marks for a fraction equal to the mark scheme value', () => {
    const result = autoGradeAnswer({ question: calculation('0.5'), answer: '1/2', selected_choice_id: null });
    expect(result).toMatchObject({ is_correct: true, marks_awarded: 2, needs_manual_grading: false });
  });

  it('uses a relative tolerance, so large answers are not held to +/-0.01', () => {
    const result = autoGradeAnswer({ question: calculation('3e8'), answer: '3.001 x 10^8', selected_choice_id: null });
    expect(result.is_correct).toBe(true);
  });

  it('marks a clear wrong number wrong', () => {
    const result = autoGradeAnswer({ question: calculation('12'), answer: '15', selected_choice_id: null });
    expect(result).toMatchObject({ is_correct: false, marks_awarded: 0, needs_manual_grading: false });
  });

  it('leaves an unreadable answer for the teacher', () => {
    const result = autoGradeAnswer({ question: calculation('2'), answer: '5-3', selected_choice_id: null });
    expect(result).toMatchObject({ is_correct: null, marks_awarded: null, needs_manual_grading: true });
  });
});
