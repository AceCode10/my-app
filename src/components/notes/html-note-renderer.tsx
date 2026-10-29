'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { List, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SectionCheckpoints } from './note-checkpoint';

interface HtmlNoteRendererProps {
  html: string;
  className?: string;
}

interface TocEntry {
  id: string;
  num: string;
  label: string;
}

/**
 * The note body, cut into the `<div class="section">` cards it is built from so
 * the exam-practice block for a section can be rendered straight after it.
 */
type NoteSegment =
  | { kind: 'html'; key: string; html: string }
  | { kind: 'section'; key: string; id: string; title: string; html: string };

/**
 * Styles for teacher-authored note HTML (self-contained documents with their own
 * class names). Every rule is scoped under `.ict-note` so the note's markup can
 * never leak styles into the rest of the app.
 */
const NOTE_STYLES = `
.ict-note {
  --note-bg-page: #f5f3ee;
  --note-card: #ffffff;
  --note-text: #2c3647;
  --note-text-light: #5a6478;
  --note-border: #ddd9d0;
  --note-h1: #1c2b3a;
  --note-h2: #1e4976;
  --note-h3: #2563a9;
  --note-accent: #b5602a;
  --note-adv-bg: #edf7ed;
  --note-adv-border: #4caf50;
  --note-adv-text: #1b5e20;
  --note-dis-bg: #fdf0f0;
  --note-dis-border: #e57373;
  --note-dis-text: #7f1d1d;
  --note-tip-bg: #fff8e1;
  --note-tip-border: #f59e0b;
  --note-table-head: #1c2b3a;
  --note-table-alt: #f0f4f9;
  font-family: inherit;
  font-size: 15px;
  line-height: 1.7;
  color: var(--note-text);
}
.ict-note * { box-sizing: border-box; margin: 0; padding: 0; }
.ict-note p { margin-bottom: 0.6rem; }
/* Tailwind's preflight sets list-style to none on every ul/ol, so a note's
   lists arrive with no bullets or numbers at all. Put the markers back, and
   give nested levels their own so a sub-list reads as subordinate. */
.ict-note ul, .ict-note ol { padding-left: 1.5rem; margin-bottom: 0.6rem; }
.ict-note ul { list-style: disc outside; }
.ict-note ol { list-style: decimal outside; }
.ict-note ul ul { list-style-type: circle; }
.ict-note ul ul ul { list-style-type: square; }
.ict-note ol ol { list-style-type: lower-alpha; }
.ict-note li { display: list-item; margin-bottom: 0.2rem; }
.ict-note li::marker { color: var(--note-h3); }
.ict-note li > ul, .ict-note li > ol { margin-top: 0.2rem; margin-bottom: 0.2rem; }
.ict-note strong { font-weight: 700; color: var(--note-h1); }
.ict-note a { color: var(--note-h3); }

/* PAGE HEADER */
.ict-note .page-header { margin-bottom: 2rem; }
.ict-note .page-header .section-label {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--note-accent);
  margin-bottom: 0.4rem;
}
.ict-note .page-header h1 {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 2rem;
  font-weight: 700;
  color: var(--note-h1);
  line-height: 1.2;
  margin-bottom: 0.75rem;
}

/* SECTION BLOCK */
.ict-note .section { margin-bottom: 2.5rem; scroll-margin-top: 6rem; }
.ict-note .section-header {
  background: var(--note-h1);
  color: #fff;
  padding: 0.9rem 1.25rem;
  border-radius: 10px 10px 0 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.ict-note .section-header .snum {
  background: rgba(255,255,255,0.15);
  border-radius: 6px;
  padding: 0.2rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  flex-shrink: 0;
}
.ict-note .section-header h2 {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1.25rem;
  font-weight: 700;
}
.ict-note .section-body {
  background: var(--note-card);
  border: 1px solid var(--note-border);
  border-top: none;
  border-radius: 0 0 10px 10px;
  padding: 1.5rem;
}

/* SUB-SECTION */
.ict-note .sub { margin-bottom: 2rem; scroll-margin-top: 6rem; }
.ict-note .sub:last-child { margin-bottom: 0; }
.ict-note .sub h3 {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--note-h2);
  padding-bottom: 0.4rem;
  border-bottom: 2px solid #d0dff0;
  margin-bottom: 1rem;
}
.ict-note .sub h4 {
  font-size: 0.9rem;
  font-weight: 800;
  color: var(--note-h3);
  margin: 1rem 0 0.4rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* DEVICE CARD */
.ict-note .device-card {
  border: 1px solid var(--note-border);
  border-radius: 8px;
  margin-bottom: 1.25rem;
  overflow: hidden;
}
.ict-note .device-card-header {
  background: #f0f4f9;
  padding: 0.6rem 1rem;
  font-weight: 700;
  font-size: 0.88rem;
  color: var(--note-h1);
  border-bottom: 1px solid var(--note-border);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.ict-note .device-card-header .badge {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 100px;
  letter-spacing: 0.05em;
}
.ict-note .badge-input { background: #dbeafe; color: #1e40af; }
.ict-note .badge-output { background: #fce7f3; color: #9d174d; }
.ict-note .badge-storage { background: #fef3c7; color: #92400e; }
.ict-note .badge-direct { background: #d1fae5; color: #065f46; }
.ict-note .device-card-body { padding: 0.75rem 1rem; }

/* ADVANTAGE / DISADVANTAGE BOXES */
.ict-note .adv-dis {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-top: 0.5rem;
}
.ict-note .adv-dis.full { grid-template-columns: 1fr; }
.ict-note .adv-box, .ict-note .dis-box {
  border-radius: 6px;
  padding: 0.6rem 0.85rem;
  font-size: 0.84rem;
}
.ict-note .adv-box { background: var(--note-adv-bg); border-left: 3px solid var(--note-adv-border); }
.ict-note .adv-box .label {
  color: var(--note-adv-text);
  font-weight: 800;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.3rem;
}
.ict-note .dis-box { background: var(--note-dis-bg); border-left: 3px solid var(--note-dis-border); }
.ict-note .dis-box .label {
  color: var(--note-dis-text);
  font-weight: 800;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.3rem;
}

/* NOTE BOX */
.ict-note .note {
  background: var(--note-tip-bg);
  border-left: 3px solid var(--note-tip-border);
  border-radius: 0 6px 6px 0;
  padding: 0.6rem 0.85rem;
  font-size: 0.84rem;
  margin: 0.75rem 0;
}
.ict-note .note strong { color: #92400e; }

/* TABLES */
.ict-note .table-wrap { overflow-x: auto; margin: 0.75rem 0; }
.ict-note .comp-table {
  width: 100%;
  min-width: 34rem;
  border-collapse: collapse;
  font-size: 0.84rem;
}
.ict-note .comp-table th {
  background: var(--note-table-head);
  color: #fff;
  padding: 0.5rem 0.75rem;
  text-align: left;
  font-weight: 700;
}
.ict-note .comp-table td {
  padding: 0.45rem 0.75rem;
  border-bottom: 1px solid var(--note-border);
  vertical-align: top;
}
.ict-note .comp-table tr:nth-child(even) td { background: var(--note-table-alt); }
.ict-note .comp-table tr:last-child td { border-bottom: none; }

/* USES BOX */
.ict-note .uses-box {
  background: #f0f4f9;
  border-radius: 6px;
  padding: 0.6rem 0.85rem;
  margin: 0.5rem 0;
  font-size: 0.84rem;
}
.ict-note .uses-box .label {
  font-weight: 800;
  color: var(--note-h3);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.3rem;
}

/* DEFINITION BOX */
.ict-note .def-box {
  background: #1c2b3a;
  color: #e8f0f8;
  border-radius: 8px;
  padding: 0.85rem 1.1rem;
  margin: 0.75rem 0;
  font-size: 0.85rem;
}
.ict-note .def-box strong { color: #90caf9; }

/* MISC LAYOUT */
.ict-note .divider { border: none; border-top: 1px solid var(--note-border); margin: 1.5rem 0; }
.ict-note .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 0.75rem 0; }
.ict-note .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin: 0.75rem 0; }
.ict-note .mini-card {
  background: var(--note-bg-page);
  border: 1px solid var(--note-border);
  border-radius: 8px;
  padding: 0.85rem;
}
.ict-note .mini-card h5 {
  font-size: 0.82rem;
  font-weight: 800;
  color: var(--note-h2);
  margin-bottom: 0.4rem;
}
/* SYLLABUS REFERENCE TAG */
.ict-note .syllabus-tag {
  display: inline-block;
  background: #e8eef6;
  color: var(--note-h2);
  border-radius: 100px;
  padding: 0.1rem 0.55rem;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  margin-left: 0.4rem;
  vertical-align: middle;
}

/* KEY-WORD REVEAL LIST (details/summary, no script needed) */
.ict-note .term-list { display: grid; gap: 0.4rem; margin: 0.75rem 0; }
.ict-note details.term {
  border: 1px solid var(--note-border);
  border-radius: 6px;
  background: var(--note-card);
  overflow: hidden;
}
.ict-note details.term > summary {
  cursor: pointer;
  list-style: none;
  padding: 0.5rem 0.85rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--note-h2);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.ict-note details.term > summary::-webkit-details-marker { display: none; }
.ict-note details.term > summary::before {
  content: '+';
  flex-shrink: 0;
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 4px;
  background: #e8eef6;
  color: var(--note-h2);
  font-weight: 800;
  font-size: 0.8rem;
  line-height: 1.1rem;
  text-align: center;
}
.ict-note details.term[open] > summary::before { content: '\\2013'; }
.ict-note details.term[open] > summary { border-bottom: 1px solid var(--note-border); }
.ict-note details.term > div { padding: 0.6rem 0.85rem; font-size: 0.84rem; }

/* CHECK-YOUR-UNDERSTANDING BLOCK */
.ict-note .check {
  background: #f0f4f9;
  border: 1px solid #d0dff0;
  border-radius: 8px;
  padding: 0.85rem 1rem;
  margin: 1.25rem 0 0;
}
.ict-note .check > .label {
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--note-h3);
  margin-bottom: 0.5rem;
}
.ict-note details.q {
  border-bottom: 1px solid #dbe5f1;
  padding: 0.35rem 0;
}
.ict-note details.q:last-child { border-bottom: none; padding-bottom: 0; }
.ict-note details.q > summary {
  cursor: pointer;
  list-style: none;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--note-h1);
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
}
.ict-note details.q > summary::-webkit-details-marker { display: none; }
.ict-note details.q > summary::before {
  content: 'Q';
  flex-shrink: 0;
  width: 1.15rem;
  height: 1.15rem;
  border-radius: 100px;
  background: var(--note-h2);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 800;
  line-height: 1.15rem;
  text-align: center;
}
.ict-note details.q > .answer {
  margin: 0.45rem 0 0.3rem 1.65rem;
  padding: 0.5rem 0.75rem;
  background: var(--note-adv-bg);
  border-left: 3px solid var(--note-adv-border);
  border-radius: 0 6px 6px 0;
  font-size: 0.83rem;
  color: var(--note-adv-text);
}
.ict-note details.q > .answer strong { color: var(--note-adv-text); }
.ict-note details.q > .answer ul { margin-bottom: 0; }

/* END-OF-SECTION RECAP */
.ict-note .recap {
  background: var(--note-bg-page);
  border: 1px dashed var(--note-border);
  border-radius: 8px;
  padding: 0.85rem 1rem;
  margin-top: 1.25rem;
}
.ict-note .recap > .label {
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--note-accent);
  margin-bottom: 0.4rem;
}
.ict-note .recap ul { list-style: none; padding-left: 0; margin-bottom: 0; }
.ict-note .recap li {
  font-size: 0.84rem;
  padding-left: 1.35rem;
  position: relative;
  margin-bottom: 0.3rem;
}
.ict-note .recap li::before {
  content: '\\2713';
  position: absolute;
  left: 0;
  color: var(--note-adv-border);
  font-weight: 800;
}

/* ILLUSTRATION WITH CAPTION */
.ict-note .note-figure {
  border: 1px solid var(--note-border);
  border-radius: 8px;
  overflow: hidden;
  margin: 0 0 1.5rem;
  background: var(--note-bg-page);
}
.ict-note .note-figure img { display: block; width: 100%; height: auto; }
.ict-note .note-figure figcaption {
  padding: 0.6rem 0.85rem;
  font-size: 0.84rem;
  color: var(--note-text-light);
  border-top: 1px solid var(--note-border);
}

/* ROW OF DEVICE PICTURES AT THE TOP OF A DEVICE CARD */
.ict-note .figure-row {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.6rem;
  margin: 0.25rem 0 0.75rem;
}
.ict-note .figure-row figure {
  border: 1px solid var(--note-border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--note-bg-page);
}
.ict-note .figure-row img { display: block; width: 100%; height: auto; }
.ict-note .figure-row figcaption {
  padding: 0.3rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-align: center;
  color: var(--note-h1);
  border-top: 1px solid var(--note-border);
}

.ict-note svg { max-width: 100%; height: auto; }
/* A note's own <style> block beats its presentation attributes, so a class like
   .mem-text { text-anchor: middle } silently re-centres text the markup asked to
   left-align. Give the attribute back the last word. */
.ict-note svg [text-anchor="start"] { text-anchor: start; }
.ict-note svg [text-anchor="middle"] { text-anchor: middle; }
.ict-note svg [text-anchor="end"] { text-anchor: end; }

/* ------------------------------------------------- EXAM PRACTICE CHECKPOINTS */
.ict-note .cp-block {
  margin: -1.75rem 0 2.5rem;
  border: 1px solid #c8d6e5;
  border-radius: 10px;
  overflow: hidden;
  background: #f7fafd;
}
.ict-note .cp-block-head {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1.1rem;
  background: #eaf1f9;
  border: none;
  border-bottom: 1px solid #c8d6e5;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: var(--note-h1);
}
.ict-note .cp-block-head:hover { background: #e1ebf6; }
.ict-note .cp-block-title { display: flex; flex-direction: column; gap: 0.15rem; font-weight: 700; font-size: 0.95rem; }
.ict-note .cp-block-kicker {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--note-accent);
}
.ict-note .cp-block-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--note-text-light);
  white-space: nowrap;
}
.ict-note .cp-chev { transition: transform 0.15s ease; display: inline-block; }
.ict-note .cp-chev.is-open { transform: rotate(180deg); }
.ict-note .cp-block-body { padding: 1rem 1.1rem 1.25rem; }
.ict-note .cp-block-note {
  font-size: 0.76rem;
  color: var(--note-text-light);
  background: #fff;
  border-left: 3px solid var(--note-h3);
  border-radius: 0 6px 6px 0;
  padding: 0.5rem 0.75rem;
  margin-bottom: 1rem;
}
.ict-note .cp-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 1rem; }
.ict-note .cp-card {
  background: var(--note-card);
  border: 1px solid var(--note-border);
  border-radius: 8px;
  padding: 0.9rem 1rem 1rem;
}
.ict-note .cp-card-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 0.6rem;
}
.ict-note .cp-source { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.03em; color: var(--note-h3); }
.ict-note .cp-marks {
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: #eef2f7;
  color: var(--note-h1);
  border-radius: 100px;
  padding: 0.15rem 0.55rem;
}
.ict-note .cp-stem { font-size: 0.88rem; font-weight: 600; color: var(--note-h1); margin-bottom: 0.6rem; }
.ict-note .cp-options {
  background: var(--note-bg-page);
  border: 1px dashed var(--note-border);
  border-radius: 6px;
  padding: 0.6rem 0.85rem;
  margin-bottom: 0.75rem;
}
.ict-note .cp-options .label {
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--note-text-light);
}
.ict-note .cp-options ul { list-style: none; padding: 0; margin: 0.35rem 0 0; display: flex; flex-wrap: wrap; gap: 0.35rem; }
.ict-note .cp-options li {
  background: #fff;
  border: 1px solid var(--note-border);
  border-radius: 100px;
  padding: 0.15rem 0.6rem;
  font-size: 0.78rem;
  margin: 0;
}
.ict-note .cp-parts { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.9rem; }
.ict-note .cp-part { margin: 0; }
.ict-note .cp-prompt { font-size: 0.86rem; margin-bottom: 0.4rem; }
.ict-note .cp-part-label { font-weight: 800; margin-right: 0.35rem; color: var(--note-h1); }
.ict-note .cp-part-marks { font-weight: 700; color: var(--note-text-light); margin-left: 0.4rem; }
.ict-note .cp-answer { display: flex; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.35rem; }
.ict-note .cp-slot-num { font-size: 0.8rem; font-weight: 700; color: var(--note-text-light); padding-top: 0.5rem; }
.ict-note .cp-answer textarea {
  flex: 1;
  min-width: 0;
  font: inherit;
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--note-text);
  background: #fff;
  border: 1px solid var(--note-border);
  border-radius: 6px;
  padding: 0.45rem 0.6rem;
  resize: vertical;
}
.ict-note .cp-answer textarea:focus {
  outline: 2px solid var(--note-h3);
  outline-offset: -1px;
  border-color: var(--note-h3);
}
.ict-note .cp-scheme {
  margin-top: 0.6rem;
  background: var(--note-adv-bg);
  border-left: 3px solid var(--note-adv-border);
  border-radius: 0 6px 6px 0;
  padding: 0.6rem 0.85rem;
}
.ict-note .cp-scheme .label {
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--note-adv-text);
  margin-bottom: 0.35rem;
}
.ict-note .cp-scheme ul { margin: 0; padding-left: 1.1rem; }
.ict-note .cp-scheme li { font-size: 0.82rem; margin-bottom: 0.25rem; }
.ict-note .cp-tip {
  font-size: 0.78rem;
  background: var(--note-tip-bg);
  border-left: 3px solid var(--note-tip-border);
  border-radius: 0 4px 4px 0;
  padding: 0.4rem 0.6rem;
  margin: 0.5rem 0 0;
}
.ict-note .cp-tip strong { color: #92400e; }
.ict-note .cp-selfmark { display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap; margin-top: 0.6rem; font-size: 0.75rem; font-weight: 700; color: var(--note-adv-text); }
.ict-note .cp-selfmark button {
  font: inherit;
  font-size: 0.8rem;
  min-width: 1.9rem;
  padding: 0.15rem 0.4rem;
  border: 1px solid var(--note-adv-border);
  border-radius: 6px;
  background: #fff;
  color: var(--note-adv-text);
  cursor: pointer;
}
.ict-note .cp-selfmark button:hover { background: #e3f3e3; }
.ict-note .cp-selfmark button.is-selected { background: var(--note-adv-border); border-color: var(--note-adv-border); color: #fff; }
.ict-note .cp-outof { font-weight: 600; opacity: 0.75; }
.ict-note .cp-actions { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; margin-top: 0.9rem; }
.ict-note .cp-btn {
  font: inherit;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.4rem 0.9rem;
  border-radius: 6px;
  border: 1px solid var(--note-border);
  background: #fff;
  color: var(--note-h1);
  cursor: pointer;
}
.ict-note .cp-btn:hover { background: var(--note-bg-page); }
.ict-note .cp-btn-primary { background: var(--note-h2); border-color: var(--note-h2); color: #fff; }
.ict-note .cp-btn-primary:hover { background: var(--note-h3); }
.ict-note .cp-nudge { font-size: 0.76rem; color: var(--note-accent); font-weight: 600; }
.ict-note .cp-score { font-size: 0.85rem; font-weight: 800; padding: 0.2rem 0.65rem; border-radius: 100px; }
.ict-note .cp-score.is-full { background: var(--note-adv-bg); color: var(--note-adv-text); }
.ict-note .cp-score.is-ok { background: var(--note-tip-bg); color: #92400e; }
.ict-note .cp-score.is-low { background: var(--note-dis-bg); color: var(--note-dis-text); }
@media print {
  .ict-note .cp-block-body { display: block !important; }
  .ict-note .cp-answer textarea { min-height: 3rem; }
}

@media (max-width: 900px) {
  .ict-note .grid-3 { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 640px) {
  .ict-note .adv-dis,
  .ict-note .grid-2,
  .ict-note .grid-3 { grid-template-columns: 1fr; }
  .ict-note .figure-row { grid-template-columns: repeat(2, 1fr); }
  .ict-note .section-body { padding: 1rem; }
  .ict-note .page-header h1 { font-size: 1.6rem; }
}
@media print {
  .ict-note .device-card, .ict-note .section, .ict-note .mini-card, .ict-note .note-figure, .ict-note .figure-row figure { break-inside: avoid; }
  /* A printed or exported note has no one to click the reveals, so show the
     answers. Browsers hide a closed <details>' content through the shadow tree,
     which only ::details-content can reach; the display rule covers the rest. */
  .ict-note details::details-content { content-visibility: visible; }
  .ict-note details > *:not(summary) { display: block; }
  .ict-note details.q, .ict-note details.term { break-inside: avoid; }
}
`;

/** Pull the section headings out of the note HTML to build an "On this page" list. */
function extractToc(html: string): TocEntry[] {
  const entries: TocEntry[] = [];
  const sectionRe = /<div class="section" id="([^"]+)">\s*<div class="section-header">\s*<span class="snum">([^<]*)<\/span>\s*<h2>([\s\S]*?)<\/h2>/g;
  let match: RegExpExecArray | null;
  while ((match = sectionRe.exec(html)) !== null) {
    entries.push({
      id: match[1],
      num: match[2].trim(),
      label: match[3].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim(),
    });
  }
  return entries;
}

/**
 * Index just past the `</div>` closing the `<div>` that opens at `openIndex`,
 * or -1 when the markup never closes it.
 */
function findDivClose(html: string, openIndex: number): number {
  const tagRe = /<div\b|<\/div>/gi;
  tagRe.lastIndex = openIndex;
  let depth = 0;
  let match: RegExpExecArray | null;
  while ((match = tagRe.exec(html)) !== null) {
    if (match[0].toLowerCase() === '</div>') {
      depth -= 1;
      if (depth === 0) return tagRe.lastIndex;
    } else {
      depth += 1;
    }
  }
  return -1;
}

/** Split the note into its section cards and the markup around them. */
function splitSections(html: string, toc: TocEntry[]): NoteSegment[] {
  if (toc.length === 0) return [{ kind: 'html', key: 'all', html }];

  const segments: NoteSegment[] = [];
  const openRe = /<div class="section" id="([^"]+)">/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = openRe.exec(html)) !== null) {
    const end = findDivClose(html, match.index);
    if (end === -1) break;

    if (match.index > cursor) {
      segments.push({ kind: 'html', key: `pre-${match.index}`, html: html.slice(cursor, match.index) });
    }

    const entry = toc.find((item) => item.id === match![1]);
    segments.push({
      kind: 'section',
      key: match[1],
      id: match[1],
      title: entry ? `${entry.num} ${entry.label}`.trim() : match[1],
      html: html.slice(match.index, end),
    });

    cursor = end;
    openRe.lastIndex = end;
  }

  if (cursor < html.length) {
    segments.push({ kind: 'html', key: `post-${cursor}`, html: html.slice(cursor) });
  }
  return segments;
}

export function HtmlNoteRenderer({ html, className }: HtmlNoteRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tocOpen, setTocOpen] = useState(false);

  const toc = useMemo(() => extractToc(html), [html]);
  const segments = useMemo(() => splitSections(html, toc), [html, toc]);

  // Highlight the section currently in view
  useEffect(() => {
    if (toc.length === 0 || !containerRef.current) return;

    const targets = toc
      .map((entry) => containerRef.current?.querySelector(`#${CSS.escape(entry.id)}`))
      .filter((el): el is Element => Boolean(el));

    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (records) => {
        const visible = records
          .filter((r) => r.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: '-100px 0px -60% 0px', threshold: 0 }
    );

    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [toc, html]);

  const handleTocClick = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    const target = containerRef.current?.querySelector(`#${CSS.escape(id)}`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveId(id);
    setTocOpen(false);
  };

  return (
    <div className={cn('flex flex-col xl:flex-row xl:items-start gap-6', className)}>
      <style dangerouslySetInnerHTML={{ __html: NOTE_STYLES }} />

      {toc.length > 1 && (
        <nav
          data-html2canvas-ignore
          className="xl:order-2 xl:w-56 xl:flex-shrink-0 xl:sticky xl:top-24 rounded-lg border bg-card print:hidden"
        >
          <button
            type="button"
            onClick={() => setTocOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground xl:cursor-default"
          >
            <span className="flex items-center gap-2">
              <List className="h-3.5 w-3.5" />
              On this page
            </span>
            <ChevronDown className={cn('h-4 w-4 transition-transform xl:hidden', tocOpen && 'rotate-180')} />
          </button>
          <ul className={cn('px-2 pb-2 space-y-0.5', !tocOpen && 'hidden xl:block')}>
            {toc.map((entry) => (
              <li key={entry.id}>
                <a
                  href={`#${entry.id}`}
                  onClick={(e) => handleTocClick(e, entry.id)}
                  className={cn(
                    'block rounded-md px-2 py-1.5 text-[13px] leading-snug transition-colors',
                    activeId === entry.id
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <span className="mr-1.5 font-mono text-[11px] opacity-70">{entry.num}</span>
                  {entry.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div ref={containerRef} className="ict-note min-w-0 flex-1 xl:order-1">
        {segments.map((segment) =>
          segment.kind === 'html' ? (
            <div key={segment.key} dangerouslySetInnerHTML={{ __html: segment.html }} />
          ) : (
            <React.Fragment key={segment.key}>
              <div dangerouslySetInnerHTML={{ __html: segment.html }} />
              <SectionCheckpoints sectionId={segment.id} sectionTitle={segment.title} />
            </React.Fragment>
          )
        )}
      </div>
    </div>
  );
}

export default HtmlNoteRenderer;
