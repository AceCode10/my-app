'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { HtmlDeckPresenter } from '@/components/presenter/html-deck-presenter';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function PresentationPage() {
  const { subject: subjectSlug, topic: topicSlug } = useParams<{
    subject: string;
    topic: string;
  }>();
  const supabase = createClient();

  const [presentationUrl, setPresentationUrl] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState<string>('Presentation');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const backHref = `/student/subjects/${subjectSlug}/${topicSlug}`;

  useEffect(() => {
    async function load() {
      try {
        // 1. Resolve the topic row from slug + subject slug
        const { data: subjectRow, error: subErr } = await supabase
          .from('subjects')
          .select('id')
          .eq('slug', subjectSlug)
          .single();

        if (subErr || !subjectRow) throw new Error('Subject not found');

        const { data: topicRow, error: topErr } = await supabase
          .from('topics')
          .select('id')
          .eq('subject_id', subjectRow.id)
          .eq('slug', topicSlug)
          .single();

        if (topErr || !topicRow) throw new Error('Topic not found');

        // 2. Find the first note for this topic that has a presentation_url
        const { data: note, error: noteErr } = await supabase
          .from('notes')
          .select('title, presentation_url')
          .eq('topic_id', topicRow.id)
          .in('visibility', ['public', 'registered', 'premium'])
          .not('presentation_url', 'is', null)
          .order('display_order', { ascending: true })
          .limit(1)
          .single();

        if (noteErr && noteErr.code !== 'PGRST116') throw noteErr;

        if (!note || !note.presentation_url) {
          setError('No presentation is available for this topic yet.');
          return;
        }

        setNoteTitle(note.title);
        setPresentationUrl(note.presentation_url);
      } catch (e: any) {
        setError(e.message || 'Failed to load presentation');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [subjectSlug, topicSlug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full min-h-screen bg-black">
        <Loader2 className="h-10 w-10 animate-spin text-white" />
        <span className="ml-3 text-white text-lg">Loading…</span>
      </div>
    );
  }

  if (error || !presentationUrl) {
    return (
      <div className="flex flex-col items-center justify-center w-full min-h-screen bg-gray-950 text-white gap-4 p-8">
        <AlertCircle className="h-12 w-12 text-yellow-400" />
        <p className="text-xl font-semibold text-center">
          {error || 'No presentation available'}
        </p>
        <Link href={backHref}>
          <Button variant="outline" className="mt-4">
            Back to topic
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <HtmlDeckPresenter
      url={presentationUrl}
      title={noteTitle}
      backHref={backHref}
    />
  );
}
