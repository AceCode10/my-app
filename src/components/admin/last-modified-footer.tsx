'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { History } from 'lucide-react';

interface LastModifiedFooterProps {
  /** Type of resource (matches audit_logs.resource_type) */
  resourceType: string;
  /** Resource UUID to look up */
  resourceId: string;
  /** Optional class for outer element */
  className?: string;
}

interface AuditLogRow {
  action: string;
  created_at: string;
  user_id: string | null;
  users?: { display_name: string | null; email: string } | null;
}

/**
 * Shows "Last modified by {user} on {date}" + a deep-link to the audit log,
 * filtered by this resource. Drops onto any admin detail page (paper, note, question).
 *
 * Fail-safe: renders nothing if there is no log entry yet.
 */
export function LastModifiedFooter({ resourceType, resourceId, className }: LastModifiedFooterProps) {
  const { data } = useQuery<AuditLogRow | null>({
    queryKey: ['admin-last-modified', resourceType, resourceId],
    enabled: !!resourceId,
    staleTime: 60_000,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          action, created_at, user_id,
          users:user_id ( display_name, email )
        `)
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) return null;
      return (data as unknown as AuditLogRow) ?? null;
    },
  });

  if (!data) return null;
  const when = format(new Date(data.created_at), 'MMM d, yyyy h:mm a');
  const who = data.users?.display_name ?? data.users?.email ?? 'an admin';

  return (
    <div className={`mt-6 flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground ${className ?? ''}`}>
      <span>
        Last {data.action} by <span className="font-medium text-foreground">{who}</span> on {when}
      </span>
      <Link
        href={`/admin/audit-logs?resource_type=${encodeURIComponent(resourceType)}&resource_id=${encodeURIComponent(resourceId)}`}
        className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
      >
        <History className="h-3 w-3" />
        View history
      </Link>
    </div>
  );
}

export default LastModifiedFooter;
