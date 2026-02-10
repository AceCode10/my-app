'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ChevronRight, ChevronLeft, Download, Loader2, Info, Bookmark, Share2, ArrowLeft, PanelLeft, PanelLeftClose } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';
import type { Note } from '@/types/notes';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { allSubjects } from '@/lib/subjects';
import { format } from 'date-fns';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { FullscreenNotesViewer } from '@/components/notes/fullscreen-notes-viewer';
import { SplitCardRenderer } from '@/components/notes/markdown-renderer';

export default function NotesPage({
  params,
}: {
  params: { subject: string; topic: string };
}) {
  const { subject: subjectSlug, topic: topicSlug } = params;
  const pathname = usePathname();
  const supabase = createClient();
  const { user } = useUser();
  const { toast } = useToast();
  const noteContentRef = useRef<HTMLDivElement>(null);

  const subjectData = allSubjects.find(s => s.slug === subjectSlug);
  const topicName = useMemo(() => topicSlug.replace(/-/g, ' '), [topicSlug]);
  
  const [noteData, setNoteData] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedNoteIds, setSavedNoteIds] = useState<string[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const isNoteSaved = useMemo(() => savedNoteIds.includes(noteData?.id || ''), [savedNoteIds, noteData]);

  // Compute prev/next topics for navigation
  const topics = subjectData?.topics || [];
  const currentTopicIndex = topics.findIndex(t => t.name.toLowerCase().replace(/ /g, '-') === topicSlug);
  const prevTopic = currentTopicIndex > 0 ? topics[currentTopicIndex - 1] : null;
  const nextTopic = currentTopicIndex < topics.length - 1 ? topics[currentTopicIndex + 1] : null;

  useEffect(() => {
    async function fetchNote() {
      const topicId = `${subjectSlug}-${topicSlug}`;
      
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('topic_id', topicId)
        .in('visibility', ['public', 'registered', 'premium'])
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching note:', error);
      }
      
      setNoteData(data);
      setIsLoading(false);

      // Increment view count
      if (data) {
        await supabase
          .from('notes')
          .update({ view_count: (data.view_count || 0) + 1 })
          .eq('id', data.id);
      }
    }

    async function fetchSavedNotes() {
      if (!user) return;
      
      const { data } = await supabase
        .from('users')
        .select('saved_note_ids')
        .eq('id', user.id)
        .single();

      if (data?.saved_note_ids) {
        setSavedNoteIds(data.saved_note_ids);
      }
    }

    fetchNote();
    fetchSavedNotes();
  }, [subjectSlug, topicSlug, user]);

  if (!subjectData) {
    return <div>Subject not found.</div>;
  }

  const handleDownloadPdf = async () => {
    if (!noteContentRef.current) return;
    setIsPdfLoading(true);

    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const element = noteContentRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: element.scrollWidth,
      });

      const a4Width = 595;
      const a4Height = 842;
      const margin = 40;
      const contentWidth = a4Width - margin * 2;
      const ratio = contentWidth / canvas.width;
      const scaledHeight = canvas.height * ratio;

      const pdf = new jsPDF('p', 'pt', 'a4');
      const pageContentHeight = a4Height - margin * 2;
      let yOffset = 0;
      let pageNum = 0;

      while (yOffset < scaledHeight) {
        if (pageNum > 0) pdf.addPage();
        pdf.addImage(
          canvas.toDataURL('image/png'),
          'PNG',
          margin,
          margin - yOffset,
          contentWidth,
          scaledHeight
        );
        yOffset += pageContentHeight;
        pageNum++;
      }

      pdf.save(`${topicSlug}-revision-note.pdf`);
      toast({ title: 'PDF Downloaded', description: 'Your revision notes have been saved as a PDF.' });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        variant: 'destructive',
        title: 'PDF Export Failed',
        description: 'Could not generate PDF. Please try again.'
      });
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handleSaveNote = async () => {
    if (!user || !noteData) {
      toast({
        variant: 'destructive',
        title: 'Not Logged In',
        description: 'You need to be logged in to save notes.',
      });
      return;
    }
    setIsSaving(true);
    
    try {
      let newSavedIds: string[];
      if (isNoteSaved) {
        newSavedIds = savedNoteIds.filter(id => id !== noteData.id);
        toast({ title: 'Note Unsaved', description: 'Removed from your saved notes.' });
      } else {
        newSavedIds = [...savedNoteIds, noteData.id];
        toast({ title: 'Note Saved!', description: 'You can find it in your dashboard.' });
      }

      await supabase
        .from('users')
        .update({ saved_note_ids: newSavedIds })
        .eq('id', user.id);

      setSavedNoteIds(newSavedIds);
    } catch (error) {
      console.error("Error saving note:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save the note.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    if (noteData) {
      const shareData = {
        title: noteData.title,
        text: `Check out this revision note: ${noteData.title}`,
        url: window.location.href,
      };

      if (navigator.share) {
        try {
          await navigator.share(shareData);
        } catch (error) {
          console.error('Error sharing:', error);
        }
      } else {
        navigator.clipboard.writeText(window.location.href);
        toast({
          title: 'Link Copied!',
          description: 'The link to this note has been copied to your clipboard.',
        });
      }
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
          <div className="space-y-4 pt-4">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      );
    }
    
    if (!noteData?.content_md && !noteData?.rendered_html) {
      return (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>No Revision Note Available</AlertTitle>
          <AlertDescription>
            <p>There are no notes for this topic yet. Please check back later.</p>
          </AlertDescription>
        </Alert>
      )
    }

    return (
      <div ref={noteContentRef}>
        {noteData?.content_md ? (
          <SplitCardRenderer
            content={noteData.content_md}
            hasLatex={noteData.has_latex || false}
          />
        ) : noteData?.rendered_html ? (
          <div className="bg-card rounded-2xl border shadow-sm p-6 sm:p-8">
            <div 
              className="prose dark:prose-invert max-w-none prose-headings:font-bold prose-headings:text-foreground prose-h2:text-2xl prose-h3:text-xl"
              dangerouslySetInnerHTML={{ __html: noteData.rendered_html }}
            />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <FullscreenNotesViewer noteTitle={noteData?.title || topicName}>
      <div>
        <div className="flex items-center text-sm text-muted-foreground mb-6">
          <Link href="/student/subjects" className="hover:text-primary">Subjects</Link>
          <ChevronRight className="h-4 w-4 mx-1" />
          <Link href={`/student/subjects/${subjectSlug}`} className="hover:text-primary">{subjectData.name}</Link>
          <ChevronRight className="h-4 w-4 mx-1" />
          <span className="font-medium text-foreground capitalize truncate">{topicName}</span>
        </div>

        <div className="flex gap-8 items-start">
          {/* Desktop sidebar - collapsible */}
          <aside className={cn(
            "hidden lg:block flex-shrink-0 transition-all duration-300",
            sidebarCollapsed ? "w-0" : "w-64"
          )}>
            {!sidebarCollapsed && (
              <div className="bg-card p-4 rounded-2xl shadow-sm border sticky top-24">
                <div className="flex items-center justify-between mb-2">
                  <Button variant="ghost" className="flex-1 justify-start" asChild>
                    <Link href={`/student/subjects/${subjectSlug}`}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to {subjectData.name}
                    </Link>
                  </Button>
                  <button
                    onClick={() => setSidebarCollapsed(true)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Hide sidebar"
                  >
                    <PanelLeftClose className="h-4 w-4" />
                  </button>
                </div>
                <h3 className="font-bold text-lg text-foreground px-2 mb-2 mt-2">Topics</h3>
                <nav className="flex flex-col space-y-1">
                  {subjectData.topics?.map(t => {
                    const currentTopicSlug = t.name.toLowerCase().replace(/ /g, '-');
                    const href = `/student/subjects/${subjectSlug}/${currentTopicSlug}/notes`;
                    const isActive = pathname === href;
                    return (
                      <Link href={href} key={t.name}>
                        <div className={cn(
                          "p-2 rounded-md text-sm font-medium transition-colors",
                          isActive 
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}>
                          {t.name}
                        </div>
                      </Link>
                    )
                  })}
                </nav>
              </div>
            )}
          </aside>

          {/* Mobile sidebar */}
          <div className="lg:hidden mb-4">
            <Collapsible defaultOpen={false}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm">
                  <PanelLeft className="h-4 w-4 mr-2" />
                  Show Topics
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <div className="bg-card p-4 rounded-2xl shadow-sm border">
                  <nav className="flex flex-col space-y-1">
                    {subjectData.topics?.map(t => {
                      const currentTopicSlug = t.name.toLowerCase().replace(/ /g, '-');
                      const href = `/student/subjects/${subjectSlug}/${currentTopicSlug}/notes`;
                      const isActive = pathname === href;
                      return (
                        <Link href={href} key={t.name}>
                          <div className={cn(
                            "p-2 rounded-md text-sm font-medium transition-colors",
                            isActive 
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}>
                            {t.name}
                          </div>
                        </Link>
                      )
                    })}
                  </nav>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <main className="flex-1 min-w-0 space-y-6">
            {/* Desktop: show sidebar button when collapsed */}
            {sidebarCollapsed && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSidebarCollapsed(false)}
                className="hidden lg:flex mb-2"
              >
                <PanelLeft className="h-4 w-4 mr-2" />
                Show Topics
              </Button>
            )}
            {/* Header card with title and actions */}
            <div className="bg-card p-6 sm:p-8 rounded-2xl shadow-sm border">
              <div className="mb-4">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-2 capitalize">
                  {noteData?.title || `${topicName}`}
                </h1>
                <p className="text-lg text-muted-foreground">{noteData?.subtitle || subjectData.topics?.find(t => t.name.toLowerCase().replace(/ /g, '-') === topicSlug)?.description}</p>
                {noteData?.updated_at && <p className="text-xs text-muted-foreground mt-2">Last updated: {format(new Date(noteData.updated_at), 'PPP')}</p>}
              </div>
              
              <div className="flex items-center gap-2">
                <Button onClick={handleDownloadPdf} disabled={isPdfLoading || (!noteData?.content_md && !noteData?.rendered_html)}>
                  {isPdfLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4" />}
                  Download PDF
                </Button>
                <Button variant="outline" onClick={handleSaveNote} disabled={isSaving || !user}>
                  <Bookmark className={cn("mr-2 h-4 w-4", isNoteSaved && "fill-current")} />
                  {isSaving ? 'Saving...' : (isNoteSaved ? 'Saved' : 'Save')}
                </Button>
                <Button variant="outline" onClick={handleShare}><Share2 className="mr-2 h-4 w-4"/>Share</Button>
              </div>
            </div>

            {/* Note content - split into cards at ## headings */}
            {renderContent()}

            {/* Previous / Next Topic Navigation */}
            <div className="flex items-center justify-between mt-8 gap-4">
              {prevTopic ? (
                <Button variant="outline" asChild className="flex-1 sm:flex-none">
                  <Link href={`/student/subjects/${subjectSlug}/${prevTopic.name.toLowerCase().replace(/ /g, '-')}/notes`}>
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    <div className="text-left">
                      <div className="text-xs text-muted-foreground">Previous</div>
                      <div className="text-sm font-medium truncate max-w-[150px]">{prevTopic.name}</div>
                    </div>
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" asChild>
                  <Link href={`/student/subjects/${subjectSlug}`}>
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    All Topics
                  </Link>
                </Button>
              )}

              {nextTopic ? (
                <Button variant="outline" asChild className="flex-1 sm:flex-none">
                  <Link href={`/student/subjects/${subjectSlug}/${nextTopic.name.toLowerCase().replace(/ /g, '-')}/notes`}>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Next</div>
                      <div className="text-sm font-medium truncate max-w-[150px]">{nextTopic.name}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              ) : (
                <div />
              )}
            </div>
          </main>
        </div>
      </div>
    </FullscreenNotesViewer>
  );
}
