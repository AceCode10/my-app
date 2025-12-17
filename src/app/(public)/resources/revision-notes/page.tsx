'use client';

import { SubjectsGrid } from '@/components/subjects-grid';
import { BookOpen, FileText, Download } from 'lucide-react';

export default function RevisionNotesPage() {
  return (
    <div className="py-12">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <BookOpen className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl font-extrabold text-foreground">Revision Notes</h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Comprehensive revision notes organized by topic. Study smarter with clear explanations.
        </p>
      </div>

      {/* Features highlight */}
      <div className="max-w-4xl mx-auto mb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card p-6 rounded-xl border text-center">
            <BookOpen className="w-8 h-8 text-blue-500 mx-auto mb-3" />
            <h3 className="font-semibold text-foreground">Topic-Based</h3>
            <p className="text-sm text-muted-foreground mt-1">Notes organized by syllabus topics</p>
          </div>
          <div className="bg-card p-6 rounded-xl border text-center">
            <FileText className="w-8 h-8 text-green-500 mx-auto mb-3" />
            <h3 className="font-semibold text-foreground">Clear Explanations</h3>
            <p className="text-sm text-muted-foreground mt-1">Easy to understand content</p>
          </div>
          <div className="bg-card p-6 rounded-xl border text-center">
            <Download className="w-8 h-8 text-purple-500 mx-auto mb-3" />
            <h3 className="font-semibold text-foreground">Download PDF</h3>
            <p className="text-sm text-muted-foreground mt-1">Save notes for offline study</p>
          </div>
        </div>
      </div>

      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground">Select a Subject</h2>
        <p className="text-muted-foreground mt-2">Choose a subject to browse available revision notes</p>
      </div>
      
      <SubjectsGrid basePath="/resources/revision-notes" />
    </div>
  );
}
