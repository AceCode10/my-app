
'use client';

import React from 'react';
import { getSubjectBySlug } from '@/lib/subjects.tsx';
import Link from 'next/link';
import { ChevronRight, FileText, Download, CheckCircle, FileArchive } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from '@/components/ui/button';

export default function SubjectPage({ params }: { params: { subject: string }}) {
    const subjectData = getSubjectBySlug(params.subject);

    if (!subjectData) {
        return <div>Subject not found.</div>;
    }
    
    const ResourceIcon = ({ type }: { type: string }) => {
        switch (type) {
            case 'qp': return <FileText className="w-5 h-5 text-blue-500" />;
            case 'ms': return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'sf': return <FileArchive className="w-5 h-5 text-yellow-500" />;
            default: return <FileText className="w-5 h-5 text-gray-500" />;
        }
    }


    return (
        <div>
            <div className="flex items-center text-sm text-muted-foreground mb-4">
                <Link href="/subjects" className="hover:text-primary">Subjects</Link>
                <ChevronRight className="h-4 w-4 mx-1" />
                <span className="font-medium text-foreground">{subjectData.name}</span>
            </div>
            <div className="mb-8 text-center">
              <h1 className="text-4xl font-extrabold text-foreground">{subjectData.name} ({subjectData.code})</h1>
              <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
                  Explore our revision notes, quizzes, and past papers for {subjectData.name}.
              </p>
            </div>
            
            <Tabs defaultValue="notes" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="notes">📝 Notes</TabsTrigger>
                    <TabsTrigger value="past-papers">🗃️ Past Papers</TabsTrigger>
                    <TabsTrigger value="quizzes">✅ Quizzes</TabsTrigger>
                    <TabsTrigger value="flashcards" disabled>✨ Flashcards</TabsTrigger>
                </TabsList>
                <TabsContent value="notes" className="mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {subjectData.topics?.map(topic => (
                           <Link href={`/subjects/${params.subject}/${topic.name.toLowerCase().replace(/ /g, '-')}`} key={topic.name}>
                             <div className="bg-background p-6 rounded-2xl shadow-sm border hover:border-primary hover:shadow-lg transition-all duration-200 h-full flex flex-col">
                                <h4 className="font-bold text-lg text-foreground">{topic.name}</h4>
                                <p className="text-sm text-muted-foreground mt-2 flex-grow">{topic.description}</p>
                                <Button variant="secondary" className="mt-4 w-full">View Topic Resources</Button>
                             </div>
                           </Link>
                        ))}
                    </div>
                </TabsContent>
                <TabsContent value="past-papers" className="mt-6">
                     <div className="space-y-6">
                        {subjectData.papers?.map(({ year, session, papers }) => (
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
                        ))}
                    </div>
                     {(!subjectData.papers || subjectData.papers.length === 0) && (
                        <div className="text-center py-20 bg-background rounded-2xl shadow-sm border">
                            <h3 className="text-xl font-semibold text-foreground">Past Papers Coming Soon</h3>
                            <p className="text-muted-foreground mt-2">We are working on adding past papers for {subjectData.name}.</p>
                        </div>
                    )}
                </TabsContent>
                 <TabsContent value="quizzes" className="mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {subjectData.topics?.map(topic => (
                           <Link href={`/subjects/${params.subject}/${topic.name.toLowerCase().replace(/ /g, '-')}/quiz`} key={topic.name}>
                             <div className="bg-background p-6 rounded-2xl shadow-sm border hover:border-primary hover-shadow-lg transition-all duration-200 h-full flex flex-col">
                                <h4 className="font-bold text-lg text-foreground">{topic.name}</h4>
                                <p className="text-sm text-muted-foreground mt-2 flex-grow">{topic.description}</p>
                                <Button variant="default" className="mt-4 w-full">Start Quiz</Button>
                             </div>
                           </Link>
                        ))}
                    </div>
                </TabsContent>
                <TabsContent value="flashcards" className="mt-6">
                    <div className="text-center py-20 bg-background rounded-2xl shadow-sm border">
                        <h3 className="text-xl font-semibold text-foreground">Coming Soon!</h3>
                        <p className="text-muted-foreground mt-2">Interactive flashcards for {subjectData.name} are on the way.</p>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

    