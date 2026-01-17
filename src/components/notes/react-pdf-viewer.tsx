'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ZoomIn, ZoomOut, Maximize2, Minimize2, Sun, Moon, 
  Sparkles, Loader2, Menu, BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Topic {
  id: string;
  name: string;
  slug: string;
}

interface ReactPDFViewerProps {
  pdfUrl: string;
  title?: string;
  topics?: Topic[];
  currentTopicSlug?: string;
  subjectSlug?: string;
  subjectName?: string;
  subjectCode?: string;
  subjectIcon?: string;
  subjectColor?: string;
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

export function ReactPDFViewer({ 
  pdfUrl, 
  title = 'PDF Document',
  topics = [],
  currentTopicSlug,
  subjectSlug,
  subjectName,
  subjectCode,
  subjectIcon,
  subjectColor,
  className 
}: ReactPDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);
  
  const [scale, setScale] = useState(1.2);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showMagicMenu, setShowMagicMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  
  // Animation states
  const [isBlurred, setIsBlurred] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showBubbles, setShowBubbles] = useState(false);
  const [showDrumroll, setShowDrumroll] = useState(false);
  const [showMicDrop, setShowMicDrop] = useState(false);
  const [showQuiet, setShowQuiet] = useState(false);

  // Zoom controls
  const zoomIn = () => setScale(s => Math.min(s + 0.2, 3.0));
  const zoomOut = () => setScale(s => Math.max(s - 0.2, 0.5));
  const zoomPercent = Math.round(scale * 100);

  // Load PDF.js from CDN and render PDF
  useEffect(() => {
    if (scriptLoadedRef.current || !viewerContainerRef.current) return;
    
    const loadPdfJs = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        
        // Load PDF.js from CDN
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.async = true;
        
        script.onload = async () => {
          scriptLoadedRef.current = true;
          
          // Access pdfjsLib from window
          const pdfjsLib = (window as any).pdfjsLib;
          if (!pdfjsLib) {
            setLoadError('Failed to load PDF.js library');
            setIsLoading(false);
            return;
          }
          
          // Set worker
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          
          try {
            // Load PDF
            const loadingTask = pdfjsLib.getDocument(pdfUrl);
            const pdf = await loadingTask.promise;
            setNumPages(pdf.numPages);
            
            // Clear container
            if (viewerContainerRef.current) {
              viewerContainerRef.current.innerHTML = '';
              
              // Render all pages
              for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const viewport = page.getViewport({ scale });
                
                // Create canvas
                const canvas = document.createElement('canvas');
                canvas.className = 'pdf-page-canvas bg-white shadow-sm mb-4';
                canvas.style.maxWidth = '100%';
                canvas.style.height = 'auto';
                
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                if (context) {
                  await page.render({
                    canvasContext: context,
                    viewport: viewport,
                  }).promise;
                }
                
                viewerContainerRef.current?.appendChild(canvas);
              }
            }
            
            setIsLoading(false);
          } catch (error) {
            console.error('PDF render error:', error);
            setLoadError('Failed to render PDF');
            setIsLoading(false);
          }
        };
        
        script.onerror = () => {
          setLoadError('Failed to load PDF.js from CDN');
          setIsLoading(false);
        };
        
        document.head.appendChild(script);
        
        return () => {
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }
        };
      } catch (error) {
        console.error('PDF load error:', error);
        setLoadError('Failed to load PDF');
        setIsLoading(false);
      }
    };
    
    loadPdfJs();
  }, [pdfUrl]);

  // Re-render when scale changes
  useEffect(() => {
    if (!scriptLoadedRef.current || !viewerContainerRef.current || isLoading) return;
    
    const reRenderPages = async () => {
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) return;
      
      try {
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        
        if (viewerContainerRef.current) {
          viewerContainerRef.current.innerHTML = '';
          
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale });
            
            const canvas = document.createElement('canvas');
            canvas.className = 'pdf-page-canvas bg-white shadow-sm mb-4';
            canvas.style.maxWidth = '100%';
            canvas.style.height = 'auto';
            
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            if (context) {
              await page.render({
                canvasContext: context,
                viewport: viewport,
              }).promise;
            }
            
            viewerContainerRef.current?.appendChild(canvas);
          }
        }
      } catch (error) {
        console.error('Re-render error:', error);
      }
    };
    
    reRenderPages();
  }, [scale, pdfUrl, isLoading]);

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
      
      switch (e.key.toLowerCase()) {
        case 'f':
          e.preventDefault();
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
      style={{ height: isFullscreen ? '100vh' : '85vh' }}
    >
      {/* Topics Sidebar */}
      {topics.length > 0 && showSidebar && !isFullscreen && (
        <aside className="w-64 border-r bg-gray-50 dark:bg-neutral-900 flex-shrink-0 overflow-y-auto">
          {/* Subject Header */}
          {subjectName && (
            <div className="p-4 border-b border-gray-200 dark:border-neutral-700">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm overflow-hidden"
                  style={{ backgroundColor: subjectColor || '#22c55e' }}
                >
                  {subjectIcon ? (
                    <img 
                      src={subjectIcon} 
                      alt={subjectName} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Hide broken image and show fallback
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : null}
                  <span className={subjectIcon ? 'hidden' : ''}>
                    {subjectName.substring(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
                    {subjectName}
                  </h2>
                  {subjectCode && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {subjectCode}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Topics List */}
          <div className="p-3">
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2 mb-2">
              Topics
            </h3>
            <nav className="space-y-0.5">
              {topics.map((topic) => (
                <Link
                  key={topic.id}
                  href={`/resources/revision-notes/${subjectSlug}/${topic.slug}`}
                  className={cn(
                    "block px-3 py-2 text-sm rounded-md transition-colors",
                    topic.slug === currentTopicSlug 
                      ? "bg-primary/10 text-primary font-medium" 
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800"
                  )}
                >
                  {topic.name}
                </Link>
              ))}
            </nav>
          </div>
        </aside>
      )}

      {/* Main PDF Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* PDF Content */}
        <div 
          className={cn(
            "flex-1 overflow-auto relative",
            isDarkMode ? "bg-neutral-800" : "bg-gray-100"
          )}
        >
          {/* Loading State */}
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-white dark:bg-neutral-900">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">Loading PDF...</p>
            </div>
          )}

          {/* Error State */}
          {loadError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-white dark:bg-neutral-900">
              <p className="text-red-500 text-sm">{loadError}</p>
            </div>
          )}

          {/* PDF Viewer Container */}
          <div 
            ref={viewerContainerRef}
            className={cn(
              "flex flex-col items-center py-4",
              isDarkMode && "invert"
            )}
          />

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

          {/* Quiet/Shh animation */}
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

          {/* Bubbles animation */}
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

          {/* Drumroll animation */}
          {showDrumroll && (
            <div className="absolute inset-0 pointer-events-none z-40 flex items-center justify-center">
              <div className="relative">
                <div 
                  style={{ 
                    fontSize: '180px', 
                    animation: 'drum-shake 0.1s infinite',
                    filter: 'drop-shadow(8px 8px 16px rgba(0,0,0,0.4))'
                  }}
                >
                  🥁
                </div>
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
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex gap-2">
                  <div style={{ fontSize: '40px', animation: 'pulse 0.3s infinite' }}>🎵</div>
                  <div style={{ fontSize: '40px', animation: 'pulse 0.3s infinite 0.1s' }}>🎶</div>
                  <div style={{ fontSize: '40px', animation: 'pulse 0.3s infinite 0.2s' }}>🎵</div>
                </div>
              </div>
            </div>
          )}

          {/* Mic Drop animation */}
          {showMicDrop && (
            <div className="absolute inset-0 pointer-events-none z-40 flex flex-col items-center justify-center">
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
              <div 
                style={{ 
                  animation: 'mic-fall 1.5s ease-in forwards',
                  fontSize: '140px',
                  filter: 'drop-shadow(6px 6px 12px rgba(0,0,0,0.4))'
                }}
              >
                🎤
              </div>
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
              </div>
              <div className="grid grid-cols-2 gap-2">
                {MAGIC_ANIMATIONS.map((anim) => (
                  <button
                    key={anim.id}
                    onClick={() => triggerMagic(anim.id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-700 text-white text-sm transition-colors"
                  >
                    <span>{anim.emoji}</span>
                    <span>{anim.name}</span>
                    <span className="text-xs text-gray-400 ml-auto">{anim.key.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Toolbar */}
        <div className={cn(
          "flex items-center justify-between px-4 py-2 border-t",
          isDarkMode ? "bg-neutral-900 border-neutral-700" : "bg-white border-gray-200"
        )}>
          {/* Left: Menu toggle */}
          <div className="flex items-center gap-3">
            {topics.length > 0 && !isFullscreen && (
              <button
                onClick={() => setShowSidebar(s => !s)}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                title="Toggle sidebar"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}
            <span className="text-sm text-gray-500">
              {numPages > 0 && `${numPages} pages`}
            </span>
          </div>

          {/* Center: Zoom */}
          <div className="flex items-center gap-1">
            <button 
              onClick={zoomOut} 
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors" 
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs px-2 min-w-[45px] text-center">{zoomPercent}%</span>
            <button 
              onClick={zoomIn} 
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors" 
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Right: Magic, Dark mode, Fullscreen */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowMagicMenu(m => !m)}
              className={cn(
                'p-1.5 rounded hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors', 
                showMagicMenu && 'bg-primary text-white'
              )}
              title="Magic shortcuts"
            >
              <Sparkles className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsDarkMode(d => !d)}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
              title="Toggle dark mode"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
              title="Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti {
          animation: confetti 3s ease-out forwards;
        }
        @keyframes bubble {
          0% { transform: translateY(0) scale(1); opacity: 0.8; }
          50% { opacity: 1; }
          100% { transform: translateY(-100vh) scale(1.2); opacity: 0; }
        }
        .animate-bubble {
          animation: bubble 5s ease-out forwards;
        }
        @keyframes drum-shake {
          0%, 100% { transform: rotate(-2deg); }
          50% { transform: rotate(2deg); }
        }
        @keyframes drumstick-left {
          0%, 100% { transform: rotate(-15deg); }
          50% { transform: rotate(15deg); }
        }
        @keyframes drumstick-right {
          0%, 100% { transform: rotate(15deg); }
          50% { transform: rotate(-15deg); }
        }
        @keyframes hand-release {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-50px); }
        }
        @keyframes mic-fall {
          0% { transform: translateY(-100px); }
          70% { transform: translateY(100px); }
          85% { transform: translateY(80px); }
          100% { transform: translateY(100px); }
        }
        @keyframes impact-show {
          0% { opacity: 0; transform: scale(0.5); }
          100% { opacity: 1; transform: scale(1); }
        }
        
        .pdf-page-canvas {
          display: block;
          margin: 0 auto;
        }
      `}</style>
    </div>
  );
}
