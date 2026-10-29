import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { checkpointMarks, ictCheckpoints } from '@/data/ict-0417';

/**
 * Checks that every exam-practice checkpoint can actually be shown.
 *
 * HtmlNoteRenderer places a checkpoint after the `<div class="section">` whose id
 * matches `checkpoint.section`. A mistyped or sub-section id raises no error -
 * the question simply never appears - so these tests are the only signal.
 */

const NOTES_DIR = path.resolve(__dirname, '../../../../content/ict-0417/notes');

/**
 * Networks (topic 4) is preserved as published and drawn from its markdown, so
 * it has no HTML sections yet. Its checkpoints wait there until it does.
 */
const AWAITING_HTML_NOTE = /^s4-/;

function noteSectionIds(): Set<string> {
  const ids = new Set<string>();
  for (const file of fs.readdirSync(NOTES_DIR).filter((name) => name.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(NOTES_DIR, file), 'utf8');
    for (const [, id] of html.matchAll(/<div class="section" id="([^"]+)">/g)) ids.add(id);
  }
  return ids;
}

describe('ICT 0417 checkpoints', () => {
  it('gives every checkpoint a unique id', () => {
    const ids = ictCheckpoints.map((checkpoint) => checkpoint.id);
    expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([]);
  });

  it('places every checkpoint after a section that exists in the notes', () => {
    const sections = noteSectionIds();
    const orphaned = ictCheckpoints
      .filter((checkpoint) => !sections.has(checkpoint.section))
      .filter((checkpoint) => !AWAITING_HTML_NOTE.test(checkpoint.section))
      .map((checkpoint) => `${checkpoint.id} -> ${checkpoint.section}`);
    expect(orphaned).toEqual([]);
  });

  it('gives every part marks and at least one marking point', () => {
    for (const checkpoint of ictCheckpoints) {
      expect(checkpoint.parts.length).toBeGreaterThan(0);
      expect(checkpointMarks(checkpoint)).toBeGreaterThan(0);
      for (const part of checkpoint.parts) {
        expect(part.prompt.trim()).not.toBe('');
        expect(part.markPoints.length).toBeGreaterThan(0);
      }
    }
  });
});
