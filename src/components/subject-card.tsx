
'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BookOpen } from 'lucide-react';
import Image from 'next/image';
import { Progress } from './ui/progress';
import { getIconComponent } from '@/lib/icon-mapper';
import { memo } from 'react';

interface SubjectCardProps {
    name: string;
    code: string;
    path: string;
    icon?: LucideIcon | string;
    color: string;
    progress?: number; // Progress percentage (0-100)
    showProgress?: boolean; // Whether to show progress for authenticated users
}

export const SubjectCard = memo(function SubjectCard({ name, code, path, icon, color, progress = 0, showProgress = false }: SubjectCardProps) {
    // Determine if icon is a component, icon name, or URL
    const isIconComponent = icon && typeof icon !== 'string';
    const isIconUrl = typeof icon === 'string' && (icon.startsWith('http') || icon.startsWith('/'));
    
    let IconComponent: LucideIcon;
    if (isIconComponent) {
        IconComponent = icon as LucideIcon;
    } else if (typeof icon === 'string' && !isIconUrl) {
        // Icon name from database - map to Lucide component
        IconComponent = getIconComponent(icon);
    } else {
        IconComponent = BookOpen;
    }
    
    const iconUrl = isIconUrl ? icon as string : null;

    // Parse color to get gradient classes
    const getGradientClasses = (colorValue: string) => {
        const colorMap: Record<string, string> = {
            '#3b82f6': 'from-blue-500 to-blue-700',
            '#8b5cf6': 'from-purple-500 to-purple-700',
            '#10b981': 'from-green-500 to-green-700',
            '#f59e0b': 'from-amber-500 to-amber-700',
            '#ef4444': 'from-red-500 to-red-700',
            '#ec4899': 'from-pink-500 to-pink-700',
            '#06b6d4': 'from-cyan-500 to-cyan-700',
            '#6366f1': 'from-indigo-500 to-indigo-700',
            '#14b8a6': 'from-teal-500 to-teal-700',
            '#0ea5e9': 'from-sky-500 to-sky-700',
        };
        return colorMap[colorValue] || 'from-blue-500 to-blue-700';
    };

    const gradientClasses = getGradientClasses(color);

    return (
        <Link href={path} className="block group">
            <div className={cn(
                "relative overflow-hidden rounded-2xl p-6 h-full min-h-[180px]",
                "bg-gradient-to-br shadow-lg",
                "hover:shadow-2xl hover:scale-105 transition-all duration-300",
                "border border-white/10",
                gradientClasses
            )}>
                {/* Background pattern overlay */}
                <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]" />
                
                {/* Content */}
                <div className="relative z-10 flex flex-col h-full text-white">
                    {/* Icon */}
                    <div className="mb-3">
                        {iconUrl ? (
                            <div className="w-10 h-10 relative">
                                <Image 
                                    src={iconUrl} 
                                    alt={name}
                                    fill
                                    className="object-contain filter brightness-0 invert"
                                />
                            </div>
                        ) : (
                            <IconComponent className="w-10 h-10 text-white" />
                        )}
                    </div>
                    
                    {/* Subject Name */}
                    <div className="flex-grow">
                        <h3 className="font-bold text-white text-lg mb-1 line-clamp-2">
                            {name}
                        </h3>
                        {code && (
                            <p className="text-xs text-white/80 mt-1">{code}</p>
                        )}
                    </div>
                    
                    {/* Progress Bar (only shown for authenticated users with progress) */}
                    {showProgress && (
                        <div className="mt-4 space-y-1">
                            <Progress 
                                value={progress} 
                                className="h-2 bg-white/20"
                                indicatorClassName="bg-white"
                            />
                            <p className="text-xs text-white/90 font-medium">
                                {progress}% Complete
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
});
