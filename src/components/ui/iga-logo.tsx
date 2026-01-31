'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface IGALogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
}

export function IGALogo({ size = 'md', className, showText = false }: IGALogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20',
  };

  const widthHeightMap = {
    sm: 32,
    md: 48,
    lg: 64,
    xl: 80,
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Image 
        src="/iga-logo.svg" 
        alt="IGA Prep Logo"
        className={cn(sizeClasses[size], 'flex-shrink-0')}
        width={widthHeightMap[size]}
        height={widthHeightMap[size]}
        priority
      />
      {showText && (
        <span className={cn('font-bold text-foreground', textSizes[size])}>IGA Prep</span>
      )}
    </div>
  );
}

export function IGALogoIcon({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const widthHeightMap = {
    sm: 32,
    md: 48,
    lg: 64,
    xl: 80,
  };

  return (
    <Image 
      src="/iga-logo.svg" 
      alt="IGA Prep Logo"
      className={cn('w-full h-full', className)}
      width={widthHeightMap[size]}
      height={widthHeightMap[size]}
      priority
    />
  );
}
