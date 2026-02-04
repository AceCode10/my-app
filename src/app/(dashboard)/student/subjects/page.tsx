
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SubjectCard } from '@/components/subject-card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle, BookOpen, GraduationCap, Globe, Settings, Trash2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EXAM_BOARDS } from '@/lib/exam-boards';
import { getCountryName } from '@/lib/countries';

const supabase = createClient();

interface UserSubject {
    id: string;
    subject_id: string;
    subjects?: {
        id: string;
        name: string;
        slug: string;
        code: string;
        exam_board_id: string;
        icon_url?: string;
        color?: string;
        display_name?: string;
    } | null;
}

export default function SubjectsPage() {
    const { user, loading: userLoading } = useUser();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [editMode, setEditMode] = useState(false);

    const userExamBoards = user?.exam_boards || [];
    const userLevel = user?.level;
    const userCountry = user?.country;
    const selectedBoardsInfo = EXAM_BOARDS.filter(b => userExamBoards.includes(b.id));

    // Listen for progress updates to refresh subject progress
    useEffect(() => {
        const handleProgressUpdate = () => {
            queryClient.invalidateQueries({ queryKey: ['subject-progress'] });
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('progress_updated', handleProgressUpdate);
            window.addEventListener('xp_earned', handleProgressUpdate);
            return () => {
                window.removeEventListener('progress_updated', handleProgressUpdate);
                window.removeEventListener('xp_earned', handleProgressUpdate);
            };
        }
    }, [queryClient]);

    // Cached user subjects query - filtered by user's preferences
    const { data: userSubjects = [], isLoading } = useQuery({
        queryKey: ['user-subjects', user?.id, user?.level, user?.exam_boards],
        queryFn: async () => {
            if (!user?.id) return [];
            
            let query = supabase
                .from('user_subjects')
                .select('id, subject_id, subjects(id, name, slug, code, exam_board_id, icon_url, color, display_name, level)')
                .eq('user_id', user.id);

            const { data, error } = await query;

            if (error) throw error;
            
            return (data || []).map((item: any) => ({
                id: item.id,
                subject_id: item.subject_id,
                subjects: Array.isArray(item.subjects) ? item.subjects[0] : item.subjects
            })) as UserSubject[];
        },
        enabled: !!user?.id,
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
        gcTime: 15 * 60 * 1000, // 15 minutes
        refetchOnWindowFocus: false, // Don't refetch on window focus
    });

    // Fetch progress for all user subjects
    const { data: subjectProgress = {} } = useQuery({
        queryKey: ['subject-progress', user?.id, userSubjects.map(s => s.subject_id)],
        queryFn: async () => {
            if (!user?.id || userSubjects.length === 0) return {};
            
            const progressMap: Record<string, number> = {};
            
            // Get subject IDs
            const subjectIds = userSubjects.map(us => us.subject_id).filter(Boolean);
            
            // For each subject, calculate progress based on available resources and user activity
            for (const subjectId of subjectIds) {
                // Get total resources for this subject
                const [notesResult, questionsResult, papersResult] = await Promise.all([
                    supabase.from('notes').select('*', { count: 'exact', head: true })
                        .eq('subject_id', subjectId).in('visibility', ['public', 'registered']).not('published_at', 'is', null),
                    supabase.from('questions').select('*', { count: 'exact', head: true })
                        .eq('subject_id', subjectId),
                    supabase.from('past_papers').select('*', { count: 'exact', head: true })
                        .eq('subject_id', subjectId).eq('status', 'published')
                ]);
                
                const totalNotes = notesResult.count || 0;
                const totalQuestions = questionsResult.count || 0;
                const totalPapers = papersResult.count || 0;
                const totalResources = totalNotes + totalQuestions + totalPapers;
                
                if (totalResources === 0) {
                    progressMap[subjectId] = 0;
                    continue;
                }
                
                // Get user's completed resources
                const [topicProgressResult, quizAttemptsResult, paperAttemptsResult] = await Promise.all([
                    supabase.from('user_topic_progress').select('notes_read, questions_attempted')
                        .eq('user_id', user.id).eq('subject_id', subjectId),
                    supabase.from('quiz_attempts').select('*', { count: 'exact', head: true })
                        .eq('user_id', user.id),
                    supabase.from('assessment_attempts').select('*', { count: 'exact', head: true })
                        .eq('user_id', user.id).eq('status', 'completed')
                ]);
                
                const notesRead = topicProgressResult.data?.reduce((sum: number, tp: { notes_read?: number }) => sum + (tp.notes_read || 0), 0) || 0;
                const questionsAnswered = (topicProgressResult.data?.reduce((sum: number, tp: { questions_attempted?: number }) => sum + (tp.questions_attempted || 0), 0) || 0) 
                    + (quizAttemptsResult.count || 0);
                const papersCompleted = paperAttemptsResult.count || 0;
                
                const completedResources = Math.min(notesRead, totalNotes) + Math.min(questionsAnswered, totalQuestions) + Math.min(papersCompleted, totalPapers);
                const progress = Math.round((completedResources / totalResources) * 100);
                
                progressMap[subjectId] = Math.min(progress, 100); // Cap at 100%
            }
            
            return progressMap;
        },
        enabled: !!user?.id && userSubjects.length > 0,
        staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    });

    // Map user's added subjects - use database data directly
    const mySubjects = userSubjects
        .map(us => {
            if (!us.subjects) return null;
            return {
                id: us.subjects.id,
                userSubjectId: us.id, // Keep track of the user_subjects record id for deletion
                name: us.subjects.display_name || us.subjects.name,
                slug: us.subjects.slug,
                code: us.subjects.code,
                icon_url: us.subjects.icon_url,
                color: us.subjects.color || '#3b82f6',
            };
        })
        .filter(Boolean);

    // Mutation for removing a subject
    const removeSubjectMutation = useMutation({
        mutationFn: async (userSubjectId: string) => {
            const { error } = await supabase
                .from('user_subjects')
                .delete()
                .eq('id', userSubjectId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user-subjects'] });
            toast({ title: 'Subject removed', description: 'The subject has been removed from your dashboard.' });
        },
        onError: (error: any) => {
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'Could not remove subject.' });
        },
    });

    // Show loading state while user data is being fetched
    if (userLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-64" />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-[180px] w-full rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with user preferences summary */}
            <div className="flex flex-col gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground">My Subjects</h2>
                    <p className="text-muted-foreground mt-1"></p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    {mySubjects.length > 0 && (
                        <Button 
                            variant={editMode ? "default" : "outline"}
                            onClick={() => setEditMode(!editMode)}
                            className="w-full sm:w-auto"
                        >
                            {editMode ? (
                                <><X className="mr-2 h-4 w-4" />Done</>
                            ) : (
                                <><Trash2 className="mr-2 h-4 w-4" />Edit</>                            )}
                        </Button>
                    )}
                    <Button asChild className="w-full sm:w-auto">
                        <Link href="/student/subjects/add">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Subjects
                        </Link>
                    </Button>
                </div>
            </div>

            {/* User preferences summary card */}
            {(selectedBoardsInfo.length > 0 || userLevel || userCountry) && (
                <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                    <CardContent className="pt-4 pb-4">
                        <div className="flex flex-col gap-3">
                            {userCountry && (
                                <div className="flex items-center gap-2">
                                    <Globe className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">{getCountryName(userCountry)}</span>
                                </div>
                            )}
                            {selectedBoardsInfo.length > 0 && (
                                <div className="flex flex-col gap-2">
                                    <span className="text-sm text-muted-foreground">Exam Boards:</span>
                                    <div className="flex flex-wrap gap-1">
                                        {selectedBoardsInfo.map(board => (
                                            <Badge key={board.id} variant="secondary" className={board.color + ' text-white text-xs'}>
                                                {board.shortName}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {userLevel && (
                                <div className="flex items-center gap-2">
                                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                                    <Badge variant="outline">{userLevel.toUpperCase().replace('_', ' ')}</Badge>
                                </div>
                            )}
                            <Button variant="ghost" size="sm" asChild className="w-full sm:w-auto mt-2">
                                <Link href="/student/settings">
                                    <Settings className="h-4 w-4 mr-1" />
                                    Edit Preferences
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
            
            {/* Subjects Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-[180px] w-full rounded-xl" />
                    ))}
                </div>
            ) : mySubjects.length === 0 ? (
                <Card className="text-center p-8 sm:p-12 border-dashed">
                    <BookOpen className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">No Subjects Selected</h3>
                    <p className="text-muted-foreground max-w-md mx-auto text-sm sm:text-base">
                        {user?.onboarding_completed 
                            ? "You skipped subject selection during setup. Use the 'Add Subjects' button above to get started!"
                            : "Use the 'Add Subjects' button above to add subjects you're studying."
                        }
                    </p>
                </Card>
            ) : (
                <>
                    {/* Selected subjects count */}
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            {mySubjects.length} subject{mySubjects.length !== 1 ? 's' : ''} selected
                        </p>
                    </div>

                    {/* Subject cards grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                        {mySubjects.map((subject) => subject && (
                            <div key={subject.slug} className="relative group">
                                {editMode && (
                                    <button
                                        onClick={() => removeSubjectMutation.mutate(subject.userSubjectId)}
                                        className="absolute -top-2 -right-2 z-10 bg-destructive text-destructive-foreground rounded-full p-1.5 shadow-lg hover:bg-destructive/90 transition-colors"
                                        title="Remove subject"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                                <SubjectCard 
                                    name={subject.name}
                                    code={subject.code}
                                    icon={subject.icon_url}
                                    path={editMode ? '' : `/student/subjects/${subject.slug}`}
                                    color={subject.color}
                                    showProgress={false}
                                    progress={0}
                                />
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
