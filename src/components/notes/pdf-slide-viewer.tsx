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
  X,
  ChevronLeft,
  ChevronRight,
  Pencil
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PDFSlideViewerProps {
  pdfUrl: string;
  title: string;
  totalPages?: number;
  className?: string;
}

interface MagicAnimation {
  id: string;
  key: string;
  name: string;
  emoji: string;
  icon?: string;
}

const MAGIC_ANIMATIONS: MagicAnimation[] = [
  { id: 'blur', key: 'b', name: 'Blur', emoji: '✨', icon: '✨' },
  { id: 'quiet', key: 'q', name: 'Quiet', emoji: '🤫', icon: '🤫' },
  { id: 'bubbles', key: 'o', name: 'Bubbles', emoji: '🫧', icon: '○' },
  { id: 'confetti', key: 'c', name: 'Confetti', emoji: '🎊', icon: '🎉' },
  { id: 'drumroll', key: 'd', name: 'Drumroll', emoji: '🥁', icon: '🥁' },
  { id: 'curtain', key: 'u', name: 'Curtain Call', emoji: '🎭', icon: '🎭' },
  { id: 'micdrop', key: 'm', name: 'Mic Drop', emoji: '🎤', icon: '✋' },
];

// Sound URLs - using free sound effects
const SOUND_URLS = {
  shush: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  drumroll: 'https://assets.mixkit.co/active_storage/sfx/2012/2012-preview.mp3',
  micdrop: 'https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3',
  confetti: 'https://assets.mixkit.co/active_storage/sfx/1978/1978-preview.mp3',
  curtain: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  bubbles: 'https://assets.mixkit.co/active_storage/sfx/2353/2353-preview.mp3',
};

export function PDFSlideViewer({
  pdfUrl,
  title,
  totalPages = 10,
  className
}: PDFSlideViewerProps) {
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(100);
  const [activeAnimation, setActiveAnimation] = useState<string | null>(null);
  const [showMagicMenu, setShowMagicMenu] = useState(false);
  const [isBlurred, setIsBlurred] = useState(false);
  const [curtainState, setCurtainState] = useState<'open' | 'closing' | 'closed' | 'opening'>('open');
  const [showPointer, setShowPointer] = useState(false);
  const [pointerPos, setPointerPos] = useState({ x: 0, y: 0 });
  const [iframeKey, setIframeKey] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Calculate progress percentage
  const progressPercent = (currentPage / totalPages) * 100;

  // Build PDF URL with page parameter - force iframe reload on page change
  const getPdfUrl = useCallback(() => {
    // Use Google Docs viewer for better page control, or direct URL with page hash
    // Google Docs viewer: `https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`
    // Direct with page: adds #page=N which some viewers respect
    return `${pdfUrl}#page=${currentPage}&zoom=${scale}`;
  }, [pdfUrl, currentPage, scale]);

  // Play sound effect
  const playSound = useCallback((soundKey: keyof typeof SOUND_URLS) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(SOUND_URLS[soundKey]);
      audio.volume = 0.5;
      audioRef.current = audio;
      audio.play().catch(() => {});
    } catch (e) {
      console.log('Sound playback failed');
    }
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!isFullscreen) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen();
        }
        // Auto-enable pointer in fullscreen
        setShowPointer(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
        setShowPointer(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  }, [isFullscreen]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setIsFullscreen(isFs);
      if (isFs) {
        setShowPointer(true);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Trigger magic animation
  const triggerAnimation = useCallback((animationId: string) => {
    // Handle blur toggle
    if (animationId === 'blur') {
      setIsBlurred(prev => !prev);
      return;
    }

    // Handle curtain toggle
    if (animationId === 'curtain') {
      playSound('curtain');
      setCurtainState(prev => {
        if (prev === 'open') return 'closing';
        if (prev === 'closed') return 'opening';
        return prev;
      });
      return;
    }

    // Play sounds for animations
    if (animationId === 'quiet') playSound('shush');
    if (animationId === 'drumroll') playSound('drumroll');
    if (animationId === 'micdrop') playSound('micdrop');
    if (animationId === 'confetti') playSound('confetti');
    if (animationId === 'bubbles') playSound('bubbles');

    setActiveAnimation(animationId);
    
    // Clear after animation duration
    const duration = animationId === 'drumroll' ? 5000 : animationId === 'micdrop' ? 4000 : 3000;
    setTimeout(() => {
      setActiveAnimation(null);
    }, duration);
  }, [playSound]);

  // Handle curtain animation end
  useEffect(() => {
    if (curtainState === 'closing') {
      const timer = setTimeout(() => setCurtainState('closed'), 2000);
      return () => clearTimeout(timer);
    }
    if (curtainState === 'opening') {
      const timer = setTimeout(() => setCurtainState('open'), 2000);
      return () => clearTimeout(timer);
    }
  }, [curtainState]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Pointer toggle
      if (e.key === 'h' || e.key === 'H') {
        setShowPointer(p => !p);
      }
      // Fullscreen
      else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
      // Magic animations (only in fullscreen)
      else if (isFullscreen) {
        const animation = MAGIC_ANIMATIONS.find(a => a.key.toLowerCase() === e.key.toLowerCase());
        if (animation) {
          triggerAnimation(animation.id);
        } else if (e.key === 'x' || e.key === 'X') {
          setActiveAnimation(null);
        } else if (e.key === '?' || e.key === '/') {
          setShowMagicMenu(m => !m);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleFullscreen, isFullscreen, triggerAnimation]);

  // Mouse tracking for pointer
  useEffect(() => {
    if (!showPointer) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPointerPos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [showPointer]);

  // Page navigation
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Zoom controls
  const zoomIn = () => setScale(s => Math.min(s + 25, 200));
  const zoomOut = () => setScale(s => Math.max(s - 25, 50));

  // Force iframe reload when page changes
  useEffect(() => {
    setIframeKey(prev => prev + 1);
  }, [currentPage]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex flex-col bg-white rounded-lg overflow-hidden shadow-lg',
        isFullscreen && 'fixed inset-0 z-50 rounded-none',
        className
      )}
      style={{ height: isFullscreen ? '100vh' : 'calc(100vh - 180px)' }}
    >
      {/* Main PDF area - clean, content-focused */}
      <div className="flex-1 relative overflow-hidden bg-gray-100">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-white">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-gray-500 mt-2 text-sm">Loading PDF...</p>
          </div>
        )}
        
        {/* PDF iframe - embedded viewer */}
        <iframe
          key={iframeKey}
          ref={iframeRef}
          src={getPdfUrl()}
          className="w-full h-full border-0"
          onLoad={() => setIsLoading(false)}
          title={title}
          style={{ 
            transform: scale !== 100 ? `scale(${scale / 100})` : undefined,
            transformOrigin: 'center top'
          }}
        />

        {/* Left/Right navigation arrows - visible in all modes */}
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          className={cn(
            "absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-gray-900/80 dark:bg-black/60 hover:bg-gray-800 dark:hover:bg-gray-900/80 transition-all z-20 shadow-lg border border-gray-600 dark:border-gray-700",
            currentPage <= 1 && "opacity-30 cursor-not-allowed"
          )}
        >
          <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
        </button>
        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={cn(
            "absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-gray-900/80 dark:bg-black/60 hover:bg-gray-800 dark:hover:bg-gray-900/80 transition-all z-20 shadow-lg border border-gray-600 dark:border-gray-700",
            currentPage >= totalPages && "opacity-30 cursor-not-allowed"
          )}
        >
          <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
        </button>

        {/* Transparent overlay for pointer - sits on top of PDF */}
        {showPointer && (
          <div 
            className="absolute inset-0 z-30"
            style={{ cursor: 'none' }}
          />
        )}

        {/* Pointer highlighter - green, seamless */}
        {showPointer && (
          <div
            className="fixed pointer-events-none z-[100]"
            style={{ 
              left: pointerPos.x, 
              top: pointerPos.y,
              transform: 'translate(-50%, -50%)',
              transition: 'none'
            }}
          >
            <div className="w-12 h-12 rounded-full bg-green-500/30 shadow-[0_0_20px_10px_rgba(34,197,94,0.3)]" />
            <div className="absolute inset-2 rounded-full bg-green-500/60" />
            <div className="absolute inset-4 rounded-full bg-green-400" />
          </div>
        )}

        {/* Blur overlay - stays until toggled off */}
        {isBlurred && (
          <div className="absolute inset-0 backdrop-blur-md z-20 pointer-events-none" />
        )}

        {/* Curtain animation */}
        {(curtainState === 'closing' || curtainState === 'closed' || curtainState === 'opening') && (
          <CurtainAnimation state={curtainState} />
        )}

        {/* Magic animations overlay */}
        {activeAnimation && (
          <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
            {activeAnimation === 'confetti' && <ConfettiAnimation />}
            {activeAnimation === 'bubbles' && <BubblesAnimation />}
            {activeAnimation === 'drumroll' && <DrumrollAnimation />}
            {activeAnimation === 'quiet' && <QuietAnimation />}
            {activeAnimation === 'micdrop' && <MicDropAnimation />}
          </div>
        )}

        {/* Magic shortcuts menu */}
        {showMagicMenu && (
          <div className="absolute top-4 right-4 bg-gray-800/95 rounded-xl p-4 z-50 shadow-xl border border-gray-600">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-white">
                <Sparkles className="w-5 h-5" />
                <span className="font-semibold">Magic Shortcuts</span>
              </div>
              <button onClick={() => setShowMagicMenu(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {MAGIC_ANIMATIONS.map(anim => (
                <button
                  key={anim.id}
                  onClick={() => triggerAnimation(anim.id)}
                  className="w-full flex items-center justify-between gap-8 text-gray-300 hover:bg-gray-700/50 p-2 rounded-lg transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-2xl">{anim.emoji}</span>
                    <span>{anim.name}</span>
                    {anim.id === 'blur' && isBlurred && <span className="text-xs text-green-400">(ON)</span>}
                    {anim.id === 'curtain' && curtainState !== 'open' && <span className="text-xs text-green-400">(CLOSED)</span>}
                  </span>
                  <kbd className="px-2 py-1 bg-gray-700 rounded text-xs uppercase font-mono">{anim.key}</kbd>
                </button>
              ))}
              <div className="border-t border-gray-700 pt-2 mt-2">
                <button
                  onClick={() => {
                    setActiveAnimation(null);
                    setIsBlurred(false);
                    setCurtainState('open');
                  }}
                  className="w-full flex items-center justify-between gap-8 text-gray-300 hover:bg-gray-700/50 p-2 rounded-lg transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-2xl">↩️</span>
                    <span>Clear All</span>
                  </span>
                  <kbd className="px-2 py-1 bg-gray-700 rounded text-xs font-mono">X</kbd>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Green progress bar */}
      <div className="h-1 bg-gray-200">
        <div 
          className="h-full bg-green-500 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Bottom controls - mobile-friendly */}
      <div className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 bg-gray-900 dark:bg-gray-950 border-t border-gray-700">
        {/* Left: Page number with navigation */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-1.5 sm:p-2 rounded bg-gray-800 dark:bg-gray-900 text-white hover:bg-gray-700 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="bg-gray-800 dark:bg-gray-900 text-white px-2 sm:px-3 py-1.5 rounded text-xs sm:text-sm font-medium min-w-[50px] sm:min-w-[60px] text-center">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-1.5 sm:p-2 rounded bg-gray-800 dark:bg-gray-900 text-white hover:bg-gray-700 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Zoom controls */}
        <div className="flex items-center gap-1">
          <button 
            onClick={zoomOut}
            className="p-1.5 sm:p-2 rounded bg-gray-800 dark:bg-gray-900 text-white hover:bg-gray-700 dark:hover:bg-gray-800 transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-white text-xs sm:text-sm px-1 sm:px-2 font-medium">{scale}%</span>
          <button 
            onClick={zoomIn}
            className="p-1.5 sm:p-2 rounded bg-gray-800 dark:bg-gray-900 text-white hover:bg-gray-700 dark:hover:bg-gray-800 transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Magic, Annotate, Fullscreen */}
        <div className="flex items-center gap-1">
          {/* Magic shortcuts */}
          <button
            onClick={() => setShowMagicMenu(m => !m)}
            className={cn(
              'p-1.5 sm:p-2 rounded bg-gray-800 dark:bg-gray-900 text-white hover:bg-gray-700 dark:hover:bg-gray-800 transition-colors',
              showMagicMenu && 'bg-primary'
            )}
            title="Magic shortcuts"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          {/* Annotate */}
          <button
            onClick={() => setShowPointer(p => !p)}
            className={cn(
              'p-1.5 sm:p-2 rounded bg-gray-800 dark:bg-gray-900 text-white hover:bg-gray-700 dark:hover:bg-gray-800 transition-colors',
              showPointer && 'bg-green-600'
            )}
            title="Annotate / Pointer"
          >
            <Pencil className="w-4 h-4" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 sm:p-2 rounded bg-gray-800 dark:bg-gray-900 text-white hover:bg-gray-700 dark:hover:bg-gray-800 transition-colors"
            title="Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// Animation components
function ConfettiAnimation() {
  const confettiPieces = React.useMemo(() => 
    Array.from({ length: 80 }).map((_, i) => ({
      left: `${Math.random() * 100}%`,
      color: ['#ff0', '#f0f', '#0ff', '#f00', '#0f0', '#00f', '#ff6b6b', '#ffd93d', '#6bcb77'][Math.floor(Math.random() * 9)],
      delay: `${Math.random() * 2}s`,
      duration: `${2 + Math.random() * 2}s`,
      rotation: Math.random() * 360,
      size: 8 + Math.random() * 8,
    }))
  , []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {confettiPieces.map((piece, i) => (
        <div
          key={i}
          className="absolute animate-confetti"
          style={{
            left: piece.left,
            top: '-20px',
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            backgroundColor: piece.color,
            animationDelay: piece.delay,
            animationDuration: piece.duration,
            transform: `rotate(${piece.rotation}deg)`,
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
          }}
        />
      ))}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[150px] animate-bounce">🎉</span>
      </div>
    </div>
  );
}

function BubblesAnimation() {
  const bubbles = React.useMemo(() => 
    Array.from({ length: 25 }).map((_, i) => ({
      left: `${Math.random() * 100}%`,
      size: 30 + Math.random() * 60,
      delay: `${Math.random() * 2}s`,
      duration: `${3 + Math.random() * 2}s`,
    }))
  , []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {bubbles.map((bubble, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-bubble"
          style={{
            left: bubble.left,
            bottom: '-80px',
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
            background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8), rgba(100,200,255,0.3))',
            border: '2px solid rgba(100,200,255,0.5)',
            animationDelay: bubble.delay,
            animationDuration: bubble.duration,
          }}
        />
      ))}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[120px]">🫧</span>
      </div>
    </div>
  );
}

function DrumrollAnimation() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
      <div className="relative">
        {/* Drum */}
        <div className="text-[180px] animate-drum-shake">🥁</div>
        {/* Left drumstick */}
        <div 
          className="absolute -top-8 -left-16 text-[80px] origin-bottom-right animate-drumstick-left"
          style={{ transform: 'rotate(-30deg)' }}
        >
          🥢
        </div>
        {/* Right drumstick */}
        <div 
          className="absolute -top-8 -right-16 text-[80px] origin-bottom-left animate-drumstick-right"
          style={{ transform: 'rotate(30deg) scaleX(-1)' }}
        >
          🥢
        </div>
      </div>
    </div>
  );
}

function QuietAnimation() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
      <div className="relative">
        {/* Main shushing emoji - large and animated */}
        <div className="text-[200px] animate-float-gentle">
          🤫
        </div>
        {/* Floating "shh" text */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-white text-4xl font-bold animate-pulse opacity-80">
          Shhhhh...
        </div>
      </div>
    </div>
  );
}

function CurtainAnimation({ state }: { state: 'open' | 'closing' | 'closed' | 'opening' }) {
  const isClosing = state === 'closing';
  const isClosed = state === 'closed';
  const isOpening = state === 'opening';

  return (
    <div className="absolute inset-0 flex z-50 pointer-events-none overflow-hidden">
      {/* Left curtain */}
      <div 
        className={cn(
          "h-full bg-gradient-to-r from-red-900 via-red-800 to-red-700 transition-all ease-in-out shadow-2xl",
          isClosing && "w-1/2 duration-[2000ms]",
          isClosed && "w-1/2",
          isOpening && "w-0 duration-[2000ms]",
          state === 'open' && "w-0"
        )}
        style={{
          backgroundImage: 'repeating-linear-gradient(90deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 20px, transparent 20px, transparent 40px)',
        }}
      >
        {/* Curtain folds */}
        <div className="h-full w-full" style={{
          backgroundImage: 'repeating-linear-gradient(90deg, rgba(0,0,0,0.15) 0px, transparent 3px, transparent 30px)',
        }} />
      </div>
      
      {/* Right curtain */}
      <div 
        className={cn(
          "h-full bg-gradient-to-l from-red-900 via-red-800 to-red-700 transition-all ease-in-out shadow-2xl ml-auto",
          isClosing && "w-1/2 duration-[2000ms]",
          isClosed && "w-1/2",
          isOpening && "w-0 duration-[2000ms]",
          state === 'open' && "w-0"
        )}
        style={{
          backgroundImage: 'repeating-linear-gradient(90deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 20px, transparent 20px, transparent 40px)',
        }}
      >
        <div className="h-full w-full" style={{
          backgroundImage: 'repeating-linear-gradient(90deg, rgba(0,0,0,0.15) 0px, transparent 3px, transparent 30px)',
        }} />
      </div>

      {/* Theater emoji when closed */}
      {isClosed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[150px]">🎭</span>
        </div>
      )}
    </div>
  );
}

function MicDropAnimation() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Hand releasing mic */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 animate-hand-release">
        <span className="text-[120px]">🖐️</span>
      </div>
      
      {/* Falling microphone */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 animate-mic-drop">
        <span className="text-[150px]">🎤</span>
      </div>
      
      {/* Impact effect at bottom */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 animate-impact-appear">
        <span className="text-[80px]">💥</span>
      </div>
    </div>
  );
}

export default PDFSlideViewer;
