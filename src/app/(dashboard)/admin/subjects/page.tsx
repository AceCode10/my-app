'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  ChevronRight,
  BookOpen,
  FolderOpen,
  FileText,
  Upload,
  Loader2,
  Download,
  GripVertical
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { logCreate, logUpdate, logDelete } from '@/lib/audit';

interface Subject {
  id: string;
  name: string;
  slug: string;
  code: string;
  description: string | null;
  exam_board: string;
  exam_board_id: string | null;
  level: string | null;
  icon_url: string | null;
  color: string | null;
  display_order: number;
  status: 'draft' | 'pending' | 'published' | 'archived';
  created_at: string;
  topics?: Topic[];
}

interface DbExamBoard {
  id: string;
  code: string;
  name: string;
  full_name: string;
  color: string;
  is_active: boolean;
  display_order: number;
}

interface Topic {
  id: string;
  subject_id: string;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
  status: 'draft' | 'pending' | 'published' | 'archived';
  subtopics?: Subtopic[];
}

interface Subtopic {
  id: string;
  topic_id: string;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
  status: 'draft' | 'pending' | 'published' | 'archived';
}

const EXAM_BOARDS_LEGACY = ['IGCSE', 'Edexcel', 'Cambridge', 'IB', 'AQA', 'OCR'];
const LEVELS = [
  { id: 'igcse', name: 'IGCSE' },
  { id: 'gcse', name: 'GCSE' },
  { id: 'as', name: 'AS Level' },
  { id: 'a2', name: 'A2 Level' },
  { id: 'alevel', name: 'A Level' },
  { id: 'ib_myp', name: 'IB MYP' },
  { id: 'ib_dp', name: 'IB DP' },
  { id: 'ap', name: 'AP' },
];
const STATUSES = ['draft', 'pending', 'published', 'archived'] as const;

export default function SubjectsPage() {
  const supabase = createClient();
  const { toast } = useToast();
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [dbExamBoards, setDbExamBoards] = useState<DbExamBoard[]>([]);
  
  // Dialog states
  const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false);
  const [isTopicDialogOpen, setIsTopicDialogOpen] = useState(false);
  const [isSubtopicDialogOpen, setIsSubtopicDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [bulkUploadType, setBulkUploadType] = useState<'subjects' | 'topics' | 'questions'>('subjects');
  const [bulkUploadData, setBulkUploadData] = useState('');
  const [bulkUploading, setBulkUploading] = useState(false);
  
  // Form states
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [editingSubtopic, setEditingSubtopic] = useState<Subtopic | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'subject' | 'topic' | 'subtopic'; id: string; name: string } | null>(null);

  useEffect(() => {
    fetchExamBoards();
    fetchSubjects();
  }, []);

  async function fetchExamBoards() {
    try {
      const { data, error } = await supabase
        .from('exam_boards')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setDbExamBoards(data || []);
    } catch (error: any) {
      console.error('Error fetching exam boards:', error);
    }
  }

  async function fetchSubjects() {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select(`
          *,
          topics:topics(*)
        `)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      setSubjects(data || []);
    } catch (error: any) {
      console.error('Error fetching subjects:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to load subjects'
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSubject(formData: Partial<Subject>) {
    try {
      const level = (formData.level || 'igcse').toLowerCase();
      const baseName = formData.name?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || '';
      // Include level in slug to make it unique across different qualification levels
      const slug = `${baseName}-${level}`;
      
      const code = formData.code || baseName.toUpperCase().substring(0, 10);
      
      // Auto-calculate display_order for new subjects
      let displayOrder = formData.display_order ?? 0;
      if (!editingSubject) {
        const maxOrder = Math.max(0, ...subjects.map(s => s.display_order || 0));
        displayOrder = maxOrder + 1;
      }
      
      if (editingSubject) {
        // For updates, only change slug if name or level changed
        const needsNewSlug = editingSubject.name !== formData.name || editingSubject.level !== level;
        const updateSlug = needsNewSlug ? slug : editingSubject.slug;
        
        const { error } = await supabase
          .from('subjects')
          .update({
            name: formData.name,
            slug: updateSlug,
            code,
            description: formData.description,
            exam_board: formData.exam_board,
            exam_board_id: formData.exam_board_id,
            level,
            status: formData.status,
            display_order: formData.display_order
          })
          .eq('id', editingSubject.id);

        if (error) throw error;

        // Log the update
        await logUpdate(
          'subject',
          editingSubject.id,
          formData.name || editingSubject.name,
          { exam_board: formData.exam_board }
        );
        
        toast({
          title: 'Success',
          description: 'Subject updated successfully'
        });
      } else {
        // Create new
        const { data: newSubject, error } = await supabase
          .from('subjects')
          .insert({
            name: formData.name,
            slug,
            code,
            description: formData.description,
            exam_board: formData.exam_board,
            exam_board_id: formData.exam_board_id,
            level,
            status: formData.status || 'draft',
            display_order: displayOrder
          })
          .select()
          .single();

        if (error) throw error;

        // Log the creation
        if (newSubject) {
          await logCreate(
            'subject',
            newSubject.id,
            formData.name || '',
            { exam_board: formData.exam_board }
          );
        }
        
        toast({
          title: 'Success',
          description: 'Subject created successfully'
        });
      }

      setIsSubjectDialogOpen(false);
      setEditingSubject(null);
      fetchSubjects();
    } catch (error: any) {
      console.error('Error saving subject:', JSON.stringify(error, null, 2));
      console.error('Error details:', error?.message, error?.code, error?.details, error?.hint);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error?.message || error?.code || 'Failed to save subject'
      });
    }
  }

  async function handleSaveTopic(formData: Partial<Topic>) {
    if (!selectedSubject) return;

    try {
      const slug = formData.name?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || '';
      
      // Auto-calculate display_order for new topics
      let displayOrder = formData.display_order ?? 0;
      if (!editingTopic && selectedSubject.topics) {
        const maxOrder = Math.max(0, ...selectedSubject.topics.map(t => t.display_order || 0));
        displayOrder = maxOrder + 1;
      }
      
      if (editingTopic) {
        const { error } = await supabase
          .from('topics')
          .update({
            name: formData.name,
            slug,
            description: formData.description,
            status: formData.status,
            display_order: formData.display_order
          })
          .eq('id', editingTopic.id);

        if (error) throw error;

        // Log the update
        await logUpdate(
          'topic',
          editingTopic.id,
          formData.name || editingTopic.name,
          { subject: selectedSubject.name }
        );
        
        toast({
          title: 'Success',
          description: 'Topic updated successfully'
        });
      } else {
        const { data: newTopic, error } = await supabase
          .from('topics')
          .insert({
            subject_id: selectedSubject.id,
            name: formData.name,
            slug,
            description: formData.description,
            status: formData.status || 'draft',
            display_order: displayOrder
          })
          .select()
          .single();

        if (error) throw error;

        // Log the creation
        if (newTopic) {
          await logCreate(
            'topic',
            newTopic.id,
            formData.name || '',
            { subject: selectedSubject.name }
          );
        }
        
        toast({
          title: 'Success',
          description: 'Topic created successfully'
        });
      }

      setIsTopicDialogOpen(false);
      setEditingTopic(null);
      fetchSubjects();
    } catch (error: any) {
      console.error('Error saving topic:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to save topic'
      });
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    try {
      const { error } = await supabase
        .from(deleteTarget.type === 'subject' ? 'subjects' : deleteTarget.type === 'topic' ? 'topics' : 'subtopics')
        .delete()
        .eq('id', deleteTarget.id);

      if (error) throw error;

      // Log the deletion
      await logDelete(
        deleteTarget.type as 'subject' | 'topic',
        deleteTarget.id,
        deleteTarget.name
      );

      toast({
        title: 'Success',
        description: `${deleteTarget.type.charAt(0).toUpperCase() + deleteTarget.type.slice(1)} deleted successfully`
      });

      setIsDeleteDialogOpen(false);
      setDeleteTarget(null);
      fetchSubjects();
    } catch (error: any) {
      console.error('Error deleting:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete'
      });
    }
  }

  const toggleSubject = (subjectId: string) => {
    const newExpanded = new Set(expandedSubjects);
    if (newExpanded.has(subjectId)) {
      newExpanded.delete(subjectId);
      // Clear selection if collapsing the selected subject
      if (selectedSubject?.id === subjectId) {
        setSelectedSubject(null);
      }
    } else {
      newExpanded.add(subjectId);
      // Auto-select the subject when expanding for bulk upload
      const subject = subjects.find(s => s.id === subjectId);
      if (subject) {
        setSelectedSubject(subject);
      }
    }
    setExpandedSubjects(newExpanded);
  };

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle subject reordering
  const handleSubjectDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const oldIndex = subjects.findIndex(s => s.id === active.id);
    const newIndex = subjects.findIndex(s => s.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) return;

    // Optimistically update UI
    const newSubjects = arrayMove(subjects, oldIndex, newIndex);
    setSubjects(newSubjects);

    // Update display_order in database
    try {
      const updates = newSubjects.map((subject: Subject, index: number) => ({
        id: subject.id,
        display_order: index
      }));

      for (const update of updates) {
        await supabase
          .from('subjects')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
      }

      toast({
        title: 'Reordered',
        description: 'Subject order updated successfully'
      });
    } catch (error: any) {
      console.error('Error reordering subjects:', error);
      fetchSubjects(); // Revert on error
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save new order'
      });
    }
  }, [subjects, supabase, toast]);

  // Handle topic reordering within a subject
  const handleTopicDragEnd = useCallback(async (event: DragEndEvent, subjectId: string) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const subject = subjects.find(s => s.id === subjectId);
    if (!subject?.topics) return;

    const oldIndex = subject.topics.findIndex(t => t.id === active.id);
    const newIndex = subject.topics.findIndex(t => t.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) return;

    // Optimistically update UI
    const newTopics = arrayMove(subject.topics, oldIndex, newIndex);
    setSubjects(prev => prev.map(s => 
      s.id === subjectId ? { ...s, topics: newTopics } : s
    ));

    // Update display_order in database
    try {
      const updates = newTopics.map((topic: Topic, index: number) => ({
        id: topic.id,
        display_order: index
      }));

      for (const update of updates) {
        await supabase
          .from('topics')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
      }

      toast({
        title: 'Reordered',
        description: 'Topic order updated successfully'
      });
    } catch (error: any) {
      console.error('Error reordering topics:', error);
      fetchSubjects(); // Revert on error
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save new order'
      });
    }
  }, [subjects, supabase, toast]);

  async function handleBulkUpload() {
    if (!bulkUploadData.trim()) return;
    setBulkUploading(true);

    try {
      console.log('Starting bulk upload for:', bulkUploadType);
      const items = JSON.parse(bulkUploadData);
      if (!Array.isArray(items)) {
        throw new Error('Input must be a JSON array');
      }
      console.log('Parsed items:', items.length);

      if (bulkUploadType === 'subjects') {
        // Get max display_order for new subjects
        const maxOrder = Math.max(0, ...subjects.map(s => s.display_order || 0));
        
        const subjectsData = items.map((item: any, index: number) => {
          const level = (item.level || 'igcse').toLowerCase();
          const baseName = item.name?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || `subject-${index}`;
          // Include level in slug to make it unique across different qualification levels
          const slug = item.slug || `${baseName}-${level}`;
          
          return {
            name: item.name,
            code: item.code || item.name?.toUpperCase().substring(0, 10) || 'CODE',
            slug,
            description: item.description || null,
            exam_board: item.exam_board || dbExamBoards[0]?.name || 'Cambridge',
            exam_board_id: item.exam_board_id || dbExamBoards[0]?.id || null,
            level,
            status: item.status || 'published',
            display_order: item.display_order ?? (maxOrder + index + 1)
          };
        });

        console.log('Inserting subjects:', subjectsData);
        
        // Insert one at a time to avoid batch issues
        let successCount = 0;
        const errors: string[] = [];
        
        for (const subject of subjectsData) {
          try {
            const { error } = await supabase.from('subjects').insert(subject);
            if (error) {
              console.error('Error inserting subject:', subject.name, error);
              errors.push(`${subject.name}: ${error.message}`);
            } else {
              successCount++;
            }
          } catch (e: any) {
            console.error('Exception inserting subject:', subject.name, e);
            errors.push(`${subject.name}: ${e.message}`);
          }
        }

        if (successCount > 0) {
          toast({
            title: 'Import Complete',
            description: `Imported ${successCount} of ${subjectsData.length} subjects${errors.length > 0 ? `. ${errors.length} failed.` : ''}`
          });
        }
        
        if (errors.length > 0 && successCount === 0) {
          throw new Error(errors.join('; '));
        }
      } else if (bulkUploadType === 'topics') {
        if (!selectedSubject) {
          throw new Error('Please select a subject first');
        }

        // Get subject slug for unique topic slug generation
        const subjectSlug = selectedSubject.slug || selectedSubject.name.toLowerCase().replace(/\s+/g, '-');

        const topicsData = items.map((item: any, index: number) => {
          const baseName = item.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          // Include subject slug in topic slug to ensure uniqueness across subjects
          const slug = item.slug || `${baseName}-${subjectSlug}`;
          
          return {
            subject_id: selectedSubject.id,
            name: item.name,
            slug,
            description: item.description || null,
            status: item.status || 'published',
            display_order: item.display_order ?? index
          };
        });

        // Insert one at a time with timeout to avoid stalling
        let successCount = 0;
        const errors: string[] = [];
        
        for (let i = 0; i < topicsData.length; i++) {
          const topic = topicsData[i];
          try {
            // Wrap in a proper promise that executes immediately
            const insertPromise = new Promise(async (resolve, reject) => {
              try {
                const result = await supabase.from('topics').insert(topic);
                resolve(result);
              } catch (err) {
                reject(err);
              }
            });
            
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Request timeout after 10s')), 10000)
            );
            
            const { error } = await Promise.race([insertPromise, timeoutPromise]) as any;
            
            if (error) {
              console.error('Error inserting topic:', topic.name, error);
              errors.push(`${topic.name}: ${error.message}`);
            } else {
              successCount++;
              console.log(`Inserted topic ${i + 1}/${topicsData.length}: ${topic.name}`);
            }
          } catch (e: any) {
            console.error('Exception inserting topic:', topic.name, e);
            errors.push(`${topic.name}: ${e.message}`);
          }
        }

        if (successCount > 0) {
          toast({
            title: 'Import Complete',
            description: `Imported ${successCount} of ${topicsData.length} topics${errors.length > 0 ? `. ${errors.length} failed.` : ''}`
          });
        }
        
        if (errors.length > 0 && successCount === 0) {
          throw new Error(errors.join('; '));
        }
      } else if (bulkUploadType === 'questions') {
        if (!selectedSubject) {
          throw new Error('Please select a subject and topic first');
        }

        // For questions, we need topic_id from the items
        // Supports model_answer, answer, or correct_answer for the answer field
        const questionsData = items.map((item: any, index: number) => ({
          topic_id: item.topic_id,
          subject_id: selectedSubject.id,
          stem_md: item.question || item.stem_markdown || item.stem_md || item.text,
          question_type: item.question_type || item.type || 'short_answer',
          difficulty: item.difficulty || 'medium',
          marks: item.marks || 2,
          correct_answer: JSON.stringify(item.model_answer || item.correct_answer || item.answer || ''),
          explanation: item.explanation || null,
          examiner_comment: item.examiner_comment || null,
          question_number: item.question_number || `${index + 1}`,
          visibility: 'published'
        }));

        // Insert one at a time to avoid batch issues
        let successCount = 0;
        const errors: string[] = [];
        
        for (const question of questionsData) {
          try {
            const { error } = await supabase.from('questions').insert(question);
            if (error) {
              console.error('Error inserting question:', error);
              errors.push(`Q${question.question_number}: ${error.message}`);
            } else {
              successCount++;
            }
          } catch (e: any) {
            console.error('Exception inserting question:', e);
            errors.push(`Q${question.question_number}: ${e.message}`);
          }
        }

        if (successCount > 0) {
          toast({
            title: 'Import Complete',
            description: `Imported ${successCount} of ${questionsData.length} questions${errors.length > 0 ? `. ${errors.length} failed.` : ''}`
          });
        }
        
        if (errors.length > 0 && successCount === 0) {
          throw new Error(errors.join('; '));
        }
      }

      setIsBulkUploadOpen(false);
      setBulkUploadData('');
      fetchSubjects();
    } catch (error: any) {
      console.error('Bulk upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Import Error',
        description: error.message || 'Failed to import. Check JSON format.'
      });
    } finally {
      setBulkUploading(false);
    }
  }

  function downloadTemplate(type: 'subjects' | 'topics' | 'questions') {
    let template: any[] = [];
    
    if (type === 'subjects') {
      template = [
        { name: "Mathematics", code: "0580", description: "IGCSE Mathematics", exam_board: "Cambridge", level: "igcse" },
        { name: "Physics", code: "0625", description: "IGCSE Physics", exam_board: "Cambridge", level: "igcse" }
      ];
    } else if (type === 'topics') {
      template = [
        { name: "Algebra", description: "Basic algebra concepts", status: "published" },
        { name: "Geometry", description: "Shapes and measurements", status: "published" }
      ];
    } else {
      template = [
        { 
          topic_id: "uuid-here", 
          question: "What is 2+2?", 
          model_answer: "4", 
          explanation: "Basic addition: 2 + 2 = 4",
          examiner_comment: "Award 1 mark for correct answer",
          marks: 2, 
          difficulty: "easy", 
          type: "short_answer" 
        },
        { 
          topic_id: "different-topic-uuid", 
          question: "Solve for x: 2x = 10", 
          model_answer: "x = 5", 
          explanation: "Divide both sides by 2: 2x/2 = 10/2, therefore x = 5",
          examiner_comment: "Award 1 mark for method, 1 mark for correct answer",
          marks: 3, 
          difficulty: "medium", 
          type: "short_answer" 
        }
      ];
    }

    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-template.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filteredSubjects = subjects.filter(subject =>
    subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    subject.exam_board.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-500/10 text-green-500';
      case 'draft': return 'bg-gray-500/10 text-gray-500';
      case 'pending': return 'bg-yellow-500/10 text-yellow-500';
      case 'archived': return 'bg-red-500/10 text-red-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Subjects & Topics</h1>
          <p className="text-muted-foreground mt-1">
            Manage the subject hierarchy for your platform
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsBulkUploadOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Bulk Upload
          </Button>
          <Button onClick={() => {
            setEditingSubject(null);
            setIsSubjectDialogOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Subject
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search subjects or exam boards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Subjects List */}
      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))
        ) : filteredSubjects.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No subjects found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? 'Try a different search term' : 'Get started by creating your first subject'}
                </p>
                {!searchQuery && (
                  <Button onClick={() => {
                    setEditingSubject(null);
                    setIsSubjectDialogOpen(true);
                  }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Subject
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleSubjectDragEnd}
          >
            <SortableContext
              items={filteredSubjects.map(s => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {filteredSubjects.map((subject) => (
                <SortableSubjectCard
                  key={subject.id}
                  subject={subject}
                  dbExamBoards={dbExamBoards}
                  expandedSubjects={expandedSubjects}
                  toggleSubject={toggleSubject}
                  getStatusColor={getStatusColor}
                  onAddTopic={() => {
                    setSelectedSubject(subject);
                    setEditingTopic(null);
                    setIsTopicDialogOpen(true);
                  }}
                  onEditSubject={() => {
                    setEditingSubject(subject);
                    setIsSubjectDialogOpen(true);
                  }}
                  onDeleteSubject={() => {
                    setDeleteTarget({ type: 'subject', id: subject.id, name: subject.name });
                    setIsDeleteDialogOpen(true);
                  }}
                  onEditTopic={(topic: Topic) => {
                    setSelectedSubject(subject);
                    setEditingTopic(topic);
                    setIsTopicDialogOpen(true);
                  }}
                  onDeleteTopic={(topic: Topic) => {
                    setDeleteTarget({ type: 'topic', id: topic.id, name: topic.name });
                    setIsDeleteDialogOpen(true);
                  }}
                  onTopicDragEnd={(event: DragEndEvent) => handleTopicDragEnd(event, subject.id)}
                  sensors={sensors}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Subject Dialog */}
      <SubjectDialog
        open={isSubjectDialogOpen}
        onOpenChange={setIsSubjectDialogOpen}
        subject={editingSubject}
        onSave={handleSaveSubject}
        dbExamBoards={dbExamBoards}
      />

      {/* Topic Dialog */}
      <TopicDialog
        open={isTopicDialogOpen}
        onOpenChange={setIsTopicDialogOpen}
        topic={editingTopic}
        subjectName={selectedSubject?.name || ''}
        onSave={handleSaveTopic}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
              {deleteTarget?.type === 'subject' && ' This will also delete all topics and subtopics under it.'}
              {deleteTarget?.type === 'topic' && ' This will also delete all subtopics under it.'}
              <br /><br />
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Bulk Upload</DialogTitle>
            <DialogDescription>
              Import multiple items at once using JSON format
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Upload Type</Label>
              <Select
                value={bulkUploadType}
                onValueChange={(value: 'subjects' | 'topics' | 'questions') => setBulkUploadType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="subjects">Subjects</SelectItem>
                  <SelectItem value="topics">Topics (requires selected subject)</SelectItem>
                  <SelectItem value="questions">Questions (requires topic_id in data)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {bulkUploadType !== 'subjects' && !selectedSubject && (
              <div className="p-3 bg-yellow-500/10 text-yellow-600 rounded-lg text-sm">
                Please expand a subject first to select it before uploading {bulkUploadType}.
              </div>
            )}

            {bulkUploadType !== 'subjects' && selectedSubject && (
              <div className="p-3 bg-green-500/10 text-green-600 rounded-lg text-sm">
                Uploading to: <strong>{selectedSubject.name}</strong>
                {bulkUploadType === 'questions' && (
                  <span className="block mt-1 text-xs opacity-80">
                    Tip: Each question can have a different topic_id to assign questions to multiple topics in one upload.
                  </span>
                )}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>JSON Data</Label>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => downloadTemplate(bulkUploadType)}
                >
                  <Download className="mr-2 h-3 w-3" />
                  Download Template
                </Button>
              </div>
              <Textarea
                value={bulkUploadData}
                onChange={(e) => setBulkUploadData(e.target.value)}
                placeholder={`Paste JSON array here...\n\nExample for ${bulkUploadType}:\n${
                  bulkUploadType === 'subjects' 
                    ? '[{"name": "Mathematics", "code": "0580", "exam_board": "Cambridge", "level": "igcse"}]'
                    : bulkUploadType === 'topics'
                    ? '[{"name": "Algebra", "description": "Basic algebra"}]'
                    : '[{"topic_id": "uuid", "question": "What is 2+2?", "model_answer": "4", "explanation": "Basic addition", "examiner_comment": "Award 1 mark", "marks": 2, "difficulty": "easy", "type": "short_answer"}]'
                }`}
                rows={12}
                className="font-mono text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkUploadOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkUpload}
              disabled={bulkUploading || !bulkUploadData.trim() || (bulkUploadType !== 'subjects' && !selectedSubject)}
            >
              {bulkUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import {bulkUploadType}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Subject Dialog Component
function SubjectDialog({
  open,
  onOpenChange,
  subject,
  onSave,
  dbExamBoards
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: Subject | null;
  onSave: (data: Partial<Subject>) => void;
  dbExamBoards: DbExamBoard[];
}) {
  const [formData, setFormData] = useState<Partial<Subject>>({
    name: '',
    code: '',
    description: '',
    exam_board: '',
    exam_board_id: null,
    level: null,
    status: 'draft',
    display_order: 0
  });

  useEffect(() => {
    console.log('SubjectDialog open state changed:', open);
    if (subject) {
      setFormData(subject);
    } else {
      // Set default exam board to first available
      const defaultBoard = dbExamBoards[0];
      setFormData({
        name: '',
        code: '',
        description: '',
        exam_board: defaultBoard?.name || '',
        exam_board_id: defaultBoard?.id || null,
        level: 'igcse',
        status: 'draft',
        display_order: 0
      });
    }
  }, [subject, open, dbExamBoards]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{subject ? 'Edit Subject' : 'Create Subject'}</DialogTitle>
          <DialogDescription>
            {subject ? 'Update the subject details below' : 'Add a new subject to your platform'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Subject Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Mathematics"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Subject Code *</Label>
              <Input
                id="code"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g., 0580"
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground">Exam board subject code</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the subject"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="exam_board">Exam Board *</Label>
              <Select
                value={formData.exam_board_id || ''}
                onValueChange={(value) => {
                  const board = dbExamBoards.find(b => b.id === value);
                  setFormData({ 
                    ...formData, 
                    exam_board_id: value,
                    exam_board: board?.name || ''
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select exam board" />
                </SelectTrigger>
                <SelectContent>
                  {dbExamBoards.map((board) => (
                    <SelectItem key={board.id} value={board.id}>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: board.color }} />
                        {board.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="level">Level *</Label>
              <Select
                value={formData.level || ''}
                onValueChange={(value) => setFormData({ ...formData, level: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((level) => (
                    <SelectItem key={level.id} value={level.id}>
                      {level.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => onSave(formData)}
            disabled={!formData.name || !formData.code || !formData.exam_board_id}
          >
            {subject ? 'Update' : 'Create'} Subject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Topic Dialog Component
function TopicDialog({
  open,
  onOpenChange,
  topic,
  subjectName,
  onSave
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topic: Topic | null;
  subjectName: string;
  onSave: (data: Partial<Topic>) => void;
}) {
  const [formData, setFormData] = useState<Partial<Topic>>({
    name: '',
    description: '',
    status: 'draft',
    display_order: 0
  });

  useEffect(() => {
    if (topic) {
      setFormData(topic);
    } else {
      setFormData({
        name: '',
        description: '',
        status: 'draft',
        display_order: 0
      });
    }
  }, [topic, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{topic ? 'Edit Topic' : 'Create Topic'}</DialogTitle>
          <DialogDescription>
            {topic ? 'Update the topic details below' : `Add a new topic to ${subjectName}`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="topic-name">Topic Name *</Label>
            <Input
              id="topic-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Algebra"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="topic-description">Description</Label>
            <Textarea
              id="topic-description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the topic"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="topic-status">Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(value: any) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => onSave(formData)}
            disabled={!formData.name}
          >
            {topic ? 'Update' : 'Create'} Topic
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Sortable Subject Card Component
function SortableSubjectCard({
  subject,
  dbExamBoards,
  expandedSubjects,
  toggleSubject,
  getStatusColor,
  onAddTopic,
  onEditSubject,
  onDeleteSubject,
  onEditTopic,
  onDeleteTopic,
  onTopicDragEnd,
  sensors
}: {
  subject: Subject;
  dbExamBoards: DbExamBoard[];
  expandedSubjects: Set<string>;
  toggleSubject: (id: string) => void;
  getStatusColor: (status: string) => string;
  onAddTopic: () => void;
  onEditSubject: () => void;
  onDeleteSubject: () => void;
  onEditTopic: (topic: Topic) => void;
  onDeleteTopic: (topic: Topic) => void;
  onTopicDragEnd: (event: DragEndEvent) => void;
  sensors: ReturnType<typeof useSensors>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subject.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style} className={cn(isDragging && 'shadow-lg', 'mb-4')}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-4 flex-1">
            <div
              {...attributes}
              {...listeners}
              className="mt-1 p-1 cursor-grab hover:bg-muted rounded active:cursor-grabbing"
            >
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>
            <button
              onClick={() => toggleSubject(subject.id)}
              className="mt-1 p-1 hover:bg-muted rounded"
            >
              <ChevronRight
                className={cn(
                  'h-5 w-5 transition-transform',
                  expandedSubjects.has(subject.id) && 'rotate-90'
                )}
              />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold">{subject.name}</h3>
                {subject.exam_board_id ? (
                  <Badge variant="outline" style={{ 
                    borderColor: dbExamBoards.find(b => b.id === subject.exam_board_id)?.color 
                  }}>
                    {dbExamBoards.find(b => b.id === subject.exam_board_id)?.name || subject.exam_board}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    {subject.exam_board || 'No board'}
                  </Badge>
                )}
                {subject.level && (
                  <Badge variant="secondary">
                    {LEVELS.find(l => l.id === subject.level)?.name || subject.level}
                  </Badge>
                )}
                <Badge className={getStatusColor(subject.status)}>
                  {subject.status}
                </Badge>
              </div>
              {subject.description && (
                <p className="text-sm text-muted-foreground">{subject.description}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span>{subject.topics?.length || 0} topics</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onAddTopic}>
              <Plus className="h-4 w-4 mr-1" />
              Add Topic
            </Button>
            <Button variant="ghost" size="sm" onClick={onEditSubject}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDeleteSubject}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {expandedSubjects.has(subject.id) && subject.topics && subject.topics.length > 0 && (
          <div className="ml-14 space-y-3 mt-4 border-l-2 pl-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onTopicDragEnd}
            >
              <SortableContext
                items={subject.topics.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                {subject.topics.map((topic) => (
                  <SortableTopicCard
                    key={topic.id}
                    topic={topic}
                    getStatusColor={getStatusColor}
                    onEdit={() => onEditTopic(topic)}
                    onDelete={() => onDeleteTopic(topic)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Sortable Topic Card Component
function SortableTopicCard({
  topic,
  getStatusColor,
  onEdit,
  onDelete
}: {
  topic: Topic;
  getStatusColor: (status: string) => string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: topic.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-start justify-between p-3 bg-muted/50 rounded-lg",
        isDragging && "shadow-md"
      )}
    >
      <div className="flex items-start gap-2 flex-1">
        <div
          {...attributes}
          {...listeners}
          className="p-1 cursor-grab hover:bg-muted rounded active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{topic.name}</span>
            <Badge className={getStatusColor(topic.status)} variant="outline">
              {topic.status}
            </Badge>
          </div>
          {topic.description && (
            <p className="text-sm text-muted-foreground ml-6">{topic.description}</p>
          )}
          <div className="flex items-center gap-4 mt-1 ml-6 text-xs text-muted-foreground">
            <span>{topic.subtopics?.length || 0} subtopics</span>
            <span className="font-mono text-[10px] opacity-60" title="Topic UUID for bulk uploads">
              ID: {topic.id}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Edit className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
