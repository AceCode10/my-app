
'use client';

import type { Question } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2 } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

interface QuestionItemProps {
    question: Question;
    index: number;
    quizId: string;
    onDelete: () => void;
}

export const QuestionItem = ({ question, index, quizId, onDelete }: QuestionItemProps) => {
    const router = useRouter();
    const pathname = usePathname();
    
    const getBadgeVariant = (type: string) => {
        switch (type) {
            case 'mcq': return 'default';
            case 'short_answer': return 'secondary';
            default: return 'outline';
        }
    }

    const handleEdit = () => {
        const basePath = pathname.includes('/admin/') ? '/admin/dashboard' : '/teacher/dashboard';
        router.push(`${basePath}/questions/${question.id}?quizId=${quizId}`);
    }

    return (
        <div className="p-4 bg-muted/50 rounded-lg border flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
                <span className="text-lg font-bold text-muted-foreground">{index + 1}.</span>
                <div className="flex-1">
                    <p className="font-medium text-foreground">{question.stem}</p>
                    <div className="mt-2 flex items-center gap-2">
                        <Badge variant={getBadgeVariant(question.type)}>{question.type.toUpperCase()}</Badge>
                        <Badge variant="outline">{question.marks} Mark{question.marks === 1 ? '' : 's'}</Badge>
                    </div>
                </div>
            </div>
            <div className="flex-shrink-0 flex gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleEdit}>
                    <Edit2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDelete}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}
