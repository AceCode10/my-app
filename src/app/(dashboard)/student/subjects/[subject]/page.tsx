'use client';

import React, { use, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { ChevronRight, ChevronDown, FileText, Download, CheckCircle, FileArchive, FlaskConical, TestTube, BookOpen, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const supabase = createClient();

interface SubjectPageProps {
  params: Promise<{ subject: string }>;
}

export default function SubjectPage({ params }: SubjectPageProps) {
    const resolvedParams = use(params);
    const subjectSlug = resolvedParams.subject;

    // Fetch subject from database
    const { data: subjectData, isLoading, error } = useQuery({
        queryKey: ['subject', subjectSlug],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('subjects')
                .select(`
                    id,
                    name,
                    slug,
                    code,
                    description,
                    icon_url,
                    color,
                    exam_board_id,
                    level,
                    status
                `)
                .eq('slug', subjectSlug)
                .single();
            
            if (error) throw error;
            return data;
        },
    });

    // Fetch topics for this subject
    const { data: topics = [] } = useQuery({
        queryKey: ['subject-topics', subjectData?.id],
        queryFn: async () => {
            if (!subjectData?.id) return [];
            const { data, error } = await supabase
                .from('topics')
                .select('id, name, slug, description, display_order, status')
                .eq('subject_id', subjectData.id)
                .eq('status', 'published')
                .order('display_order', { ascending: true });
            
            if (error) throw error;
            return data || [];
        },
        enabled: !!subjectData?.id,
    });

    // Fetch past papers for this subject
    const { data: pastPapers = [] } = useQuery({
        queryKey: ['subject-papers', subjectData?.id],
        queryFn: async () => {
            if (!subjectData?.id) return [];
            const { data, error } = await supabase
                .from('past_papers')
                .select('id, title, year, session, paper_number, question_paper_url, mark_scheme_url, status')
                .eq('subject_id', subjectData.id)
                .eq('status', 'published')
                .order('year', { ascending: false });
            
            if (error) throw error;
            return data || [];
        },
        enabled: !!subjectData?.id,
    });

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-64" />
                <div className="flex items-center space-x-4">
                    <Skeleton className="h-16 w-16 rounded-lg" />
                    <div>
                        <Skeleton className="h-10 w-48 mb-2" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                </div>
                <Skeleton className="h-12 w-full" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}
                </div>
            </div>
        );
    }

    if (error || !subjectData) {
        return (
            <div className="text-center py-20">
                <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold text-foreground mb-2">Subject not found</h2>
                <p className="text-muted-foreground mb-4">The subject you're looking for doesn't exist or has been removed.</p>
                <Link href="/student/subjects">
                    <Button>Back to Subjects</Button>
                </Link>
            </div>
        );
    }

    // Group past papers by year and session
    const groupedPapers = pastPapers.reduce((acc: any, paper: any) => {
        const key = `${paper.year}-${paper.session}`;
        if (!acc[key]) {
            acc[key] = { year: paper.year, session: paper.session, papers: [] };
        }
        acc[key].papers.push(paper);
        return acc;
    }, {});

    // Track expanded paper groups - first one open by default
    const [expandedPaperGroups, setExpandedPaperGroups] = useState<Set<string>>(() => {
        const keys = Object.keys(groupedPapers);
        return new Set(keys.length > 0 ? [keys[0]] : []);
    });

    const togglePaperGroup = (key: string) => {
        setExpandedPaperGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) {
                newSet.delete(key);
            } else {
                newSet.add(key);
            }
            return newSet;
        });
    };

    const practicalResources = [
        { name: "Lab Safety Guide", description: "Essential safety protocols for all experiments.", icon: TestTube},
        { name: "Experiment Simulation", description: "Interactive simulation for titration.", icon: FlaskConical},
    ];

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
                <Link href="/student/subjects" className="hover:text-primary">Subjects</Link>
                <ChevronRight className="h-4 w-4 mx-1" />
                <span className="font-medium text-foreground">{subjectData.name}</span>
            </div>
            <div className="mb-8 flex items-center space-x-4">
                <div className="bg-muted p-4 rounded-lg">
                    <BookOpen className="w-10 h-10 text-primary" />
                </div>
                <div>
                    <h1 className="text-4xl font-extrabold text-foreground">{subjectData.name}</h1>
                    <p className="text-muted-foreground mt-1">Syllabus Code: {subjectData.code || 'N/A'}</p>
                </div>
            </div>

             <Tabs defaultValue="notes" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="notes">📝 Topics</TabsTrigger>
                    <TabsTrigger value="past-papers">🗃️ Past Papers</TabsTrigger>
                    <TabsTrigger value="quizzes">✅ Practice</TabsTrigger>
                </TabsList>
                <TabsContent value="notes" className="mt-6">
                    {topics.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {topics.map((topic: any) => (
                               <Link href={`/student/subjects/${subjectSlug}/${topic.slug}`} key={topic.id}>
                                 <div className="bg-background p-6 rounded-2xl shadow-sm border hover:border-primary hover:shadow-lg transition-all duration-200 h-full flex flex-col">
                                    <h4 className="font-bold text-lg text-foreground">{topic.name}</h4>
                                    <p className="text-sm text-muted-foreground mt-2 flex-grow">{topic.description || 'Explore this topic'}</p>
                                    <Button variant="secondary" className="mt-4 w-full">View Topic</Button>
                                 </div>
                               </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-background rounded-2xl shadow-sm border">
                            <h3 className="text-xl font-semibold text-foreground">No Topics Yet</h3>
                            <p className="text-muted-foreground mt-2">Topics for {subjectData.name} are being added.</p>
                        </div>
                    )}
                </TabsContent>
                <TabsContent value="past-papers" className="mt-6">
                     {Object.keys(groupedPapers).length > 0 ? (
                         <div className="space-y-4">
                            {Object.entries(groupedPapers).map(([key, group]: [string, any]) => {
                                const isExpanded = expandedPaperGroups.has(key);
                                return (
                                    <Collapsible
                                        key={key}
                                        open={isExpanded}
                                        onOpenChange={() => togglePaperGroup(key)}
                                    >
                                        <div className="bg-background rounded-2xl shadow-sm border overflow-hidden">
                                            <CollapsibleTrigger asChild>
                                                <button className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <h2 className="text-lg font-bold text-foreground">
                                                            {group.year} - {group.session || 'All Sessions'}
                                                        </h2>
                                                        <span className="text-sm text-muted-foreground">
                                                            ({group.papers.length} {group.papers.length === 1 ? 'paper' : 'papers'})
                                                        </span>
                                                    </div>
                                                    <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                                </button>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent>
                                                <div className="px-4 pb-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {group.papers.map((p: any) => (
                                                            <div key={p.id} className="p-3 bg-muted/30 rounded-lg space-y-2">
                                                                <div className="font-medium text-foreground">{p.title || `Paper ${p.paper_number}`}</div>
                                                                <div className="flex gap-2">
                                                                    {p.question_paper_url && (
                                                                        <a href={p.question_paper_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                                                                            <FileText className="w-4 h-4" /> QP
                                                                        </a>
                                                                    )}
                                                                    {p.mark_scheme_url && (
                                                                        <a href={p.mark_scheme_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-green-600 hover:underline">
                                                                            <CheckCircle className="w-4 h-4" /> MS
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </CollapsibleContent>
                                        </div>
                                    </Collapsible>
                                );
                            })}
                        </div>
                     ) : (
                        <div className="text-center py-20 bg-background rounded-2xl shadow-sm border">
                            <h3 className="text-xl font-semibold text-foreground">Past Papers Coming Soon</h3>
                            <p className="text-muted-foreground mt-2">We are working on adding past papers for {subjectData.name}.</p>
                        </div>
                    )}
                </TabsContent>
                 <TabsContent value="quizzes" className="mt-6">
                    {topics.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {topics.map((topic: any) => (
                               <Link href={`/resources/topical-questions/${subjectSlug}/${topic.slug}`} key={topic.id}>
                                 <div className="bg-background p-6 rounded-2xl shadow-sm border hover:border-primary hover:shadow-lg transition-all duration-200 h-full flex flex-col">
                                    <h4 className="font-bold text-lg text-foreground">{topic.name}</h4>
                                    <p className="text-sm text-muted-foreground mt-2 flex-grow">{topic.description || 'Practice questions for this topic'}</p>
                                    <Button variant="default" className="mt-4 w-full">Start Practice</Button>
                                 </div>
                               </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-background rounded-2xl shadow-sm border">
                            <h3 className="text-xl font-semibold text-foreground">Practice Coming Soon</h3>
                            <p className="text-muted-foreground mt-2">Practice questions for {subjectData.name} are being added.</p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
