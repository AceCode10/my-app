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
  FileText,
  Download,
  Eye,
  Upload
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface PastPaper {
  id: string;
  title: string;
  exam_board: string;
  year: number;
  paper_number: string | null;
  variant: string | null;
  duration_minutes: number | null;
  total_marks: number | null;
  paper_url: string;
  mark_scheme_url: string | null;
  examiner_report_url: string | null;
  status: string;
  created_at: string;
  subject_id: string | null;
  subjects?: { name: string };
}

const EXAM_BOARDS = ['IGCSE', 'Edexcel', 'Cambridge', 'IB', 'AQA', 'OCR'];
const STATUSES = ['draft', 'pending', 'published', 'archived'];

export default function PastPapersPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const router = useRouter();
  
  const [papers, setPapers] = useState<PastPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBoard, setFilterBoard] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchPapers();
  }, []);

  async function fetchPapers() {
    try {
      const { data, error } = await supabase
        .from('past_papers')
        .select(`
          *,
          subjects:subject_id(name)
        `)
        .order('year', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPapers(data || []);
    } catch (error) {
      console.error('Error fetching papers:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load past papers'
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this past paper?')) return;

    try {
      const { error } = await supabase
        .from('past_papers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Past paper deleted successfully'
      });

      fetchPapers();
    } catch (error: any) {
      console.error('Error deleting paper:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete past paper'
      });
    }
  }

  const filteredPapers = papers.filter(paper => {
    const matchesSearch = 
      paper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      paper.exam_board.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBoard = filterBoard === 'all' || paper.exam_board === filterBoard;
    const matchesYear = filterYear === 'all' || paper.year.toString() === filterYear;
    const matchesStatus = filterStatus === 'all' || paper.status === filterStatus;
    
    return matchesSearch && matchesBoard && matchesYear && matchesStatus;
  });

  const years = Array.from(new Set(papers.map(p => p.year))).sort((a, b) => b - a);

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
          <h1 className="text-3xl font-bold text-foreground">Past Papers</h1>
          <p className="text-muted-foreground mt-1">
            Manage exam papers, mark schemes, and examiner reports
          </p>
        </div>
        <Button onClick={() => router.push('/admin/papers/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Upload Paper
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search papers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterBoard} onValueChange={setFilterBoard}>
              <SelectTrigger>
                <SelectValue placeholder="Exam Board" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Boards</SelectItem>
                {EXAM_BOARDS.map(board => (
                  <SelectItem key={board} value={board}>
                    {board}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger>
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {years.map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
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

      {/* Papers Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredPapers.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No past papers found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || filterBoard !== 'all' || filterYear !== 'all' || filterStatus !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by uploading your first past paper'}
              </p>
              {!searchQuery && filterBoard === 'all' && (
                <Button onClick={() => router.push('/admin/papers/new')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Upload Paper
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Board</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Paper</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Files</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPapers.map((paper) => (
                    <TableRow key={paper.id}>
                      <TableCell className="font-medium">
                        {paper.title}
                      </TableCell>
                      <TableCell>
                        {paper.subjects?.name || (
                          <span className="text-muted-foreground">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{paper.exam_board}</Badge>
                      </TableCell>
                      <TableCell>{paper.year}</TableCell>
                      <TableCell>
                        {paper.paper_number || '-'}
                        {paper.variant && ` (${paper.variant})`}
                      </TableCell>
                      <TableCell>
                        {paper.duration_minutes ? `${paper.duration_minutes} min` : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">Paper</Badge>
                          {paper.mark_scheme_url && (
                            <Badge variant="secondary">MS</Badge>
                          )}
                          {paper.examiner_report_url && (
                            <Badge variant="secondary">ER</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(paper.status)}>
                          {paper.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(paper.paper_url, '_blank')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/admin/papers/${paper.id}`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(paper.id)}
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
      {!loading && filteredPapers.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {filteredPapers.length} of {papers.length} past papers
          </span>
          {(searchQuery || filterBoard !== 'all' || filterYear !== 'all' || filterStatus !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setFilterBoard('all');
                setFilterYear('all');
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
