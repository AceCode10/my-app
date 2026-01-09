'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, CheckCircle } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getIconComponent } from '@/lib/icon-mapper';

const supabase = createClient();

interface DbSubject {
  id: string;
  name: string;
  slug: string;
  code: string;
  icon_url?: string;
  color?: string;
  display_name?: string;
}

export default function AddSubjectsPage() {
  const router = useRouter();
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch available subjects
  const { data: availableSubjects = [], isLoading: isFetching } = useQuery({
    queryKey: ['subjects-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name, slug, code, icon_url, color, display_name')
        .eq('status', 'published')
        .order('name');
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Fetch user's selected subjects
  const { data: userSubjects } = useQuery({
    queryKey: ['user-subjects', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_subjects')
        .select('subject_id')
        .eq('user_id', user.id);
      if (error) throw error;
      
      const selectedIds = (data || []).map((us: any) => us.subject_id);
      setSelectedSubjectIds(selectedIds);
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Filter subjects based on search
  const filteredSubjects = availableSubjects.filter(subject => {
    if (!searchQuery.trim()) return true;
    const search = searchQuery.toLowerCase();
    return (
      subject.name.toLowerCase().includes(search) ||
      subject.code.toLowerCase().includes(search) ||
      (subject.display_name?.toLowerCase().includes(search))
    );
  });

  // Mutation for saving subjects
  const saveMutation = useMutation({
    mutationFn: async (subjectIds: string[]) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Get current subjects
      const { data: currentSubjects } = await supabase
        .from('user_subjects')
        .select('subject_id')
        .eq('user_id', user.id);

      const currentIds = (currentSubjects || []).map((s: any) => s.subject_id);
      const toAdd = subjectIds.filter(id => !currentIds.includes(id));
      const toRemove = currentIds.filter(id => !subjectIds.includes(id));

      // Execute deletions and insertions in parallel
      const operations = [];
      
      if (toRemove.length > 0) {
        operations.push(
          supabase
            .from('user_subjects')
            .delete()
            .eq('user_id', user.id)
            .in('subject_id', toRemove)
        );
      }

      if (toAdd.length > 0) {
        operations.push(
          supabase
            .from('user_subjects')
            .insert(toAdd.map(subject_id => ({ user_id: user.id, subject_id })))
        );
      }

      if (operations.length > 0) {
        const results = await Promise.all(operations);
        const errors = results.filter(r => r.error);
        if (errors.length > 0) throw errors[0].error;
      }

      return subjectIds;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-subjects'] });
      toast({ title: 'Success!', description: 'Your subjects have been saved.' });
      router.push('/teacher/subjects');
    },
    onError: (error: any) => {
      console.error('Error saving subjects:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: error.message || 'Could not save subjects. Please try again.' 
      });
    },
  });

  const handleCheckboxChange = (subjectId: string) => {
    setSelectedSubjectIds(prev =>
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleSaveChanges = () => {
    saveMutation.mutate(selectedSubjectIds);
  };

  return (
    <div>
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/teacher/subjects">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Subjects
          </Link>
        </Button>
        <h2 className="text-3xl font-bold text-foreground">Manage My Subjects</h2>
        <p className="text-muted-foreground mt-1">Select the subjects you teach to see them on your dashboard.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Available Subjects</span>
            {selectedSubjectIds.length > 0 && (
              <span className="text-sm font-normal text-primary flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                {selectedSubjectIds.length} selected
              </span>
            )}
          </CardTitle>
          {/* Search bar */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search subjects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isFetching ? (
            <div className="text-center py-8 text-muted-foreground">Loading subjects...</div>
          ) : filteredSubjects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? `No subjects found matching "${searchQuery}"` : 'No subjects available'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2">
              {filteredSubjects.map(subject => {
                const IconComponent = getIconComponent(subject.icon_url);
                return (
                  <Label
                    key={subject.id}
                    htmlFor={subject.id}
                    className={cn(
                      "flex items-center p-4 rounded-lg border bg-background hover:bg-muted/50 transition-colors cursor-pointer",
                      selectedSubjectIds.includes(subject.id) && "border-primary bg-primary/5"
                    )}
                  >
                    <Checkbox
                      id={subject.id}
                      checked={selectedSubjectIds.includes(subject.id)}
                      onCheckedChange={() => handleCheckboxChange(subject.id)}
                      className="mr-4 h-5 w-5"
                    />
                    <div className="flex items-center space-x-3">
                      <div 
                        className="p-2 rounded-lg text-white flex items-center justify-center w-10 h-10"
                        style={{ backgroundColor: subject.color || '#3b82f6' }}
                      >
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="font-semibold text-foreground block">{subject.name}</span>
                        <span className="text-xs text-muted-foreground">{subject.code}</span>
                      </div>
                    </div>
                  </Label>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-8 flex justify-end gap-4">
        <Button variant="outline" asChild>
          <Link href="/teacher/subjects">Cancel</Link>
        </Button>
        <Button onClick={handleSaveChanges} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
