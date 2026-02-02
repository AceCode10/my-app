'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { debounce } from '@/lib/debounce';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  FileQuestion,
  Eye,
  Download,
  Upload,
  Copy,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle,
  XCircle,
  Archive,
  FileText
} from 'lucide-react';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { logDelete } from '@/lib/audit';

interface Question {
  id: string;
  stem_markdown: string | null;
  question_type: string | null;
  difficulty: string | null;
  marks: number;
  status: string | null;
  exam_board: string | null;
  created_at: string;
  subject_id: string | null;
  topic_id: string | null;
  subjects?: { name: string } | null;
  topics?: { name: string } | null;
  // Structure fields
  parent_question_id: string | null;
  part_label: string | null;
  question_number: number | null;
  context_text: string | null;
  is_context_only: boolean | null;
  needs_answer: boolean | null;
  display_order: number | null;
}

interface Subject {
  id: string;
  name: string;
}

interface Topic {
  id: string;
  name: string;
  subject_id: string;
}

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True/False' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'numeric', label: 'Numeric' },
  { value: 'essay', label: 'Essay' },
  { value: 'fill_in_blank', label: 'Fill in the Blank' },
  { value: 'matching', label: 'Matching' }
];

const DIFFICULTY_LEVELS = [
  { value: 'easy', label: 'Easy', color: 'bg-green-500/10 text-green-500' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500/10 text-yellow-500' },
  { value: 'hard', label: 'Hard', color: 'bg-orange-500/10 text-orange-500' },
  { value: 'very_hard', label: 'Very Hard', color: 'bg-red-500/10 text-red-500' }
];

const STATUSES = ['draft', 'pending', 'published', 'archived'];

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export default function QuestionsPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const router = useRouter();
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterTopic, setFilterTopic] = useState('all');
  
  const [totalCount, setTotalCount] = useState(0);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  
  // Dialogs
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = useState(false);
  const [newBulkStatus, setNewBulkStatus] = useState('published');
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);

  // filteredQuestions equals questions since filtering is done server-side
  const filteredQuestions = questions;

  useEffect(() => {
    fetchQuestions();
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (filterSubject !== 'all') {
      fetchTopics(filterSubject);
    } else {
      setTopics([]);
      setFilterTopic('all');
    }
  }, [filterSubject]);

  async function fetchQuestions() {
    setLoading(true);
    try {
      // Build server-side filters
      // Question Bank only shows parent questions (not child parts) that have been assigned to topics
      let query = supabase
        .from('questions')
        .select(`
          *,
          subjects:subject_id(name),
          topics:topic_id(name)
        `)
        .not('topic_id', 'is', null) // Only show questions assigned to topics
        .is('parent_question_id', null) // Only show parent questions, not child parts
        .order('question_number', { ascending: true })
        .order('created_at', { ascending: false });

      // Apply filters server-side for better performance
      if (filterSubject !== 'all') {
        query = query.eq('subject_id', filterSubject);
      }
      if (filterTopic !== 'all') {
        query = query.eq('topic_id', filterTopic);
      }
      if (filterType !== 'all') {
        query = query.eq('question_type', filterType);
      }
      if (filterDifficulty !== 'all') {
        query = query.eq('difficulty', filterDifficulty);
      }
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }
      if (searchQuery.trim()) {
        query = query.ilike('stem_markdown', `%${searchQuery.trim()}%`);
      }

      // Add pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      // Get total count for pagination (only parent questions with topic_id)
      const { count, error: countError } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .not('topic_id', 'is', null)
        .is('parent_question_id', null);
      
      if (countError) throw countError;
      setTotalCount(count || 0);

      const { data, error } = await query;
      if (error) throw error;
      
      setQuestions(data || []);
    } catch (error: any) {
      console.error('Error fetching questions:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to fetch questions'
      });
    } finally {
      setLoading(false);
    }
  }

  async function fetchSubjects() {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  }

  async function fetchTopics(subjectId: string) {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('id, name, subject_id, display_order')
        .eq('subject_id', subjectId)
        .order('display_order');

      if (error) throw error;
      setTopics(data || []);
    } catch (error) {
      console.error('Error fetching topics:', error);
    }
  }

  async function handleDelete(id: string) {
    try {
      const questionToDeleteData = questions.find(q => q.id === id);
      
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (questionToDeleteData) {
        await logDelete(
          'question',
          id,
          (questionToDeleteData.stem_markdown || 'Untitled').substring(0, 50) + '...'
        );
      }

      toast({
        title: 'Success',
        description: 'Question deleted successfully'
      });

      setQuestionToDelete(null);
      setDeleteDialogOpen(false);
      fetchQuestions();
    } catch (error: any) {
      console.error('Error deleting question:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete question'
      });
    }
  }

  async function handleBulkDelete() {
    try {
      const ids = Array.from(selectedIds);
      
      const { error } = await supabase
        .from('questions')
        .delete()
        .in('id', ids);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${ids.length} question(s) deleted successfully`
      });

      setSelectedIds(new Set());
      setSelectAll(false);
      setBulkDeleteDialogOpen(false);
      fetchQuestions();
    } catch (error: any) {
      console.error('Error bulk deleting questions:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete questions'
      });
    }
  }

  async function handleBulkStatusChange() {
    try {
      const ids = Array.from(selectedIds);
      
      const { error } = await supabase
        .from('questions')
        .update({ status: newBulkStatus })
        .in('id', ids);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${ids.length} question(s) updated to ${newBulkStatus}`
      });

      setSelectedIds(new Set());
      setSelectAll(false);
      setBulkStatusDialogOpen(false);
      fetchQuestions();
    } catch (error: any) {
      console.error('Error updating questions:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update questions'
      });
    }
  }

  async function handleDuplicate(id: string) {
    try {
      const question = questions.find(q => q.id === id);
      if (!question) return;

      const { id: _, created_at, subjects, topics, ...questionData } = question as any;
      
      const { error } = await supabase
        .from('questions')
        .insert({
          ...questionData,
          stem_markdown: `[COPY] ${questionData.stem_markdown || ''}`,
          status: 'draft'
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Question duplicated successfully'
      });

      fetchQuestions();
    } catch (error: any) {
      console.error('Error duplicating question:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to duplicate question'
      });
    }
  }

  async function handleQuickStatusChange(id: string, newStatus: string) {
    try {
      const { error } = await supabase
        .from('questions')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Question status changed to ${newStatus}`
      });

      fetchQuestions();
    } catch (error: any) {
      console.error('Error updating question status:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update status'
      });
    }
  }

  function handleExport() {
    const dataToExport = selectedIds.size > 0 
      ? questions.filter(q => selectedIds.has(q.id))
      : filteredQuestions;
    
    const exportData = dataToExport.map(q => ({
      id: q.id,
      question: q.stem_markdown,
      type: q.question_type,
      difficulty: q.difficulty,
      marks: q.marks,
      status: q.status,
      exam_board: q.exam_board,
      subject: q.subjects?.name || '',
      topic: q.topics?.name || '',
      created_at: q.created_at
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `questions-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Export Complete',
      description: `Exported ${exportData.length} question(s)`
    });
  }

  function toggleSelectAll() {
    if (selectAll) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedQuestions.map(q => q.id)));
    }
    setSelectAll(!selectAll);
  }

  function toggleSelect(id: string) {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    setSelectAll(newSelected.size === paginatedQuestions.length);
  }

  function clearFilters() {
    setSearchQuery('');
    setFilterType('all');
    setFilterDifficulty('all');
    setFilterStatus('all');
    setFilterSubject('all');
    setFilterTopic('all');
    setCurrentPage(1);
  }

  // Debounced search to reduce API calls
  const debouncedSearch = useMemo(
    () => debounce((value: string) => {
      setSearchQuery(value);
      setCurrentPage(1);
    }, 300),
    []
  );

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  }, [debouncedSearch]);

  // Pagination calculations - now using server-side data
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const paginatedQuestions = questions; // Already paginated from server
  const startIndex = (currentPage - 1) * itemsPerPage;

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
    setSelectAll(false);
    fetchQuestions(); // Fetch with new filters
  }, [filterType, filterDifficulty, filterStatus, filterSubject, filterTopic]);

  // Fetch questions when page or search changes
  useEffect(() => {
    fetchQuestions();
  }, [currentPage, searchQuery]);

  // Stats calculations
  const stats = useMemo(() => {
    const published = questions.filter(q => q.status === 'published').length;
    const draft = questions.filter(q => q.status === 'draft').length;
    const pending = questions.filter(q => q.status === 'pending').length;
    const archived = questions.filter(q => q.status === 'archived').length;
    return { published, draft, pending, archived, total: questions.length };
  }, [questions]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-500/10 text-green-500';
      case 'draft': return 'bg-gray-500/10 text-gray-500';
      case 'pending': return 'bg-yellow-500/10 text-yellow-500';
      case 'archived': return 'bg-red-500/10 text-red-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    const level = DIFFICULTY_LEVELS.find(d => d.value === difficulty);
    return level?.color || 'bg-gray-500/10 text-gray-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Question Bank</h1>
          <p className="text-muted-foreground mt-1">
            Manage your question database ({stats.total} total)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => router.push('/admin/questions/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Question
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Questions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-green-600">{stats.published}</div>
            <p className="text-xs text-muted-foreground">Published</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-gray-600">{stats.draft}</div>
            <p className="text-xs text-muted-foreground">Draft</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Pending Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-red-600">{stats.archived}</div>
            <p className="text-xs text-muted-foreground">Archived</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search questions..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-10"
              />
            </div>

            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map(subject => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterTopic} onValueChange={setFilterTopic} disabled={filterSubject === 'all'}>
              <SelectTrigger>
                <SelectValue placeholder="Topic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Topics</SelectItem>
                {topics.map(topic => (
                  <SelectItem key={topic.id} value={topic.id}>
                    {topic.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Question Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {QUESTION_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
              <SelectTrigger>
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                {DIFFICULTY_LEVELS.map(level => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {STATUSES.map(status => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {(searchQuery || filterType !== 'all' || filterDifficulty !== 'all' || filterStatus !== 'all' || filterSubject !== 'all' || filterTopic !== 'all') && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>

            <Button variant="ghost" size="sm" onClick={fetchQuestions}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <Card className="border-primary">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedIds.size} question(s) selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkStatusDialogOpen(true)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Change Status
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Selected
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setBulkDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Questions Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="text-center py-12">
              <FileQuestion className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No questions found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || filterType !== 'all' || filterDifficulty !== 'all' || filterStatus !== 'all' || filterSubject !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by creating your first question'}
              </p>
              {!searchQuery && filterType === 'all' && filterSubject === 'all' && (
                <Button onClick={() => router.push('/admin/questions/new')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Question
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectAll}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Subject/Topic</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Marks</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedQuestions.map((question) => (
                    <TableRow key={question.id} className={selectedIds.has(question.id) ? 'bg-muted/50' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(question.id)}
                          onCheckedChange={() => toggleSelect(question.id)}
                        />
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div 
                          className="cursor-pointer hover:text-primary"
                          onClick={() => {
                            setPreviewQuestion(question);
                            setPreviewDialogOpen(true);
                          }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {question.question_number && (
                              <Badge variant="outline" className="text-xs">
                                Q{question.question_number}{question.part_label ? question.part_label : ''}
                              </Badge>
                            )}
                            {question.is_context_only && (
                              <Badge variant="secondary" className="text-xs">Context</Badge>
                            )}
                            {question.question_type === 'context' && (
                              <Badge variant="secondary" className="text-xs">Context</Badge>
                            )}
                          </div>
                          <div className="line-clamp-2 text-sm">
                            {(question.stem_markdown || 'No content').substring(0, 100)}
                            {(question.stem_markdown || '').length > 100 && '...'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm capitalize">
                          {(question.question_type || 'unknown').replace(/_/g, ' ')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {question.subjects?.name && (
                            <div className="font-medium">{question.subjects.name}</div>
                          )}
                          {question.topics?.name && (
                            <div className="text-muted-foreground">{question.topics.name}</div>
                          )}
                          {!question.subjects?.name && !question.topics?.name && (
                            <span className="text-muted-foreground">Not assigned</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getDifficultyColor(question.difficulty || 'medium')} variant="outline">
                          {(question.difficulty || 'medium').replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{question.marks}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(question.status || 'draft')}>
                          {question.status || 'draft'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setPreviewQuestion(question);
                              setPreviewDialogOpen(true);
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/admin/questions/${question.id}`)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(question.id)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {question.status !== 'published' && (
                              <DropdownMenuItem onClick={() => handleQuickStatusChange(question.id, 'published')}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Publish
                              </DropdownMenuItem>
                            )}
                            {question.status !== 'archived' && (
                              <DropdownMenuItem onClick={() => handleQuickStatusChange(question.id, 'archived')}>
                                <Archive className="h-4 w-4 mr-2" />
                                Archive
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => {
                                setQuestionToDelete(question.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!loading && filteredQuestions.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Show</span>
            <Select value={itemsPerPage.toString()} onValueChange={(v) => {
              setItemsPerPage(parseInt(v));
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ITEMS_PER_PAGE_OPTIONS.map(opt => (
                  <SelectItem key={opt} value={opt.toString()}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>per page</span>
            <span className="ml-4">
              Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredQuestions.length)} of {filteredQuestions.length}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this question? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => questionToDelete && handleDelete(questionToDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Questions</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} question(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleBulkDelete}
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Status Change Dialog */}
      <Dialog open={bulkStatusDialogOpen} onOpenChange={setBulkStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Status for {selectedIds.size} Questions</DialogTitle>
            <DialogDescription>
              Select the new status for the selected questions.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={newBulkStatus} onValueChange={setNewBulkStatus}>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkStatusChange}>
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Question Preview</DialogTitle>
          </DialogHeader>
          {previewQuestion && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Question</h4>
                <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap">
                  {previewQuestion.stem_markdown || 'No content'}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Type</h4>
                  <p className="capitalize">{(previewQuestion.question_type || 'unknown').replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Difficulty</h4>
                  <Badge className={getDifficultyColor(previewQuestion.difficulty || 'medium')} variant="outline">
                    {(previewQuestion.difficulty || 'medium').replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Marks</h4>
                  <p>{previewQuestion.marks}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Status</h4>
                  <Badge className={getStatusColor(previewQuestion.status || 'draft')}>
                    {previewQuestion.status || 'draft'}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Subject</h4>
                  <p>{previewQuestion.subjects?.name || 'Not assigned'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Topic</h4>
                  <p>{previewQuestion.topics?.name || 'Not assigned'}</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  setPreviewDialogOpen(false);
                  router.push(`/admin/questions/${previewQuestion.id}`);
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Question
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
