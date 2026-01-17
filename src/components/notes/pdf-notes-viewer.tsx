'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Download,
  Share2,
  Bookmark,
  BookmarkCheck,
  RotateCw,
  Loader2,
  Eye,
  MousePointer2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';

interface PDFNotesViewerProps {
  pdfUrl: string;
  title: string;
  subtitle?: string;
  viewCount?: number;
  isDownloadable?: boolean;
  onBookmark?: () => void;
  isBookmarked?: boolean;
  className?: string;
}

export function PDFNotesViewer({
  pdfUrl,
  title,
  subtitle,
  viewCount = 0,
  isDownloadable = true,
  onBookmark,
  isBookmarked = false,
  className
}: PDFNotesViewerProps) {
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [showPointer, setShowPointer] = useState(false);
  const [pointerPos, setPointerPos] = useState({ x: 0, y: 0 });

  // Handle fullscreen toggle
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!isFullscreen) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  }, [isFullscreen]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Handle keyboard shortcuts in fullscreen
  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          // Handled by browser
          break;
        case '+':
        case '=':
          setZoom(z => Math.min(z + 10, 200));
          break;
        case '-':
          setZoom(z => Math.max(z - 10, 50));
          break;
        case 'h':
        case 'H':
          setShowPointer(p => !p);
          break;
        case '0':
          setZoom(100);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Track pointer position in fullscreen
  useEffect(() => {
    if (!isFullscreen || !showPointer) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPointerPos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isFullscreen, showPointer]);

  const handleShare = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({ title, text: subtitle || title, url });
      } catch (err) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast({
        title: 'Link Copied',
        description: 'The link has been copied to your clipboard.',
      });
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: 'Download Started',
      description: 'Your PDF is being downloaded.',
    });
  };

  // Build PDF URL with viewer settings
  const getPdfViewerUrl = () => {
    // Use Google Docs viewer as fallback for cross-origin PDFs, or direct embed
    // Adding #toolbar=1&navpanes=0&scrollbar=1&view=FitH for PDF.js viewer controls
    return `${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`;
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex flex-col bg-background rounded-xl border overflow-hidden',
        isFullscreen && 'fixed inset-0 z-50 rounded-none border-none',
        className
      )}
    >
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur',
        isFullscreen && 'bg-gray-900 border-gray-700'
      )}>
        <div className="flex-1 min-w-0">
          <h1 className={cn(
            'font-bold text-lg truncate',
            isFullscreen && 'text-white'
          )}>
            {title}
          </h1>
          {subtitle && (
            <p className={cn(
              'text-sm text-muted-foreground truncate',
              isFullscreen && 'text-gray-400'
            )}>
              {subtitle}
            </p>
          )}
          {viewCount > 0 && (
            <div className={cn(
              'flex items-center gap-1 text-xs text-muted-foreground mt-1',
              isFullscreen && 'text-gray-500'
            )}>
              <Eye className="w-3 h-3" />
              <span>{viewCount} views</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 ml-4">
          {/* Zoom controls - visible in fullscreen */}
          {isFullscreen && (
            <div className="flex items-center gap-2 mr-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setZoom(z => Math.max(z - 10, 50))}
                className="text-white hover:bg-white/10"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-white text-sm w-12 text-center">{zoom}%</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setZoom(z => Math.min(z + 10, 200))}
                className="text-white hover:bg-white/10"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowPointer(p => !p)}
                className={cn(
                  'text-white hover:bg-white/10',
                  showPointer && 'bg-primary text-white'
                )}
                title="Toggle pointer (H)"
              >
                <MousePointer2 className="w-4 h-4" />
              </Button>
            </div>
          )}

          {onBookmark && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBookmark}
              className={isFullscreen ? 'text-white hover:bg-white/10' : ''}
            >
              {isBookmarked ? (
                <BookmarkCheck className="w-5 h-5 text-primary" />
              ) : (
                <Bookmark className="w-5 h-5" />
              )}
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleShare}
            className={isFullscreen ? 'text-white hover:bg-white/10' : ''}
          >
            <Share2 className="w-5 h-5" />
          </Button>
          
          {isDownloadable && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className={isFullscreen ? 'text-white hover:bg-white/10' : ''}
            >
              <Download className="w-5 h-5" />
            </Button>
          )}
          
          <Button
            variant={isFullscreen ? 'secondary' : 'default'}
            size="sm"
            onClick={toggleFullscreen}
            className={cn(
              isFullscreen && 'bg-primary hover:bg-primary/90'
            )}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-4 h-4 mr-2" />
                Exit Fullscreen
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4 mr-2" />
                Fullscreen
              </>
            )}
          </Button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className={cn(
        'relative flex-1 bg-gray-100 dark:bg-gray-800',
        isFullscreen && 'bg-gray-900'
      )}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading PDF...</p>
            </div>
          </div>
        )}

        {/* Pointer highlighter in fullscreen */}
        {isFullscreen && showPointer && (
          <div
            className="fixed pointer-events-none z-50 transition-transform duration-75"
            style={{
              left: pointerPos.x - 20,
              top: pointerPos.y - 20,
            }}
          >
            <div className="w-10 h-10 rounded-full bg-yellow-400/50 animate-pulse" />
            <div className="absolute inset-2 rounded-full bg-yellow-400/80" />
          </div>
        )}

        <iframe
          ref={iframeRef}
          src={getPdfViewerUrl()}
          className={cn(
            'w-full h-full border-0',
            isFullscreen && 'bg-gray-900'
          )}
          style={{
            minHeight: isFullscreen ? '100%' : '600px',
            transform: isFullscreen ? `scale(${zoom / 100})` : undefined,
            transformOrigin: 'top center',
          }}
          onLoad={() => setIsLoading(false)}
          title={title}
          allowFullScreen
        />
      </div>

      {/* Fullscreen keyboard shortcuts hint */}
      {isFullscreen && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-4 py-2 rounded-full opacity-50 hover:opacity-100 transition-opacity">
          <span className="mr-4"><kbd>+/-</kbd> Zoom</span>
          <span className="mr-4"><kbd>H</kbd> Pointer</span>
          <span><kbd>ESC</kbd> Exit</span>
        </div>
      )}
    </div>
  );
}

export default PDFNotesViewer;
