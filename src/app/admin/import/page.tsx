'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const IMPORT_TYPES = [
  { value: 'subjects', label: 'Subjects', template: 'subjects_template.csv' },
  { value: 'topics', label: 'Topics', template: 'topics_template.csv' },
  { value: 'questions', label: 'Questions', template: 'questions_template.csv' }
];

interface ImportResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

export default function BulkImportPage() {
  const supabase = createClient();
  const { toast } = useToast();

  const [importType, setImportType] = useState('subjects');
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();
    if (fileExt !== 'csv' && fileExt !== 'json') {
      toast({
        variant: 'destructive',
        title: 'Invalid file type',
        description: 'Please upload a CSV or JSON file'
      });
      return;
    }

    setFile(selectedFile);
    setResult(null);
    setPreviewData([]);

    // Parse and preview
    parseFile(selectedFile);
  }

  async function parseFile(file: File) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target?.result as string;
      
      if (file.name.endsWith('.csv')) {
        const lines = content.split('\n').filter(line => line.trim());
        if (lines.length === 0) return;

        const headers = lines[0].split(',').map(h => h.trim());
        const rows = lines.slice(1, 6).map(line => {
          const values = line.split(',').map(v => v.trim());
          return headers.reduce((obj, header, i) => {
            obj[header] = values[i] || '';
            return obj;
          }, {} as any);
        });

        setPreviewData(rows);
      } else if (file.name.endsWith('.json')) {
        try {
          const data = JSON.parse(content);
          setPreviewData(Array.isArray(data) ? data.slice(0, 5) : [data]);
        } catch (error) {
          toast({
            variant: 'destructive',
            title: 'Invalid JSON',
            description: 'Failed to parse JSON file'
          });
        }
      }
    };

    reader.readAsText(file);
  }

  async function handleImport() {
    if (!file) return;

    setImporting(true);
    setProgress(0);
    setResult(null);

    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        let data: any[] = [];

        // Parse file
        if (file.name.endsWith('.csv')) {
          const lines = content.split('\n').filter(line => line.trim());
          const headers = lines[0].split(',').map(h => h.trim());
          data = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim());
            return headers.reduce((obj, header, i) => {
              obj[header] = values[i] || '';
              return obj;
            }, {} as any);
          });
        } else if (file.name.endsWith('.json')) {
          data = JSON.parse(content);
          if (!Array.isArray(data)) data = [data];
        }

        // Process import
        const errors: Array<{ row: number; error: string }> = [];
        let successful = 0;

        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          setProgress(Math.round(((i + 1) / data.length) * 100));

          try {
            if (importType === 'subjects') {
              await importSubject(row);
            } else if (importType === 'topics') {
              await importTopic(row);
            } else if (importType === 'questions') {
              await importQuestion(row);
            }
            successful++;
          } catch (error: any) {
            errors.push({ row: i + 2, error: error.message });
          }

          // Small delay to show progress
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        setResult({
          total: data.length,
          successful,
          failed: errors.length,
          errors
        });

        if (successful > 0) {
          toast({
            title: 'Import completed',
            description: `Successfully imported ${successful} of ${data.length} items`
          });
        }
      };

      reader.readAsText(file);
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        variant: 'destructive',
        title: 'Import failed',
        description: error.message || 'An error occurred during import'
      });
    } finally {
      setImporting(false);
    }
  }

  async function importSubject(row: any) {
    const slug = row.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    const { error } = await supabase
      .from('subjects')
      .insert({
        name: row.name,
        slug,
        description: row.description || null,
        exam_board: row.exam_board || 'IGCSE',
        status: row.status || 'draft',
        display_order: parseInt(row.display_order) || 0
      });

    if (error) throw error;
  }

  async function importTopic(row: any) {
    // Find subject by name
    const { data: subject } = await supabase
      .from('subjects')
      .select('id')
      .eq('name', row.subject_name)
      .single();

    if (!subject) throw new Error(`Subject not found: ${row.subject_name}`);

    const slug = row.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const { error } = await supabase
      .from('topics')
      .insert({
        subject_id: subject.id,
        name: row.name,
        slug,
        description: row.description || null,
        status: row.status || 'draft',
        display_order: parseInt(row.display_order) || 0
      });

    if (error) throw error;
  }

  async function importQuestion(row: any) {
    // Find subject and topic
    let subject_id = null;
    let topic_id = null;

    if (row.subject_name) {
      const { data: subject } = await supabase
        .from('subjects')
        .select('id')
        .eq('name', row.subject_name)
        .single();
      subject_id = subject?.id || null;
    }

    if (row.topic_name && subject_id) {
      const { data: topic } = await supabase
        .from('topics')
        .select('id')
        .eq('name', row.topic_name)
        .eq('subject_id', subject_id)
        .single();
      topic_id = topic?.id || null;
    }

    const { error } = await supabase
      .from('questions')
      .insert({
        stem_markdown: row.question_text,
        question_type: row.question_type || 'short_answer',
        difficulty: row.difficulty || 'medium',
        marks: parseInt(row.marks) || 1,
        correct_answer: row.correct_answer || null,
        examiner_comment: row.examiner_comment || '',
        subject_id,
        topic_id,
        exam_board: row.exam_board || 'IGCSE',
        status: row.status || 'draft'
      });

    if (error) throw error;
  }

  function downloadTemplate() {
    const template = IMPORT_TYPES.find(t => t.value === importType);
    if (!template) return;

    let csvContent = '';

    if (importType === 'subjects') {
      csvContent = 'name,description,exam_board,status,display_order\n';
      csvContent += 'Mathematics,IGCSE Mathematics,IGCSE,draft,0\n';
      csvContent += 'Physics,IGCSE Physics,IGCSE,draft,1\n';
    } else if (importType === 'topics') {
      csvContent = 'subject_name,name,description,status,display_order\n';
      csvContent += 'Mathematics,Algebra,Basic algebra concepts,draft,0\n';
      csvContent += 'Mathematics,Geometry,Geometric principles,draft,1\n';
    } else if (importType === 'questions') {
      csvContent = 'question_text,question_type,difficulty,marks,correct_answer,examiner_comment,subject_name,topic_name,exam_board,status\n';
      csvContent += 'What is 2+2?,short_answer,easy,1,4,Basic arithmetic,Mathematics,Algebra,IGCSE,draft\n';
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = template.template;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Bulk Import</h1>
        <p className="text-muted-foreground mt-1">
          Import multiple items at once using CSV or JSON files
        </p>
      </div>

      {/* Import Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Import Configuration</CardTitle>
          <CardDescription>Select what you want to import and download a template</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="import-type">Import Type</Label>
              <Select value={importType} onValueChange={setImportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMPORT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Template</Label>
              <Button
                variant="outline"
                className="w-full"
                onClick={downloadTemplate}
              >
                <Download className="mr-2 h-4 w-4" />
                Download Template
              </Button>
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Template Format</AlertTitle>
            <AlertDescription>
              Download the template to see the required format. Make sure your file matches the column headers exactly.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
          <CardDescription>Upload a CSV or JSON file to import</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">Select File</Label>
            <Input
              id="file"
              type="file"
              accept=".csv,.json"
              onChange={handleFileChange}
              disabled={importing}
            />
          </div>

          {file && !importing && (
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <Button onClick={handleImport}>
                <Upload className="mr-2 h-4 w-4" />
                Start Import
              </Button>
            </div>
          )}

          {importing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Importing...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      {previewData.length > 0 && !result && (
        <Card>
          <CardHeader>
            <CardTitle>Preview (First 5 rows)</CardTitle>
            <CardDescription>Review your data before importing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(previewData[0]).map(key => (
                      <TableHead key={key}>{key}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, i) => (
                    <TableRow key={i}>
                      {Object.values(row).map((value: any, j) => (
                        <TableCell key={j}>{value}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
            <CardDescription>Summary of the import operation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-blue-500/10 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileSpreadsheet className="h-5 w-5 text-blue-500" />
                  <span className="text-sm font-medium">Total</span>
                </div>
                <p className="text-2xl font-bold">{result.total}</p>
              </div>

              <div className="p-4 bg-green-500/10 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium">Successful</span>
                </div>
                <p className="text-2xl font-bold text-green-500">{result.successful}</p>
              </div>

              <div className="p-4 bg-red-500/10 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="text-sm font-medium">Failed</span>
                </div>
                <p className="text-2xl font-bold text-red-500">{result.failed}</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold">Errors</h4>
                <div className="rounded-md border max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.errors.map((error, i) => (
                        <TableRow key={i}>
                          <TableCell>{error.row}</TableCell>
                          <TableCell className="text-red-500">{error.error}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <Button
              variant="outline"
              onClick={() => {
                setFile(null);
                setResult(null);
                setPreviewData([]);
              }}
            >
              Import Another File
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Import Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold">Step 1: Download Template</h4>
            <p className="text-sm text-muted-foreground">
              Download the CSV template for the type of data you want to import. The template shows the required column headers and example data.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">Step 2: Prepare Your Data</h4>
            <p className="text-sm text-muted-foreground">
              Fill in the template with your data. Make sure to follow the format exactly, including column headers and data types.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">Step 3: Upload and Preview</h4>
            <p className="text-sm text-muted-foreground">
              Upload your file and review the preview to ensure the data looks correct before importing.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">Step 4: Import</h4>
            <p className="text-sm text-muted-foreground">
              Click "Start Import" to begin. The system will process each row and report any errors.
            </p>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Important Notes</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>For topics, the subject must already exist</li>
                <li>For questions, subjects and topics must already exist</li>
                <li>Duplicate entries will be rejected</li>
                <li>All imports are logged in the audit trail</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
