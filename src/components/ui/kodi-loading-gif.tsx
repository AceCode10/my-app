'use client';

import React from 'react';
import Image from 'next/image';

interface KodiLoadingGifProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function KodiLoadingGif({ text = 'Loading', size = 'md' }: KodiLoadingGifProps) {
  const sizeMap = {
    sm: { width: 64, height: 64 },
    md: { width: 96, height: 96 },
    lg: { width: 128, height: 128 },
  };

  const { width, height } = sizeMap[size];

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div 
        className="relative"
        style={{ width, height }}
      >
        <Image
          src="/load.gif"
          alt="Kodi Loading"
          width={width}
          height={height}
          className="object-contain"
          unoptimized
          priority
        />
      </div>

      {/* Loading text with animated dots */}
      <div className="text-sm text-muted-foreground font-medium">
        <span>{text}</span>
        <span className="inline-flex w-6">
          <span className="animate-pulse" style={{ animationDelay: '0ms' }}>.</span>
          <span className="animate-pulse" style={{ animationDelay: '200ms' }}>.</span>
          <span className="animate-pulse" style={{ animationDelay: '400ms' }}>.</span>
        </span>
      </div>
    </div>
  );
}

export default KodiLoadingGif;
