'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  MessageSquare
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
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Approval {
  id: string;
  entity_type: string;
  entity_id: string;
  submitted_by: string;
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  status: 'pending' | 'approved' | 'rejected';
  review_notes: string | null;
  content_snapshot: any;
  users?: { display_name: string; email: string };
}

export default function ApprovalsPage() {
  const supabase = createClient();
  const { user } = useUser();
  const { toast } = useToast();

  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [filterType, setFilterType] = useState('all');
  
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    fetchApprovals();
  }, [filterStatus]);

  async function fetchApprovals() {
    try {
      let query = supabase
        .from('content_approvals')
        .select(`
          *,
          users:submitted_by(display_name, email)
        `)
        .order('submitted_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setApprovals(data || []);
    } catch (error) {
      console.error('Error fetching approvals:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load approvals'
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleReview(approval: Approval, action: 'approve' | 'reject') {
    if (!user) return;

    setReviewing(true);

    try {
      // Update approval record
      const { error: approvalError } = await supabase
        .from('content_approvals')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null
        })
        .eq('id', approval.id);

      if (approvalError) throw approvalError;

      // If approved, update the actual entity status
      if (action === 'approve') {
        const table = approval.entity_type === 'subject' ? 'subjects' 
          : approval.entity_type === 'topic' ? 'topics'
          : approval.entity_type === 'question' ? 'questions'
          : 'past_papers';

        const { error: entityError } = await supabase
          .from(table)
          .update({ status: 'published' })
          .eq('id', approval.entity_id);

        if (entityError) throw entityError;
      }

      toast({
        title: 'Success',
        description: `Content ${action === 'approve' ? 'approved' : 'rejected'} successfully`
      });

      setIsReviewDialogOpen(false);
      setSelectedApproval(null);
      setReviewNotes('');
      fetchApprovals();
    } catch (error: any) {
      console.error('Error reviewing approval:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to process review'
      });
    } finally {
      setReviewing(false);
    }
  }

  const filteredApprovals = approvals.filter(approval => {
    if (filterType === 'all') return true;
    return approval.entity_type === filterType;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500/10 text-green-500';
      case 'rejected': return 'bg-red-500/10 text-red-500';
      case 'pending': return 'bg-yellow-500/10 text-yellow-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Content Approvals</h1>
        <p className="text-muted-foreground mt-1">
          Review and approve pending content submissions
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Content Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="subject">Subjects</SelectItem>
                  <SelectItem value="topic">Topics</SelectItem>
                  <SelectItem value="question">Questions</SelectItem>
                  <SelectItem value="paper">Past Papers</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approvals Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredApprovals.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No approvals found</h3>
              <p className="text-muted-foreground">
                {filterStatus === 'pending' 
                  ? 'All content has been reviewed'
                  : 'Try adjusting your filters'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Submitted At</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reviewed By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApprovals.map((approval) => (
                    <TableRow key={approval.id}>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {approval.entity_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {approval.users?.display_name || 'Unknown'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {approval.users?.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(approval.submitted_at), 'PPp')}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(approval.status)}>
                          <span className="mr-1">{getStatusIcon(approval.status)}</span>
                          {approval.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {approval.reviewed_at ? (
                          <div className="text-sm">
                            {format(new Date(approval.reviewed_at), 'PPp')}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedApproval(approval);
                              setIsReviewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {approval.status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-500 hover:text-green-600"
                                onClick={() => {
                                  setSelectedApproval(approval);
                                  setReviewNotes('');
                                  handleReview(approval, 'approve');
                                }}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-600"
                                onClick={() => {
                                  setSelectedApproval(approval);
                                  setReviewNotes('');
                                  setIsReviewDialogOpen(true);
                                }}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
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

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Content</DialogTitle>
            <DialogDescription>
              Review the submitted content and provide feedback
            </DialogDescription>
          </DialogHeader>

          {selectedApproval && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Type:</span>{' '}
                  <Badge variant="outline" className="capitalize">
                    {selectedApproval.entity_type}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Status:</span>{' '}
                  <Badge className={getStatusColor(selectedApproval.status)}>
                    {selectedApproval.status}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Submitted by:</span>{' '}
                  {selectedApproval.users?.display_name}
                </div>
                <div>
                  <span className="font-medium">Submitted at:</span>{' '}
                  {format(new Date(selectedApproval.submitted_at), 'PPp')}
                </div>
              </div>

              {selectedApproval.content_snapshot && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Content Preview</h4>
                  <pre className="text-sm overflow-x-auto">
                    {JSON.stringify(selectedApproval.content_snapshot, null, 2)}
                  </pre>
                </div>
              )}

              {selectedApproval.review_notes && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Review Notes</h4>
                  <p className="text-sm">{selectedApproval.review_notes}</p>
                </div>
              )}

              {selectedApproval.status === 'pending' && (
                <div className="space-y-2">
                  <Label htmlFor="notes">Review Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add any comments or feedback..."
                    rows={4}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {selectedApproval?.status === 'pending' ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsReviewDialogOpen(false)}
                  disabled={reviewing}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => selectedApproval && handleReview(selectedApproval, 'reject')}
                  disabled={reviewing}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  onClick={() => selectedApproval && handleReview(selectedApproval, 'approve')}
                  disabled={reviewing}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsReviewDialogOpen(false)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats */}
      {!loading && filteredApprovals.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {filteredApprovals.length} of {approvals.length} approvals
          </span>
        </div>
      )}
    </div>
  );
}
