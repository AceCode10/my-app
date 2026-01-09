'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FullscreenNotesViewerProps {
  children: ReactNode;
  noteTitle?: string;
}

export function FullscreenNotesViewer({ children, noteTitle }: FullscreenNotesViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Handle scroll progress
  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return;

      const element = contentRef.current;
      const scrollTop = element.scrollTop;
      const scrollHeight = element.scrollHeight - element.clientHeight;
      
      if (scrollHeight > 0) {
        const progress = (scrollTop / scrollHeight) * 100;
        setScrollProgress(Math.min(progress, 100));
      }
    };

    const element = contentRef.current;
    if (element) {
      element.addEventListener('scroll', handleScroll);
      return () => element.removeEventListener('scroll', handleScroll);
    }
  }, [isFullscreen]);

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      // Enter fullscreen
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if ((containerRef.current as any)?.webkitRequestFullscreen) {
        (containerRef.current as any).webkitRequestFullscreen();
      } else if ((containerRef.current as any)?.msRequestFullscreen) {
        (containerRef.current as any).msRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes (e.g., ESC key)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative',
        isFullscreen && 'bg-background'
      )}
    >
      {/* Progress Border - Animated teal/cyan border that fills on scroll */}
      <div
        className="fixed inset-0 pointer-events-none z-50"
        style={{
          background: `linear-gradient(to right, rgb(20, 184, 166) ${scrollProgress}%, transparent ${scrollProgress}%)`,
          height: '4px',
          top: 0,
          transition: 'background 0.1s ease-out',
        }}
      />
      <div
        className="fixed right-0 top-0 bottom-0 pointer-events-none z-50"
        style={{
          background: `linear-gradient(to bottom, rgb(20, 184, 166) ${scrollProgress}%, transparent ${scrollProgress}%)`,
          width: '4px',
          transition: 'background 0.1s ease-out',
        }}
      />
      <div
        className="fixed bottom-0 left-0 right-0 pointer-events-none z-50"
        style={{
          background: `linear-gradient(to left, rgb(20, 184, 166) ${scrollProgress}%, transparent ${scrollProgress}%)`,
          height: '4px',
          transition: 'background 0.1s ease-out',
        }}
      />
      <div
        className="fixed left-0 top-0 bottom-0 pointer-events-none z-50"
        style={{
          background: `linear-gradient(to top, rgb(20, 184, 166) ${scrollProgress}%, transparent ${scrollProgress}%)`,
          width: '4px',
          transition: 'background 0.1s ease-out',
        }}
      />

      {/* Fullscreen Controls */}
      {isFullscreen && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-background/95 backdrop-blur-sm rounded-lg p-2 shadow-lg border">
          {noteTitle && (
            <span className="text-sm font-medium px-2 max-w-md truncate">
              {noteTitle}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Fullscreen Toggle Button (when not in fullscreen) */}
      {!isFullscreen && (
        <div className="fixed bottom-6 right-6 z-40">
          <Button
            onClick={toggleFullscreen}
            size="lg"
            className="h-12 w-12 rounded-full shadow-lg"
            title="Enter fullscreen mode"
          >
            <Maximize2 className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Content Container */}
      <div
        ref={contentRef}
        className={cn(
          'transition-all duration-300',
          isFullscreen && 'h-screen overflow-y-auto p-8 md:p-12 lg:p-16'
        )}
      >
        {/* Progress Indicator Text */}
        {isFullscreen && scrollProgress > 0 && (
          <div className="fixed bottom-6 left-6 z-50 bg-teal-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
            {Math.round(scrollProgress)}%
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
