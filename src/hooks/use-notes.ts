'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Note {
    id: string;
    title: string;
    subtitle?: string;
    slug: string;
    content_md: string;
    rendered_html?: string;
    subject_id: string;
    topic_id: string;
    author_id?: string;
    visibility: string;
    tags?: string[];
    is_downloadable?: boolean;
    view_count?: number;
    version?: number;
    created_at: string;
    updated_at?: string;
    published_at?: string;
}

interface UseNotesProps {
    searchTerm?: string;
    subjectId?: string | null;
    topicId?: string | null;
    authorId?: string | null;
    visibility?: string | null;
}

/**
 * A custom hook to fetch and filter notes from Supabase.
 */
export function useNotes({ searchTerm, subjectId, topicId, authorId, visibility }: UseNotesProps) {
    const supabase = createClient();
    const [data, setData] = useState<Note[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        fetchNotes();

        // Set up realtime subscription
        const channel = supabase
            .channel('notes-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notes',
                },
                () => {
                    fetchNotes();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [subjectId, topicId, authorId, visibility]);

    async function fetchNotes() {
        try {
            setIsLoading(true);
            let query = supabase.from('notes').select('*');

            // Add filters
            if (authorId) {
                query = query.eq('author_id', authorId);
            }

            if (subjectId && subjectId !== 'all') {
                query = query.eq('subject_id', subjectId);
            }

            if (topicId && topicId !== 'all') {
                query = query.eq('topic_id', topicId);
            }

            if (visibility && visibility !== 'all') {
                query = query.eq('visibility', visibility);
            }

            const { data: notesData, error: fetchError } = await query.order('title');

            if (fetchError) {
                console.error('Supabase error fetching notes:', fetchError);
                throw fetchError;
            }
            
            console.log('Notes fetched successfully:', notesData?.length || 0, 'notes');
            setData(notesData || []);
            setError(null);
        } catch (err) {
            console.error('Error fetching notes:', err);
            setError(err as Error);
        } finally {
            setIsLoading(false);
        }
    }

    const filteredNotes = useMemo(() => {
        if (!data) return [];
        if (!searchTerm) return data;

        return data.filter((note) =>
            note.title.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [data, searchTerm]);

    return { notes: filteredNotes, isLoading, error };
}
