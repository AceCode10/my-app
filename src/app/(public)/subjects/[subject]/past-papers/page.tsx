
'use client';

import { useState } from 'react';
import { Download, FileText, CheckCircle, FileArchive } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getSubjectBySlug } from '@/lib/subjects.tsx';


const ResourceIcon = ({ type }: { type: string }) => {
    switch (type) {
        case 'qp': return <FileText className="w-5 h-5 text-blue-500" />;
        case 'ms': return <CheckCircle className="w-5 h-5 text-green-500" />;
        case 'sf': return <FileArchive className="w-5 h-5 text-yellow-500" />;
        default: return <FileText className="w-5 h-5 text-gray-500" />;
    }
}

export default function SubjectPastPapersPage({ params: { subject } }: { params: { subject: string } }) {
    const subjectData = getSubjectBySlug(subject);
    const papersByYear = subjectData?.papers || [];

    const availableYears = [...new Set(papersByYear.map(p => p.year.toString()))].sort((a, b) => b.localeCompare(a));
    const availableSessions = [...new Set(papersByYear.map(p => p.session))];

    const [year, setYear] = useState('all');
    const [session, setSession] = useState('all');

    const filteredPapers = papersByYear
        .filter(p => year === 'all' || p.year.toString() === year)
        .filter(p => session === 'all' || p.session.toLowerCase().includes(session.toLowerCase()));

    if (!subjectData) {
        return <div>Subject not found.</div>;
    }
        
    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8 text-center">
              <h1 className="text-4xl font-extrabold text-foreground">Past Papers for {subjectData.name} ({subjectData.code})</h1>
              <p className="text-muted-foreground mt-2">Find and download official exam papers and mark schemes.</p>
            </div>

            <div className="flex gap-4 mb-8 bg-background p-4 rounded-2xl shadow-sm border">
                <div className="w-full">
                    <label className="text-sm font-medium text-muted-foreground">Year</label>
                    <Select value={year} onValueChange={setYear}>
                        <SelectTrigger><SelectValue placeholder="Select Year" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Years</SelectItem>
                            {availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="w-full">
                    <label className="text-sm font-medium text-muted-foreground">Session</label>
                    <Select value={session} onValueChange={setSession}>
                        <SelectTrigger><SelectValue placeholder="Select Session" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Sessions</SelectItem>
                             {availableSessions.map(s => <SelectItem key={s} value={s.toLowerCase()}>{s}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-6">
                {filteredPapers.length > 0 ? filteredPapers.map(({ year, session, papers }) => (
                    <div key={`${year}-${session}`} className="bg-background p-6 rounded-2xl shadow-sm border">
                        <h2 className="text-xl font-bold text-foreground mb-4">{year} - {session}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {papers.map((p: any) => (
                                <a href={p.link} key={p.name} download className="flex justify-between items-center bg-muted/50 p-3 rounded-lg hover:bg-muted transition-colors">
                                    <div className="flex items-center gap-3">
                                        <ResourceIcon type={p.type} />
                                        <span className="font-medium text-foreground">{p.name}</span>
                                    </div>
                                    <Download className="w-5 h-5 text-muted-foreground" />
                                </a>
                            ))}
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-12 bg-background rounded-2xl shadow-sm border">
                        <h3 className="text-lg font-semibold text-foreground">No Papers Found</h3>
                        <p className="text-muted-foreground mt-2">Try adjusting your filters or check back later.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

    