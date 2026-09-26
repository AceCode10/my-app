'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { loadPdfJs } from '@/lib/pdf-to-images-client';
import { mergeContiguous, type Label, type Region } from '@/lib/pdf/compose-test-pdf';

/**
 * A past-paper question shown exactly as the board printed it: its source
 * regions cut from the original question paper, stacked, with the test's own
 * number beside it. Shows `fallback` (the text rendering) while the paper
 * loads, and keeps showing it if the paper cannot be rendered.
 */

const RENDER_SCALE = 2;

// Shared across every view on the page: each paper is fetched once and each
// page rasterised once, however many questions come from it.
interface PdfJsDocument {
  getPage(pageNumber: number): Promise<{
    getViewport(options: { scale: number }): { width: number; height: number };
    render(options: { canvasContext: CanvasRenderingContext2D; viewport: unknown }): { promise: Promise<void> };
  }>;
}

const documents = new Map<string, Promise<PdfJsDocument>>();
const pages = new Map<string, Promise<HTMLCanvasElement>>();

function loadDocument(url: string) {
  if (!documents.has(url)) {
    documents.set(
      url,
      loadPdfJs().then((pdfjs) => pdfjs.getDocument({ url }).promise),
    );
    documents.get(url)!.catch(() => documents.delete(url));
  }
  return documents.get(url)!;
}

function renderPage(url: string, pageIndex: number) {
  const key = `${url}#${pageIndex}`;
  if (!pages.has(key)) {
    pages.set(
      key,
      loadDocument(url).then(async (doc) => {
        const page = await doc.getPage(pageIndex + 1);
        const viewport = page.getViewport({ scale: RENDER_SCALE });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
        return canvas;
      }),
    );
    pages.get(key)!.catch(() => pages.delete(key));
  }
  return pages.get(key)!;
}

async function composeImage(url: string, regions: Region[], label: Label | null): Promise<string> {
  const merged = mergeContiguous(regions);
  const s = RENDER_SCALE;
  const gap = 8 * s;
  const width = Math.ceil(Math.max(...merged.map((r) => r.bbox[2] - r.bbox[0])) * s);
  const height = Math.ceil(
    merged.reduce((sum, r) => sum + (r.bbox[3] - r.bbox[1]) * s, 0) + gap * (merged.length - 1),
  );

  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  const ctx = out.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  let y = 0;
  for (const region of merged) {
    const [x0, top, x1, bottom] = region.bbox;
    const page = await renderPage(url, region.page);
    const w = (x1 - x0) * s;
    const h = (bottom - top) * s;
    ctx.drawImage(page, x0 * s, top * s, w, h, 0, y, w, h);

    // Same rule as the PDF composer: paint out the paper's own number when
    // content starting left of it kept the number inside the region.
    if (label && label.page === region.page && label.top >= top - 1 && label.top <= bottom && label.right !== undefined && label.right + 4 > x0) {
      const left = Math.max(x0, label.x - 1);
      ctx.fillRect((left - x0) * s, y + (label.top - 1.5 - top) * s, (label.right + 4 - left) * s, (label.bottom - label.top + 3) * s);
    }
    y += h + gap;
  }

  return out.toDataURL('image/png');
}

/** Question paper PDF URL per past_papers id, for the given ids. */
export function useSourcePaperUrls(paperIds: (string | null | undefined)[]): Map<string, string> | null {
  const ids = Array.from(new Set(paperIds.filter((id): id is string => !!id))).sort();
  const key = ids.join(',');
  const [urls, setUrls] = useState<Map<string, string> | null>(null);

  useEffect(() => {
    if (ids.length === 0) {
      setUrls(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const supabase = (await import('@/lib/supabase/client')).createClient();
      const { data } = await supabase.from('past_papers').select('id, question_paper_url, paper_url').in('id', ids);
      const map = new Map<string, string>();
      (data ?? []).forEach((p: { id: string; question_paper_url: string | null; paper_url: string | null }) => {
        const url = p.question_paper_url || p.paper_url;
        if (url) map.set(p.id, url);
      });
      if (!cancelled) setUrls(map);
    })().catch((error) => console.error('Could not load question paper URLs:', error));
    return () => { cancelled = true; };
    // `key` captures ids by value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return urls;
}

interface SourceRegionViewProps {
  pdfUrl: string;
  regions: Region[];
  label?: Label | null;
  /** The number this question has in the test. */
  number?: number | string;
  /** Shown while loading and if the paper cannot be rendered. */
  fallback: ReactNode;
}

export function SourceRegionView({ pdfUrl, regions, label = null, number, fallback }: SourceRegionViewProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const key = `${pdfUrl}|${JSON.stringify(regions)}`;

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    setFailed(false);
    composeImage(pdfUrl, regions, label)
      .then((dataUrl) => { if (!cancelled) setSrc(dataUrl); })
      .catch((error) => {
        console.error('Could not render the original paper for this question:', error);
        if (!cancelled) setFailed(true);
      });
    return () => { cancelled = true; };
    // `key` captures pdfUrl and regions by value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (failed || !src) return <>{fallback}</>;

  return (
    <div className="flex items-start gap-2">
      {number !== undefined && <span className="font-bold text-sm pt-[2px] w-6 shrink-0">{number}</span>}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Question as printed in the original paper" className="w-full max-w-[640px] h-auto" />
    </div>
  );
}
