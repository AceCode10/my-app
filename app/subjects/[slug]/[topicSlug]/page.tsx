import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FileText, Eye, Download } from 'lucide-react';
import { notFound } from 'next/navigation';

export default async function TopicDetailPage({
  params,
}: {
  params: { slug: string; topicSlug: string };
}) {
  const supabase = await createClient();

  // Get subject
  const { data: subject } = await supabase
    .from('subjects')
    .select('*')
    .eq('slug', params.slug)
    .single();

  if (!subject) {
    notFound();
  }

  // Get topic
  const { data: topic } = await supabase
    .from('topics')
    .select('*')
    .eq('subject_id', subject.id)
    .eq('slug', params.topicSlug)
    .single();

  if (!topic) {
    notFound();
  }

  // Get notes for this topic
  const { data: notes } = await supabase
    .from('notes')
    .select('*')
    .eq('topic_id', topic.id)
    .in('visibility', ['public', 'registered', 'premium'])
    .order('created_at', { ascending: false });

  // Get flashcard decks for this topic
  const { data: flashcardDecks } = await supabase
    .from('flashcard_decks')
    .select('*, flashcards(count)')
    .eq('topic_id', topic.id)
    .eq('visibility', 'published');

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/subjects" className="hover:text-foreground">Subjects</Link>
        <span>/</span>
        <Link href={`/subjects/${subject.slug}`} className="hover:text-foreground">
          {subject.name}
        </Link>
        <span>/</span>
        <span className="text-foreground">{topic.name}</span>
      </div>

      {/* Topic Header */}
      <div>
        <h1 className="text-4xl font-bold">{topic.name}</h1>
        {topic.description && (
          <p className="text-muted-foreground mt-2 text-lg">{topic.description}</p>
        )}
      </div>

      {/* Notes Section */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Study Notes</h2>
        {notes && notes.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {notes.map((note) => (
              <Card key={note.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>{note.title}</CardTitle>
                  {note.subtitle && (
                    <CardDescription>{note.subtitle}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      <span>{note.view_count} views</span>
                    </div>
                    {note.is_downloadable && (
                      <div className="flex items-center gap-1">
                        <Download className="h-4 w-4" />
                        <span>Downloadable</span>
                      </div>
                    )}
                  </div>
                  
                  {note.tags && note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {note.tags.map((tag) => (
                        <span 
                          key={tag}
                          className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <Button asChild className="w-full">
                    <Link href={`/notes/${note.id}`}>
                      Read Note
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No notes available yet</p>
              <p className="text-sm text-muted-foreground">
                Check back soon for study materials
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Flashcards Section */}
      {flashcardDecks && flashcardDecks.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Flashcards</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {flashcardDecks.map((deck) => (
              <Card key={deck.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>{deck.title}</CardTitle>
                  {deck.description && (
                    <CardDescription>{deck.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {deck.flashcards?.[0]?.count || 0} cards
                  </p>
                  <Button asChild className="w-full">
                    <Link href={`/flashcards/${deck.id}`}>
                      Study Flashcards
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Practice Section */}
      <Card>
        <CardHeader>
          <CardTitle>Practice Questions</CardTitle>
          <CardDescription>
            Test your knowledge with practice questions on this topic
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href={`/practice?topic=${topic.id}`}>
              Start Practice Quiz
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
