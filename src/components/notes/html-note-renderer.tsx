'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { List, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

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
.ict-note ul, .ict-note ol { padding-left: 1.5rem; margin-bottom: 0.6rem; }
.ict-note li { margin-bottom: 0.2rem; }
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
.ict-note svg { max-width: 100%; height: auto; }

@media (max-width: 900px) {
  .ict-note .grid-3 { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 640px) {
  .ict-note .adv-dis,
  .ict-note .grid-2,
  .ict-note .grid-3 { grid-template-columns: 1fr; }
  .ict-note .section-body { padding: 1rem; }
  .ict-note .page-header h1 { font-size: 1.6rem; }
}
@media print {
  .ict-note .device-card, .ict-note .section, .ict-note .mini-card { break-inside: avoid; }
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

export function HtmlNoteRenderer({ html, className }: HtmlNoteRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tocOpen, setTocOpen] = useState(false);

  const toc = useMemo(() => extractToc(html), [html]);

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

      <div
        ref={containerRef}
        className="ict-note min-w-0 flex-1 xl:order-1"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

export default HtmlNoteRenderer;
