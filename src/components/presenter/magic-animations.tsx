'use client';

import React, { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface MagicAnimationsProps {
  activeAnimation: string | null;
}

export function MagicAnimations({ activeAnimation }: MagicAnimationsProps) {
  if (!activeAnimation) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      {activeAnimation === 'blur' && <BlurEffect />}
      {activeAnimation === 'quiet' && <QuietEffect />}
      {activeAnimation === 'bubbles' && <BubblesEffect />}
      {activeAnimation === 'confetti' && <ConfettiEffect />}
      {activeAnimation === 'drumroll' && <DrumrollEffect />}
      {activeAnimation === 'curtain' && <CurtainEffect />}
      {activeAnimation === 'micdrop' && <MicDropEffect />}
    </div>
  );
}

// Blur effect - applies gaussian blur to content
function BlurEffect() {
  return (
    <div className="absolute inset-0 backdrop-blur-md bg-black/20 animate-fade-in" />
  );
}

// Quiet effect - shows shushing emoji
function QuietEffect() {
  return (
    <div className="absolute inset-0 flex items-center justify-center animate-fade-in">
      <div className="text-[200px] animate-bounce-slow drop-shadow-2xl">
        🤫
      </div>
    </div>
  );
}

// Bubbles effect - floating bubbles
function BubblesEffect() {
  const [bubbles, setBubbles] = useState<Array<{ id: number; x: number; size: number; delay: number }>>([]);

  useEffect(() => {
    const newBubbles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: 20 + Math.random() * 60,
      delay: Math.random() * 2,
    }));
    setBubbles(newBubbles);
  }, []);

  return (
    <>
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className="absolute bottom-0 rounded-full bg-gradient-to-br from-cyan-200/60 to-blue-300/40 border border-white/30 animate-float-up"
          style={{
            left: `${bubble.x}%`,
            width: bubble.size,
            height: bubble.size,
            animationDelay: `${bubble.delay}s`,
          }}
        />
      ))}
    </>
  );
}

// Confetti effect - colorful confetti pieces
function ConfettiEffect() {
  const [pieces, setPieces] = useState<Array<{
    id: number;
    x: number;
    color: string;
    size: number;
    rotation: number;
    delay: number;
  }>>([]);

  useEffect(() => {
    const colors = ['#ff0080', '#7928ca', '#0070f3', '#00c853', '#ffeb3b', '#ff5722', '#e91e63'];
    const newPieces = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 8 + Math.random() * 12,
      rotation: Math.random() * 360,
      delay: Math.random() * 0.5,
    }));
    setPieces(newPieces);
  }, []);

  return (
    <>
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute top-0 animate-confetti-fall"
          style={{
            left: `${piece.x}%`,
            width: piece.size,
            height: piece.size * 0.6,
            backgroundColor: piece.color,
            transform: `rotate(${piece.rotation}deg)`,
            animationDelay: `${piece.delay}s`,
          }}
        />
      ))}
    </>
  );
}

// Drumroll effect - animated drum
function DrumrollEffect() {
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimating(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className={cn(
        'relative transition-transform',
        isAnimating && 'animate-drum-shake'
      )}>
        {/* Drum body */}
        <div className="w-40 h-28 bg-gradient-to-b from-orange-400 to-orange-600 rounded-lg relative overflow-hidden shadow-2xl">
          {/* Drum pattern */}
          <div className="absolute inset-0 flex">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex-1 border-r border-orange-300/50 last:border-r-0"
                style={{
                  background: i % 2 === 0 ? 'linear-gradient(to bottom, #06b6d4, #0891b2)' : 'transparent',
                }}
              />
            ))}
          </div>
          {/* Drum top */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-44 h-6 bg-gradient-to-r from-yellow-300 via-yellow-200 to-yellow-300 rounded-full shadow-lg" />
        </div>
        
        {/* Drumsticks */}
        <div className={cn(
          'absolute -top-8 left-8 w-2 h-20 bg-gradient-to-b from-amber-600 to-amber-800 rounded-full origin-bottom',
          isAnimating && 'animate-drumstick-left'
        )}>
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-amber-200 rounded-full" />
        </div>
        <div className={cn(
          'absolute -top-8 right-8 w-2 h-20 bg-gradient-to-b from-amber-600 to-amber-800 rounded-full origin-bottom',
          isAnimating && 'animate-drumstick-right'
        )}>
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-amber-200 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// Curtain call effect - red theater curtains
function CurtainEffect() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Start opening after a brief pause
    const openTimer = setTimeout(() => setIsOpen(true), 500);
    return () => clearTimeout(openTimer);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Curtain top bar */}
      <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-amber-700 to-amber-900 z-20 shadow-lg" />
      
      {/* Left curtain */}
      <div
        className={cn(
          'absolute top-0 left-0 w-1/2 h-full transition-transform duration-[2000ms] ease-out',
          isOpen ? '-translate-x-[85%]' : 'translate-x-0'
        )}
        style={{
          background: 'linear-gradient(90deg, #8b0000 0%, #dc143c 30%, #b22222 50%, #8b0000 100%)',
        }}
      >
        {/* Curtain folds */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-8"
            style={{
              left: `${i * 12.5}%`,
              background: i % 2 === 0 
                ? 'linear-gradient(90deg, transparent, rgba(0,0,0,0.3), transparent)'
                : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
            }}
          />
        ))}
        {/* Curtain bottom curve */}
        <div className="absolute bottom-0 left-0 right-0 h-20">
          <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-full">
            <path d="M0,0 Q25,20 50,10 T100,0 L100,20 L0,20 Z" fill="#8b0000" />
          </svg>
        </div>
      </div>

      {/* Right curtain */}
      <div
        className={cn(
          'absolute top-0 right-0 w-1/2 h-full transition-transform duration-[2000ms] ease-out',
          isOpen ? 'translate-x-[85%]' : 'translate-x-0'
        )}
        style={{
          background: 'linear-gradient(270deg, #8b0000 0%, #dc143c 30%, #b22222 50%, #8b0000 100%)',
        }}
      >
        {/* Curtain folds */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-8"
            style={{
              right: `${i * 12.5}%`,
              background: i % 2 === 0 
                ? 'linear-gradient(90deg, transparent, rgba(0,0,0,0.3), transparent)'
                : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
            }}
          />
        ))}
        {/* Curtain bottom curve */}
        <div className="absolute bottom-0 left-0 right-0 h-20 transform scale-x-[-1]">
          <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-full">
            <path d="M0,0 Q25,20 50,10 T100,0 L100,20 L0,20 Z" fill="#8b0000" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// Mic drop effect - falling microphone
function MicDropEffect() {
  return (
    <div className="absolute inset-0 flex items-start justify-center pt-20">
      <div className="animate-mic-drop">
        {/* Microphone */}
        <div className="relative">
          {/* Mic head */}
          <div className="w-20 h-24 bg-gradient-to-b from-gray-600 to-gray-800 rounded-t-full relative overflow-hidden">
            {/* Mic grill */}
            <div className="absolute inset-2 bg-gradient-to-b from-gray-400 to-gray-600 rounded-t-full">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="absolute left-0 right-0 h-px bg-gray-700"
                  style={{ top: `${15 + i * 14}%` }}
                />
              ))}
            </div>
          </div>
          {/* Mic body */}
          <div className="w-10 h-16 mx-auto bg-gradient-to-b from-gray-700 to-gray-900 rounded-b-lg" />
          {/* Cable hint */}
          <div className="w-4 h-8 mx-auto bg-gray-900 rounded-b-full" />
        </div>
      </div>
    </div>
  );
}
