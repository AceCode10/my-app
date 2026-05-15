'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface HtmlDeckPresenterProps {
  url: string;
  title?: string;
  backHref?: string;
}

interface Slide {
  html: string;
  label: string;
}

function parseSlides(rawHtml: string): { slides: Slide[]; styleBlock: string } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');

  // Collect all <style> blocks
  const styleBlock = Array.from(doc.querySelectorAll('style'))
    .map((s) => s.outerHTML)
    .join('\n');

  // Extract sections inside <deck-stage> first, then fall back to all <section> tags
  const deckStage = doc.querySelector('deck-stage');
  const container = deckStage || doc.body;
  const sections = Array.from(container.querySelectorAll('section'));

  if (sections.length === 0) {
    // Fallback: render entire body as one slide
    return {
      slides: [{ html: doc.body.innerHTML, label: 'Slide 1' }],
      styleBlock,
    };
  }

  const slides: Slide[] = sections.map((section, i) => ({
    html: section.outerHTML,
    label: section.getAttribute('data-label') || `Slide ${i + 1}`,
  }));

  return { slides, styleBlock };
}

function buildSrcdoc(styleBlock: string, slideHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1920">
${styleBlock}
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1920px;height:1080px;overflow:hidden;background:#f9fafb}
section{width:1920px;min-height:1080px;height:1080px;overflow:hidden}
</style>
</head>
<body>
${slideHtml}
</body>
</html>`;
}

export function HtmlDeckPresenter({ url, title = 'Presentation', backHref }: HtmlDeckPresenterProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [slides, setSlides] = useState<Slide[]>([]);
  const [styleBlock, setStyleBlock] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [viewport, setViewport] = useState({ w: 1920, h: 1080 });

  // Reactive viewport size for scale calculation
  useEffect(() => {
    const update = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Fetch + parse the HTML deck
  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to fetch presentation (${r.status})`);
        return r.text();
      })
      .then((html) => {
        const { slides: parsed, styleBlock: styles } = parseSlides(html);
        setSlides(parsed);
        setStyleBlock(styles);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [url]);

  // Navigation
  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, slides.length - 1));
  }, [slides.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, []);

  // Keyboard handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'Home') {
        e.preventDefault();
        setCurrentIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setCurrentIndex(slides.length - 1);
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'Escape' && !isFullscreen) {
        handleExit();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev, slides.length, isFullscreen]);

  // Touch swipe
  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 50) {
      delta > 0 ? goNext() : goPrev();
    }
    touchStartX.current = null;
  };

  // Fullscreen API
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false));
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Auto-hide controls
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, [currentIndex]);

  const handleExit = () => {
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-screen bg-black">
        <Loader2 className="h-10 w-10 animate-spin text-white" />
        <span className="ml-3 text-white text-lg">Loading presentation…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full min-h-screen bg-gray-950 text-white gap-4">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-xl font-semibold">Could not load presentation</p>
        <p className="text-sm text-gray-400">{error}</p>
        <Button variant="outline" onClick={handleExit} className="mt-4">
          Go back
        </Button>
      </div>
    );
  }

  const currentSlide = slides[currentIndex];

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen bg-black overflow-hidden select-none"
      onMouseMove={resetControlsTimer}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Slide stage — scaled to fit viewport */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ background: '#111' }}
      >
        <div
          style={{
            width: 1920,
            height: 1080,
            transform: `scale(${Math.min(viewport.w / 1920, viewport.h / 1080)})`,
            transformOrigin: 'center center',
            position: 'relative',
          }}
        >
          <iframe
            key={currentIndex}
            srcDoc={buildSrcdoc(styleBlock, currentSlide?.html ?? '')}
            sandbox="allow-same-origin"
            style={{
              width: 1920,
              height: 1080,
              border: 'none',
              display: 'block',
              background: '#f9fafb',
            }}
            title={`Slide ${currentIndex + 1}: ${currentSlide?.label ?? ''}`}
          />
        </div>
      </div>

      {/* Controls overlay */}
      <div
        className={cn(
          'absolute inset-0 pointer-events-none transition-opacity duration-300',
          showControls ? 'opacity-100' : 'opacity-0'
        )}
        onMouseEnter={resetControlsTimer}
      >
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/70 to-transparent pointer-events-auto">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
            onClick={handleExit}
          >
            <X className="h-4 w-4 mr-2" />
            Exit
          </Button>
          <span className="text-white font-medium text-sm truncate max-w-md">{title}</span>
          <div className="flex items-center gap-2">
            <span className="text-white/70 text-sm">
              {currentIndex + 1} / {slides.length}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
            >
              {isFullscreen ? (
                <Minimize className="h-5 w-5" />
              ) : (
                <Maximize className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Prev / Next side buttons */}
        <button
          className={cn(
            'absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors pointer-events-auto',
            currentIndex === 0 && 'opacity-30 cursor-not-allowed'
          )}
          onClick={goPrev}
          disabled={currentIndex === 0}
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-8 w-8" />
        </button>
        <button
          className={cn(
            'absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors pointer-events-auto',
            currentIndex === slides.length - 1 && 'opacity-30 cursor-not-allowed'
          )}
          onClick={goNext}
          disabled={currentIndex === slides.length - 1}
          aria-label="Next slide"
        >
          <ChevronRight className="h-8 w-8" />
        </button>

        {/* Bottom progress bar */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-4 bg-gradient-to-t from-black/70 to-transparent pointer-events-auto">
          {/* Slide thumbnails / dots */}
          <div className="flex items-center justify-center gap-1 flex-wrap max-w-4xl mx-auto">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-200',
                  i === currentIndex
                    ? 'bg-white w-6'
                    : 'bg-white/40 w-2 hover:bg-white/70'
                )}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
          <p className="text-center text-white/40 text-xs mt-2">
            ← → to navigate · F for fullscreen · Esc to exit
          </p>
        </div>
      </div>
    </div>
  );
}
