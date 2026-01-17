'use client';

import React, { useState, useEffect } from 'react';

export function PointerHighlighter() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      setIsVisible(true);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <>
      {/* Outer glow ring */}
      <div
        className="fixed pointer-events-none z-50 rounded-full transition-all duration-75 ease-out"
        style={{
          left: position.x - 60,
          top: position.y - 60,
          width: 120,
          height: 120,
          background: 'radial-gradient(circle, rgba(34, 197, 94, 0.3) 0%, rgba(34, 197, 94, 0.1) 50%, transparent 70%)',
          boxShadow: '0 0 40px rgba(34, 197, 94, 0.4)',
        }}
      />
      
      {/* Inner highlight ring */}
      <div
        className="fixed pointer-events-none z-50 rounded-full border-2 border-green-400 transition-all duration-75 ease-out"
        style={{
          left: position.x - 30,
          top: position.y - 30,
          width: 60,
          height: 60,
          background: 'radial-gradient(circle, rgba(34, 197, 94, 0.2) 0%, transparent 70%)',
        }}
      />
      
      {/* Center dot */}
      <div
        className="fixed pointer-events-none z-50 rounded-full bg-green-400 transition-all duration-75 ease-out"
        style={{
          left: position.x - 4,
          top: position.y - 4,
          width: 8,
          height: 8,
          boxShadow: '0 0 10px rgba(34, 197, 94, 0.8)',
        }}
      />
    </>
  );
}
