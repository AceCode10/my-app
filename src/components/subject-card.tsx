
'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { ArrowRight, BookOpen } from 'lucide-react';
import Image from 'next/image';

interface SubjectCardProps {
    name: string;
    code: string;
    path: string;
    icon?: LucideIcon | string;
    color: string;
}

export function SubjectCard({ name, code, path, icon, color }: SubjectCardProps) {
    // Determine if icon is a component or URL
    const isIconComponent = icon && typeof icon !== 'string';
    const IconComponent = isIconComponent ? icon as LucideIcon : BookOpen;
    const iconUrl = !isIconComponent && typeof icon === 'string' ? icon : null;

    return (
        <div className="bg-background p-6 rounded-2xl shadow-sm border flex flex-col text-left hover:shadow-lg hover:-translate-y-1 transition-all duration-200 h-full">
            <div className="flex-grow">
               <div className="mb-4 bg-muted w-fit p-3 rounded-lg">
                   {iconUrl ? (
                       <div className="w-8 h-8 relative">
                           <Image 
                               src={iconUrl} 
                               alt={name}
                               fill
                               className="object-contain"
                           />
                       </div>
                   ) : (
                       <IconComponent className={cn("w-8 h-8", color)} />
                   )}
               </div>
               <h3 className="font-bold text-foreground text-lg">{name}</h3>
               <p className="text-sm text-muted-foreground mt-1">Code: {code}</p>
            </div>
            <Link href={path} className="mt-4">
                <Button variant="outline" className="w-full">
                    View Resources <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </Link>
        </div>
    );
}
