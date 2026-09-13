import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Structural checks on the ICT 0417 note bodies in content/ict-0417/notes.
 *
 * The files are injected with dangerouslySetInnerHTML, and HtmlNoteRenderer
 * parses the section headers with a regular expression to build its contents
 * list, so malformed markup fails silently in the browser rather than loudly.
 * These tests are the safety net.
 */

const NOTES_DIR = path.resolve(__dirname, '../../../../content/ict-0417/notes');

const EXPECTED_FILES = [
  '01-types-and-components.html',
  '02-input-and-output-devices.html',
  '03-storage-devices-and-media.html',
  '05-the-effects-of-using-it.html',
  '06-ict-applications.html',
  '07-the-systems-life-cycle.html',
  '08-safety-and-security.html',
  '09-audience.html',
  '10-communication.html',
  '11-file-management.html',
  '12-document-production.html',
  '13-databases.html',
  '14-presentations.html',
  '15-spreadsheets.html',
  '16-web-authoring.html',
];

/** The same expression HtmlNoteRenderer uses to build the "On this page" list. */
const TOC_RE =
  /<div class="section" id="([^"]+)">\s*<div class="section-header">\s*<span class="snum">([^<]*)<\/span>\s*<h2>([\s\S]*?)<\/h2>/g;

function read(file: string): string {
  return fs.readFileSync(path.join(NOTES_DIR, file), 'utf8');
}

/** Count opening and closing tags of one element, ignoring self-closing ones. */
function tagBalance(html: string, tag: string): { open: number; close: number } {
  const open = html.match(new RegExp(`<${tag}(?=[\\s>])`, 'gi'))?.length ?? 0;
  const close = html.match(new RegExp(`</${tag}\\s*>`, 'gi'))?.length ?? 0;
  return { open, close };
}

describe('ICT 0417 note content', () => {
  it('has a file for every topic the import script publishes', () => {
    const present = fs
      .readdirSync(NOTES_DIR)
      .filter((name) => name.endsWith('.html'))
      .sort();
    expect(present).toEqual([...EXPECTED_FILES].sort());
  });

  it('does not include a Networks note, which is preserved as published', () => {
    const networks = fs
      .readdirSync(NOTES_DIR)
      .filter((name) => /network/i.test(name));
    expect(networks).toEqual([]);
  });

  describe.each(EXPECTED_FILES)('%s', (file) => {
    const html = read(file);

    it('is a note body, not a whole document', () => {
      expect(html).not.toMatch(/<\/?(?:html|head|body|script|style)\b/i);
    });

    it('opens with a page header carrying a label and a title', () => {
      expect(html.trimStart()).toMatch(/^<div class="page-header">/);
      expect(html).toMatch(/<div class="section-label">/);
      expect(html).toMatch(/<h1>[^<]+<\/h1>/);
    });

    it('has sections the renderer can build a contents list from', () => {
      const sections = html.match(/<div class="section" id="/g)?.length ?? 0;
      const parsed = [...html.matchAll(TOC_RE)];
      expect(sections).toBeGreaterThan(0);
      // Every section must match the shape the renderer parses, or it silently
      // disappears from the "On this page" navigation.
      expect(parsed).toHaveLength(sections);
      for (const [, id, num, label] of parsed) {
        expect(id).not.toBe('');
        expect(num.trim()).not.toBe('');
        expect(label.replace(/<[^>]+>/g, '').trim()).not.toBe('');
      }
    });

    it('gives every section a body and a unique id', () => {
      const sections = html.match(/<div class="section" id="/g)?.length ?? 0;
      const bodies = html.match(/<div class="section-body">/g)?.length ?? 0;
      expect(bodies).toBe(sections);

      const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('balances its div, details and table tags', () => {
      for (const tag of ['div', 'details', 'table', 'ul', 'ol', 'li', 'summary']) {
        const { open, close } = tagBalance(html, tag);
        expect({ tag, open, close }).toEqual({ tag, open, close: open });
      }
    });

    it('gives every reveal a summary, and every question an answer', () => {
      const details = html.match(/<details\b/g)?.length ?? 0;
      const summaries = html.match(/<summary>/g)?.length ?? 0;
      expect(summaries).toBe(details);

      const questions = html.match(/<details class="q">/g)?.length ?? 0;
      const answers = html.match(/<div class="answer">/g)?.length ?? 0;
      expect(answers).toBe(questions);
    });

    it('includes interactive self-test and recap material', () => {
      expect(html).toMatch(/<div class="check">/);
      expect(html).toMatch(/<div class="recap">/);
    });

    it('uses only classes the renderer styles', () => {
      const known = new Set([
        'page-header', 'section-label', 'section', 'section-header', 'snum',
        'section-body', 'sub', 'device-card', 'device-card-header',
        'device-card-body', 'badge', 'badge-input', 'badge-output',
        'badge-storage', 'badge-direct', 'adv-dis', 'full', 'adv-box',
        'dis-box', 'label', 'note', 'table-wrap', 'comp-table', 'uses-box',
        'def-box', 'divider', 'grid-2', 'grid-3', 'mini-card', 'syllabus-tag',
        'term-list', 'term', 'check', 'q', 'answer', 'recap',
      ]);
      // Code samples quote markup as text, so their class= is not a real one.
      const markup = html.replace(/<code>[\s\S]*?<\/code>/g, '');
      const used = new Set(
        [...markup.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/))
      );
      expect([...used].filter((name) => !known.has(name))).toEqual([]);
    });
  });
});
