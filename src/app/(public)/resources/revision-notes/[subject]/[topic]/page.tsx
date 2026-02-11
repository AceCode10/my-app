'use client';

import React, { useEffect, useState, useRef, use } from 'react';
import Link from 'next/link';
import { ChevronRight, ChevronLeft, ChevronDown, BookOpen, Download, Share2, Bookmark, BookmarkCheck, Loader2, Menu, PanelLeftClose, PanelLeft } from 'lucide-react';
import Image from 'next/image';
import { getIconComponent } from '@/lib/icon-mapper';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { MarkdownRenderer, SplitCardRenderer } from '@/components/notes/markdown-renderer';
import { ReactPDFViewer } from '@/components/notes/react-pdf-viewer';

interface Note {
  id: string;
  title: string;
  subtitle?: string;
  slug: string;
  content_md: string;
  rendered_html?: string;
  pdf_url?: string;
  view_count: number;
  visibility: string;
  tags?: string[];
  is_downloadable: boolean;
  has_latex?: boolean;
  created_at: string;
  updated_at: string;
}

interface Topic {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parent_topic_id?: string | null;
  display_order?: number;
}

interface Subject {
  id: string;
  name: string;
  slug: string;
  code?: string;
  icon_url?: string;
  color?: string;
}

// Derive a short abbreviation from the subject name
// e.g. "Information and Communication Technology" → "ICT"
function getSubjectAbbreviation(name: string): string {
  const stopWords = ['and', 'the', 'of', 'in', 'for', 'with', 'to', 'a', 'an'];
  const words = name.split(/\s+/).filter(w => !stopWords.includes(w.toLowerCase()));
  if (words.length <= 2) return name;
  return words.map(w => w[0]).join('').toUpperCase();
}

export default function TopicNotesPage({
  params,
}: {
  params: Promise<{ subject: string; topic: string }>;
}) {
  const { subject: subjectSlug, topic: topicSlug } = use(params);
  const supabase = createClient();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  
  const [subject, setSubject] = useState<Subject | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [allTopics, setAllTopics] = useState<Topic[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  // Find adjacent topics for prev/next navigation
  const currentTopicIndex = allTopics.findIndex(t => t.slug === topicSlug);
  const prevTopic = currentTopicIndex > 0 ? allTopics[currentTopicIndex - 1] : null;
  const nextTopic = currentTopicIndex < allTopics.length - 1 ? allTopics[currentTopicIndex + 1] : null;

  useEffect(() => {
    fetchData();
  }, [subjectSlug, topicSlug]);

  async function fetchData() {
    try {
      setIsLoading(true);

      // Fetch subject
      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects')
        .select('*')
        .eq('slug', subjectSlug)
        .single();

      if (subjectError || !subjectData) {
        throw new Error('Subject not found');
      }
      setSubject(subjectData);

      // Fetch topic
      const { data: topicData, error: topicError } = await supabase
        .from('topics')
        .select('*')
        .eq('subject_id', subjectData.id)
        .or(`slug.eq.${topicSlug},name.ilike.${topicSlug.replace(/-/g, ' ')}`)
        .single();

      if (topicError || !topicData) {
        throw new Error('Topic not found');
      }
      setTopic(topicData);

      // Fetch all topics for this subject (for sidebar navigation) including parent_topic_id
      const { data: allTopicsData } = await supabase
        .from('topics')
        .select('id, name, slug, display_order, parent_topic_id')
        .eq('subject_id', subjectData.id)
        .order('display_order', { ascending: true });

      setAllTopics(allTopicsData || []);

      // Auto-expand the parent topic that contains the current topic
      if (allTopicsData && topicData) {
        const currentTopic = allTopicsData.find((t: Topic) => t.id === topicData.id);
        if (currentTopic?.parent_topic_id) {
          setExpandedTopics(prev => new Set([...prev, currentTopic.parent_topic_id!]));
        }
      }

      // Fetch notes for this topic
      const { data: notesData, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .eq('topic_id', topicData.id)
        .eq('visibility', 'public')
        .not('published_at', 'is', null)
        .order('display_order', { ascending: true });

      if (notesError) {
        throw notesError;
      }

      setNotes(notesData || []);
      
      // Select the first note by default
      if (notesData && notesData.length > 0) {
        setSelectedNote(notesData[0]);
        // Increment view count
        await supabase
          .from('notes')
          .update({ view_count: (notesData[0].view_count || 0) + 1 })
          .eq('id', notesData[0].id);
      }

      setError(null);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load notes');
    } finally {
      setIsLoading(false);
    }
  }

  const handleDownloadPdf = async () => {
    if (!selectedNote || !contentRef.current) return;
    
    setIsDownloading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      
      const element = contentRef.current;
      
      // Capture at 3x scale for sharp text
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        logging: false,
        windowWidth: element.scrollWidth,
        backgroundColor: '#ffffff',
      });
      
      // A4 dimensions in points (72 dpi)
      const a4Width = 595.28;
      const a4Height = 841.89;
      const margin = 40;
      const footerHeight = 30;
      const contentWidth = a4Width - margin * 2;
      const pageContentHeight = a4Height - margin - footerHeight - margin;
      
      // Scale factor: how the canvas maps to PDF content area
      const ratio = contentWidth / canvas.width;
      const totalScaledHeight = canvas.height * ratio;
      
      const pdf = new jsPDF('p', 'pt', 'a4');
      
      // Calculate total pages
      const totalPages = Math.ceil(totalScaledHeight / pageContentHeight);
      
      // Helper: add footer to current page
      const addFooter = (pageNum: number) => {
        const footerY = a4Height - margin;
        
        // Thin line above footer
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.5);
        pdf.line(margin, footerY - 12, a4Width - margin, footerY - 12);
        
        // Page number - left aligned
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(120, 120, 120);
        pdf.text(`Page ${pageNum}`, margin, footerY);
        
        // Copyright - center aligned
        pdf.text('\u00A9 2026 IGA Prep', a4Width / 2, footerY, { align: 'center' });
        
        // "For more, visit igaprep.com" - right aligned with link
        const rightText = 'For more, visit ';
        const linkText = 'igaprep.com';
        const rightTextWidth = pdf.getTextWidth(rightText);
        const linkTextWidth = pdf.getTextWidth(linkText);
        const totalRightWidth = rightTextWidth + linkTextWidth;
        const rightStartX = a4Width - margin - totalRightWidth;
        
        pdf.text(rightText, rightStartX, footerY);
        pdf.setTextColor(22, 163, 74); // green
        pdf.text(linkText, rightStartX + rightTextWidth, footerY);
        pdf.link(rightStartX + rightTextWidth, footerY - 8, linkTextWidth, 10, { url: 'https://igaprep.com' });
        pdf.setTextColor(120, 120, 120);
      };
      
      // Slice canvas into page-sized chunks
      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage();
        
        // Calculate which portion of canvas to extract for this page
        const srcY = Math.round((page * pageContentHeight) / ratio);
        const srcHeight = Math.min(
          Math.round(pageContentHeight / ratio),
          canvas.height - srcY
        );
        
        if (srcHeight <= 0) break;
        
        // Create a temp canvas for just this page's content
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = srcHeight;
        const ctx = pageCanvas.getContext('2d');
        if (!ctx) continue;
        
        ctx.drawImage(
          canvas,
          0, srcY, canvas.width, srcHeight,
          0, 0, canvas.width, srcHeight
        );
        
        // Add this slice to PDF
        const sliceHeight = srcHeight * ratio;
        pdf.addImage(
          pageCanvas.toDataURL('image/jpeg', 0.95),
          'JPEG',
          margin,
          margin,
          contentWidth,
          sliceHeight
        );
        
        // Add footer
        addFooter(page + 1);
      }
      
      pdf.save(`${selectedNote.slug || 'revision-note'}.pdf`);
      
      toast({
        title: 'PDF Downloaded',
        description: 'Your revision notes have been saved as a PDF.',
      });
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: 'Could not generate PDF. Please try again.',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    // Use short URL with note ID for sharing (much shorter than the full path)
    const shortUrl = selectedNote?.id 
      ? `${window.location.origin}/n/${selectedNote.id}`
      : window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: selectedNote?.title || 'Revision Notes',
          text: `Check out these revision notes for ${topic?.name}`,
          url: shortUrl,
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(shortUrl);
      toast({
        title: 'Link Copied',
        description: 'The link has been copied to your clipboard.',
      });
    }
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    toast({
      title: isSaved ? 'Removed from Saved' : 'Saved',
      description: isSaved 
        ? 'Note removed from your saved items.' 
        : 'Note saved. Sign in to access your saved notes anytime.',
    });
  };

  // Toggle expand/collapse for parent topics
  const toggleTopicExpand = (topicId: string) => {
    setExpandedTopics(prev => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return next;
    });
  };

  // Build hierarchical topic tree
  const parentTopics = allTopics.filter(t => !t.parent_topic_id);
  const getChildren = (parentId: string) => allTopics.filter(t => t.parent_topic_id === parentId);

  // Topic sidebar component (reused for desktop & mobile)
  // Render subject icon (same logic as SubjectCard)
  const renderSubjectIcon = (size: 'sm' | 'md' = 'md') => {
    const sizeClass = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
    const iconSizeClass = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6';
    
    if (!subject) return null;
    
    const iconUrl = typeof subject.icon_url === 'string' && (subject.icon_url.startsWith('http') || subject.icon_url.startsWith('/')) ? subject.icon_url : null;
    const iconName = typeof subject.icon_url === 'string' && !iconUrl ? subject.icon_url : undefined;
    const IconComponent = getIconComponent(iconName);
    
    if (iconUrl) {
      return (
        <div className={cn(sizeClass, 'relative flex-shrink-0 rounded-lg overflow-hidden')} style={{ backgroundColor: subject.color || '#16a34a' }}>
          <Image src={iconUrl} alt={subject.name} fill className="object-contain p-1" />
        </div>
      );
    }
    
    return (
      <div className={cn(sizeClass, 'rounded-lg flex items-center justify-center flex-shrink-0')} style={{ backgroundColor: subject.color || '#16a34a' }}>
        <IconComponent className={cn(iconSizeClass, 'text-white')} />
      </div>
    );
  };

  const TopicSidebar = ({ onNavigate, showCollapseButton = false }: { onNavigate?: () => void; showCollapseButton?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* ZNotes-style header: icon + short name + syllabus code */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <Link 
            href={`/resources/revision-notes/${subjectSlug}`}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft className="h-3 w-3" />
            All Topics
          </Link>
          {showCollapseButton && (
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Hide sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>
        {subject && (
          <div className="flex items-center gap-3">
            {renderSubjectIcon('md')}
            <div className="min-w-0">
              <h3 className="font-bold text-foreground text-base leading-tight">
                {getSubjectAbbreviation(subject.name)}
              </h3>
              {subject.code && (
                <p className="text-xs text-muted-foreground">{subject.code}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Topics heading */}
      <div className="px-4 pt-3 pb-1">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Topics</h4>
      </div>

      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-0.5">
          {parentTopics.map((t) => {
            const children = getChildren(t.id);
            const isExpanded = expandedTopics.has(t.id);
            const isParentWithChildren = children.length > 0;
            const isActive = t.slug === topicSlug;
            const hasActiveChild = children.some(c => c.slug === topicSlug);

            return (
              <div key={t.id}>
                {/* Parent topic row */}
                <div className="flex items-center">
                  {isParentWithChildren ? (
                    <>
                      {/* Expand/collapse button */}
                      <button
                        onClick={() => toggleTopicExpand(t.id)}
                        className={cn(
                          "flex items-center gap-2 flex-1 px-3 py-2.5 text-[15px] rounded-lg transition-colors text-left",
                          isActive
                            ? "bg-primary/10 text-primary font-semibold"
                            : hasActiveChild
                            ? "text-foreground font-semibold"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <ChevronDown className={cn(
                          "h-3.5 w-3.5 flex-shrink-0 transition-transform duration-200",
                          !isExpanded && "-rotate-90"
                        )} />
                        <span className="flex-1">{t.name}</span>
                      </button>
                    </>
                  ) : (
                    <Link
                      href={`/resources/revision-notes/${subjectSlug}/${t.slug}`}
                      onClick={onNavigate}
                      className={cn(
                        "block w-full px-3 py-2.5 text-[15px] rounded-lg transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary font-semibold border-l-3 border-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {t.name}
                    </Link>
                  )}
                </div>

                {/* Sub-topics (children) */}
                {isParentWithChildren && isExpanded && (
                  <div className="ml-4 pl-3 border-l-2 border-border space-y-0.5 mt-0.5 mb-1">
                    {children.map((child) => (
                      <Link
                        key={child.id}
                        href={`/resources/revision-notes/${subjectSlug}/${child.slug}`}
                        onClick={onNavigate}
                        className={cn(
                          "block px-3 py-2 text-[14px] rounded-lg transition-colors",
                          child.slug === topicSlug
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        {child.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </ScrollArea>
    </div>
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="py-2">
        <Skeleton className="h-6 w-64 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <div className="lg:col-span-3">
            <Skeleton className="h-10 w-3/4 mb-4" />
            <Skeleton className="h-6 w-1/2 mb-8" />
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Error or no notes
  if (error || notes.length === 0) {
    return (
      <div className="py-2">
        {/* Breadcrumb */}
        <div className="flex items-center text-sm text-muted-foreground mb-6">
          <Link href="/resources/revision-notes" className="hover:text-primary">
            Revision Notes
          </Link>
          <ChevronRight className="h-4 w-4 mx-1" />
          <Link href={`/resources/revision-notes/${subjectSlug}`} className="hover:text-primary">
            {subject?.name || subjectSlug}
          </Link>
          <ChevronRight className="h-4 w-4 mx-1" />
          <span className="font-medium text-foreground">{topic?.name || topicSlug}</span>
        </div>

        <div className="flex gap-6">
          {allTopics.length > 0 && (
            <div className="hidden lg:block w-64 flex-shrink-0">
              <Card className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-hidden">
                <TopicSidebar />
              </Card>
            </div>
          )}

          <div className="flex-1">
            <Card className="text-center py-12">
              <CardContent>
                <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-foreground mb-2">No Notes Available</h2>
                <p className="text-muted-foreground mb-6">
                  {error || `Revision notes for ${topic?.name || topicSlug} are being prepared. Check back soon!`}
                </p>
                <Button variant="outline" asChild>
                  <Link href={`/resources/revision-notes/${subjectSlug}`}>
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back to Topics
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // PDF note - render with PDF viewer
  if (selectedNote?.pdf_url) {
    return (
      <div className="py-4">
        <div className="flex justify-end gap-2 mb-2">
          <Button variant="outline" size="sm" onClick={handleSave}>
            {isSaved ? <BookmarkCheck className="w-4 h-4 mr-2 text-primary" /> : <Bookmark className="w-4 h-4 mr-2" />}
            {isSaved ? 'Saved' : 'Save'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />Share
          </Button>
        </div>
        <ReactPDFViewer
          pdfUrl={selectedNote.pdf_url}
          title={selectedNote.title}
          topics={allTopics}
          currentTopicSlug={topicSlug}
          subjectSlug={subjectSlug}
          subjectName={subject?.name}
          subjectCode={subject?.code}
          subjectIcon={subject?.icon_url}
          subjectColor={subject?.color}
          className="min-h-[600px]"
        />
      </div>
    );
  }

  // Markdown note - SaveMyExams/ZNotes style layout
  return (
    <div className="py-2">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-muted-foreground mb-4">
        <Link href="/resources/revision-notes" className="hover:text-primary transition-colors">
          Revision Notes
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <Link href={`/resources/revision-notes/${subjectSlug}`} className="hover:text-primary transition-colors">
          {subject?.name || subjectSlug}
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <span className="font-medium text-foreground">{topic?.name || topicSlug}</span>
      </div>

      <div className="flex gap-8">
        {/* Desktop Sidebar - collapsible */}
        {allTopics.length > 0 && (
          <aside className={cn(
            "hidden lg:block flex-shrink-0 transition-all duration-300",
            sidebarCollapsed ? "w-0" : "w-64"
          )}>
            {!sidebarCollapsed && (
              <Card className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-hidden flex flex-col">
                <TopicSidebar showCollapseButton />
              </Card>
            )}
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {/* Sidebar toggle + mobile trigger */}
          <div className="flex items-center gap-2 mb-4">
            {/* Desktop: show sidebar button when collapsed */}
            {sidebarCollapsed && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSidebarCollapsed(false)}
                className="hidden lg:flex"
              >
                <PanelLeft className="h-4 w-4 mr-2" />
                Show Topics
              </Button>
            )}
            {/* Mobile sidebar trigger */}
            <div className="lg:hidden">
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Menu className="h-4 w-4 mr-2" />
                    Show Topics
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0">
                  <TopicSidebar onNavigate={() => setSidebarOpen(false)} />
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {selectedNote && (
            <>
              {/* Note header with actions */}
              <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
                <div className="flex-1 min-w-0">
                  {selectedNote.tags && selectedNote.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {selectedNote.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={handleSave}>
                    {isSaved ? <BookmarkCheck className="w-4 h-4 mr-2 text-primary" /> : <Bookmark className="w-4 h-4 mr-2" />}
                    {isSaved ? 'Saved' : 'Save'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleShare}>
                    <Share2 className="w-4 h-4 mr-2" />Share
                  </Button>
                  {selectedNote.is_downloadable && (
                    <Button size="sm" onClick={handleDownloadPdf} disabled={isDownloading}>
                      {isDownloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                      PDF
                    </Button>
                  )}
                </div>
              </div>

              {/* Note content - split into cards at ## headings */}
              <div ref={contentRef}>
                {selectedNote.content_md ? (
                  <SplitCardRenderer 
                    content={selectedNote.content_md} 
                    hasLatex={selectedNote.has_latex || false}
                  />
                ) : (
                  <Card>
                    <CardContent className="p-6 sm:p-8 lg:p-10">
                      <p className="text-muted-foreground text-center py-8">
                        No content available for this note.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Topic Navigation (prev/next) */}
              <div className="flex items-center justify-between mt-8 gap-4">
                {prevTopic ? (
                  <Button variant="outline" asChild className="flex-1 sm:flex-none">
                    <Link href={`/resources/revision-notes/${subjectSlug}/${prevTopic.slug}`}>
                      <ChevronLeft className="w-4 h-4 mr-2" />
                      <div className="text-left">
                        <div className="text-xs text-muted-foreground">Previous</div>
                        <div className="text-sm font-medium truncate max-w-[150px]">{prevTopic.name}</div>
                      </div>
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" asChild>
                    <Link href={`/resources/revision-notes/${subjectSlug}`}>
                      <ChevronLeft className="w-4 h-4 mr-2" />
                      All Topics
                    </Link>
                  </Button>
                )}

                <Button asChild>
                  <Link href={`/resources/topical-questions/${subjectSlug}/${topicSlug}`}>
                    Practice Questions
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>

                {nextTopic ? (
                  <Button variant="outline" asChild className="flex-1 sm:flex-none">
                    <Link href={`/resources/revision-notes/${subjectSlug}/${nextTopic.slug}`}>
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
            </>
          )}
        </main>
      </div>
    </div>
  );
}
