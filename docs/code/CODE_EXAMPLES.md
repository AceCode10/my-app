# Code Examples - Copy-Paste Ready

## Table of Contents
1. [Supabase Client Setup](#supabase-client-setup)
2. [Authentication](#authentication)
3. [CRUD Operations](#crud-operations)
4. [Realtime Subscriptions](#realtime-subscriptions)
5. [Storage Operations](#storage-operations)
6. [Custom Hooks](#custom-hooks)
7. [Server Actions](#server-actions)
8. [Middleware](#middleware)

---

## Supabase Client Setup

### Client-Side Client
```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
```

### Server-Side Client (Already exists)
```typescript
// lib/supabase/server.ts - ALREADY IN CODEBASE
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}
```

---

## Authentication

### Sign Up
```typescript
// app/auth/signup/actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const displayName = formData.get('displayName') as string;
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
    },
  });
  
  if (error) {
    return { error: error.message };
  }
  
  // Create user profile
  if (data.user) {
    await supabase.from('users').insert({
      id: data.user.id,
      email: data.user.email!,
      display_name: displayName,
      role: 'student',
    });
  }
  
  redirect('/dashboard');
}
```

### Sign In
```typescript
// app/auth/login/actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  });
  
  if (error) {
    return { error: error.message };
  }
  
  redirect('/dashboard');
}
```

### Get Current User
```typescript
// lib/auth/get-user.ts
import { createClient } from '@/lib/supabase/server';

export async function getCurrentUser() {
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  // Get user profile with role
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();
  
  return profile;
}
```

### Protected Route Check
```typescript
// lib/auth/require-auth.ts
import { getCurrentUser } from './get-user';
import { redirect } from 'next/navigation';

export async function requireAuth(allowedRoles?: string[]) {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/auth/login');
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    redirect('/unauthorized');
  }
  
  return user;
}
```

---

## CRUD Operations

### Create (Insert)
```typescript
// Example: Create a class
import { createClient } from '@/lib/supabase/client';

async function createClass(data: {
  name: string;
  subject_id: string;
  description?: string;
}) {
  const supabase = createClient();
  
  const { data: newClass, error } = await supabase
    .from('classes')
    .insert({
      ...data,
      teacher_id: (await supabase.auth.getUser()).data.user?.id,
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return newClass;
}
```

### Read (Select)
```typescript
// Example: Get paginated notes
async function getNotes(topicId: string, page = 1, limit = 10) {
  const supabase = createClient();
  
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  
  const { data, error, count } = await supabase
    .from('notes')
    .select('*, topics(name), subjects(name)', { count: 'exact' })
    .eq('topic_id', topicId)
    .eq('visibility', 'published')
    .order('created_at', { ascending: false })
    .range(from, to);
  
  if (error) throw error;
  
  return {
    notes: data,
    total: count,
    pages: Math.ceil((count || 0) / limit),
  };
}
```

### Update
```typescript
// Example: Update user profile
async function updateProfile(userId: string, updates: {
  display_name?: string;
  avatar_url?: string;
  subjects_of_interest?: string[];
}) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  
  if (error) throw error;
  
  return data;
}
```

### Delete (Soft Delete Recommended)
```typescript
// Example: Archive a question
async function archiveQuestion(questionId: string) {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('questions')
    .update({ visibility: 'archived' })
    .eq('id', questionId);
  
  if (error) throw error;
}
```

### Complex Query with Filters
```typescript
// Example: Search questions with filters
async function searchQuestions(filters: {
  subject_id?: string;
  topic_id?: string;
  difficulty?: string;
  question_type?: string;
  search?: string;
}) {
  const supabase = createClient();
  
  let query = supabase
    .from('questions')
    .select('*, topics(name), subjects(name)')
    .eq('visibility', 'published');
  
  if (filters.subject_id) {
    query = query.eq('subject_id', filters.subject_id);
  }
  
  if (filters.topic_id) {
    query = query.eq('topic_id', filters.topic_id);
  }
  
  if (filters.difficulty) {
    query = query.eq('difficulty', filters.difficulty);
  }
  
  if (filters.question_type) {
    query = query.eq('question_type', filters.question_type);
  }
  
  if (filters.search) {
    query = query.textSearch('stem_md', filters.search);
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  
  if (error) throw error;
  
  return data;
}
```

---

## Realtime Subscriptions

### Subscribe to Table Changes
```typescript
// hooks/use-realtime-classes.ts
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Class } from '@/types';

export function useRealtimeClasses(teacherId: string) {
  const [classes, setClasses] = useState<Class[]>([]);
  const supabase = createClient();
  
  useEffect(() => {
    // Initial fetch
    supabase
      .from('classes')
      .select('*')
      .eq('teacher_id', teacherId)
      .then(({ data }) => {
        if (data) setClasses(data);
      });
    
    // Subscribe to changes
    const channel = supabase
      .channel('classes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'classes',
          filter: `teacher_id=eq.${teacherId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setClasses((prev) => [...prev, payload.new as Class]);
          } else if (payload.eventType === 'UPDATE') {
            setClasses((prev) =>
              prev.map((c) => (c.id === payload.new.id ? (payload.new as Class) : c))
            );
          } else if (payload.eventType === 'DELETE') {
            setClasses((prev) => prev.filter((c) => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [teacherId, supabase]);
  
  return classes;
}
```

---

## Storage Operations

### Upload File
```typescript
// lib/storage/upload.ts
import { createClient } from '@/lib/supabase/client';

export async function uploadFile(
  bucket: string,
  path: string,
  file: File
): Promise<string> {
  const supabase = createClient();
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
  
  if (error) throw error;
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);
  
  // Track in media table
  await supabase.from('media').insert({
    storage_path: data.path,
    bucket,
    mime_type: file.type,
    size_bytes: file.size,
  });
  
  return publicUrl;
}
```

### Get Signed URL (for private files)
```typescript
export async function getSignedUrl(bucket: string, path: string, expiresIn = 3600) {
  const supabase = createClient();
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  
  if (error) throw error;
  
  return data.signedUrl;
}
```

### Delete File
```typescript
export async function deleteFile(bucket: string, path: string) {
  const supabase = createClient();
  
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);
  
  if (error) throw error;
  
  // Remove from media table
  await supabase
    .from('media')
    .delete()
    .eq('storage_path', path);
}
```

---

## Custom Hooks

### useUser Hook
```typescript
// hooks/use-user.ts
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@/types';

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            setUser(data);
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          setUser(data);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);
  
  return { user, loading };
}
```

### useSupabaseQuery Hook
```typescript
// hooks/use-supabase-query.ts
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js';

export function useSupabaseQuery<T>(
  queryFn: (supabase: ReturnType<typeof createClient>) => PostgrestFilterBuilder<any, any, T[]>
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();
  
  useEffect(() => {
    queryFn(supabase)
      .then(({ data, error }) => {
        if (error) throw error;
        setData(data || []);
      })
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, [supabase]);
  
  return { data, loading, error };
}

// Usage:
// const { data: classes } = useSupabaseQuery((supabase) =>
//   supabase.from('classes').select('*').eq('teacher_id', userId)
// );
```

---

## Server Actions

### Create Assignment Action
```typescript
// app/teacher/assignments/actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createAssignment(data: {
  test_id: string;
  target_class_id: string;
  title: string;
  due_at?: string;
  time_limit_minutes?: number;
}) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  const { data: assignment, error } = await supabase
    .from('assignments')
    .insert({
      ...data,
      assigned_by: user.id,
    })
    .select()
    .single();
  
  if (error) throw error;
  
  // Create notifications for students
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('user_id')
    .eq('class_id', data.target_class_id)
    .eq('status', 'active');
  
  if (enrollments) {
    await supabase.from('notifications').insert(
      enrollments.map((e) => ({
        user_id: e.user_id,
        type: 'assignment_posted',
        title: 'New Assignment',
        body: `${data.title} has been assigned`,
        link_url: `/dashboard/assignments/${assignment.id}`,
      }))
    );
  }
  
  revalidatePath('/teacher/assignments');
  
  return assignment;
}
```

### Submit Attempt Action
```typescript
// app/student/attempts/actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';

export async function submitAttempt(attemptId: string, answers: Record<string, any>) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('attempts')
    .update({
      answers,
      submitted_at: new Date().toISOString(),
      status: 'submitted',
    })
    .eq('id', attemptId);
  
  if (error) throw error;
  
  // Auto-grading will be triggered by database trigger
  
  return { success: true };
}
```

---

## Middleware

### Auth Middleware (Already exists, enhance it)
```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );
  
  const { data: { user } } = await supabase.auth.getUser();
  
  // Protected routes
  const protectedPaths = ['/dashboard', '/teacher', '/admin'];
  const isProtected = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );
  
  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
  
  // Role-based access
  if (request.nextUrl.pathname.startsWith('/teacher')) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user!.id)
      .single();
    
    if (profile?.role !== 'teacher' && profile?.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }
  
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user!.id)
      .single();
    
    if (!['super_admin', 'content_moderator'].includes(profile?.role || '')) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }
  
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

---

## TypeScript Types

```typescript
// types/database.ts
export type Role = 'student' | 'teacher' | 'content_moderator' | 'super_admin';
export type SubscriptionTier = 'basic' | 'essential' | 'pro';
export type QuestionType = 'mcq' | 'tf' | 'numeric' | 'short_answer' | 'long_answer' | 'fill_blank';

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: Role;
  subscription_tier: SubscriptionTier;
  leaderboard_opt_out: boolean;
  xp: number;
  streak_days: number;
  last_activity_at: string | null;
  subjects_of_interest: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Class {
  id: string;
  name: string;
  subject_id: string | null;
  teacher_id: string;
  description: string | null;
  join_code: string;
  capacity: number;
  auto_approve: boolean;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  subject_id: string;
  topic_id: string;
  exam_board: string | null;
  paper_id: string | null;
  paper_position: number | null;
  question_type: QuestionType;
  stem_md: string;
  options: any | null;
  correct_answer: any;
  marks: number;
  examiner_comment: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[] | null;
  media_refs: string[] | null;
  version: number;
  visibility: 'draft' | 'published' | 'archived';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Add more types as needed...
```

---

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... # Server-side only, never expose to client
```
