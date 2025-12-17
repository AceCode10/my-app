'use client';

import { SubjectsGrid } from '@/components/subjects-grid';
import { FileText, Download, Calendar } from 'lucide-react';

export default function PastPapersPage() {
  return (
    <div className="py-12">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <FileText className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl font-extrabold text-foreground">Past Papers</h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Access past examination papers with mark schemes. Practice with real exam questions.
        </p>
      </div>

      {/* Features highlight */}
      <div className="max-w-4xl mx-auto mb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card p-6 rounded-xl border text-center">
            <FileText className="w-8 h-8 text-blue-500 mx-auto mb-3" />
            <h3 className="font-semibold text-foreground">Question Papers</h3>
            <p className="text-sm text-muted-foreground mt-1">Original exam papers in PDF format</p>
          </div>
          <div className="bg-card p-6 rounded-xl border text-center">
            <Download className="w-8 h-8 text-green-500 mx-auto mb-3" />
            <h3 className="font-semibold text-foreground">Mark Schemes</h3>
            <p className="text-sm text-muted-foreground mt-1">Official marking guidelines included</p>
          </div>
          <div className="bg-card p-6 rounded-xl border text-center">
            <Calendar className="w-8 h-8 text-purple-500 mx-auto mb-3" />
            <h3 className="font-semibold text-foreground">Multiple Years</h3>
            <p className="text-sm text-muted-foreground mt-1">Papers from various exam sessions</p>
          </div>
        </div>
      </div>

      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground">Select a Subject</h2>
        <p className="text-muted-foreground mt-2">Choose a subject to browse available past papers</p>
      </div>
      
      <SubjectsGrid basePath="/resources/past-papers" />
    </div>
  );
}
