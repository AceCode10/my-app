'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';
import type { Note } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { ArrowLeft, Loader2, Bot } from 'lucide-react';
import { generateRevisionNote } from '@/lib/ai-placeholders';
import withRole from '@/hooks/withRole';
import { allSubjects } from '@/lib/subjects';

const noteSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  subtitle: z.string().optional(),
  slug: z.string().min(3, { message: "Slug must be at least 3 characters." }),
  subjectId: z.string().min(1, { message: "Please select a subject." }),
  topicId: z.string().min(1, { message: "Please select a topic." }),
  visibility: z.enum(['draft', 'public', 'registered', 'premium']),
  contentRaw: z.string().optional(),
  renderedHtml: z.string().optional(),
  contentFormat: z.enum(['markdown', 'richTextJson']),
}).refine(data => {
  if (data.visibility !== 'draft') {
    return !!data.renderedHtml && data.renderedHtml.length > 0;
  }
  return true;
}, {
  message: "Rendered HTML must be provided for non-draft notes.",
  path: ["renderedHtml"],
});

type NoteFormData = z.infer<typeof noteSchema>;

const NoteEditorPage = () => {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const { id: noteId } = params;
  const isNewNote = noteId === 'new';

  const supabase = createClient();
  const { user } = useUser();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(!isNewNote);

  const form = useForm<NoteFormData>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      title: '',
      subtitle: '',
      slug: '',
      subjectId: '',
      topicId: '',
      visibility: 'draft',
      contentRaw: '',
      renderedHtml: '',
      contentFormat: 'richTextJson',
    },
  });

  const subjectIdValue = form.watch('subjectId');
  const topicIdValue = form.watch('topicId');
  const titleValue = form.watch('title');
  const visibilityValue = form.watch('visibility');
  
  const selectedSubject = useMemo(() => allSubjects.find(s => s.slug === subjectIdValue), [subjectIdValue]);
  const topics = useMemo(() => selectedSubject?.topics || [], [selectedSubject]);

  useEffect(() => {
    if (titleValue && form.getValues('slug') === '') {
      form.setValue('slug', titleValue.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
    }
  }, [titleValue, form]);

  useEffect(() => {
    if (form.getValues('topicId')) {
      form.resetField('topicId', { defaultValue: '' });
    }
  }, [subjectIdValue, form]);
  
  const backPath = pathname.includes('/admin/') ? '/admin/notes' : '/teacher/notes';
  
  useEffect(() => {
    if (isNewNote) {
      setIsFetching(false);
      return;
    }
    
    if (typeof noteId !== 'string' || !noteId) {
      toast({
        variant: 'destructive',
        title: 'Invalid Note ID',
        description: 'The note ID is missing or invalid.',
      });
      router.push(backPath);
      return;
    }

    const fetchNote = async () => {
      setIsFetching(true);
      try {
        const { data, error } = await supabase
          .from('notes')
          .select('*')
          .eq('id', noteId)
          .single();

        if (error) throw error;

        if (data) {
          form.reset({
            title: data.title,
            subtitle: data.subtitle || '',
            slug: data.slug,
            subjectId: data.subject_id,
            topicId: data.topic_id,
            visibility: data.visibility || 'draft',
            contentRaw: data.content_raw || '',
            renderedHtml: data.rendered_html || '',
            contentFormat: data.content_format || 'richTextJson',
          });
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Note not found.' });
          router.push(backPath);
        }
      } catch (error) {
        console.error("Error fetching note:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load note data.' });
      } finally {
        setIsFetching(false);
      }
    };

    fetchNote();
  }, [noteId, isNewNote, router, toast, backPath, form]);

  const handleAiGenerate = async () => {
    if (!topicIdValue) {
      toast({ variant: 'destructive', title: 'Topic Not Selected', description: 'Please select a subject and topic first.' });
      return;
    }
    setIsLoading(true);
    toast({ title: 'AI Generating...', description: `Creating note content for ${topicIdValue}.` });
    try {
      const topicName = topics?.find(t => t.name.toLowerCase().replace(/ /g, '-') === topicIdValue)?.name || topicIdValue;
      const result = await generateRevisionNote({ topic: topicName });
      form.setValue('renderedHtml', result.htmlContent, { shouldValidate: true });
      toast({ title: 'Content Generated!', description: 'The AI-generated content has been added.' });
    } catch (error) {
      console.error('Error generating note content:', error);
      toast({ variant: 'destructive', title: 'AI Generation Failed', description: 'Could not generate note content.' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const onSubmit = async (data: NoteFormData) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
      return;
    }
    setIsLoading(true);

    try {
      const noteData = {
        title: data.title,
        subtitle: data.subtitle,
        slug: data.slug,
        topic_id: data.topicId,
        subject_id: data.subjectId,
        visibility: data.visibility,
        content_raw: data.contentRaw,
        rendered_html: data.renderedHtml,
        content_format: data.contentFormat,
        author_id: user.id,
        updated_at: new Date().toISOString(),
      };

      if (isNewNote) {
        const { error } = await supabase
          .from('notes')
          .insert({
            ...noteData,
            created_at: new Date().toISOString(),
            published_at: data.visibility === 'public' ? new Date().toISOString() : null,
            version: 1,
          });

        if (error) throw error;
        toast({ title: 'Note Created', description: 'The new note has been saved successfully.' });
      } else {
        const { error } = await supabase
          .from('notes')
          .update({
            ...noteData,
            ...(data.visibility === 'public' && { published_at: new Date().toISOString() }),
          })
          .eq('id', noteId as string);

        if (error) throw error;
        toast({ title: 'Note Updated', description: 'Your changes have been saved.' });
      }
      router.push(backPath);
      router.refresh(); 
    } catch (error) {
      console.error('Error saving note:', error);
      toast({ variant: 'destructive', title: 'Save Failed', description: 'There was an error saving the note.' });
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonText = () => {
    if (isLoading) return 'Saving...';
    switch (visibilityValue) {
      case 'public':
        return isNewNote ? 'Publish Note' : 'Publish Changes';
      case 'draft':
        return 'Save Draft';
      default:
        return 'Save Changes';
    }
  }
  
  if (isFetching) {
    return <NoteEditorSkeleton />;
  }

  return (
    <>
      <Button variant="ghost" asChild className="mb-4">
        <Link href={backPath}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to All Notes
        </Link>
      </Button>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>{isNewNote ? 'Create New Note' : 'Edit Note'}</CardTitle>
              <CardDescription>Fill out the details for the note.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl><Input placeholder="e.g., The Principles of Debit and Credit" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subtitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subtitle (Optional)</FormLabel>
                    <FormControl><Input placeholder="A brief summary" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl><Input placeholder="auto-generated-from-title" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="subjectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select a subject" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {allSubjects.map(subject => (
                            <SelectItem key={subject.slug} value={subject.slug}>{subject.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="topicId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Topic</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value} disabled={!subjectIdValue}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder={!subjectIdValue ? "Select a subject first" : "Select a topic"} /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {topics.map(topic => (
                            <SelectItem key={topic.name} value={topic.name.toLowerCase().replace(/ /g, '-')}>
                              {topic.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="renderedHtml"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center">
                      <FormLabel>Rendered HTML Content</FormLabel>
                      <Button type="button" size="sm" variant="secondary" onClick={handleAiGenerate} disabled={!topicIdValue || isLoading}>
                        <Bot className="mr-2 h-4 w-4" />
                        AI Generate
                      </Button>
                    </div>
                    <FormControl><Textarea placeholder="<h1>Title</h1><p>Content...</p>" {...field} rows={15} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="visibility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visibility</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select visibility" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="registered">Registered Users Only</SelectItem>
                        <SelectItem value="premium">Premium Only</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {getButtonText()}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </>
  );
};

const NoteEditorSkeleton = () => (
  <>
    <Skeleton className="h-10 w-48 mb-4" />
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-24 w-full" />
        </div>
      </CardContent>
      <CardFooter>
        <Skeleton className="h-10 w-32" />
      </CardFooter>
    </Card>
  </>
);

export default withRole(NoteEditorPage, ['admin', 'teacher', 'content_editor']);
