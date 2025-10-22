'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import type { Note } from '@/types';

interface UseNotesProps {
    searchTerm?: string;
    subjectId?: string | null;
    topicId?: string | null;
    authorId?: string | null; // Can be null to fetch all notes (for admin)
    visibility?: string | null;
}

/**
 * A custom hook to fetch and filter notes from Firestore.
 */
export function useNotes({ searchTerm, subjectId, topicId, authorId, visibility }: UseNotesProps) {
    const firestore = useFirestore();

    const notesQuery = useMemoFirebase(() => {
        if (!firestore) return null;

        let q = query(collection(firestore, 'notes'));
        
        // Add author filter if an authorId is provided
        if (authorId) {
            q = query(q, where('authorId', '==', authorId));
        }

        // Add subject filter
        if (subjectId && subjectId !== 'all') {
            q = query(q, where('subjectId', '==', subjectId));
        }
        
        // Add topic filter
        if (topicId && topicId !== 'all') {
            q = query(q, where('topicId', '==', topicId));
        }

        if (visibility && visibility !== 'all') {
            q = query(q, where('visibility', '==', visibility));
        }

        // Adding an orderBy clause here with multiple where clauses
        // often requires a composite index in Firestore. Removing it
        // to prevent crashes if the index doesn't exist.
        // q = query(q, orderBy('title'));

        return q;
    }, [firestore, subjectId, topicId, authorId, visibility]);

    const { data, isLoading, error } = useCollection<Note>(notesQuery);

    const filteredNotes = useMemo(() => {
        if (!data) return [];
        if (!searchTerm) return data;
        
        return data.filter(note =>
            note.title.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [data, searchTerm]);

    return { notes: filteredNotes, isLoading, error };
}
