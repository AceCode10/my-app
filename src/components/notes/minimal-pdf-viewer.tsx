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
  Pencil,
  X,
  Moon,
  Sun,
  Menu,
  BookOpen
} from 'lucide-react';
import Link from 'next/link';

interface Topic {
  id: string;
  name: string;
  slug: string;
}

interface MinimalPDFViewerProps {
  pdfUrl: string;
  title: string;
  topics?: Topic[];
  currentTopicSlug?: string;
  subjectSlug?: string;
  className?: string;
}

const MAGIC_ANIMATIONS = [
  { id: 'blur', key: 'b', name: 'Blur', emoji: '🌫️' },
  { id: 'quiet', key: 'q', name: 'Quiet', emoji: '🤫' },
  { id: 'bubbles', key: 'o', name: 'Bubbles', emoji: '🫧' },
  { id: 'confetti', key: 'c', name: 'Confetti', emoji: '🎊' },
  { id: 'drumroll', key: 'd', name: 'Drumroll', emoji: '🥁' },
  { id: 'micdrop', key: 'm', name: 'Mic Drop', emoji: '🎤' },
  { id: 'clear', key: 'x', name: 'Clear All', emoji: '↩' },
];

export function MinimalPDFViewer({ 
  pdfUrl, 
  title, 
  topics = [],
  currentTopicSlug,
  subjectSlug,
  className 
}: MinimalPDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [scale, setScale] = useState(100);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMagicMenu, setShowMagicMenu] = useState(false);
  const [isBlurred, setIsBlurred] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showBubbles, setShowBubbles] = useState(false);
  const [showDrumroll, setShowDrumroll] = useState(false);
  const [showMicDrop, setShowMicDrop] = useState(false);
  const [showQuiet, setShowQuiet] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  // Zoom controls
  const zoomIn = () => setScale(s => Math.min(s + 25, 200));
  const zoomOut = () => setScale(s => Math.max(s - 25, 50));

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

  // Trigger magic animation
  const triggerMagic = useCallback((id: string) => {
    switch (id) {
      case 'blur':
        setIsBlurred(b => !b);
        break;
      case 'confetti':
        setShowConfetti(true);
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3');
          audio.volume = 0.6;
          audio.play().catch(() => {});
        } catch {}
        setTimeout(() => setShowConfetti(false), 4000);
        break;
      case 'bubbles':
        setShowBubbles(true);
        setTimeout(() => setShowBubbles(false), 4000);
        break;
      case 'drumroll':
        setShowDrumroll(true);
        try {
          const audio = new Audio('https://www.soundjay.com/drum/sounds/snare-drum-roll-01.mp3');
          audio.volume = 0.7;
          audio.play().catch(() => {});
        } catch {}
        setTimeout(() => setShowDrumroll(false), 4000);
        break;
      case 'micdrop':
        setShowMicDrop(true);
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3');
          audio.volume = 0.5;
          audio.play().catch(() => {});
        } catch {}
        setTimeout(() => setShowMicDrop(false), 4000);
        break;
      case 'quiet':
        setShowQuiet(true);
        try {
          const audio = new Audio('https://www.soundjay.com/human/sounds/shh-1.mp3');
          audio.volume = 0.7;
          audio.play().catch(() => {});
        } catch {}
        setTimeout(() => setShowQuiet(false), 3500);
        break;
      case 'clear':
        setIsBlurred(false);
        setShowConfetti(false);
        setShowBubbles(false);
        setShowDrumroll(false);
        setShowMicDrop(false);
        setShowQuiet(false);
        break;
    }
    setShowMagicMenu(false);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const key = e.key.toLowerCase();
      switch (key) {
        case 'f':
          toggleFullscreen();
          break;
        case 'b':
          triggerMagic('blur');
          break;
        case 'q':
          triggerMagic('quiet');
          break;
        case 'o':
          triggerMagic('bubbles');
          break;
        case 'c':
          triggerMagic('confetti');
          break;
        case 'd':
          triggerMagic('drumroll');
          break;
        case 'm':
          triggerMagic('micdrop');
          break;
        case 'x':
          triggerMagic('clear');
          break;
        case 'escape':
          setShowMagicMenu(false);
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleFullscreen, triggerMagic]);


  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex bg-white overflow-hidden',
        isFullscreen && 'fixed inset-0 z-50 rounded-none',
        isDarkMode && 'dark',
        className
      )}
      style={{ height: isFullscreen ? '100vh' : 'calc(100vh - 200px)', minHeight: '500px' }}
    >
      {/* Left Sidebar - Topic Navigation - Hidden in fullscreen */}
      {showSidebar && topics.length > 0 && !isFullscreen && (
        <div className="w-64 bg-white border-r border-gray-200 flex-shrink-0 overflow-y-auto transition-all duration-300">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <BookOpen className="w-4 h-4" />
              <span>Topics</span>
            </div>
          </div>
          <nav className="py-2">
            {topics.map((topic) => (
              <Link
                key={topic.id}
                href={`/resources/revision-notes/${subjectSlug}/${topic.slug}`}
                className={cn(
                  "block px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors border-l-2",
                  topic.slug === currentTopicSlug 
                    ? "border-primary bg-green-50 text-gray-900 font-medium" 
                    : "border-transparent text-gray-600 hover:text-gray-900"
                )}
              >
                {topic.name}
              </Link>
            ))}
          </nav>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* PDF Content Area - Clean Canvas look */}
        <div className={cn(
          "flex-1 relative overflow-hidden",
          isDarkMode ? "bg-neutral-900" : "bg-white"
        )}>
          {/* Loading State */}
          {isLoading && (
            <div className={cn(
              "absolute inset-0 flex flex-col items-center justify-center z-10",
              isDarkMode ? "bg-neutral-900" : "bg-white"
            )}>
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">Loading...</p>
            </div>
          )}

          {/* PDF iframe - embedded viewer with zoom - seamless look */}
          {/* Grey background (#525659) matches Chrome/Edge PDF viewer's background so shadows blend in */}
          <div 
            className="w-full h-full flex items-start justify-center overflow-auto"
            style={{ backgroundColor: isDarkMode ? '#1a1a1a' : '#525659' }}
          >
            <iframe
              key={`pdf-${isFullscreen ? 'fullscreen' : 'normal'}`}
              src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH&page=1`}
              className={cn(
                isDarkMode && "invert",
                "w-full h-full"
              )}
              style={{ 
                transform: isFullscreen ? undefined : `scale(${scale / 100})`, 
                transformOrigin: 'top center',
                minHeight: '100%',
                border: 'none',
                outline: 'none',
                colorScheme: 'light'
              }}
              onLoad={() => setIsLoading(false)}
              title={title}
            />
          </div>

          {/* Blur overlay */}
          {isBlurred && (
            <div className="absolute inset-0 backdrop-blur-md z-30 pointer-events-none" />
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

          {/* Quiet/Shh animation - large 3D style like Canva */}
          {showQuiet && (
            <div className="absolute inset-0 pointer-events-none z-40 flex items-center justify-center">
              <div 
                className="relative animate-pulse"
                style={{ 
                  fontSize: '200px',
                  filter: 'drop-shadow(8px 8px 16px rgba(0,0,0,0.3))'
                }}
              >
                🤫
              </div>
            </div>
          )}

          {/* Bubbles animation - realistic 3D soap bubbles like Canva */}
          {showBubbles && (
            <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
              {Array.from({ length: 25 }).map((_, i) => {
                const size = 40 + Math.random() * 80;
                return (
                  <div
                    key={i}
                    className="absolute animate-bubble rounded-full"
                    style={{
                      left: `${Math.random() * 100}%`,
                      bottom: '-100px',
                      width: `${size}px`,
                      height: `${size}px`,
                      background: `radial-gradient(circle at 30% 30%, 
                        rgba(255,255,255,0.95) 0%, 
                        rgba(173,216,230,0.4) 20%, 
                        rgba(135,206,235,0.2) 40%, 
                        rgba(176,224,230,0.15) 60%, 
                        rgba(175,238,238,0.1) 80%, 
                        transparent 100%)`,
                      border: '1px solid rgba(173,216,230,0.5)',
                      animationDelay: `${Math.random() * 3}s`,
                      animationDuration: `${4 + Math.random() * 3}s`,
                      boxShadow: `
                        inset -${size/8}px -${size/8}px ${size/4}px rgba(255,255,255,0.6),
                        inset ${size/10}px ${size/10}px ${size/5}px rgba(173,216,230,0.3),
                        0 0 ${size/6}px rgba(135,206,235,0.3)
                      `,
                    }}
                  >
                    {/* Shine highlight */}
                    <div 
                      className="absolute rounded-full bg-white/80"
                      style={{
                        width: `${size/5}px`,
                        height: `${size/8}px`,
                        top: `${size/6}px`,
                        left: `${size/5}px`,
                        transform: 'rotate(-40deg)',
                        filter: 'blur(1px)'
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Drumroll animation - large 3D style like Canva */}
          {showDrumroll && (
            <div className="absolute inset-0 pointer-events-none z-40 flex items-center justify-center">
              <div className="relative">
                {/* Large 3D drum */}
                <div 
                  style={{ 
                    fontSize: '180px', 
                    animation: 'drum-shake 0.1s infinite',
                    filter: 'drop-shadow(8px 8px 16px rgba(0,0,0,0.4))'
                  }}
                >
                  🥁
                </div>
                {/* Left drumstick */}
                <div 
                  className="absolute -left-20 top-1/3"
                  style={{ 
                    fontSize: '80px',
                    animation: 'drumstick-left 0.15s infinite',
                    filter: 'drop-shadow(4px 4px 8px rgba(0,0,0,0.3))',
                    transformOrigin: 'bottom right'
                  }}
                >
                  🥢
                </div>
                {/* Right drumstick */}
                <div 
                  className="absolute -right-20 top-1/3"
                  style={{ 
                    fontSize: '80px',
                    animation: 'drumstick-right 0.15s infinite',
                    filter: 'drop-shadow(4px 4px 8px rgba(0,0,0,0.3))',
                    transformOrigin: 'bottom left'
                  }}
                >
                  🥢
                </div>
                {/* Sound waves */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex gap-2">
                  <div style={{ fontSize: '40px', animation: 'pulse 0.3s infinite' }}>🎵</div>
                  <div style={{ fontSize: '40px', animation: 'pulse 0.3s infinite 0.1s' }}>🎶</div>
                  <div style={{ fontSize: '40px', animation: 'pulse 0.3s infinite 0.2s' }}>🎵</div>
                </div>
              </div>
            </div>
          )}

          {/* Mic Drop animation - 3D style like Canva */}
          {showMicDrop && (
            <div className="absolute inset-0 pointer-events-none z-40 flex flex-col items-center justify-center">
              {/* Hand releasing mic - 3D yellow hand */}
              <div 
                className="absolute"
                style={{ 
                  animation: 'hand-release 1s ease-out forwards',
                  top: '25%',
                  fontSize: '120px',
                  filter: 'drop-shadow(4px 4px 8px rgba(0,0,0,0.3))'
                }}
              >
                🖐️
              </div>
              {/* Falling mic - larger 3D style */}
              <div 
                style={{ 
                  animation: 'mic-fall 1.5s ease-in forwards',
                  fontSize: '140px',
                  filter: 'drop-shadow(6px 6px 12px rgba(0,0,0,0.4))'
                }}
              >
                🎤
              </div>
              {/* Impact effect - just the explosion */}
              <div 
                className="absolute bottom-1/4 flex items-center justify-center"
                style={{ animation: 'impact-show 0.3s ease-out 1.2s forwards', opacity: 0 }}
              >
                <div style={{ fontSize: '100px', filter: 'drop-shadow(4px 4px 8px rgba(0,0,0,0.3))' }}>💥</div>
              </div>
            </div>
          )}

          {/* Magic menu popup */}
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

        {/* Bottom Controls Bar - minimal like Tutopiya */}
        <div className="flex items-center justify-between px-4 py-2 bg-white/90 backdrop-blur-sm border-t border-gray-100 text-gray-600">
          {/* Left: Sidebar toggle */}
          <div className="flex items-center gap-3">
            {topics.length > 0 && !isFullscreen && (
              <button
                onClick={() => setShowSidebar(s => !s)}
                className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                title="Toggle sidebar"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Center: Zoom */}
          <div className="flex items-center gap-1">
            <button onClick={zoomOut} className="p-1.5 rounded hover:bg-gray-100 transition-colors" title="Zoom out">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs px-2 min-w-[45px] text-center">{scale}%</span>
            <button onClick={zoomIn} className="p-1.5 rounded hover:bg-gray-100 transition-colors" title="Zoom in">
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Right: Magic, Annotate, Dark mode, Fullscreen */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowMagicMenu(m => !m)}
              className={cn('p-1.5 rounded hover:bg-gray-100 transition-colors', showMagicMenu && 'bg-primary text-white')}
              title="Magic shortcuts"
            >
              <Sparkles className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsDarkMode(d => !d)}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
              title="Toggle dark mode"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
              title="Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MinimalPDFViewer;
