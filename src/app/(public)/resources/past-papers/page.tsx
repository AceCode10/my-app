'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SubjectsGrid } from '@/components/subjects-grid';
import { FileText, Building2, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { EXAM_BOARDS, getLevelsForBoard, getExamBoardById, getLevelById } from '@/lib/exam-boards';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export default function PastPapersPage() {
  const [selectedBoard, setSelectedBoard] = useState<string>('cambridge');
  const [selectedLevel, setSelectedLevel] = useState<string>('igcse');

  // Cached exam boards query
  const { data: dbExamBoards = [] } = useQuery({
    queryKey: ['exam-boards'],
    queryFn: async () => {
      const { data } = await supabase
        .from('exam_boards')
        .select('id, code, name, color, is_active, display_order')
        .eq('is_active', true)
        .order('display_order');
      return data || [];
    },
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes
  });

  // Compute selectedBoardId from cached data
  const selectedBoardId = useMemo(() => {
    const codeMap: Record<string, string> = {
      'cambridge': 'CIE',
      'ib': 'IB',
      'edexcel': 'EDEX',
      'ocr': 'OCR',
      'aqa': 'AQA',
      'ap': 'AP'
    };
    const dbCode = codeMap[selectedBoard] || selectedBoard.toUpperCase();
    const board = dbExamBoards.find((b: any) => b.code === dbCode);
    return board?.id || '';
  }, [selectedBoard, dbExamBoards]);

  // Get available levels for the selected board
  const availableLevels = useMemo(() => {
    return getLevelsForBoard(selectedBoard);
  }, [selectedBoard]);

  // Reset level if current selection is not available for the new board
  useMemo(() => {
    const levelAvailable = availableLevels.some(l => l.id === selectedLevel);
    if (!levelAvailable && availableLevels.length > 0) {
      setSelectedLevel(availableLevels[0].id);
    }
  }, [selectedBoard, availableLevels]);

  const selectedBoardData = getExamBoardById(selectedBoard);
  const selectedLevelData = getLevelById(selectedLevel);

  return (
    <div className="py-12">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <FileText className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl font-extrabold text-foreground">Past Papers</h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Access past examination papers with mark schemes. Practice with real exam questions.
        </p>
      </div>

      {/* Exam Board & Level Selection */}
      <div className="max-w-4xl mx-auto mb-10">
        <div className="bg-card border rounded-xl p-6 space-y-6">
          {/* Exam Board Selection */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Exam Board</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {EXAM_BOARDS.map((board) => (
                <Button
                  key={board.id}
                  variant={selectedBoard === board.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedBoard(board.id)}
                  className={cn(
                    "transition-all",
                    selectedBoard === board.id && "ring-2 ring-offset-2 ring-primary"
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full mr-2", board.color)} />
                  {board.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Level Selection */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Qualification Level</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {availableLevels.map((level) => (
                <button
                  key={level.id}
                  onClick={() => setSelectedLevel(level.id)}
                  className={cn(
                    "p-3 rounded-lg border-2 text-left transition-all",
                    selectedLevel === level.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="font-semibold text-foreground">{level.name}</div>
                  <div className="text-xs text-muted-foreground">{level.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Current Selection Display */}
          <div className="flex items-center justify-center gap-2 pt-2 border-t">
            <span className="text-sm text-muted-foreground">Showing:</span>
            <Badge variant="secondary" className="font-medium">
              {selectedBoardData?.name}
            </Badge>
            <span className="text-muted-foreground">•</span>
            <Badge variant="secondary" className="font-medium">
              {selectedLevelData?.name}
            </Badge>
          </div>
        </div>
      </div>

      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground">Select a Subject</h2>
        <p className="text-muted-foreground mt-2">Choose a subject to browse available past papers</p>
      </div>
      
      <SubjectsGrid 
        basePath="/resources/past-papers" 
        examBoard={selectedBoard}
        examBoardId={selectedBoardId}
        level={selectedLevel}
      />
    </div>
  );
}
