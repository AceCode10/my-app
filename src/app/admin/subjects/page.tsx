'use client';

import { useEffect, useState } from 'react';
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
  FileText
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Subject {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  exam_board: string;
  icon_url: string | null;
  color: string | null;
  display_order: number;
  status: 'draft' | 'pending' | 'published' | 'archived';
  created_at: string;
  topics?: Topic[];
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

const EXAM_BOARDS = ['IGCSE', 'Edexcel', 'Cambridge', 'IB', 'AQA', 'OCR'];
const STATUSES = ['draft', 'pending', 'published', 'archived'] as const;

export default function SubjectsPage() {
  const supabase = createClient();
  const { toast } = useToast();
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  
  // Dialog states
  const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false);
  const [isTopicDialogOpen, setIsTopicDialogOpen] = useState(false);
  const [isSubtopicDialogOpen, setIsSubtopicDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Form states
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [editingSubtopic, setEditingSubtopic] = useState<Subtopic | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'subject' | 'topic' | 'subtopic'; id: string; name: string } | null>(null);

  useEffect(() => {
    fetchSubjects();
  }, []);

  async function fetchSubjects() {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select(`
          *,
          topics:topics(
            *,
            subtopics:subtopics(*)
          )
        `)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load subjects'
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSubject(formData: Partial<Subject>) {
    try {
      const slug = formData.name?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || '';
      
      if (editingSubject) {
        // Update existing
        const { error } = await supabase
          .from('subjects')
          .update({
            name: formData.name,
            slug,
            description: formData.description,
            exam_board: formData.exam_board,
            status: formData.status,
            display_order: formData.display_order
          })
          .eq('id', editingSubject.id);

        if (error) throw error;
        
        toast({
          title: 'Success',
          description: 'Subject updated successfully'
        });
      } else {
        // Create new
        const { error } = await supabase
          .from('subjects')
          .insert({
            name: formData.name,
            slug,
            description: formData.description,
            exam_board: formData.exam_board,
            status: formData.status || 'draft',
            display_order: formData.display_order || 0
          });

        if (error) throw error;
        
        toast({
          title: 'Success',
          description: 'Subject created successfully'
        });
      }

      setIsSubjectDialogOpen(false);
      setEditingSubject(null);
      fetchSubjects();
    } catch (error: any) {
      console.error('Error saving subject:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to save subject'
      });
    }
  }

  async function handleSaveTopic(formData: Partial<Topic>) {
    if (!selectedSubject) return;

    try {
      const slug = formData.name?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || '';
      
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
        
        toast({
          title: 'Success',
          description: 'Topic updated successfully'
        });
      } else {
        const { error } = await supabase
          .from('topics')
          .insert({
            subject_id: selectedSubject.id,
            name: formData.name,
            slug,
            description: formData.description,
            status: formData.status || 'draft',
            display_order: formData.display_order || 0
          });

        if (error) throw error;
        
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
    } else {
      newExpanded.add(subjectId);
    }
    setExpandedSubjects(newExpanded);
  };

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
        <Button onClick={() => {
          setEditingSubject(null);
          setIsSubjectDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Subject
        </Button>
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
          filteredSubjects.map((subject) => (
            <Card key={subject.id}>
              <CardContent className="pt-6">
                {/* Subject Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-4 flex-1">
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
                        <Badge variant="outline">{subject.exam_board}</Badge>
                        <Badge className={getStatusColor(subject.status)}>
                          {subject.status}
                        </Badge>
                      </div>
                      {subject.description && (
                        <p className="text-sm text-muted-foreground">{subject.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>{subject.topics?.length || 0} topics</span>
                        <span>•</span>
                        <span>Order: {subject.display_order}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedSubject(subject);
                        setEditingTopic(null);
                        setIsTopicDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Topic
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingSubject(subject);
                        setIsSubjectDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDeleteTarget({ type: 'subject', id: subject.id, name: subject.name });
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Topics */}
                {expandedSubjects.has(subject.id) && subject.topics && subject.topics.length > 0 && (
                  <div className="ml-10 space-y-3 mt-4 border-l-2 pl-4">
                    {subject.topics.map((topic) => (
                      <div key={topic.id} className="flex items-start justify-between p-3 bg-muted/50 rounded-lg">
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
                            <span>•</span>
                            <span>Order: {topic.display_order}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedSubject(subject);
                              setEditingTopic(topic);
                              setIsTopicDialogOpen(true);
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeleteTarget({ type: 'topic', id: topic.id, name: topic.name });
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Subject Dialog */}
      <SubjectDialog
        open={isSubjectDialogOpen}
        onOpenChange={setIsSubjectDialogOpen}
        subject={editingSubject}
        onSave={handleSaveSubject}
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
    </div>
  );
}

// Subject Dialog Component
function SubjectDialog({
  open,
  onOpenChange,
  subject,
  onSave
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: Subject | null;
  onSave: (data: Partial<Subject>) => void;
}) {
  const [formData, setFormData] = useState<Partial<Subject>>({
    name: '',
    description: '',
    exam_board: 'IGCSE',
    status: 'draft',
    display_order: 0
  });

  useEffect(() => {
    if (subject) {
      setFormData(subject);
    } else {
      setFormData({
        name: '',
        description: '',
        exam_board: 'IGCSE',
        status: 'draft',
        display_order: 0
      });
    }
  }, [subject, open]);

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
                value={formData.exam_board}
                onValueChange={(value) => setFormData({ ...formData, exam_board: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXAM_BOARDS.map((board) => (
                    <SelectItem key={board} value={board}>
                      {board}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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

          <div className="space-y-2">
            <Label htmlFor="display_order">Display Order</Label>
            <Input
              id="display_order"
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">Lower numbers appear first</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => onSave(formData)}
            disabled={!formData.name || !formData.exam_board}
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

          <div className="grid grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <Label htmlFor="topic-order">Display Order</Label>
              <Input
                id="topic-order"
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
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
