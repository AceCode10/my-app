'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Filter,
  FileQuestion,
  Eye
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
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface Question {
  id: string;
  stem_markdown: string;
  question_type: string;
  difficulty: string;
  marks: number;
  status: string;
  exam_board: string | null;
  created_at: string;
  subject_id: string | null;
  topic_id: string | null;
  subjects?: { name: string };
  topics?: { name: string };
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

export default function QuestionsPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const router = useRouter();
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchQuestions();
  }, []);

  async function fetchQuestions() {
    try {
      let query = supabase
        .from('questions')
        .select(`
          *,
          subjects:subject_id(name),
          topics:topic_id(name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      const { data, error } = await query;

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load questions'
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Question deleted successfully'
      });

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

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.stem_markdown.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || q.question_type === filterType;
    const matchesDifficulty = filterDifficulty === 'all' || q.difficulty === filterDifficulty;
    const matchesStatus = filterStatus === 'all' || q.status === filterStatus;
    
    return matchesSearch && matchesType && matchesDifficulty && matchesStatus;
  });

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
            Manage your question database
          </p>
        </div>
        <Button onClick={() => router.push('/admin/questions/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Question
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

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

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
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
          </div>
        </CardContent>
      </Card>

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
                {searchQuery || filterType !== 'all' || filterDifficulty !== 'all' || filterStatus !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by creating your first question'}
              </p>
              {!searchQuery && filterType === 'all' && (
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
                  {filteredQuestions.map((question) => (
                    <TableRow key={question.id}>
                      <TableCell className="max-w-md">
                        <div className="line-clamp-2 text-sm">
                          {question.stem_markdown.substring(0, 100)}
                          {question.stem_markdown.length > 100 && '...'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm capitalize">
                          {question.question_type.replace(/_/g, ' ')}
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
                        <Badge className={getDifficultyColor(question.difficulty)} variant="outline">
                          {question.difficulty.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{question.marks}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(question.status)}>
                          {question.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/admin/questions/${question.id}`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(question.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      {!loading && filteredQuestions.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {filteredQuestions.length} of {questions.length} questions
          </span>
          {(searchQuery || filterType !== 'all' || filterDifficulty !== 'all' || filterStatus !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setFilterType('all');
                setFilterDifficulty('all');
                setFilterStatus('all');
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
