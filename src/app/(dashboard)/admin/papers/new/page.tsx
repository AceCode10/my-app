'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, Save, FileText, CheckCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { logCreate } from '@/lib/audit';

const EXAM_BOARDS = ['IGCSE', 'Edexcel', 'Cambridge', 'IB', 'AQA', 'OCR'];
const SESSIONS = ['May/June', 'Oct/Nov', 'Feb/Mar', 'Specimen'];
const LEVELS = ['igcse', 'olevel', 'alevel', 'aslevel'];
const STATUSES = ['draft', 'pending', 'published', 'archived'];

export default function NewPastPaperPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{
    paper?: number;
    markScheme?: number;
    examinerReport?: number;
  }>({});

  const [formData, setFormData] = useState({
    title: '',
    exam_board: 'IGCSE',
    subject_id: '',
    year: new Date().getFullYear(),
    session: 'May/June',
    paper_number: '',
    variant: '',
    level: 'igcse',
    duration_minutes: 0,
    total_marks: 0,
    status: 'draft'
  });

  const [files, setFiles] = useState<{
    paper: File | null;
    markScheme: File | null;
    examinerReport: File | null;
  }>({
    paper: null,
    markScheme: null,
    examinerReport: null
  });

  const [uploadedUrls, setUploadedUrls] = useState<{
    paper?: string;
    markScheme?: string;
    examinerReport?: string;
  }>({});

  useEffect(() => {
    fetchSubjects();
  }, []);

  async function fetchSubjects() {
    const { data } = await supabase
      .from('subjects')
      .select('id, name')
      .eq('status', 'published')
      .order('name');
    
    setSubjects(data || []);
  }

  async function uploadFile(file: File, type: 'paper' | 'markScheme' | 'examinerReport') {
    try {
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(7);
      
      // Create organized file path: year/subject/type-timestamp-random.pdf
      const year = formData.year || new Date().getFullYear();
      const subjectSlug = formData.subject_id ? 'subject' : 'general';
      const typePrefix = type === 'paper' ? 'qp' : type === 'markScheme' ? 'ms' : 'er';
      const fileName = `${typePrefix}-${timestamp}-${randomId}.${fileExt}`;
      const filePath = `${year}/${subjectSlug}/${fileName}`;

      setUploadProgress(prev => ({ ...prev, [type]: 0 }));

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('past-papers')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'application/pdf'
        });

      if (error) {
        // If bucket doesn't exist, show helpful error
        if (error.message.includes('Bucket not found') || error.message.includes('bucket')) {
          throw new Error('Storage bucket "past-papers" not configured. Please create it in Supabase Dashboard.');
        }
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('past-papers')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;
      
      setUploadedUrls(prev => ({ ...prev, [type]: publicUrl }));
      setUploadProgress(prev => ({ ...prev, [type]: 100 }));
      
      return publicUrl;
    } catch (error: any) {
      console.error(`Error uploading ${type}:`, error);
      setUploadProgress(prev => ({ ...prev, [type]: 0 }));
      throw error;
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>, type: 'paper' | 'markScheme' | 'examinerReport') {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      toast({
        variant: 'destructive',
        title: 'Invalid file type',
        description: 'Please upload a PDF file'
      });
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Please upload a file smaller than 50MB'
      });
      return;
    }

    setFiles(prev => ({ ...prev, [type]: file }));

    // Auto-upload
    try {
      await uploadFile(file, type);
      toast({
        title: 'Success',
        description: `${type === 'paper' ? 'Paper' : type === 'markScheme' ? 'Mark scheme' : 'Examiner report'} uploaded successfully`
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: 'Failed to upload file. Please try again.'
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!uploadedUrls.paper) {
      toast({
        variant: 'destructive',
        title: 'Missing file',
        description: 'Please upload the exam paper PDF'
      });
      return;
    }

    setLoading(true);

    try {
      const paperData = {
        title: formData.title,
        exam_board: formData.exam_board,
        subject_id: formData.subject_id || null,
        year: formData.year,
        session: formData.session || null,
        paper_number: formData.paper_number || null,
        variant: formData.variant || null,
        level: formData.level || null,
        duration_minutes: formData.duration_minutes || null,
        total_marks: formData.total_marks || null,
        paper_url: uploadedUrls.paper,
        question_paper_url: uploadedUrls.paper,
        mark_scheme_url: uploadedUrls.markScheme || null,
        examiner_report_url: uploadedUrls.examinerReport || null,
        status: formData.status
      };

      const { data: newPaper, error } = await supabase
        .from('past_papers')
        .insert(paperData)
        .select()
        .single();

      if (error) throw error;

      // Log the creation in audit logs
      if (newPaper) {
        await logCreate(
          'past_paper',
          newPaper.id,
          formData.title,
          {
            exam_board: formData.exam_board,
            year: formData.year,
            paper_number: formData.paper_number,
            status: formData.status
          }
        );
      }

      toast({
        title: 'Success',
        description: 'Past paper created successfully'
      });

      router.push('/admin/papers');
    } catch (error: any) {
      console.error('Error creating past paper:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to create past paper'
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Upload Past Paper</h1>
          <p className="text-muted-foreground mt-1">
            Add a new past paper with mark scheme and examiner report
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Enter the paper details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Paper Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., IGCSE Mathematics Paper 1 - May/June 2023"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="exam_board">Exam Board *</Label>
                <Select
                  value={formData.exam_board}
                  onValueChange={(value) => setFormData({ ...formData, exam_board: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXAM_BOARDS.map(board => (
                      <SelectItem key={board} value={board}>
                        {board}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Select
                  value={formData.subject_id}
                  onValueChange={(value) => setFormData({ ...formData, subject_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(subject => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="year">Year *</Label>
                <Input
                  id="year"
                  type="number"
                  min="1990"
                  max="2100"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || new Date().getFullYear() })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="session">Session *</Label>
                <Select
                  value={formData.session}
                  onValueChange={(value) => setFormData({ ...formData, session: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SESSIONS.map(session => (
                      <SelectItem key={session} value={session}>
                        {session}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paper_number">Paper Number</Label>
                <Input
                  id="paper_number"
                  value={formData.paper_number}
                  onChange={(e) => setFormData({ ...formData, paper_number: e.target.value })}
                  placeholder="e.g., Paper 1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="variant">Variant</Label>
                <Input
                  id="variant"
                  value={formData.variant}
                  onChange={(e) => setFormData({ ...formData, variant: e.target.value })}
                  placeholder="e.g., Variant 1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="level">Level</Label>
              <Select
                value={formData.level}
                onValueChange={(value) => setFormData({ ...formData, level: value })}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map(level => (
                    <SelectItem key={level} value={level}>
                      {level.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="0"
                  value={formData.duration_minutes || ''}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
                  placeholder="e.g., 120"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="total_marks">Total Marks</Label>
                <Input
                  id="total_marks"
                  type="number"
                  min="0"
                  value={formData.total_marks || ''}
                  onChange={(e) => setFormData({ ...formData, total_marks: parseInt(e.target.value) || 0 })}
                  placeholder="e.g., 100"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* File Uploads */}
        <Card>
          <CardHeader>
            <CardTitle>File Uploads</CardTitle>
            <CardDescription>Upload PDF files (max 50MB each)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Exam Paper */}
            <div className="space-y-3">
              <Label htmlFor="paper-file">Exam Paper (PDF) *</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="paper-file"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleFileChange(e, 'paper')}
                  className="flex-1"
                />
                {uploadedUrls.paper && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
              </div>
              {uploadProgress.paper !== undefined && uploadProgress.paper < 100 && (
                <Progress value={uploadProgress.paper} className="h-2" />
              )}
              {files.paper && (
                <p className="text-sm text-muted-foreground">
                  {files.paper.name} ({(files.paper.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            {/* Mark Scheme */}
            <div className="space-y-3">
              <Label htmlFor="ms-file">Mark Scheme (PDF)</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="ms-file"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleFileChange(e, 'markScheme')}
                  className="flex-1"
                />
                {uploadedUrls.markScheme && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
              </div>
              {uploadProgress.markScheme !== undefined && uploadProgress.markScheme < 100 && (
                <Progress value={uploadProgress.markScheme} className="h-2" />
              )}
              {files.markScheme && (
                <p className="text-sm text-muted-foreground">
                  {files.markScheme.name} ({(files.markScheme.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            {/* Examiner Report */}
            <div className="space-y-3">
              <Label htmlFor="er-file">Examiner Report (PDF)</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="er-file"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleFileChange(e, 'examinerReport')}
                  className="flex-1"
                />
                {uploadedUrls.examinerReport && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
              </div>
              {uploadProgress.examinerReport !== undefined && uploadProgress.examinerReport < 100 && (
                <Progress value={uploadProgress.examinerReport} className="h-2" />
              )}
              {files.examinerReport && (
                <p className="text-sm text-muted-foreground">
                  {files.examinerReport.name} ({(files.examinerReport.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> Files are uploaded immediately when selected. 
                You can preview uploaded files before saving the paper.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle>Publication Status</CardTitle>
            <CardDescription>Set the visibility of this past paper</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map(status => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={loading || !uploadedUrls.paper}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? 'Creating...' : 'Create Past Paper'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
