'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Loader2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Pencil,
  X
} from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamic import of react-pdf to avoid SSR issues
const Document = dynamic(
  () => import('react-pdf').then((mod) => mod.Document),
  { ssr: false }
);

const Page = dynamic(
  () => import('react-pdf').then((mod) => mod.Page),
  { ssr: false }
);

// Configure worker
import { pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  pdfUrl: string;
  title: string;
  className?: string;
}

const MAGIC_ANIMATIONS = [
  { id: 'blur', key: 'b', name: 'Blur', emoji: '✨' },
  { id: 'confetti', key: 'c', name: 'Confetti', emoji: '🎉' },
  { id: 'quiet', key: 'q', name: 'Quiet', emoji: '🤫' },
];

export function PDFViewerSimple({ pdfUrl, title, className }: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [numPages, setNumPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPointer, setShowPointer] = useState(false);
  const [pointerPos, setPointerPos] = useState({ x: 0, y: 0 });
  const [showMagicMenu, setShowMagicMenu] = useState(false);
  const [isBlurred, setIsBlurred] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Progress percentage
  const progressPercent = (currentPage / numPages) * 100;

  // PDF load success
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
  };

  // Page navigation
  const goToPage = (page: number) => {
    if (page >= 1 && page <= numPages) {
      setCurrentPage(page);
    }
  };

  // Zoom controls
  const zoomIn = () => setScale(s => Math.min(s + 0.25, 3));
  const zoomOut = () => setScale(s => Math.max(s - 0.25, 0.5));

  // Fullscreen toggle
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      if (!isFullscreen) {
        await containerRef.current.requestFullscreen?.();
      } else {
        await document.exitFullscreen?.();
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  }, [isFullscreen]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPage(currentPage - 1);
      if (e.key === 'ArrowRight') goToPage(currentPage + 1);
      if (e.key === 'f') toggleFullscreen();
      if (e.key === 'b') setIsBlurred(b => !b);
      if (e.key === 'p') setShowPointer(p => !p);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, toggleFullscreen]);

  // Mouse tracking for pointer
  useEffect(() => {
    if (!showPointer) return;
    const handleMouseMove = (e: MouseEvent) => {
      setPointerPos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [showPointer]);

  // Trigger magic animation
  const triggerMagic = (id: string) => {
    if (id === 'blur') setIsBlurred(b => !b);
    if (id === 'confetti') {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
    setShowMagicMenu(false);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex flex-col bg-gray-100 rounded-lg overflow-hidden',
        isFullscreen && 'fixed inset-0 z-50 rounded-none bg-black',
        className
      )}
      style={{ height: isFullscreen ? '100vh' : 'calc(100vh - 200px)' }}
    >
      {/* PDF Content Area */}
      <div className="flex-1 relative overflow-auto flex items-center justify-center">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-gray-500 mt-2 text-sm">Loading PDF...</p>
          </div>
        )}

        {/* PDF Document */}
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={(error) => console.error('PDF load error:', error)}
          loading={null}
          className="flex items-center justify-center"
        >
          <Page
            pageNumber={currentPage}
            scale={scale}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="shadow-xl"
          />
        </Document>

        {/* Navigation arrows on sides */}
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          className={cn(
            "absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/30 hover:bg-black/50 transition-all z-20",
            currentPage <= 1 && "opacity-30 cursor-not-allowed"
          )}
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= numPages}
          className={cn(
            "absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/30 hover:bg-black/50 transition-all z-20",
            currentPage >= numPages && "opacity-30 cursor-not-allowed"
          )}
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>

        {/* Blur overlay */}
        {isBlurred && (
          <div className="absolute inset-0 backdrop-blur-md z-30 pointer-events-none" />
        )}

        {/* Pointer highlighter */}
        {showPointer && (
          <div
            className="fixed pointer-events-none z-[100]"
            style={{ left: pointerPos.x, top: pointerPos.y, transform: 'translate(-50%, -50%)' }}
          >
            <div className="w-10 h-10 rounded-full bg-green-500/40 shadow-[0_0_15px_8px_rgba(34,197,94,0.3)]" />
            <div className="absolute inset-2 rounded-full bg-green-500/70" />
            <div className="absolute inset-3 rounded-full bg-green-400" />
          </div>
        )}

        {/* Confetti animation */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={i}
                className="absolute animate-confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: '-20px',
                  width: '10px',
                  height: '10px',
                  backgroundColor: ['#ff0', '#f0f', '#0ff', '#f00', '#0f0'][Math.floor(Math.random() * 5)],
                  animationDelay: `${Math.random() * 2}s`,
                  borderRadius: Math.random() > 0.5 ? '50%' : '0',
                }}
              />
            ))}
          </div>
        )}

        {/* Magic menu */}
        {showMagicMenu && (
          <div className="absolute top-4 right-4 bg-gray-900/95 rounded-lg p-3 z-50 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white text-sm font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Magic
              </span>
              <button onClick={() => setShowMagicMenu(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            {MAGIC_ANIMATIONS.map(anim => (
              <button
                key={anim.id}
                onClick={() => triggerMagic(anim.id)}
                className="w-full flex items-center gap-2 text-gray-300 hover:bg-gray-700/50 p-2 rounded text-sm"
              >
                <span>{anim.emoji}</span>
                <span>{anim.name}</span>
                {anim.id === 'blur' && isBlurred && <span className="text-green-400 text-xs">(ON)</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Green progress bar */}
      <div className="h-1 bg-gray-300">
        <div 
          className="h-full bg-green-500 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Bottom controls bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900">
        {/* Left: Page navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-1.5 rounded bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-white text-sm font-medium min-w-[50px] text-center">
            {currentPage} / {numPages}
          </span>
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= numPages}
            className="p-1.5 rounded bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Zoom */}
        <div className="flex items-center gap-1">
          <button onClick={zoomOut} className="p-1.5 rounded bg-gray-800 text-white hover:bg-gray-700">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-white text-xs px-2 min-w-[50px] text-center">{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} className="p-1.5 rounded bg-gray-800 text-white hover:bg-gray-700">
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Magic, Annotate, Fullscreen */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowMagicMenu(m => !m)}
            className={cn('p-1.5 rounded bg-gray-800 text-white hover:bg-gray-700', showMagicMenu && 'bg-primary')}
            title="Magic shortcuts"
          >
            <Sparkles className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowPointer(p => !p)}
            className={cn('p-1.5 rounded bg-gray-800 text-white hover:bg-gray-700', showPointer && 'bg-green-600')}
            title="Pointer"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded bg-gray-800 text-white hover:bg-gray-700"
            title="Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
