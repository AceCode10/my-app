
'use client'
// Catch-all route for /dashboard/subjects/notes/[...slug]
// For example /dashboard/subjects/notes/maths/algebra
// Or /dashboard/subjects/notes/physics

import { useParams } from 'next/navigation'

export default function NotesCatchallPage() {
    const params = useParams();
    const { slug } = params;

    const path = Array.isArray(slug) ? slug.join('/') : slug;

    return (
        <div>
            <h1>Notes for: {path}</h1>
            <p>This is a catch-all page for notes. The specific subject and topic will be handled here.</p>
        </div>
    )
}
