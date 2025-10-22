
'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { ArrowRight } from 'lucide-react';

interface SubjectCardProps {
    name: string;
    code: string;
    path: string;
    icon: LucideIcon;
    color: string;
}

export function SubjectCard({ name, code, path, icon: Icon, color }: SubjectCardProps) {
    return (
        <div className="bg-background p-6 rounded-2xl shadow-sm border flex flex-col text-left hover:shadow-lg hover:-translate-y-1 transition-all duration-200 h-full">
            <div className="flex-grow">
               <div className="mb-4 bg-muted w-fit p-3 rounded-lg">
                   <Icon className={cn("w-8 h-8", color)} />
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
