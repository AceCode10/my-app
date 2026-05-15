'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  ArrowLeft,
  Save,
  Eye,
  Globe,
  Lock,
  Loader2,
  BookOpen,
  Tag,
  Clock,
  FileText,
  X,
  Plus,
  Upload,
  Presentation,
  Trash2
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { MarkdownEditor } from '@/components/notes/markdown-editor';
import Link from 'next/link';
import type { Note } from '@/types/notes';

interface Subject {
  id: string;
  name: string;
  slug: string;
}

interface Topic {
  id: string;
  name: string;
  slug: string;
  subject_id: string;
}

interface ExamBoard {
  id: string;
  name: string;
  code: string;
}

interface NoteEditorProps {
  noteId?: string;
}

export function NoteEditor({ noteId }: NoteEditorProps) {
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  const [loading, setLoading] = useState(!!noteId);
  const [saving, setSaving] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [examBoards, setExamBoards] = useState<ExamBoard[]>([]);

  // Form state
  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    slug: '',
    content_md: '',
    pdf_url: '' as string,
    presentation_url: '' as string,
    subject_id: '',
    topic_id: '',
    exam_board_id: '',
    visibility: 'draft' as 'draft' | 'public' | 'registered' | 'premium',
    tags: [] as string[],
    is_downloadable: true,
    estimated_read_time: 5,
    has_latex: false
  });

  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadingHtml, setUploadingHtml] = useState(false);

  const [tagInput, setTagInput] = useState('');

  const isEditing = !!noteId;

  useEffect(() => {
    fetchInitialData();
    if (noteId) {
      fetchNote(noteId);
    }
  }, [noteId]);

  useEffect(() => {
    if (form.subject_id) {
      fetchTopics(form.subject_id);
    } else {
      setTopics([]);
    }
  }, [form.subject_id]);

  async function fetchInitialData() {
    try {
      const [subjectsRes, examBoardsRes] = await Promise.all([
        supabase.from('subjects').select('id, name, slug').order('name'),
        supabase.from('exam_boards').select('id, name, code').eq('is_active', true).order('display_order')
      ]);

      if (subjectsRes.data) setSubjects(subjectsRes.data);
      if (examBoardsRes.data) setExamBoards(examBoardsRes.data);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  }

  async function fetchTopics(subjectId: string) {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('id, name, slug, subject_id')
        .eq('subject_id', subjectId)
        .order('display_order');

      if (error) throw error;
      setTopics(data || []);
    } catch (error) {
      console.error('Error fetching topics:', error);
    }
  }

  async function fetchNote(id: string) {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setForm({
          title: data.title || '',
          subtitle: data.subtitle || '',
          slug: data.slug || '',
          content_md: data.content_md || '',
          pdf_url: data.pdf_url || '',
          presentation_url: data.presentation_url || '',
          subject_id: data.subject_id || '',
          topic_id: data.topic_id || '',
          exam_board_id: data.exam_board_id || '',
          visibility: data.visibility || 'draft',
          tags: data.tags || [],
          is_downloadable: data.is_downloadable ?? true,
          estimated_read_time: data.estimated_read_time || 5,
          has_latex: data.has_latex || false
        });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load note'
      });
      router.push('/admin/notes');
    } finally {
      setLoading(false);
    }
  }

  const generateSlug = useCallback((title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }, []);

  const handleTitleChange = (title: string) => {
    setForm(prev => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title)
    }));
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !form.tags.includes(tag)) {
      setForm(prev => ({ ...prev, tags: [...prev.tags, tag] }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tagToRemove)
    }));
  };

  const calculateReadTime = (content: string) => {
    const wordsPerMinute = 200;
    const words = content.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(words / wordsPerMinute));
  };

  const handleContentChange = (content: string) => {
    setForm(prev => ({
      ...prev,
      content_md: content,
      estimated_read_time: calculateReadTime(content),
      has_latex: content.includes('$') || content.includes('\\(') || content.includes('\\[')
    }));
  };

  async function handleSave(publish = false) {
    if (!form.title.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Title is required'
      });
      return;
    }

    setSaving(true);

    try {
      const noteData = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        slug: form.slug || generateSlug(form.title),
        content_md: form.content_md,
        pdf_url: form.pdf_url || null,
        presentation_url: form.presentation_url || null,
        subject_id: form.subject_id || null,
        topic_id: form.topic_id || null,
        exam_board_id: form.exam_board_id || null,
        visibility: publish ? 'public' : form.visibility,
        tags: form.tags,
        is_downloadable: form.is_downloadable,
        estimated_read_time: form.estimated_read_time,
        has_latex: form.has_latex,
        published_at: publish ? new Date().toISOString() : (form.visibility === 'public' ? new Date().toISOString() : null)
      };

      if (isEditing) {
        const { error } = await supabase
          .from('notes')
          .update(noteData)
          .eq('id', noteId);

        if (error) throw error;
        toast({ title: 'Success', description: 'Note updated successfully' });
      } else {
        const { data, error } = await supabase
          .from('notes')
          .insert(noteData)
          .select()
          .single();

        if (error) throw error;
        toast({ title: 'Success', description: 'Note created successfully' });
        
        // Redirect to edit page for the new note
        router.push(`/admin/notes/${data.id}`);
      }
    } catch (error: any) {
      console.error('Error saving note:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to save note'
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/notes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {isEditing ? 'Edit Note' : 'Create Note'}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? 'Update note content and settings' : 'Create a new revision note'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Draft
          </Button>
          <Button onClick={() => handleSave(true)} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Globe className="h-4 w-4 mr-2" />}
            Publish
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title & Subtitle */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter note title..."
                  value={form.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subtitle">Subtitle</Label>
                <Input
                  id="subtitle"
                  placeholder="Brief description..."
                  value={form.subtitle}
                  onChange={(e) => setForm(prev => ({ ...prev, subtitle: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug</Label>
                <Input
                  id="slug"
                  placeholder="url-friendly-slug"
                  value={form.slug}
                  onChange={(e) => setForm(prev => ({ ...prev, slug: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Content Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Content
              </CardTitle>
              <CardDescription>
                Write your note content using Markdown. Supports images, tables, LaTeX ($), and callout boxes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MarkdownEditor
                value={form.content_md}
                onChange={handleContentChange}
                hasLatex={form.has_latex}
                imageFolder={form.slug || 'draft'}
                minHeight="500px"
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Subject & Topic */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Organization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Exam Board</Label>
                <Select
                  value={form.exam_board_id}
                  onValueChange={(value) => setForm(prev => ({ ...prev, exam_board_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select exam board" />
                  </SelectTrigger>
                  <SelectContent>
                    {examBoards.map(board => (
                      <SelectItem key={board.id} value={board.id}>
                        {board.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Subject</Label>
                <Select
                  value={form.subject_id}
                  onValueChange={(value) => setForm(prev => ({ ...prev, subject_id: value, topic_id: '' }))}
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

              <div className="space-y-2">
                <Label>Topic</Label>
                <Select
                  value={form.topic_id}
                  onValueChange={(value) => setForm(prev => ({ ...prev, topic_id: value }))}
                  disabled={!form.subject_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={form.subject_id ? "Select topic" : "Select subject first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {topics.map(topic => (
                      <SelectItem key={topic.id} value={topic.id}>
                        {topic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Visibility */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Visibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={form.visibility}
                onValueChange={(value: any) => setForm(prev => ({ ...prev, visibility: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Draft
                    </div>
                  </SelectItem>
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Public
                    </div>
                  </SelectItem>
                  <SelectItem value="registered">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Registered Users
                    </div>
                  </SelectItem>
                  <SelectItem value="premium">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Premium Only
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center justify-between">
                <Label htmlFor="downloadable" className="cursor-pointer">
                  Allow PDF Download
                </Label>
                <Switch
                  id="downloadable"
                  checked={form.is_downloadable}
                  onCheckedChange={(checked) => setForm(prev => ({ ...prev, is_downloadable: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="latex" className="cursor-pointer">
                  Contains LaTeX
                </Label>
                <Switch
                  id="latex"
                  checked={form.has_latex}
                  onCheckedChange={(checked) => setForm(prev => ({ ...prev, has_latex: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* PDF Upload for Presenter Mode */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Presentation className="h-4 w-4" />
                Presenter PDF
              </CardTitle>
              <CardDescription>
                Upload a PDF for fullscreen presenter mode
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.pdf_url ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <FileText className="h-5 w-5 text-red-500" />
                    <span className="text-sm flex-1 truncate">PDF uploaded</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setForm(prev => ({ ...prev, pdf_url: '' }))}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <a
                    href={form.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    View PDF
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  <Label
                    htmlFor="pdf-upload"
                    className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    {uploadingPdf ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                        <span className="text-xs text-muted-foreground">Click to upload PDF</span>
                      </>
                    )}
                  </Label>
                  <input
                    id="pdf-upload"
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      setUploadingPdf(true);
                      try {
                        const fileName = `notes/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                        const { data, error } = await supabase.storage
                          .from('documents')
                          .upload(fileName, file, { cacheControl: '3600', upsert: false });
                        
                        if (error) throw error;
                        
                        const { data: urlData } = supabase.storage
                          .from('documents')
                          .getPublicUrl(data.path);
                        
                        setForm(prev => ({ ...prev, pdf_url: urlData.publicUrl }));
                        toast({ title: 'Success', description: 'PDF uploaded successfully' });
                      } catch (error: any) {
                        console.error('Error uploading PDF:', error);
                        toast({
                          variant: 'destructive',
                          title: 'Upload Failed',
                          description: error.message || 'Failed to upload PDF'
                        });
                      } finally {
                        setUploadingPdf(false);
                        e.target.value = '';
                      }
                    }}
                    disabled={uploadingPdf}
                  />
                  <p className="text-xs text-muted-foreground">
                    Max 50MB. Users can view in presenter mode.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Presentation HTML Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Presentation className="h-4 w-4" />
                Presentation HTML
              </CardTitle>
              <CardDescription>
                Upload an HTML slide deck for fullscreen presenter mode
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.presentation_url ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <FileText className="h-5 w-5 text-green-600" />
                    <span className="text-sm flex-1 truncate">HTML deck uploaded</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setForm(prev => ({ ...prev, presentation_url: '' }))}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <a
                    href={form.presentation_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    View raw HTML
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  <Label
                    htmlFor="html-upload"
                    className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    {uploadingHtml ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                        <span className="text-xs text-muted-foreground">Click to upload HTML deck</span>
                      </>
                    )}
                  </Label>
                  <input
                    id="html-upload"
                    type="file"
                    accept=".html,text/html"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      setUploadingHtml(true);
                      try {
                        const fileName = `presentations/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                        const { data, error } = await supabase.storage
                          .from('documents')
                          .upload(fileName, file, { contentType: 'text/html', cacheControl: '3600', upsert: false });

                        if (error) throw error;

                        const { data: urlData } = supabase.storage
                          .from('documents')
                          .getPublicUrl(data.path);

                        setForm(prev => ({ ...prev, presentation_url: urlData.publicUrl }));
                        toast({ title: 'Success', description: 'HTML deck uploaded successfully' });
                      } catch (error: any) {
                        console.error('Error uploading HTML:', error);
                        toast({
                          variant: 'destructive',
                          title: 'Upload Failed',
                          description: error.message || 'Failed to upload HTML deck'
                        });
                      } finally {
                        setUploadingHtml(false);
                        e.target.value = '';
                      }
                    }}
                    disabled={uploadingHtml}
                  />
                  <p className="text-xs text-muted-foreground">
                    Max 5MB. Self-contained HTML deck (no external dependencies).
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <Button variant="outline" size="icon" onClick={addTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Meta Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Reading Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={form.estimated_read_time}
                  onChange={(e) => setForm(prev => ({ ...prev, estimated_read_time: parseInt(e.target.value) || 1 }))}
                  className="w-20"
                />
                <span className="text-muted-foreground">minutes</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Auto-calculated based on content length
              </p>
            </CardContent>
          </Card>

          {/* Actions for existing note */}
          {isEditing && (
            <Card>
              <CardContent className="pt-6 space-y-2">
                <Link href={`/admin/notes/${noteId}/sections`} className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Manage Sections
                  </Button>
                </Link>
                <Link href={`/notes/${form.slug}`} target="_blank" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Eye className="h-4 w-4 mr-2" />
                    Preview Note
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default NoteEditor;
