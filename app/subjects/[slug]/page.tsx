import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { BookOpen, FileText, Brain } from 'lucide-react';
import { notFound } from 'next/navigation';

export default async function SubjectDetailPage({
  params,
}: {
  params: { slug: string };
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

  // Get topics (only parent topics, we'll nest children)
  const { data: allTopics } = await supabase
    .from('topics')
    .select('*')
    .eq('subject_id', subject.id)
    .order('ordering');

  // Build topic hierarchy
  const parentTopics = allTopics?.filter(t => !t.parent_topic_id) || [];
  const topicMap = new Map(allTopics?.map(t => [t.id, { ...t, children: [] as any[] }]) || []);
  
  allTopics?.forEach(topic => {
    if (topic.parent_topic_id) {
      const parent = topicMap.get(topic.parent_topic_id);
      if (parent) {
        parent.children.push(topicMap.get(topic.id));
      }
    }
  });

  // Get counts
  const { count: notesCount } = await supabase
    .from('notes')
    .select('*', { count: 'exact', head: true })
    .eq('subject_id', subject.id)
    .eq('visibility', 'published');

  const { count: questionsCount } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('subject_id', subject.id)
    .eq('visibility', 'published');

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Subject Header */}
      <div className="flex items-start gap-6">
        {subject.icon_url ? (
          <img 
            src={subject.icon_url} 
            alt={subject.name}
            className="w-20 h-20 rounded-lg"
          />
        ) : (
          <div className="w-20 h-20 rounded-lg bg-primary/10 flex items-center justify-center">
            <BookOpen className="h-10 w-10 text-primary" />
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-4xl font-bold">{subject.name}</h1>
          <p className="text-muted-foreground mt-2">
            {subject.level} • {subject.exam_board} • {subject.code}
          </p>
          {subject.description && (
            <p className="mt-4 text-lg">{subject.description}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Topics</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allTopics?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notesCount || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Questions</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{questionsCount || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Topics */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Topics</h2>
        <div className="space-y-4">
          {parentTopics.map((topic) => {
            const topicWithChildren = topicMap.get(topic.id);
            return (
              <Card key={topic.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{topic.name}</span>
                    <Button asChild>
                      <Link href={`/subjects/${subject.slug}/${topic.slug}`}>
                        View Content
                      </Link>
                    </Button>
                  </CardTitle>
                  {topic.description && (
                    <CardDescription>{topic.description}</CardDescription>
                  )}
                </CardHeader>
                {topicWithChildren?.children && topicWithChildren.children.length > 0 && (
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Subtopics:</p>
                      <div className="grid gap-2 md:grid-cols-2">
                        {topicWithChildren.children.map((child: any) => (
                          <Button 
                            key={child.id} 
                            asChild 
                            variant="outline" 
                            className="justify-start"
                          >
                            <Link href={`/subjects/${subject.slug}/${child.slug}`}>
                              {child.name}
                            </Link>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {parentTopics.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No topics available yet</p>
            <p className="text-sm text-muted-foreground">
              Content is being prepared for this subject
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
