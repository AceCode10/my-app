'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  Shield,
  Download,
  Filter
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
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  description: string;
  metadata: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  users?: {
    email: string;
    display_name: string | null;
  };
}

const ACTIONS = ['create', 'update', 'delete', 'publish', 'unpublish', 'approve', 'reject', 'login', 'logout'];
const TABLES = ['subjects', 'topics', 'questions', 'past_papers', 'users', 'content_approvals'];

export default function AuditLogsPage() {
  const supabase = createClient();
  const { toast } = useToast();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterTable, setFilterTable] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    fetchLogs();
  }, [page]);

  async function fetchLogs() {
    try {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          users:user_id (
            email,
            display_name
          )
        `)
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load audit logs'
      });
    } finally {
      setLoading(false);
    }
  }

  async function exportLogs() {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      // Convert to CSV
      const csv = [
        ['Timestamp', 'User ID', 'Action', 'Resource Type', 'Resource ID', 'Description', 'IP Address'].join(','),
        ...(data || []).map(log => [
          log.created_at,
          log.user_id || '',
          log.action,
          log.resource_type,
          log.resource_id || '',
          `"${log.description.replace(/"/g, '""')}"`, // Escape quotes in description
          log.ip_address || ''
        ].join(','))
      ].join('\n');

      // Download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Audit logs exported successfully'
      });
    } catch (error) {
      console.error('Error exporting logs:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to export audit logs'
      });
    }
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      (log.users?.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.users?.display_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.resource_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    const matchesTable = filterTable === 'all' || log.resource_type === filterTable;
    
    return matchesSearch && matchesAction && matchesTable;
  });

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create': return 'bg-green-500/10 text-green-500';
      case 'update': return 'bg-blue-500/10 text-blue-500';
      case 'delete': return 'bg-red-500/10 text-red-500';
      case 'publish': return 'bg-purple-500/10 text-purple-500';
      case 'approve': return 'bg-green-500/10 text-green-500';
      case 'reject': return 'bg-red-500/10 text-red-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Audit Logs</h1>
          <p className="text-muted-foreground mt-1">
            System-wide activity and change tracking
          </p>
        </div>
        <Button onClick={exportLogs}>
          <Download className="mr-2 h-4 w-4" />
          Export Logs
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {ACTIONS.map(action => (
                  <SelectItem key={action} value={action}>
                    {action.charAt(0).toUpperCase() + action.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterTable} onValueChange={setFilterTable}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by table" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tables</SelectItem>
                {TABLES.map(table => (
                  <SelectItem key={table} value={table}>
                    {table.charAt(0).toUpperCase() + table.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No audit logs found</h3>
              <p className="text-muted-foreground">
                {searchQuery || filterAction !== 'all' || filterTable !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No activity has been logged yet'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {format(new Date(log.created_at), 'PPpp')}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.users?.display_name || log.users?.email || 'System'}
                      </TableCell>
                      <TableCell>
                        <Badge className={getActionColor(log.action)}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {log.resource_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.description}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.ip_address || '-'}
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
      {!loading && filteredLogs.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {filteredLogs.length} logs (Page {page})
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={logs.length < pageSize}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
