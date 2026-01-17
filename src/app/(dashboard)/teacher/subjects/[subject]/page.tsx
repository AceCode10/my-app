'use client';

import React, { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { 
  ChevronRight, 
  FileText, 
  BookOpen, 
  Target, 
  ArrowRight, 
  Play,
  Sparkles,
  PenTool,
  Users,
  ClipboardList,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const supabase = createClient();

interface SubjectPageProps {
  params: Promise<{ subject: string }>;
}

export default function TeacherSubjectPage({ params }: SubjectPageProps) {
  const resolvedParams = use(params);
  const subjectSlug = resolvedParams.subject;

  // Fetch subject from database
  const { data: subjectData, isLoading, error } = useQuery({
    queryKey: ['subject', subjectSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select(`
          id,
          name,
          slug,
          code,
          description,
          icon_url,
          color,
          exam_board_id,
          level,
          status
        `)
        .eq('slug', subjectSlug)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch topics for this subject
  const { data: topics = [] } = useQuery({
    queryKey: ['subject-topics', subjectData?.id],
    queryFn: async () => {
      if (!subjectData?.id) return [];
      const { data, error } = await supabase
        .from('topics')
        .select('id, name, slug, description, display_order, status')
        .eq('subject_id', subjectData.id)
        .eq('status', 'published')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!subjectData?.id,
  });

  // Fetch resource counts
  const { data: resourceCounts = { notes: 0, questions: 0, papers: 0 } } = useQuery({
    queryKey: ['teacher-subject-resource-counts', subjectData?.id],
    queryFn: async () => {
      if (!subjectData?.id) return { notes: 0, questions: 0, papers: 0 };
      
      const topicIds = topics.map(t => t.id);
      
      // Count notes
      const { count: notesCount } = await supabase
        .from('notes')
        .select('*', { count: 'exact', head: true })
        .in('topic_id', topicIds.length > 0 ? topicIds : ['none'])
        .eq('visibility', 'public')
        .not('published_at', 'is', null);

      // Count questions
      const { count: questionsCount } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .in('topic_id', topicIds.length > 0 ? topicIds : ['none']);

      // Count past papers
      const { count: papersCount } = await supabase
        .from('past_papers')
        .select('*', { count: 'exact', head: true })
        .eq('subject_id', subjectData.id)
        .eq('status', 'published');

      return {
        notes: notesCount || 0,
        questions: questionsCount || 0,
        papers: papersCount || 0
      };
    },
    enabled: !!subjectData?.id && topics.length >= 0,
  });

  // Resource cards configuration - for students/viewing
  const resourceCards = [
    {
      title: 'Revision Notes',
      description: 'Comprehensive study notes with clear explanations and examples',
      icon: BookOpen,
      href: `/resources/revision-notes/${subjectSlug}`,
      count: resourceCounts.notes,
      countLabel: 'notes',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'hover:border-blue-500/50',
      gradient: 'from-blue-500/20 to-blue-600/5',
    },
    {
      title: 'Topical Questions',
      description: 'Practice questions organized by topic to master each concept',
      icon: Target,
      href: `/resources/topical-questions/${subjectSlug}`,
      count: resourceCounts.questions,
      countLabel: 'questions',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'hover:border-emerald-500/50',
      gradient: 'from-emerald-500/20 to-emerald-600/5',
    },
    {
      title: 'Past Papers',
      description: 'Official exam papers with mark schemes and examiner reports',
      icon: FileText,
      href: `/resources/past-papers/${subjectSlug}`,
      count: resourceCounts.papers,
      countLabel: 'papers',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'hover:border-purple-500/50',
      gradient: 'from-purple-500/20 to-purple-600/5',
    },
  ];

  // Teacher action cards
  const teacherActions = [
    {
      title: 'Manage Notes',
      description: 'Create and edit revision notes for your students',
      icon: PenTool,
      href: `/teacher/notes?subject=${subjectSlug}`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/50',
    },
    {
      title: 'Question Bank',
      description: 'Browse and manage practice questions',
      icon: Target,
      href: `/teacher/questions?subject=${subjectSlug}`,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/50',
    },
    {
      title: 'Create Test',
      description: 'Build custom assessments for your classes',
      icon: ClipboardList,
      href: `/teacher/test-builder/new?subject=${subjectSlug}`,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100 dark:bg-amber-900/50',
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-6 w-48" />
        <div className="text-center space-y-4">
          <Skeleton className="h-20 w-20 rounded-2xl mx-auto" />
          <Skeleton className="h-10 w-64 mx-auto" />
          <Skeleton className="h-6 w-32 mx-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-52 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (error || !subjectData) {
    return (
      <div className="text-center py-20">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-muted mb-6">
          <BookOpen className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Subject not found</h2>
        <p className="text-muted-foreground mb-6">The subject you're looking for doesn't exist or has been removed.</p>
        <Link href="/teacher/subjects">
          <Button size="lg">
            <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
            Back to Subjects
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-muted-foreground">
        <Link href="/teacher/subjects" className="hover:text-primary transition-colors">My Subjects</Link>
        <ChevronRight className="h-4 w-4 mx-2" />
        <span className="font-medium text-foreground">{subjectData.name}</span>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border p-8 md:p-12">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 mb-6 shadow-lg">
            <BookOpen className="w-10 h-10 text-primary" />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-3">
            {subjectData.name}
          </h1>
          
          {subjectData.code && (
            <Badge variant="secondary" className="text-base px-4 py-1.5 mb-4">
              Syllabus: {subjectData.code}
            </Badge>
          )}
          
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Manage resources and create assessments for your students.
          </p>
        </div>
      </div>

      {/* Teacher Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Teacher Actions</h2>
        <p className="text-muted-foreground mb-6">Manage content and create assessments</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {teacherActions.map((action) => (
            <Link key={action.title} href={action.href}>
              <div className="bg-card p-5 rounded-xl border hover:border-primary/50 hover:shadow-lg transition-all duration-200 group h-full">
                <div className="flex items-center gap-4">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", action.bgColor)}>
                    <action.icon className={cn("w-6 h-6", action.color)} />
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Resource Cards */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Study Resources</h2>
        <p className="text-muted-foreground mb-6">Browse available resources for this subject</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {resourceCards.map((resource) => (
            <Link key={resource.title} href={resource.href}>
              <div className={cn(
                "relative overflow-hidden bg-card p-6 rounded-2xl border-2 border-transparent transition-all duration-300 h-full flex flex-col group",
                "hover:shadow-xl hover:-translate-y-1",
                resource.borderColor
              )}>
                {/* Gradient background */}
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                  resource.gradient
                )} />
                
                <div className="relative z-10">
                  <div className={cn(
                    "w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110",
                    resource.bgColor
                  )}>
                    <resource.icon className={cn("w-7 h-7", resource.color)} />
                  </div>
                  
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-xl text-foreground">{resource.title}</h3>
                    {resource.count > 0 && (
                      <Badge variant="secondary" className="font-semibold">
                        {resource.count}
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-muted-foreground text-sm flex-grow mb-4">
                    {resource.description}
                  </p>
                  
                  <div className={cn(
                    "flex items-center font-semibold transition-all group-hover:gap-3",
                    resource.color
                  )}>
                    <span>Explore {resource.title}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Topics Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">Topics</h2>
            <p className="text-muted-foreground">
              {topics.length} topics available for {subjectData.name}
            </p>
          </div>
          {topics.length > 6 && (
            <Link href={`/resources/topical-questions/${subjectSlug}`}>
              <Button variant="outline">
                View All Topics
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          )}
        </div>
        
        {topics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topics.slice(0, 9).map((topic: any, index: number) => (
              <Link 
                key={topic.id} 
                href={`/resources/topical-questions/${subjectSlug}/${topic.slug}`}
              >
                <div className="bg-card p-5 rounded-xl border hover:border-primary/50 hover:shadow-md transition-all duration-200 group h-full">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-grow min-w-0">
                      <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {topic.name}
                      </h4>
                      {topic.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {topic.description}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-card rounded-2xl border">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-4">
              <BookOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No Topics Available Yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Topics for {subjectData.name} are being added. Check back soon!
            </p>
          </div>
        )}
      </div>

      {/* Quick Start Section */}
      {(resourceCounts.papers > 0 || resourceCounts.questions > 0) && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-background border p-8">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-xl text-foreground">Preview Resources</h3>
                <p className="text-muted-foreground">
                  View resources as your students would see them
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              {resourceCounts.questions > 0 && (
                <Link href={`/resources/topical-questions/${subjectSlug}`}>
                  <Button size="lg" className="shadow-lg">
                    <Play className="w-4 h-4 mr-2" />
                    Topical Questions
                  </Button>
                </Link>
              )}
              {resourceCounts.papers > 0 && (
                <Link href={`/resources/past-papers/${subjectSlug}`}>
                  <Button size="lg" variant="outline">
                    <FileText className="w-4 h-4 mr-2" />
                    Past Papers
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-xl border text-center">
          <div className="text-3xl font-bold text-primary mb-1">{topics.length}</div>
          <div className="text-sm text-muted-foreground">Topics</div>
        </div>
        <div className="bg-card p-4 rounded-xl border text-center">
          <div className="text-3xl font-bold text-blue-500 mb-1">{resourceCounts.notes}</div>
          <div className="text-sm text-muted-foreground">Notes</div>
        </div>
        <div className="bg-card p-4 rounded-xl border text-center">
          <div className="text-3xl font-bold text-emerald-500 mb-1">{resourceCounts.questions}</div>
          <div className="text-sm text-muted-foreground">Questions</div>
        </div>
        <div className="bg-card p-4 rounded-xl border text-center">
          <div className="text-3xl font-bold text-purple-500 mb-1">{resourceCounts.papers}</div>
          <div className="text-sm text-muted-foreground">Past Papers</div>
        </div>
      </div>
    </div>
  );
}
