'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Upload,
  FileText,
  Download,
  Check,
  X,
  AlertTriangle,
  Loader2,
  FileJson,
  BookOpen,
  Target,
  Trash2,
  Eye,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  parseQuestionJSON,
  validateQuestions,
  formatForTopicalImport,
  formatForPaperImport,
  QUESTION_IMPORT_TEMPLATE,
  type ExtractedQuestion,
  type PDFImportConfig
} from '@/lib/pdf-question-extractor';

interface Subject {
  id: string;
  name: string;
  slug: string;
  code?: string;
  exam_board_id?: string;
}

interface Topic {
  id: string;
  name: string;
  slug: string;
  subject_id: string;
}

interface Paper {
  id: string;
  title: string;
  year: number;
  session?: string;
  paper_number?: string;
}

interface ExamBoard {
  id: string;
  code: string;
  name: string;
}

export default function BulkImportPage() {
  const supabase = createClient();
  const { toast } = useToast();

  // State
  const [activeTab, setActiveTab] = useState<'topical' | 'paper'>('topical');
  const [examBoards, setExamBoards] = useState<ExamBoard[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  
  // Selection state
  const [selectedExamBoard, setSelectedExamBoard] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [selectedPaper, setSelectedPaper] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('igcse');
  
  // Import state
  const [jsonInput, setJsonInput] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<ExtractedQuestion[]>([]);
  const [validationResult, setValidationResult] = useState<{
    valid: ExtractedQuestion[];
    invalid: { question: ExtractedQuestion; error: string }[];
  } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  // Fetch exam boards on mount
  useEffect(() => {
    fetchExamBoards();
  }, []);

  // Fetch subjects when exam board changes
  useEffect(() => {
    if (selectedExamBoard) {
      fetchSubjects(selectedExamBoard);
    }
  }, [selectedExamBoard]);

  // Fetch topics when subject changes
  useEffect(() => {
    if (selectedSubject) {
      fetchTopics(selectedSubject);
    }
  }, [selectedSubject]);

  // Fetch papers when subject changes (for paper import)
  useEffect(() => {
    if (selectedSubject && activeTab === 'paper') {
      fetchPapers(selectedSubject);
    }
  }, [selectedSubject, activeTab]);

  async function fetchExamBoards() {
    const { data, error } = await supabase
      .from('exam_boards')
      .select('id, code, name')
      .eq('is_active', true)
      .order('display_order');
    
    if (!error && data) {
      setExamBoards(data);
      if (data.length > 0) {
        setSelectedExamBoard(data[0].id);
      }
    }
  }

  async function fetchSubjects(examBoardId: string) {
    const { data, error } = await supabase
      .from('subjects')
      .select('id, name, slug, code, exam_board_id')
      .eq('exam_board_id', examBoardId)
      .order('name');
    
    if (!error && data) {
      setSubjects(data);
      setSelectedSubject('');
      setSelectedTopic('');
      setTopics([]);
    }
  }

  async function fetchTopics(subjectId: string) {
    const { data, error } = await supabase
      .from('topics')
      .select('id, name, slug, subject_id')
      .eq('subject_id', subjectId)
      .order('display_order');
    
    if (!error && data) {
      setTopics(data);
    }
  }

  async function fetchPapers(subjectId: string) {
    const { data, error } = await supabase
      .from('past_papers')
      .select('id, title, year, session, paper_number')
      .eq('subject_id', subjectId)
      .order('year', { ascending: false });
    
    if (!error && data) {
      setPapers(data);
    }
  }

  const handleParseJSON = useCallback(() => {
    try {
      const questions = parseQuestionJSON(jsonInput);
      setParsedQuestions(questions);
      const validation = validateQuestions(questions);
      setValidationResult(validation);
      setImportResults(null);
      
      toast({
        title: 'Parsed Successfully',
        description: `Found ${questions.length} questions (${validation.valid.length} valid, ${validation.invalid.length} invalid)`
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Parse Error',
        description: error.message || 'Failed to parse JSON'
      });
    }
  }, [jsonInput, toast]);

  const handleImport = useCallback(async () => {
    if (!validationResult || validationResult.valid.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Valid Questions',
        description: 'Please fix validation errors before importing'
      });
      return;
    }

    const config: PDFImportConfig = {
      subject_id: selectedSubject,
      topic_id: activeTab === 'topical' ? selectedTopic : undefined,
      paper_id: activeTab === 'paper' ? selectedPaper : undefined,
      exam_board_id: selectedExamBoard,
      level: selectedLevel,
      source_file_name: 'manual_import',
      import_type: activeTab
    };

    // Validate selection
    if (activeTab === 'topical' && !selectedTopic) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a topic' });
      return;
    }
    if (activeTab === 'paper' && !selectedPaper) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a paper' });
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    
    const results = { success: 0, failed: 0, errors: [] as string[] };
    const questionsToImport = activeTab === 'topical'
      ? formatForTopicalImport(validationResult.valid, config)
      : formatForPaperImport(validationResult.valid, config);

    const table = activeTab === 'topical' ? 'questions' : 'paper_questions';
    
    // Import one at a time for better error handling
    for (let i = 0; i < questionsToImport.length; i++) {
      const question = questionsToImport[i];
      
      try {
        const { error } = await supabase.from(table).insert(question);
        
        if (error) {
          results.failed++;
          results.errors.push(`Q${i + 1}: ${error.message}`);
        } else {
          results.success++;
        }
      } catch (e: any) {
        results.failed++;
        results.errors.push(`Q${i + 1}: ${e.message}`);
      }
      
      setImportProgress(Math.round(((i + 1) / questionsToImport.length) * 100));
    }

    setImportResults(results);
    setIsImporting(false);

    if (results.success > 0) {
      toast({
        title: 'Import Complete',
        description: `Imported ${results.success} of ${questionsToImport.length} questions`
      });
    }
  }, [validationResult, selectedSubject, selectedTopic, selectedPaper, selectedExamBoard, selectedLevel, activeTab, supabase, toast]);

  const handleDownloadTemplate = () => {
    const blob = new Blob([QUESTION_IMPORT_TEMPLATE], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions-template.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setJsonInput('');
    setParsedQuestions([]);
    setValidationResult(null);
    setImportResults(null);
    setImportProgress(0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Upload className="h-8 w-8 text-primary" />
          Bulk Question Import
        </h1>
        <p className="text-muted-foreground mt-1">
          Import questions from JSON files for topical practice or past papers
        </p>
      </div>

      {/* Import Type Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'topical' | 'paper')}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="topical" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Topical Questions
          </TabsTrigger>
          <TabsTrigger value="paper" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Paper Questions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="topical" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Import Topical Questions</CardTitle>
              <CardDescription>
                Add questions organized by topic for practice sessions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selection Dropdowns */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Exam Board</Label>
                  <Select value={selectedExamBoard} onValueChange={setSelectedExamBoard}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select board" />
                    </SelectTrigger>
                    <SelectContent>
                      {examBoards.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Level</Label>
                  <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="igcse">IGCSE</SelectItem>
                      <SelectItem value="as">AS Level</SelectItem>
                      <SelectItem value="a2">A2 Level</SelectItem>
                      <SelectItem value="ib">IB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} {s.code && `(${s.code})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Topic</Label>
                  <Select value={selectedTopic} onValueChange={setSelectedTopic} disabled={!selectedSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select topic" />
                    </SelectTrigger>
                    <SelectContent>
                      {topics.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paper" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Import Paper Questions</CardTitle>
              <CardDescription>
                Add questions for specific past papers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selection Dropdowns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Exam Board</Label>
                  <Select value={selectedExamBoard} onValueChange={setSelectedExamBoard}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select board" />
                    </SelectTrigger>
                    <SelectContent>
                      {examBoards.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} {s.code && `(${s.code})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Paper</Label>
                  <Select value={selectedPaper} onValueChange={setSelectedPaper} disabled={!selectedSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select paper" />
                    </SelectTrigger>
                    <SelectContent>
                      {papers.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.title || `${p.year} ${p.session || ''} P${p.paper_number || ''}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* JSON Input Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileJson className="w-5 h-5" />
                Question Data (JSON)
              </CardTitle>
              <CardDescription>
                Paste your questions in JSON format or use the template below
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
              <Button variant="outline" size="sm" onClick={handleClear}>
                <Trash2 className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder="Paste your JSON array of questions here..."
            className="min-h-[300px] font-mono text-sm"
          />
          
          <div className="flex gap-2">
            <Button onClick={handleParseJSON} disabled={!jsonInput.trim()}>
              <Eye className="w-4 h-4 mr-2" />
              Parse & Validate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Validation Results */}
      {validationResult && (
        <Card>
          <CardHeader>
            <CardTitle>Validation Results</CardTitle>
            <CardDescription>
              {validationResult.valid.length} valid, {validationResult.invalid.length} invalid questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Valid Questions Preview */}
            {validationResult.valid.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold text-green-600 flex items-center gap-2 mb-3">
                  <Check className="w-4 h-4" />
                  Valid Questions ({validationResult.valid.length})
                </h4>
                <div className="max-h-64 overflow-y-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">#</TableHead>
                        <TableHead>Question</TableHead>
                        <TableHead className="w-24">Type</TableHead>
                        <TableHead className="w-20">Marks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validationResult.valid.slice(0, 10).map((q, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono">{q.question_number || idx + 1}</TableCell>
                          <TableCell className="max-w-md truncate">{q.question_text}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{q.question_type}</Badge>
                          </TableCell>
                          <TableCell>{q.marks}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {validationResult.valid.length > 10 && (
                    <div className="p-3 text-center text-sm text-muted-foreground border-t">
                      ... and {validationResult.valid.length - 10} more questions
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Invalid Questions */}
            {validationResult.invalid.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold text-red-600 flex items-center gap-2 mb-3">
                  <X className="w-4 h-4" />
                  Invalid Questions ({validationResult.invalid.length})
                </h4>
                <div className="space-y-2">
                  {validationResult.invalid.map((item, idx) => (
                    <div key={idx} className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <div className="font-medium text-red-600">
                        Question {item.question.question_number || idx + 1}: {item.error}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1 truncate">
                        {item.question.question_text?.substring(0, 100)}...
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Import Button */}
            {validationResult.valid.length > 0 && (
              <div className="flex items-center gap-4">
                <Button 
                  onClick={handleImport} 
                  disabled={isImporting || (activeTab === 'topical' ? !selectedTopic : !selectedPaper)}
                  size="lg"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Import {validationResult.valid.length} Questions
                    </>
                  )}
                </Button>
                
                {isImporting && (
                  <div className="flex-1 max-w-xs">
                    <Progress value={importProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">{importProgress}% complete</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Import Results */}
      {importResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importResults.failed === 0 ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              )}
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-4 bg-green-500/10 rounded-lg text-center">
                <div className="text-3xl font-bold text-green-600">{importResults.success}</div>
                <div className="text-sm text-muted-foreground">Imported Successfully</div>
              </div>
              <div className="p-4 bg-red-500/10 rounded-lg text-center">
                <div className="text-3xl font-bold text-red-600">{importResults.failed}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>
            
            {importResults.errors.length > 0 && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <h4 className="font-semibold text-red-600 mb-2">Errors:</h4>
                <ul className="text-sm space-y-1">
                  {importResults.errors.slice(0, 10).map((err, idx) => (
                    <li key={idx} className="text-red-600">{err}</li>
                  ))}
                  {importResults.errors.length > 10 && (
                    <li className="text-muted-foreground">
                      ... and {importResults.errors.length - 10} more errors
                    </li>
                  )}
                </ul>
              </div>
            )}

            <div className="mt-4">
              <Button variant="outline" onClick={handleClear}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Import More Questions
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            How to Use
          </CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <ol className="space-y-2">
            <li><strong>Prepare your questions:</strong> Convert your PDF questions to JSON format using the template provided.</li>
            <li><strong>Select destination:</strong> Choose the exam board, subject, and topic (or paper) where questions will be imported.</li>
            <li><strong>Paste JSON:</strong> Copy your JSON array of questions into the text area above.</li>
            <li><strong>Validate:</strong> Click "Parse & Validate" to check for errors before importing.</li>
            <li><strong>Import:</strong> Review the validation results and click "Import" to add questions to the database.</li>
          </ol>
          
          <h4 className="mt-6">Supported Question Fields:</h4>
          <ul className="text-sm grid grid-cols-2 gap-1">
            <li><code>question_text</code> - The question content (required)</li>
            <li><code>question_type</code> - mcq, short_answer, essay, etc.</li>
            <li><code>marks</code> - Point value (default: 1)</li>
            <li><code>difficulty</code> - easy, medium, hard</li>
            <li><code>correct_answer</code> - The correct answer</li>
            <li><code>mark_scheme</code> - Marking guidance</li>
            <li><code>options</code> - Array for MCQ options</li>
            <li><code>examiner_tips</code> - Examiner comments</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
