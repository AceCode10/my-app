'use client';

import { useState, useMemo, useEffect } from 'react';
import { SubjectsGrid } from '@/components/subjects-grid';
import { BookOpen, Target, TrendingUp, GraduationCap, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { EXAM_BOARDS, getLevelsForBoard, getExamBoardById, getLevelById } from '@/lib/exam-boards';
import { createClient } from '@/lib/supabase/client';

interface DbExamBoard {
  id: string;
  code: string;
  name: string;
  color: string;
  is_active: boolean;
  display_order: number;
}

export default function TopicalQuestionsPage() {
  const supabase = createClient();
  const [selectedBoard, setSelectedBoard] = useState<string>('cambridge');
  const [selectedLevel, setSelectedLevel] = useState<string>('igcse');
  const [dbExamBoards, setDbExamBoards] = useState<DbExamBoard[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');

  // Fetch exam boards from database
  useEffect(() => {
    async function fetchExamBoards() {
      const { data } = await supabase
        .from('exam_boards')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (data) {
        setDbExamBoards(data);
        // Set initial board ID
        const cieBoard = data.find(b => b.code === 'CIE');
        if (cieBoard) {
          setSelectedBoardId(cieBoard.id);
        }
      }
    }
    fetchExamBoards();
  }, []);

  // Update selectedBoardId when selectedBoard changes
  useEffect(() => {
    const codeMap: Record<string, string> = {
      'cambridge': 'CIE',
      'ib': 'IB',
      'edexcel': 'EDEX',
      'ocr': 'OCR',
      'aqa': 'AQA',
      'ap': 'AP'
    };
    const dbCode = codeMap[selectedBoard] || selectedBoard.toUpperCase();
    const board = dbExamBoards.find(b => b.code === dbCode);
    if (board) {
      setSelectedBoardId(board.id);
    }
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
          <Target className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl font-extrabold text-foreground">Topical Questions</h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Practice questions organized by topic. Master each concept before moving to the next.
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

      {/* Features highlight */}
      <div className="max-w-4xl mx-auto mb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card p-6 rounded-xl border text-center">
            <BookOpen className="w-8 h-8 text-blue-500 mx-auto mb-3" />
            <h3 className="font-semibold text-foreground">Topic-Focused</h3>
            <p className="text-sm text-muted-foreground mt-1">Questions grouped by syllabus topics</p>
          </div>
          <div className="bg-card p-6 rounded-xl border text-center">
            <Target className="w-8 h-8 text-green-500 mx-auto mb-3" />
            <h3 className="font-semibold text-foreground">Instant Feedback</h3>
            <p className="text-sm text-muted-foreground mt-1">Get immediate answers and explanations</p>
          </div>
          <div className="bg-card p-6 rounded-xl border text-center">
            <TrendingUp className="w-8 h-8 text-purple-500 mx-auto mb-3" />
            <h3 className="font-semibold text-foreground">Track Progress</h3>
            <p className="text-sm text-muted-foreground mt-1">Monitor your mastery of each topic</p>
          </div>
        </div>
      </div>

      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground">Select a Subject</h2>
        <p className="text-muted-foreground mt-2">Choose a subject to browse topics and start practicing</p>
      </div>
      
      <SubjectsGrid 
        basePath="/resources/topical-questions" 
        examBoard={selectedBoard}
        examBoardId={selectedBoardId}
        level={selectedLevel}
      />
    </div>
  );
}
