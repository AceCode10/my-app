import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Short URL redirect for shared notes.
 * /n/{noteId} → /resources/revision-notes/{subject}/{topic}
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: noteId } = await params;
  const origin = new URL(request.url).origin;

  try {
    const supabase = await createClient();

    // Fetch note with its topic and subject info
    const { data: note, error } = await supabase
      .from('notes')
      .select(`
        id,
        topic_id,
        topics!inner (
          slug,
          subject_id,
          subjects!inner (
            slug
          )
        )
      `)
      .eq('id', noteId)
      .single();

    if (error || !note) {
      return NextResponse.redirect(new URL('/resources/revision-notes', origin));
    }

    const topic = (note as any).topics;
    const subject = topic?.subjects;

    if (!topic?.slug || !subject?.slug) {
      return NextResponse.redirect(new URL('/resources/revision-notes', origin));
    }

    return NextResponse.redirect(
      new URL(`/resources/revision-notes/${subject.slug}/${topic.slug}`, origin)
    );
  } catch {
    return NextResponse.redirect(new URL('/resources/revision-notes', origin));
  }
}
