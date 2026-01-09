'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollText, User, Clock, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AuditLog {
    id: string;
    user_id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    details: any;
    created_at: string;
    user?: {
        display_name: string;
        email: string;
    };
}

export default function AuditLogsPage() {
    const supabase = createClient();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterAction, setFilterAction] = useState<string>('all');

    useEffect(() => {
        fetchAuditLogs();
    }, []);

    async function fetchAuditLogs() {
        try {
            const { data, error } = await supabase
                .from('audit_logs')
                .select(`
                    *,
                    user:users(display_name, email)
                `)
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        } finally {
            setLoading(false);
        }
    }

    const filteredLogs = filterAction === 'all' 
        ? logs 
        : logs.filter(log => log.action === filterAction);

    const uniqueActions = [...new Set(logs.map(log => log.action))];

    const getActionColor = (action: string) => {
        if (action.includes('create')) return 'bg-green-500';
        if (action.includes('update')) return 'bg-blue-500';
        if (action.includes('delete')) return 'bg-red-500';
        return 'bg-gray-500';
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <ScrollText className="h-8 w-8" />
                        Audit Logs
                    </h1>
                    <p className="text-muted-foreground">Track all administrative actions</p>
                </div>
                <Select value={filterAction} onValueChange={setFilterAction}>
                    <SelectTrigger className="w-48">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter by action" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Actions</SelectItem>
                        {uniqueActions.map(action => (
                            <SelectItem key={action} value={action}>{action}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Showing last 100 audit log entries</CardDescription>
                </CardHeader>
                <CardContent>
                    {filteredLogs.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No audit logs found.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredLogs.map(log => (
                                <div key={log.id} className="flex items-start gap-4 p-3 border rounded-lg hover:bg-muted/50">
                                    <Badge className={`${getActionColor(log.action)} text-white`}>
                                        {log.action}
                                    </Badge>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 text-sm">
                                            <User className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium">
                                                {log.user?.display_name || log.user?.email || 'Unknown User'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {log.entity_type}: {log.entity_id}
                                        </p>
                                        {log.details && (
                                            <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto">
                                                {JSON.stringify(log.details, null, 2)}
                                            </pre>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                                        <Clock className="h-3 w-3" />
                                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}