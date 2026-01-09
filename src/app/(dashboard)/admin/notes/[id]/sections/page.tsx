'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  GripVertical,
  ChevronRight,
  ChevronDown,
  Eye,
  Loader2,
  FileText,
  Clock,
  MoreHorizontal,
  Edit,
  Copy
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from '@/components/notes/markdown-renderer';
import Link from 'next/link';
import type { Note, NoteSection } from '@/types/notes';

export default function NoteSectionsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();
  const resolvedParams = use(params);
  const noteId = resolvedParams.id;

  const [note, setNote] = useState<Note | null>(null);
  const [sections, setSections] = useState<NoteSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<NoteSection | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<NoteSection | null>(null);

  // Form state
  const [form, setForm] = useState({
    title: '',
    slug: '',
    content_md: '',
    parent_section_id: '',
    display_order: 0,
    has_latex: false,
    estimated_read_time: 2
  });

  const [activeTab, setActiveTab] = useState('edit');

  useEffect(() => {
    fetchData();
  }, [noteId]);

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch note
      const { data: noteData, error: noteError } = await supabase
        .from('notes')
        .select('*')
        .eq('id', noteId)
        .single();

      if (noteError) throw noteError;
      setNote(noteData);

      // Fetch sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('note_sections')
        .select('*')
        .eq('note_id', noteId)
        .order('display_order');

      if (sectionsError) throw sectionsError;
      setSections(sectionsData || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load note sections'
      });
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

  const calculateReadTime = (content: string) => {
    const wordsPerMinute = 200;
    const words = content.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(words / wordsPerMinute));
  };

  const handleTitleChange = (title: string) => {
    setForm(prev => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title)
    }));
  };

  const handleContentChange = (content: string) => {
    setForm(prev => ({
      ...prev,
      content_md: content,
      estimated_read_time: calculateReadTime(content),
      has_latex: content.includes('$') || content.includes('\\(') || content.includes('\\[')
    }));
  };

  const openNewSection = (parentId?: string) => {
    setEditingSection(null);
    setForm({
      title: '',
      slug: '',
      content_md: '',
      parent_section_id: parentId || '',
      display_order: sections.filter(s => s.parent_section_id === (parentId || null)).length,
      has_latex: false,
      estimated_read_time: 2
    });
    setActiveTab('edit');
    setIsDialogOpen(true);
  };

  const openEditSection = (section: NoteSection) => {
    setEditingSection(section);
    setForm({
      title: section.title,
      slug: section.slug,
      content_md: section.content_md,
      parent_section_id: section.parent_section_id || '',
      display_order: section.display_order,
      has_latex: section.has_latex,
      estimated_read_time: section.estimated_read_time
    });
    setActiveTab('edit');
    setIsDialogOpen(true);
  };

  async function handleSaveSection() {
    if (!form.title.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Section title is required'
      });
      return;
    }

    setSaving(true);

    try {
      const sectionData = {
        note_id: noteId,
        title: form.title.trim(),
        slug: form.slug || generateSlug(form.title),
        content_md: form.content_md,
        parent_section_id: form.parent_section_id || null,
        display_order: form.display_order,
        has_latex: form.has_latex,
        estimated_read_time: form.estimated_read_time
      };

      if (editingSection) {
        const { error } = await supabase
          .from('note_sections')
          .update(sectionData)
          .eq('id', editingSection.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Section updated successfully' });
      } else {
        const { error } = await supabase
          .from('note_sections')
          .insert(sectionData);

        if (error) throw error;
        toast({ title: 'Success', description: 'Section created successfully' });
      }

      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving section:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to save section'
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSection() {
    if (!sectionToDelete) return;
    setSaving(true);

    try {
      // Delete child sections first
      await supabase
        .from('note_sections')
        .delete()
        .eq('parent_section_id', sectionToDelete.id);

      // Delete the section
      const { error } = await supabase
        .from('note_sections')
        .delete()
        .eq('id', sectionToDelete.id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Section deleted successfully' });
      setDeleteDialogOpen(false);
      setSectionToDelete(null);
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete section'
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDuplicateSection(section: NoteSection) {
    try {
      const { error } = await supabase
        .from('note_sections')
        .insert({
          note_id: noteId,
          title: `${section.title} (Copy)`,
          slug: `${section.slug}-copy-${Date.now()}`,
          content_md: section.content_md,
          parent_section_id: section.parent_section_id,
          display_order: section.display_order + 1,
          has_latex: section.has_latex,
          estimated_read_time: section.estimated_read_time
        });

      if (error) throw error;

      toast({ title: 'Success', description: 'Section duplicated' });
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to duplicate section'
      });
    }
  }

  async function handleMoveSection(sectionId: string, direction: 'up' | 'down') {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    const siblings = sections
      .filter(s => s.parent_section_id === section.parent_section_id)
      .sort((a, b) => a.display_order - b.display_order);

    const currentIndex = siblings.findIndex(s => s.id === sectionId);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= siblings.length) return;

    const otherSection = siblings[newIndex];

    try {
      await Promise.all([
        supabase
          .from('note_sections')
          .update({ display_order: newIndex })
          .eq('id', sectionId),
        supabase
          .from('note_sections')
          .update({ display_order: currentIndex })
          .eq('id', otherSection.id)
      ]);

      fetchData();
    } catch (error) {
      console.error('Error moving section:', error);
    }
  }

  // Build hierarchy for display
  const rootSections = sections.filter(s => !s.parent_section_id).sort((a, b) => a.display_order - b.display_order);
  const getChildSections = (parentId: string) => 
    sections.filter(s => s.parent_section_id === parentId).sort((a, b) => a.display_order - b.display_order);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!note) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Note not found</p>
        <Link href="/admin/notes">
          <Button className="mt-4">Back to Notes</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/admin/notes/${noteId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Manage Sections</h1>
            <p className="text-muted-foreground">{note.title}</p>
          </div>
        </div>
        <Button onClick={() => openNewSection()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Section
        </Button>
      </div>

      {/* Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">{sections.length} sections</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span className="text-muted-foreground">
                  ~{sections.reduce((acc, s) => acc + s.estimated_read_time, 0)} min total read time
                </span>
              </div>
            </div>
            <Link href={`/notes/${note.slug}`} target="_blank">
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Sections List */}
      <Card>
        <CardHeader>
          <CardTitle>Sections</CardTitle>
          <CardDescription>
            Organize your note into sections. Drag to reorder or nest sections.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sections.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No sections yet</h3>
              <p className="text-muted-foreground mt-1 mb-4">
                Break your note into sections for better organization
              </p>
              <Button onClick={() => openNewSection()}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Section
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {rootSections.map((section, index) => (
                <SectionItem
                  key={section.id}
                  section={section}
                  childSections={getChildSections(section.id)}
                  getChildSections={getChildSections}
                  onEdit={openEditSection}
                  onDelete={(s) => {
                    setSectionToDelete(s);
                    setDeleteDialogOpen(true);
                  }}
                  onDuplicate={handleDuplicateSection}
                  onAddChild={(parentId) => openNewSection(parentId)}
                  onMoveUp={() => handleMoveSection(section.id, 'up')}
                  onMoveDown={() => handleMoveSection(section.id, 'down')}
                  isFirst={index === 0}
                  isLast={index === rootSections.length - 1}
                  depth={0}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section Editor Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSection ? 'Edit Section' : 'Add Section'}
            </DialogTitle>
            <DialogDescription>
              Create or edit a section of your note
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Title & Slug */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="section-title">Title *</Label>
                <Input
                  id="section-title"
                  placeholder="Section title..."
                  value={form.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="section-slug">Slug</Label>
                <Input
                  id="section-slug"
                  placeholder="section-slug"
                  value={form.slug}
                  onChange={(e) => setForm(prev => ({ ...prev, slug: e.target.value }))}
                />
              </div>
            </div>

            {/* Parent Section */}
            <div className="space-y-2">
              <Label>Parent Section (optional)</Label>
              <Select
                value={form.parent_section_id || 'none'}
                onValueChange={(value) => setForm(prev => ({ ...prev, parent_section_id: value === 'none' ? '' : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No parent (root section)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No parent (root section)</SelectItem>
                  {sections
                    .filter(s => s.id !== editingSection?.id && !s.parent_section_id)
                    .map(section => (
                      <SelectItem key={section.id} value={section.id}>
                        {section.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Content</Label>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="h-8">
                    <TabsTrigger value="edit" className="text-xs">Edit</TabsTrigger>
                    <TabsTrigger value="preview" className="text-xs">Preview</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              {activeTab === 'edit' ? (
                <Textarea
                  placeholder="Write section content in Markdown..."
                  value={form.content_md}
                  onChange={(e) => handleContentChange(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                />
              ) : (
                <div className="min-h-[300px] border rounded-lg p-4 bg-background overflow-auto">
                  {form.content_md ? (
                    <MarkdownRenderer 
                      content={form.content_md} 
                      hasLatex={form.has_latex}
                    />
                  ) : (
                    <p className="text-muted-foreground text-center py-12">
                      No content to preview
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Options */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="section-latex"
                  checked={form.has_latex}
                  onCheckedChange={(checked) => setForm(prev => ({ ...prev, has_latex: checked }))}
                />
                <Label htmlFor="section-latex" className="cursor-pointer">Contains LaTeX</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label>Read time:</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.estimated_read_time}
                  onChange={(e) => setForm(prev => ({ ...prev, estimated_read_time: parseInt(e.target.value) || 1 }))}
                  className="w-16"
                />
                <span className="text-muted-foreground text-sm">min</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSection} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Section
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Section</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{sectionToDelete?.title}"? 
              {getChildSections(sectionToDelete?.id || '').length > 0 && 
                ' This will also delete all child sections.'}
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSection} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Section Item Component
interface SectionItemProps {
  section: NoteSection;
  childSections: NoteSection[];
  getChildSections: (parentId: string) => NoteSection[];
  onEdit: (section: NoteSection) => void;
  onDelete: (section: NoteSection) => void;
  onDuplicate: (section: NoteSection) => void;
  onAddChild: (parentId: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  depth: number;
}

function SectionItem({
  section,
  childSections,
  getChildSections,
  onEdit,
  onDelete,
  onDuplicate,
  onAddChild,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  depth
}: SectionItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = childSections.length > 0;

  return (
    <div className={cn('rounded-lg border', depth > 0 && 'ml-6')}>
      <div className="flex items-center gap-2 p-3 bg-muted/30">
        {/* Expand/Collapse */}
        {hasChildren ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-muted rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <span className="w-6" />
        )}

        {/* Drag Handle */}
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />

        {/* Title */}
        <div className="flex-1">
          <span className="font-medium">{section.title}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {section.estimated_read_time}m
            </Badge>
            {section.has_latex && (
              <Badge variant="secondary" className="text-xs">LaTeX</Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onMoveUp}
            disabled={isFirst}
          >
            <ChevronRight className="h-4 w-4 -rotate-90" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onMoveDown}
            disabled={isLast}
          >
            <ChevronRight className="h-4 w-4 rotate-90" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(section)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              {depth === 0 && (
                <DropdownMenuItem onClick={() => onAddChild(section.id)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Sub-section
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onDuplicate(section)}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(section)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Child Sections */}
      {hasChildren && isExpanded && (
        <div className="p-2 space-y-2">
          {childSections.map((child, index) => (
            <SectionItem
              key={child.id}
              section={child}
              childSections={getChildSections(child.id)}
              getChildSections={getChildSections}
              onEdit={onEdit}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onAddChild={onAddChild}
              onMoveUp={() => {}}
              onMoveDown={() => {}}
              isFirst={index === 0}
              isLast={index === childSections.length - 1}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
