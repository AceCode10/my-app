'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Download, Loader2, Info, Share2, BookOpen, FileText, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { allSubjects } from '@/lib/subjects';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { MarkdownRenderer } from '@/components/notes/markdown-renderer';
import { SectionNavigation, MobileSectionSelector } from '@/components/notes/section-navigation';
import { NotesPDFExport } from '@/components/notes/notes-pdf-export';
import type { Note, NoteSection } from '@/types/notes';

export default function NotesPage({
  params,
}: {
  params: { subject: string; topic: string };
}) {
  const { subject: subjectSlug, topic: topicSlug } = params;
  const router = useRouter();
  const supabase = createClient();
  const { user } = useUser();
  const { toast } = useToast();

  const subjectData = allSubjects.find(s => s.slug === subjectSlug);
  const topicName = useMemo(() => topicSlug.replace(/-/g, ' '), [topicSlug]);
  
  const [noteData, setNoteData] = useState<Note | null>(null);
  const [sections, setSections] = useState<NoteSection[]>([]);
  const [currentSection, setCurrentSection] = useState<NoteSection | null>(null);
  const [completedSectionIds, setCompletedSectionIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    async function fetchNote() {
      try {
        // First try to find by topic_id (legacy format)
        let topicId = `${subjectSlug}-${topicSlug}`;
        
        // Try to get the actual topic from database
        const { data: topicData } = await supabase
          .from('topics')
          .select('id')
          .eq('slug', topicSlug)
          .single();

        if (topicData) {
          topicId = topicData.id;
        }
        
        const { data, error } = await supabase
          .from('notes')
          .select(`
            *,
            subject:subjects(id, name, slug),
            topic:topics(id, name, slug)
          `)
          .or(`topic_id.eq.${topicId},topic_id.eq.${subjectSlug}-${topicSlug}`)
          .eq('visibility', 'public')
          .not('published_at', 'is', null)
          .order('display_order', { ascending: true })
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching note:', error);
        }
        
        if (data) {
          setNoteData(data);
          
          // Fetch sections
          const { data: sectionsData } = await supabase
            .from('note_sections')
            .select('*')
            .eq('note_id', data.id)
            .order('display_order', { ascending: true });

          if (sectionsData && sectionsData.length > 0) {
            // Build hierarchy
            const hierarchy = buildSectionHierarchy(sectionsData);
            setSections(hierarchy);
            setCurrentSection(hierarchy[0]);
          }

          // Fetch user progress if logged in
          if (user) {
            const { data: progressData } = await supabase
              .from('note_progress')
              .select('section_id')
              .eq('user_id', user.id)
              .eq('note_id', data.id)
              .eq('completed', true);

            if (progressData) {
              setCompletedSectionIds(new Set(progressData.map(p => p.section_id).filter(Boolean)));
            }
          }
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchNote();
  }, [subjectSlug, topicSlug, user]);

  function buildSectionHierarchy(sections: NoteSection[]): NoteSection[] {
    const sectionMap = new Map<string, NoteSection>();
    const rootSections: NoteSection[] = [];

    sections.forEach(section => {
      sectionMap.set(section.id, { ...section, children: [] });
    });

    sections.forEach(section => {
      const current = sectionMap.get(section.id)!;
      if (section.parent_section_id) {
        const parent = sectionMap.get(section.parent_section_id);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(current);
        } else {
          rootSections.push(current);
        }
      } else {
        rootSections.push(current);
      }
    });

    return rootSections;
  }

  const handleSectionClick = (section: NoteSection) => {
    setCurrentSection(section);
    setIsSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleShare = async () => {
    const shareData = {
      title: noteData?.title || topicName,
      text: `Check out this revision note: ${noteData?.title || topicName}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: 'Link Copied!',
        description: 'The link to this note has been copied to your clipboard.',
      });
    }
  };

  if (!subjectData) {
    return <div className="text-center py-12">Subject not found.</div>;
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Skeleton className="h-6 w-64 mb-6" />
        <div className="bg-card p-6 sm:p-8 rounded-2xl shadow-sm border">
          <Skeleton className="h-10 w-3/4 mb-4" />
          <Skeleton className="h-5 w-1/2 mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!noteData) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center text-sm text-muted-foreground mb-6">
          <Link href="/resources" className="hover:text-primary">Resources</Link>
          <ChevronRight className="h-4 w-4 mx-1" />
          <Link href={`/subjects/${subjectSlug}`} className="hover:text-primary">{subjectData.name}</Link>
          <ChevronRight className="h-4 w-4 mx-1" />
          <span className="font-medium text-foreground capitalize truncate">{topicName}</span>
        </div>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>No Revision Notes Available</AlertTitle>
          <AlertDescription>
            <p>There are no notes for this topic yet. Check back soon!</p>
            <Link href={`/subjects/${subjectSlug}/${topicSlug}/quiz?from=public`}>
              <Button variant="link" className="px-0 mt-2">
                Try the quiz instead →
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const hasSections = sections.length > 0;
  const currentContent = currentSection?.content_md || noteData.content_md;
  const hasLatex = currentSection?.has_latex || noteData.has_latex;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-muted-foreground mb-6">
        <Link href="/resources" className="hover:text-primary">Resources</Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <Link href={`/subjects/${subjectSlug}`} className="hover:text-primary">{subjectData.name}</Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <span className="font-medium text-foreground capitalize truncate">{topicName}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar - Sections Navigation */}
        {hasSections && (
          <aside className="hidden lg:block lg:w-72 flex-shrink-0">
            <div className="sticky top-24 bg-card rounded-2xl shadow-sm border overflow-hidden">
              <div className="p-4 border-b bg-muted/30">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Sections
                </h3>
              </div>
              <SectionNavigation
                sections={sections}
                currentSectionId={currentSection?.id}
                completedSectionIds={completedSectionIds}
                onSectionClick={handleSectionClick}
                showProgress={!!user}
                className="max-h-[60vh]"
              />
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="bg-card p-6 sm:p-8 rounded-2xl shadow-sm border">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-2">
                {currentSection ? currentSection.title : (noteData.title || topicName)}
              </h1>
              {!currentSection && noteData.subtitle && (
                <p className="text-lg text-muted-foreground">{noteData.subtitle}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {currentSection?.estimated_read_time || noteData.estimated_read_time || 5} min read
                </span>
                {noteData.updated_at && (
                  <span>Updated {format(new Date(noteData.updated_at), 'MMM d, yyyy')}</span>
                )}
                {hasLatex && (
                  <Badge variant="secondary" className="text-xs">Contains Math</Badge>
                )}
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
              {noteData.is_downloadable && (
                <NotesPDFExport 
                  note={noteData} 
                  sections={sections.length > 0 ? flattenSections(sections) : undefined}
                  trigger={
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </Button>
                  }
                />
              )}
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
              <Link href={`/subjects/${subjectSlug}/${topicSlug}/quiz?from=public`}>
                <Button variant="outline" size="sm">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Take Quiz
                </Button>
              </Link>
            </div>

            <Separator />
            
            {/* Content */}
            <div className="mt-6">
              <MarkdownRenderer 
                content={currentContent} 
                hasLatex={hasLatex}
              />
            </div>

            {/* Link to quiz at bottom */}
            <div className="mt-8 pt-6 border-t">
              <div className="bg-muted/50 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Ready to test your knowledge?</h4>
                  <p className="text-sm text-muted-foreground">Take a quiz on this topic</p>
                </div>
                <Link href={`/subjects/${subjectSlug}/${topicSlug}/quiz?from=public`}>
                  <Button>
                    <BookOpen className="mr-2 h-4 w-4" />
                    Start Quiz
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Mobile Section Navigation */}
          {hasSections && (
            <div className="lg:hidden mt-4">
              <MobileSectionSelector
                sections={sections}
                currentSection={currentSection}
                onSectionChange={handleSectionClick}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// Helper to flatten nested sections
function flattenSections(sections: NoteSection[]): NoteSection[] {
  const result: NoteSection[] = [];
  for (const section of sections) {
    result.push(section);
    if (section.children) {
      result.push(...flattenSections(section.children));
    }
  }
  return result;
}
