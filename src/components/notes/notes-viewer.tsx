'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { 
  BookOpen, 
  Download, 
  Share2, 
  Bookmark, 
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Clock,
  CheckCircle2,
  Loader2,
  Search,
  Printer,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { MarkdownRenderer } from './markdown-renderer';
import { SectionNavigation, MobileSectionSelector } from './section-navigation';
import type { Note, NoteSection, NoteProgress } from '@/types/notes';
import { 
  getNoteSections, 
  updateNoteProgress, 
  markSectionComplete,
  addBookmark,
  removeBookmark,
  isNoteBookmarked,
  incrementViewCount
} from '@/lib/supabase/notes';

interface NotesViewerProps {
  note: Note;
  userId?: string | null;
  onBack?: () => void;
  showBackButton?: boolean;
  className?: string;
}

export function NotesViewer({
  note,
  userId,
  onBack,
  showBackButton = true,
  className
}: NotesViewerProps) {
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const readingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [sections, setSections] = useState<NoteSection[]>([]);
  const [currentSection, setCurrentSection] = useState<NoteSection | null>(null);
  const [completedSectionIds, setCompletedSectionIds] = useState<Set<string>>(new Set());
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [readingTime, setReadingTime] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Load sections and progress
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const loadedSections = await getNoteSections(note.id);
        setSections(loadedSections);
        
        // Set first section as current if available
        if (loadedSections.length > 0) {
          setCurrentSection(loadedSections[0]);
        }

        // Check bookmark status
        if (userId) {
          const bookmarked = await isNoteBookmarked(userId, note.id);
          setIsBookmarked(bookmarked);
        }

        // Increment view count
        await incrementViewCount(note.id);
      } catch (error) {
        console.error('Error loading note data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [note.id, userId]);

  // Track reading time
  useEffect(() => {
    if (!userId || !currentSection) return;

    readingTimerRef.current = setInterval(() => {
      setReadingTime(prev => prev + 1);
    }, 1000);

    return () => {
      if (readingTimerRef.current) {
        clearInterval(readingTimerRef.current);
      }
    };
  }, [userId, currentSection]);

  // Save reading progress periodically
  useEffect(() => {
    if (!userId || readingTime === 0 || readingTime % 30 !== 0) return;

    updateNoteProgress(userId, note.id, currentSection?.id || null, {
      time_spent_seconds: 30
    }).catch(console.error);
  }, [readingTime, userId, note.id, currentSection]);

  const handleSectionClick = useCallback((section: NoteSection) => {
    setCurrentSection(section);
    setIsSidebarOpen(false);
    
    // Scroll to top of content
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const handleMarkComplete = useCallback(async () => {
    if (!userId || !currentSection) return;

    try {
      await markSectionComplete(userId, note.id, currentSection.id);
      setCompletedSectionIds(prev => new Set([...prev, currentSection.id]));
      
      toast({
        title: 'Section completed!',
        description: 'Your progress has been saved.'
      });

      // Auto-advance to next section
      const flatSections = flattenSections(sections);
      const currentIndex = flatSections.findIndex(s => s.id === currentSection.id);
      if (currentIndex < flatSections.length - 1) {
        setCurrentSection(flatSections[currentIndex + 1]);
      }
    } catch (error) {
      console.error('Error marking section complete:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save progress.'
      });
    }
  }, [userId, note.id, currentSection, sections, toast]);

  const handleToggleBookmark = useCallback(async () => {
    if (!userId) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to bookmark notes.'
      });
      return;
    }

    try {
      if (isBookmarked) {
        await removeBookmark(userId, note.id);
        setIsBookmarked(false);
        toast({ title: 'Bookmark removed' });
      } else {
        await addBookmark(userId, note.id);
        setIsBookmarked(true);
        toast({ title: 'Note bookmarked!' });
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  }, [userId, note.id, isBookmarked, toast]);

  const handleShare = useCallback(async () => {
    const shareData = {
      title: note.title,
      text: note.subtitle || `Check out this note: ${note.title}`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: 'Link copied!',
        description: 'The link has been copied to your clipboard.'
      });
    }
  }, [note, toast]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Handle scroll progress tracking and auto-complete
  useEffect(() => {
    let completionTriggered = false;
    
    const handleScroll = () => {
      if (!contentRef.current) return;
      
      const element = contentRef.current;
      const scrollTop = element.scrollTop;
      const scrollHeight = element.scrollHeight - element.clientHeight;
      
      if (scrollHeight > 0) {
        const progress = (scrollTop / scrollHeight) * 100;
        setScrollProgress(Math.min(progress, 100));
        
        // Auto-save progress when user reaches 90%+ of the content
        if (progress >= 90 && !completionTriggered && userId) {
          completionTriggered = true;
          
          // If viewing a section, mark it complete
          if (currentSection) {
            markSectionComplete(userId, note.id, currentSection.id)
              .then(() => {
                setCompletedSectionIds(prev => new Set([...prev, currentSection.id]));
              })
              .catch(console.error);
          } else {
            // If viewing main note (no sections), mark the note as complete
            updateNoteProgress(userId, note.id, null, { completed: true })
              .catch(console.error);
          }
        }
      }
    };

    const element = contentRef.current;
    if (element) {
      element.addEventListener('scroll', handleScroll);
      return () => element.removeEventListener('scroll', handleScroll);
    }
  }, [isLoading, userId, note.id, currentSection]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if ((containerRef.current as any)?.webkitRequestFullscreen) {
        (containerRef.current as any).webkitRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
      setIsFullscreen(false);
    }
  }, [isFullscreen]);

  // Listen for fullscreen changes (ESC key)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Get current content to display
  const currentContent = currentSection?.content_md || note.content_md;
  const hasLatex = currentSection?.has_latex || note.has_latex;
  const hasSections = sections.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn(
        'flex flex-col lg:flex-row min-h-screen relative',
        isFullscreen && 'bg-background',
        className
      )}
    >
      {/* Progress Border - Green border that fills as you scroll */}
      <div
        className="fixed top-0 left-0 right-0 h-1 z-50 pointer-events-none"
        style={{
          background: `linear-gradient(to right, rgb(34, 197, 94) ${scrollProgress}%, transparent ${scrollProgress}%)`,
          transition: 'background 0.1s ease-out',
        }}
      />
      <div
        className="fixed right-0 top-0 bottom-0 w-1 z-50 pointer-events-none"
        style={{
          background: `linear-gradient(to bottom, rgb(34, 197, 94) ${scrollProgress}%, transparent ${scrollProgress}%)`,
          transition: 'background 0.1s ease-out',
        }}
      />
      <div
        className="fixed bottom-0 left-0 right-0 h-1 z-50 pointer-events-none"
        style={{
          background: `linear-gradient(to left, rgb(34, 197, 94) ${scrollProgress}%, transparent ${scrollProgress}%)`,
          transition: 'background 0.1s ease-out',
        }}
      />
      <div
        className="fixed left-0 top-0 bottom-0 w-1 z-50 pointer-events-none"
        style={{
          background: `linear-gradient(to top, rgb(34, 197, 94) ${scrollProgress}%, transparent ${scrollProgress}%)`,
          transition: 'background 0.1s ease-out',
        }}
      />

      {/* Fullscreen Toggle Button */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-2">
        {scrollProgress > 0 && (
          <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg text-center">
            {Math.round(scrollProgress)}%
          </div>
        )}
        <Button
          onClick={toggleFullscreen}
          size="lg"
          variant="secondary"
          className="h-12 w-12 rounded-full shadow-lg"
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen mode'}
        >
          {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar - Desktop */}
      {hasSections && (
        <aside className="hidden lg:flex lg:flex-col lg:w-80 lg:border-r lg:bg-background">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-lg truncate">{note.title}</h2>
            {note.subtitle && (
              <p className="text-sm text-muted-foreground truncate">{note.subtitle}</p>
            )}
          </div>
          <SectionNavigation
            sections={sections}
            currentSectionId={currentSection?.id}
            completedSectionIds={completedSectionIds}
            onSectionClick={handleSectionClick}
            className="flex-1"
          />
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              {/* Mobile Menu */}
              {hasSections && (
                <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="lg:hidden">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 p-0">
                    <div className="p-4 border-b">
                      <h2 className="font-semibold text-lg truncate">{note.title}</h2>
                    </div>
                    <SectionNavigation
                      sections={sections}
                      currentSectionId={currentSection?.id}
                      completedSectionIds={completedSectionIds}
                      onSectionClick={handleSectionClick}
                      className="h-[calc(100vh-80px)]"
                    />
                  </SheetContent>
                </Sheet>
              )}

              {showBackButton && onBack && (
                <Button variant="ghost" size="sm" onClick={onBack}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              )}

              {/* Current Section Title */}
              {currentSection && (
                <div className="hidden sm:block">
                  <h1 className="font-medium truncate max-w-[300px]">
                    {currentSection.title}
                  </h1>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleBookmark}
                title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
              >
                {isBookmarked ? (
                  <BookmarkCheck className="h-5 w-5 text-primary" />
                ) : (
                  <Bookmark className="h-5 w-5" />
                )}
              </Button>
              <Button variant="ghost" size="icon" onClick={handleShare} title="Share">
                <Share2 className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handlePrint} title="Print" className="hidden sm:flex">
                <Printer className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Mobile Section Title */}
          {currentSection && (
            <div className="sm:hidden px-4 pb-2">
              <h1 className="font-medium text-lg">{currentSection.title}</h1>
            </div>
          )}
        </header>

        {/* Content */}
        <div 
          ref={contentRef}
          className="flex-1 overflow-y-auto"
        >
          <article className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            {/* Note Header (when no sections or showing main note) */}
            {!currentSection && (
              <header className="mb-8">
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
                  {note.title}
                </h1>
                {note.subtitle && (
                  <p className="text-xl text-muted-foreground">{note.subtitle}</p>
                )}
                <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {note.estimated_read_time} min read
                  </span>
                  {note.view_count > 0 && (
                    <span>{note.view_count} views</span>
                  )}
                </div>
              </header>
            )}

            {/* Markdown Content */}
            <MarkdownRenderer 
              content={currentContent} 
              hasLatex={hasLatex}
            />

            {/* Section Footer */}
            {currentSection && userId && (
              <div className="mt-12 pt-6 border-t">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {completedSectionIds.has(currentSection.id) ? (
                      <span className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        Completed
                      </span>
                    ) : (
                      <span>Mark as complete when you're done</span>
                    )}
                  </div>
                  {!completedSectionIds.has(currentSection.id) && (
                    <Button onClick={handleMarkComplete}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Mark Complete
                    </Button>
                  )}
                </div>
              </div>
            )}
          </article>
        </div>

        {/* Mobile Navigation */}
        {hasSections && (
          <div className="lg:hidden">
            <MobileSectionSelector
              sections={sections}
              currentSection={currentSection}
              onSectionChange={handleSectionClick}
            />
          </div>
        )}
      </main>
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

export default NotesViewer;
