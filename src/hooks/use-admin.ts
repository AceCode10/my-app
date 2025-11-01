'use client';

// ============================================
// ADMIN HOOKS
// React hooks for admin functionality
// ============================================

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from './use-user';
import type { AdminUser, AdminPermission } from '@/types/admin';
import { hasPermission, isSuperAdmin, isContentModerator, isAnyAdmin } from '@/types/admin';

export function useAdmin() {
  const { user, loading } = useUser();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadAdminData() {
      if (loading) return;

      if (!user) {
        setAdminUser(null);
        setIsLoadingAdmin(false);
        return;
      }

      try {
        // Fetch admin details with role
        const { data, error } = await supabase
          .from('users')
          .select(`
            *,
            admin_role:admin_roles(*)
          `)
          .eq('id', user.id)
          .single();

        if (error) throw error;

        setAdminUser(data as AdminUser);
      } catch (error) {
        console.error('Error loading admin data:', error);
        setAdminUser(null);
      } finally {
        setIsLoadingAdmin(false);
      }
    }

    loadAdminData();
  }, [user, loading, supabase]);

  return {
    adminUser,
    loading: loading || isLoadingAdmin,
    isAdmin: isAnyAdmin(adminUser),
    isSuperAdmin: isSuperAdmin(adminUser),
    isContentModerator: isContentModerator(adminUser),
    hasPermission: (permission: AdminPermission) => hasPermission(adminUser, permission),
  };
}

// Hook for audit logging
export function useAuditLog() {
  const supabase = createClient();
  const { user } = useUser();

  const createLog = async (
    action: string,
    resourceType: string,
    resourceId: string | null,
    description: string,
    metadata: Record<string, any> = {}
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('audit_logs').insert({
        user_id: user.id,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        description,
        metadata,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error creating audit log:', error);
    }
  };

  return { createLog };
}

// Hook to fetch audit logs (Super Admin only)
export function useAuditLogs(filters?: {
  userId?: string;
  action?: string;
  resourceType?: string;
  limit?: number;
}) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const { isSuperAdmin } = useAdmin();

  useEffect(() => {
    async function fetchLogs() {
      if (!isSuperAdmin) {
        setLogs([]);
        setLoading(false);
        return;
      }

      try {
        let query = supabase
          .from('audit_logs')
          .select(`
            *,
            user:users(id, email, display_name)
          `)
          .order('created_at', { ascending: false })
          .limit(filters?.limit || 100);

        if (filters?.userId) {
          query = query.eq('user_id', filters.userId);
        }
        if (filters?.action) {
          query = query.eq('action', filters.action);
        }
        if (filters?.resourceType) {
          query = query.eq('resource_type', filters.resourceType);
        }

        const { data, error } = await query;

        if (error) throw error;

        setLogs(data || []);
      } catch (error) {
        console.error('Error fetching audit logs:', error);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    }

    fetchLogs();
  }, [isSuperAdmin, filters, supabase]);

  return { logs, loading };
}
