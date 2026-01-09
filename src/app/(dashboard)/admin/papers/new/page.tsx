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

const EXAM_BOARDS = ['CIE', 'Edexcel', 'AQA', 'OCR', 'IB', 'AP'];

// Exam board specific series/sessions
const EXAM_BOARD_SERIES: Record<string, { code: string; name: string }[]> = {
  'CIE': [
    { code: 'fm', name: 'February/March' },
    { code: 'mj', name: 'May/June' },
    { code: 'on', name: 'October/November' },
  ],
  'Edexcel': [
    { code: 'jan', name: 'January' },
    { code: 'mj', name: 'May/June' },
    { code: 'on', name: 'October/November' },
  ],
  'AQA': [
    { code: 'may', name: 'May' },
    { code: 'jun', name: 'June' },
  ],
  'OCR': [
    { code: 'may', name: 'May' },
    { code: 'jun', name: 'June' },
  ],
  'IB': [
    { code: 'am', name: 'April/May' },
    { code: 'on', name: 'October/November' },
  ],
  'AP': [
    { code: 'may', name: 'May' },
  ],
};

// Optional additional resources (beyond QP and MS which are always required)
const OPTIONAL_RESOURCES = [
  { code: 'insert', name: 'Insert/Source Booklet' },
  { code: 'examiner_report', name: 'Examiner Report' },
  { code: 'grade_thresholds', name: 'Grade Thresholds' },
  { code: 'specimen', name: 'Specimen Paper' },
];

// Exam board specific levels
const EXAM_BOARD_LEVELS: Record<string, { value: string; label: string }[]> = {
  'CIE': [
    { value: 'igcse', label: 'IGCSE' },
    { value: 'olevel', label: 'O Level' },
    { value: 'as', label: 'AS Level' },
    { value: 'a2', label: 'A2 Level' },
    { value: 'alevel', label: 'A Level' },
  ],
  'Edexcel': [
    { value: 'gcse', label: 'GCSE' },
    { value: 'igcse', label: 'International GCSE' },
    { value: 'as', label: 'AS Level' },
    { value: 'alevel', label: 'A Level' },
  ],
  'AQA': [
    { value: 'gcse', label: 'GCSE' },
    { value: 'as', label: 'AS Level' },
    { value: 'alevel', label: 'A Level' },
  ],
  'OCR': [
    { value: 'gcse', label: 'GCSE' },
    { value: 'as', label: 'AS Level' },
    { value: 'alevel', label: 'A Level' },
  ],
  'IB': [
    { value: 'ib_myp', label: 'IB MYP' },
    { value: 'ib_dp_sl', label: 'IB DP Standard Level' },
    { value: 'ib_dp_hl', label: 'IB DP Higher Level' },
  ],
  'AP': [
    { value: 'ap', label: 'AP' },
  ],
};

const STATUSES = ['draft', 'pending', 'published', 'archived'];

interface PaperComponent {
  component_code: string;
  component_name: string;
  component_description?: string;
  duration_minutes?: number;
  total_marks?: number;
  is_practical?: boolean;
  has_source_files?: boolean;
}

interface SubjectResourceType {
  resource_type: string;
  is_available: boolean;
}

export default function NewPastPaperPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [paperComponents, setPaperComponents] = useState<PaperComponent[]>([]);
  const [subjectResourceTypes, setSubjectResourceTypes] = useState<SubjectResourceType[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{
    questionPaper?: number;
    markScheme?: number;
    optionalResource?: number;
    sourceFiles?: number;
  }>({});

  const [formData, setFormData] = useState({
    exam_board: 'CIE',
    subject_id: '',
    year: new Date().getFullYear(),
    session: 'mj', // Default to May/June
    component_code: '',
    paper_number: '',
    variant: '',
    level: 'igcse',
    duration_minutes: 0,
    total_marks: 0,
    status: 'published' // Default to published for convenience
  });

  // Get available levels for selected exam board
  const availableLevels = EXAM_BOARD_LEVELS[formData.exam_board] || EXAM_BOARD_LEVELS['CIE'];

  // Get available series for selected exam board
  const availableSeries = EXAM_BOARD_SERIES[formData.exam_board] || [];

  // Selected optional resource type
  const [optionalResourceType, setOptionalResourceType] = useState<string>('');

  // Filter optional resources based on subject configuration
  const availableOptionalResources = subjectResourceTypes.length > 0
    ? OPTIONAL_RESOURCES.filter(rt => {
        const config = subjectResourceTypes.find(srt => srt.resource_type === rt.code);
        return !config || config.is_available;
      })
    : OPTIONAL_RESOURCES;

  const [files, setFiles] = useState<{
    questionPaper: File | null;
    markScheme: File | null;
    optionalResource: File | null;
    sourceFiles: File[] | null;
  }>({
    questionPaper: null,
    markScheme: null,
    optionalResource: null,
    sourceFiles: null
  });

  const [uploadedUrls, setUploadedUrls] = useState<{
    questionPaper?: string;
    markScheme?: string;
    optionalResource?: string;
    sourceFiles?: string;
  }>({});

  // Fetch subjects when exam board or level changes
  useEffect(() => {
    fetchSubjects();
  }, [formData.exam_board, formData.level]);

  // Fetch subject-specific configuration when subject or exam board changes
  useEffect(() => {
    if (formData.subject_id && formData.exam_board) {
      fetchSubjectConfig(formData.subject_id, formData.exam_board);
    } else {
      setPaperComponents([]);
      setSubjectResourceTypes([]);
    }
  }, [formData.subject_id, formData.exam_board]);

  async function fetchSubjects() {
    // Map form exam board values to database codes
    const examBoardCodeMap: Record<string, string> = {
      'CIE': 'CIE',
      'Edexcel': 'EDEX',
      'AQA': 'AQA',
      'OCR': 'OCR',
      'IB': 'IB',
      'AP': 'AP'
    };
    
    const dbCode = examBoardCodeMap[formData.exam_board] || formData.exam_board;
    
    // First get the exam board ID for the selected exam board
    const { data: examBoardData } = await supabase
      .from('exam_boards')
      .select('id')
      .eq('code', dbCode)
      .single();
    
    // Map form level values to database level values
    // For CIE, AS Level and A2 Level share the same subjects (alevel in DB)
    const levelMappings: Record<string, string[]> = {
      'as': ['as', 'alevel'],      // AS Level can use AS or A Level subjects
      'a2': ['a2', 'alevel'],      // A2 Level can use A2 or A Level subjects
      'alevel': ['alevel', 'as', 'a2'], // A Level can use any A Level variant
    };
    
    const levelsToQuery = levelMappings[formData.level] || [formData.level];
    
    console.log('Fetching subjects for exam board:', formData.exam_board, '-> code:', dbCode, 'id:', examBoardData?.id, 'levels:', levelsToQuery);
    
    let query = supabase
      .from('subjects')
      .select('id, name, code, exam_board_id, level')
      .eq('status', 'published')
      .order('name');
    
    // Filter by exam board if we have the ID
    if (examBoardData?.id) {
      query = query.eq('exam_board_id', examBoardData.id);
    }
    
    // Filter by level(s)
    if (levelsToQuery.length === 1) {
      query = query.eq('level', levelsToQuery[0]);
    } else if (levelsToQuery.length > 1) {
      query = query.in('level', levelsToQuery);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching subjects:', error);
    }
    
    console.log('Fetched subjects:', data?.length || 0, 'subjects');
    
    setSubjects(data || []);
    
    // Reset subject selection if current subject is not in the filtered list
    if (formData.subject_id && data && !data.find(s => s.id === formData.subject_id)) {
      setFormData(prev => ({ ...prev, subject_id: '' }));
    }
  }

  async function fetchSubjectConfig(subjectId: string, examBoard: string) {
    // Fetch paper components for this subject
    const { data: components } = await supabase
      .from('subject_paper_components')
      .select('component_code, component_name, component_description, duration_minutes, total_marks, is_practical, has_source_files')
      .eq('subject_id', subjectId)
      .eq('exam_board', examBoard)
      .order('display_order');
    
    setPaperComponents(components || []);

    // Fetch resource type availability for this subject
    const { data: resourceTypes } = await supabase
      .from('subject_resource_types')
      .select('resource_type, is_available')
      .eq('subject_id', subjectId)
      .eq('exam_board', examBoard);
    
    setSubjectResourceTypes(resourceTypes || []);

    // If we have components and none is selected, select the first one
    if (components && components.length > 0 && !formData.component_code) {
      const firstComponent = components[0];
      setFormData(prev => ({
        ...prev,
        component_code: firstComponent.component_code,
        paper_number: `Paper ${firstComponent.component_code}`,
        duration_minutes: firstComponent.duration_minutes || prev.duration_minutes,
        total_marks: firstComponent.total_marks || prev.total_marks
      }));
    }
  }

  async function uploadFile(file: File, type: 'questionPaper' | 'markScheme' | 'optionalResource' | 'sourceFiles') {
    try {
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(7);
      
      // Create organized file path: year/subject/component/type-timestamp-random.ext
      const year = formData.year || new Date().getFullYear();
      const subjectSlug = formData.subject_id ? 'subject' : 'general';
      const component = formData.component_code || 'p1';
      
      // Type prefix based on file type
      let typePrefix = 'qp';
      if (type === 'markScheme') typePrefix = 'ms';
      else if (type === 'optionalResource') typePrefix = optionalResourceType || 'other';
      else if (type === 'sourceFiles') typePrefix = 'src';
      
      const fileName = `${typePrefix}-${timestamp}-${randomId}.${fileExt}`;
      const filePath = `${year}/${subjectSlug}/${component}/${fileName}`;

      setUploadProgress(prev => ({ ...prev, [type]: 0 }));

      // Determine content type
      const contentType = file.type || 'application/octet-stream';

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('past-papers')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType
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

  async function uploadSourceFilesZip(file: File) {
    try {
      const year = formData.year || new Date().getFullYear();
      const subjectSlug = formData.subject_id ? 'subject' : 'general';
      const component = formData.component_code || 'p1';
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(7);
      const fileName = `source-files-${timestamp}-${randomId}.zip`;
      const filePath = `${year}/${subjectSlug}/${component}/${fileName}`;

      setUploadProgress(prev => ({ ...prev, sourceFiles: 0 }));

      const { error } = await supabase.storage
        .from('past-papers')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'application/zip'
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('past-papers')
        .getPublicUrl(filePath);

      setUploadProgress(prev => ({ ...prev, sourceFiles: 100 }));
      setUploadedUrls(prev => ({ ...prev, sourceFiles: urlData.publicUrl }));
      return urlData.publicUrl;
    } catch (error: any) {
      console.error('Error uploading source files:', error);
      setUploadProgress(prev => ({ ...prev, sourceFiles: 0 }));
      throw error;
    }
  }

  async function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>, 
    type: 'questionPaper' | 'markScheme' | 'optionalResource'
  ) {
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
      const url = await uploadFile(file, type);
      console.log(`Upload successful for ${type}:`, url);
      const typeNames: Record<string, string> = {
        questionPaper: 'Question Paper',
        markScheme: 'Mark Scheme',
        optionalResource: OPTIONAL_RESOURCES.find(r => r.code === optionalResourceType)?.name || 'Resource'
      };
      toast({
        title: 'Success',
        description: `${typeNames[type]} uploaded successfully`
      });
    } catch (error: any) {
      console.error(`Upload failed for ${type}:`, error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error.message || 'Failed to upload file. Please try again.'
      });
    }
  }

  async function handleSourceFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const file = fileList[0];
    
    // Validate ZIP file
    if (!file.name.endsWith('.zip') && file.type !== 'application/zip' && file.type !== 'application/x-zip-compressed') {
      toast({
        variant: 'destructive',
        title: 'Invalid file type',
        description: 'Please upload a ZIP file containing the source files'
      });
      return;
    }

    // Validate file size (max 100MB for ZIP)
    if (file.size > 100 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Please upload a ZIP file smaller than 100MB'
      });
      return;
    }

    setFiles(prev => ({ ...prev, sourceFiles: [file] }));

    // Auto-upload ZIP
    try {
      await uploadSourceFilesZip(file);
      toast({
        title: 'Success',
        description: 'Source files ZIP uploaded successfully'
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: 'Failed to upload source files. Please try again.'
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!uploadedUrls.questionPaper) {
      toast({
        variant: 'destructive',
        title: 'Missing file',
        description: 'Please upload the Question Paper PDF'
      });
      return;
    }

    if (!uploadedUrls.markScheme) {
      toast({
        variant: 'destructive',
        title: 'Missing file',
        description: 'Please upload the Mark Scheme PDF'
      });
      return;
    }

    setLoading(true);

    try {
      // Auto-generate title from form fields
      const subjectName = subjects.find(s => s.id === formData.subject_id)?.name || 'Unknown Subject';
      const seriesName = availableSeries.find(s => s.code === formData.session)?.name || formData.session;
      const paperName = formData.paper_number || `Paper ${formData.component_code}`;
      const variantText = formData.variant ? ` Variant ${formData.variant}` : '';
      const generatedTitle = `${subjectName} ${paperName}${variantText} - ${seriesName} ${formData.year}`;

      const paperData = {
        title: generatedTitle,
        exam_board: formData.exam_board,
        subject_id: formData.subject_id || null,
        year: formData.year,
        session: formData.session || null,
        component_code: formData.component_code || null,
        paper_number: formData.paper_number || null,
        variant: formData.variant || null,
        level: formData.level || null,
        duration_minutes: formData.duration_minutes || null,
        total_marks: formData.total_marks || null,
        paper_url: uploadedUrls.questionPaper,
        question_paper_url: uploadedUrls.questionPaper,
        mark_scheme_url: uploadedUrls.markScheme || null,
        insert_url: optionalResourceType === 'insert' ? uploadedUrls.optionalResource : null,
        examiner_report_url: optionalResourceType === 'examiner_report' ? uploadedUrls.optionalResource : null,
        grade_thresholds_url: optionalResourceType === 'grade_thresholds' ? uploadedUrls.optionalResource : null,
        specimen_url: optionalResourceType === 'specimen' ? uploadedUrls.optionalResource : null,
        source_files_url: uploadedUrls.sourceFiles || null,
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
          generatedTitle,
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
        {/* Paper Details */}
        <Card>
          <CardHeader>
            <CardTitle>Paper Details</CardTitle>
            <CardDescription>Select the exam board, subject, year, series, and paper component</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="exam_board">Exam Board *</Label>
                <Select
                  value={formData.exam_board}
                  onValueChange={(value) => {
                    const newSeries = EXAM_BOARD_SERIES[value]?.[0]?.code || 'mj';
                    const newLevels = EXAM_BOARD_LEVELS[value] || [];
                    const newLevel = newLevels[0]?.value || 'igcse';
                    setFormData({ ...formData, exam_board: value, session: newSeries, level: newLevel, subject_id: '' });
                  }}
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
                <Label htmlFor="level">Level *</Label>
                <Select
                  value={formData.level}
                  onValueChange={(value) => setFormData({ ...formData, level: value, subject_id: '' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLevels.map(level => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
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
                        {subject.name}{subject.code ? ` (${subject.code})` : ''}
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
                <Label htmlFor="session">Series *</Label>
                <Select
                  value={formData.session}
                  onValueChange={(value) => setFormData({ ...formData, session: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select series" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSeries.map(series => (
                      <SelectItem key={series.code} value={series.code}>
                        {series.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="component">Paper Component *</Label>
                {paperComponents.length > 0 ? (
                  <Select
                    value={formData.component_code}
                    onValueChange={(value) => {
                      const component = paperComponents.find(c => c.component_code === value);
                      setFormData({ 
                        ...formData, 
                        component_code: value,
                        paper_number: component?.component_name || `Paper ${value}`,
                        duration_minutes: component?.duration_minutes || formData.duration_minutes,
                        total_marks: component?.total_marks || formData.total_marks
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select paper" />
                    </SelectTrigger>
                    <SelectContent>
                      {paperComponents.map(comp => (
                        <SelectItem key={comp.component_code} value={comp.component_code}>
                          {comp.component_name}
                          {comp.component_description && (
                            <span className="text-muted-foreground ml-1">({comp.component_description})</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="paper_number"
                    value={formData.paper_number}
                    onChange={(e) => setFormData({ ...formData, paper_number: e.target.value, component_code: e.target.value })}
                    placeholder="e.g., Paper 1"
                  />
                )}
                {paperComponents.length === 0 && formData.subject_id && (
                  <p className="text-xs text-muted-foreground">
                    No paper components configured for this subject. Enter manually.
                  </p>
                )}
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
            <CardDescription>Upload PDF files (max 50MB each). Question Paper and Mark Scheme are required.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Question Paper - Required */}
            <div className="space-y-3">
              <Label htmlFor="qp-file" className="flex items-center gap-2">
                Question Paper (PDF) <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-4">
                <Input
                  id="qp-file"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleFileChange(e, 'questionPaper')}
                  className="flex-1"
                />
                {uploadedUrls.questionPaper && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
              </div>
              {uploadProgress.questionPaper !== undefined && uploadProgress.questionPaper < 100 && (
                <Progress value={uploadProgress.questionPaper} className="h-2" />
              )}
              {files.questionPaper && (
                <p className="text-sm text-muted-foreground">
                  {files.questionPaper.name} ({(files.questionPaper.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            {/* Mark Scheme - Required */}
            <div className="space-y-3">
              <Label htmlFor="ms-file" className="flex items-center gap-2">
                Mark Scheme (PDF) <span className="text-destructive">*</span>
              </Label>
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

            {/* Optional Additional Resource */}
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <Label className="text-base font-medium">Additional Resource (Optional)</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Select a resource type and upload the corresponding file.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="optional-type">Resource Type</Label>
                  <Select
                    value={optionalResourceType}
                    onValueChange={setOptionalResourceType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableOptionalResources.map(type => (
                        <SelectItem key={type.code} value={type.code}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="optional-file">File (PDF)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="optional-file"
                      type="file"
                      accept=".pdf"
                      disabled={!optionalResourceType}
                      onChange={(e) => handleFileChange(e, 'optionalResource')}
                      className="flex-1"
                    />
                    {uploadedUrls.optionalResource && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                </div>
              </div>
              {uploadProgress.optionalResource !== undefined && uploadProgress.optionalResource < 100 && (
                <Progress value={uploadProgress.optionalResource} className="h-2" />
              )}
              {files.optionalResource && (
                <p className="text-sm text-muted-foreground">
                  {files.optionalResource.name} ({(files.optionalResource.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            {/* Source Files ZIP - Optional */}
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <Label className="text-base font-medium">Source Files ZIP (Optional)</Label>
              <p className="text-sm text-muted-foreground mb-3">
                For practical exams (e.g., Computer Science, ICT), upload a ZIP file with pre-release materials or data files. Max 100MB.
              </p>
              <div className="flex items-center gap-4">
                <Input
                  id="source-files"
                  type="file"
                  accept=".zip,application/zip,application/x-zip-compressed"
                  onChange={handleSourceFilesChange}
                  className="flex-1"
                />
                {uploadedUrls.sourceFiles && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
              </div>
              {uploadProgress.sourceFiles !== undefined && uploadProgress.sourceFiles < 100 && (
                <Progress value={uploadProgress.sourceFiles} className="h-2" />
              )}
              {files.sourceFiles && files.sourceFiles.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {files.sourceFiles.length} file(s) selected
                </p>
              )}
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> Files are uploaded immediately when selected. 
                Question Paper and Mark Scheme are required before saving.
              </p>
            </div>

            {/* Debug: Upload Status */}
            {process.env.NODE_ENV === 'development' && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">Debug: Upload Status</p>
                <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
                  <li>Question Paper: {uploadedUrls.questionPaper ? '✅ Uploaded' : '❌ Not uploaded'}</li>
                  <li>Mark Scheme: {uploadedUrls.markScheme ? '✅ Uploaded' : '❌ Not uploaded'}</li>
                  <li>Optional Resource: {uploadedUrls.optionalResource ? '✅ Uploaded' : '⚪ Not set'}</li>
                  <li>Source Files: {uploadedUrls.sourceFiles ? '✅ Uploaded' : '⚪ Not set'}</li>
                  <li>Button Enabled: {!loading && uploadedUrls.questionPaper && uploadedUrls.markScheme ? '✅ Yes' : '❌ No'}</li>
                </ul>
              </div>
            )}
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
          <Button type="submit" disabled={loading || !uploadedUrls.questionPaper || !uploadedUrls.markScheme}>
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
