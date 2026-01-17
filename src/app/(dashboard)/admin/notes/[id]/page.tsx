'use client';

import { use } from 'react';
import { NoteEditor } from '../_components/note-editor';

export default function EditNotePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return <NoteEditor noteId={resolvedParams.id} />;
}
