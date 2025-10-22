
'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ChevronRight, FileText, Download, Loader2, Info, Bookmark, Share2, ArrowLeft, PanelLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, limit, doc, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import type { Note } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { allSubjects } from '@/lib/subjects';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';


export default function NotesPage({
  params,
}: {
  params: { subject: string; topic: string };
}) {
  const { subject: subjectSlug, topic: topicSlug } = params;
  const pathname = usePathname();
  const firestore = useFirestore();
  const { user, profile } = useUser();
  const { toast } = useToast();
  const noteContentRef = useRef<HTMLDivElement>(null);

  const subjectData = allSubjects.find(s => s.slug === subjectSlug);
  const topicName = useMemo(() => topicSlug.replace(/-/g, ' '), [topicSlug]);
  
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const noteQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const topicId = `${subjectSlug}-${topicSlug}`;
    return query(
        collection(firestore, 'notes'),
        where('topicId', '==', topicId),
        // In a real app, you might check for 'premium' or 'registered' visibility based on user subscription
        where('visibility', 'in', ['public', 'registered', 'premium']),
        limit(1)
    );
  }, [firestore, subjectSlug, topicSlug]);

  const { data: notes, isLoading } = useCollection<Note>(noteQuery);
  const noteData = notes?.[0];
  const isNoteSaved = useMemo(() => profile?.savedNoteIds?.includes(noteData?.id || '') || false, [profile, noteData]);

  useEffect(() => {
    if (noteData && firestore && user) {
        const noteRef = doc(firestore, 'notes', noteData.id);
        // Use non-blocking update for view count
        updateDocumentNonBlocking(noteRef, {
            viewCount: increment(1)
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteData, firestore, user]);

  if (!subjectData) {
    return <div>Subject not found.</div>;
  }

  const handleDownloadPdf = async () => {
    if (!noteContentRef.current) return;
    setIsPdfLoading(true);

    try {
        const canvas = await html2canvas(noteContentRef.current, {
            scale: 2,
            useCORS: true,
            windowWidth: noteContentRef.current.scrollWidth,
            windowHeight: noteContentRef.current.scrollHeight
        });
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'px',
            format: [canvas.width, canvas.height]
        });
        
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`${topicSlug}-revision-note.pdf`);

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
    if (!user || !firestore || !noteData) {
        toast({
            variant: 'destructive',
            title: 'Not Logged In',
            description: 'You need to be logged in to save notes.',
        });
        return;
    }
    setIsSaving(true);
    const userRef = doc(firestore, 'users', user.uid);
    try {
        if (isNoteSaved) {
            await updateDoc(userRef, {
                savedNoteIds: arrayRemove(noteData.id)
            });
            toast({ title: 'Note Unsaved', description: 'Removed from your saved notes.' });
        } else {
            await updateDoc(userRef, {
                savedNoteIds: arrayUnion(noteData.id)
            });
            toast({ title: 'Note Saved!', description: 'You can find it in your dashboard.' });
        }
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
        text: `Check out this revision note for ${noteData.topicId}: ${noteData.title}`,
        url: window.location.href,
      };

      if (navigator.share) {
        try {
          await navigator.share(shareData);
        } catch (error) {
          console.error('Error sharing:', error);
        }
      } else {
        // Fallback for browsers that don't support the Web Share API
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
            <Skeleton className="h-6 w-1/3 mt-6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      );
    }
    
    if (!noteData?.renderedHtml) {
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
       <div 
            ref={noteContentRef}
            className="prose dark:prose-invert max-w-none prose-headings:font-bold prose-headings:text-foreground prose-h2:text-2xl prose-h3:text-xl"
            dangerouslySetInnerHTML={{ __html: noteData.renderedHtml }}
        >
        </div>
    );
  }

  return (
    <div>
      <div className="flex items-center text-sm text-muted-foreground mb-6">
        <Link href="/dashboard/subjects" className="hover:text-primary">Subjects</Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <Link href={`/dashboard/subjects/${subjectSlug}`} className="hover:text-primary">{subjectData.name}</Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <span className="font-medium text-foreground capitalize truncate">{topicName}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        <aside className="lg:col-span-1 bg-card p-4 rounded-2xl shadow-sm border sticky top-24">
           <Collapsible defaultOpen={true}>
                <div className="flex items-center justify-between mb-2">
                    <Button variant="ghost" className="w-full justify-start" asChild>
                        <Link href={`/dashboard/subjects/${subjectSlug}`}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to {subjectData.name}
                        </Link>
                    </Button>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="p-2 lg:hidden">
                            <PanelLeft className="h-5 w-5"/>
                            <span className="sr-only">Toggle topic list</span>
                        </Button>
                    </CollapsibleTrigger>
                </div>
                
                <CollapsibleContent>
                    <h3 className="font-bold text-lg text-foreground px-2 mb-2 mt-2">Topics</h3>
                    <nav className="flex flex-col space-y-1">
                        {subjectData.topics?.map(t => {
                            const currentTopicSlug = t.name.toLowerCase().replace(/ /g, '-');
                            const href = `/dashboard/subjects/${subjectSlug}/${currentTopicSlug}/notes`;
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
                </CollapsibleContent>
            </Collapsible>
        </aside>

        <main className="lg:col-span-3">
          <div className="bg-card p-6 sm:p-8 rounded-2xl shadow-sm border">
             <div className="mb-6">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-2 capitalize">
                    {noteData?.title || `${topicName}`}
                </h1>
                <p className="text-lg text-muted-foreground">{noteData?.subtitle || subjectData.topics?.find(t => t.name.toLowerCase().replace(/ /g, '-') === topicSlug)?.description}</p>
                 {noteData?.updatedAt && <p className="text-xs text-muted-foreground mt-2">Last updated: {format(noteData.updatedAt.toDate(), 'PPP')}</p>}
            </div>
            
            <div className="flex items-center gap-2 mb-6">
                <Button onClick={handleDownloadPdf} disabled={isPdfLoading || !noteData?.renderedHtml}>
                    {isPdfLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4" />}
                    Download PDF
                </Button>
                 <Button variant="outline" onClick={handleSaveNote} disabled={isSaving || !user}>
                    <Bookmark className={cn("mr-2 h-4 w-4", isNoteSaved && "fill-current")} />
                    {isSaving ? 'Saving...' : (isNoteSaved ? 'Saved' : 'Save')}
                </Button>
                <Button variant="outline" onClick={handleShare}><Share2 className="mr-2 h-4 w-4"/>Share</Button>
            </div>

            <Separator />
            
            <div className="mt-6">
                {renderContent()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
