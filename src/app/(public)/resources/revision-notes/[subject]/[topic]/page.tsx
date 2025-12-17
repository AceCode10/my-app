'use client';

import React, { useEffect, useState, useRef, use } from 'react';
import Link from 'next/link';
import { ChevronRight, ChevronLeft, BookOpen, Download, Share2, Bookmark, BookmarkCheck, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';

interface Note {
  id: string;
  title: string;
  subtitle?: string;
  slug: string;
  content_md: string;
  rendered_html?: string;
  view_count: number;
  visibility: string;
  tags?: string[];
  is_downloadable: boolean;
  created_at: string;
  updated_at: string;
}

interface Topic {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

interface Subject {
  id: string;
  name: string;
  slug: string;
  code?: string;
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
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      // Fetch notes for this topic
      const { data: notesData, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .eq('topic_id', topicData.id)
        .eq('visibility', 'public')
        .not('published_at', 'is', null)
        .order('created_at', { ascending: false });

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
      // Dynamic import for PDF generation
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
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
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: selectedNote?.title || 'Revision Notes',
          text: `Check out these revision notes for ${topic?.name}`,
          url,
        });
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url);
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

  // Loading state
  if (isLoading) {
    return (
      <div className="py-8">
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

  // Error or no notes state
  if (error || notes.length === 0) {
    return (
      <div className="py-8">
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
    );
  }

  return (
    <div className="py-8">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-muted-foreground mb-6">
        <Link href="/resources/revision-notes" className="hover:text-primary">
          Revision Notes
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <Link href={`/resources/revision-notes/${subjectSlug}`} className="hover:text-primary">
          {subject?.name}
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <span className="font-medium text-foreground">{topic?.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar - Notes list */}
        <aside className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Notes in this Topic</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {notes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => setSelectedNote(note)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedNote?.id === note.id
                      ? 'bg-primary/10 border border-primary'
                      : 'bg-muted/50 hover:bg-muted'
                  }`}
                >
                  <p className="font-medium text-foreground text-sm line-clamp-2">{note.title}</p>
                  {note.subtitle && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{note.subtitle}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Eye className="w-3 h-3" />
                    <span>{note.view_count || 0} views</span>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </aside>

        {/* Main content */}
        <main className="lg:col-span-3">
          {selectedNote && (
            <>
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h1 className="text-3xl font-extrabold text-foreground">{selectedNote.title}</h1>
                    {selectedNote.subtitle && (
                      <p className="text-lg text-muted-foreground mt-1">{selectedNote.subtitle}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleSave}>
                      {isSaved ? (
                        <BookmarkCheck className="w-4 h-4 mr-2 text-primary" />
                      ) : (
                        <Bookmark className="w-4 h-4 mr-2" />
                      )}
                      {isSaved ? 'Saved' : 'Save'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleShare}>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                    {selectedNote.is_downloadable && (
                      <Button size="sm" onClick={handleDownloadPdf} disabled={isDownloading}>
                        {isDownloading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4 mr-2" />
                        )}
                        Download PDF
                      </Button>
                    )}
                  </div>
                </div>

                {/* Tags */}
                {selectedNote.tags && selectedNote.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {selectedNote.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>

              <Separator className="mb-6" />

              {/* Note content */}
              <Card>
                <CardContent className="p-6 lg:p-8" ref={contentRef}>
                  {selectedNote.rendered_html ? (
                    <div 
                      className="prose prose-slate dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: selectedNote.rendered_html }}
                    />
                  ) : selectedNote.content_md ? (
                    <div className="prose prose-slate dark:prose-invert max-w-none whitespace-pre-wrap">
                      {selectedNote.content_md}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No content available for this note.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Navigation */}
              <div className="flex justify-between mt-8">
                <Button variant="outline" asChild>
                  <Link href={`/resources/revision-notes/${subjectSlug}`}>
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back to Topics
                  </Link>
                </Button>
                <Button asChild>
                  <Link href={`/resources/topical-questions/${subjectSlug}/${topicSlug}`}>
                    Practice Questions
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
