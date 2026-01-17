'use client';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Layers, Search, Eye, BookOpen, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FlashcardDeck {
    id: string;
    title: string;
    subject_id: string;
    topic_id: string | null;
    created_by: string;
    created_at: string;
    card_count?: number;
    subjects?: { name: string };
    topics?: { name: string };
}

interface Subject {
    id: string;
    name: string;
}

const TeacherFlashcardsPage = () => {
    const supabase = createClient();
    const { user } = useUser();
    const { toast } = useToast();
    const [decks, setDecks] = useState<FlashcardDeck[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSubject, setSelectedSubject] = useState<string>('all');

    useEffect(() => {
        fetchDecks();
        fetchSubjects();
    }, []);

    async function fetchSubjects() {
        const { data } = await supabase
            .from('subjects')
            .select('id, name')
            .order('name');
        setSubjects(data || []);
    }

    async function fetchDecks() {
        try {
            // Fetch all public flashcard decks (created by content moderators/admins)
            const { data, error } = await supabase
                .from('flashcard_decks')
                .select('*, subjects(name), topics(name)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            // Get card counts for each deck
            const decksWithCounts = await Promise.all(
                (data || []).map(async (deck) => {
                    const { count } = await supabase
                        .from('flashcards')
                        .select('*', { count: 'exact', head: true })
                        .eq('deck_id', deck.id);
                    return { ...deck, card_count: count || 0 };
                })
            );
            
            setDecks(decksWithCounts);
        } catch (error) {
            console.error('Error fetching decks:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load flashcard decks.' });
        } finally {
            setIsLoading(false);
        }
    }

    // Memoized filtered decks for real-time search performance
    const filteredDecks = useMemo(() => {
        const searchLower = searchQuery.toLowerCase();
        return decks.filter(deck => {
            const matchesSearch = !searchQuery.trim() ||
                deck.title.toLowerCase().includes(searchLower) ||
                deck.subjects?.name?.toLowerCase().includes(searchLower);
            const matchesSubject = selectedSubject === 'all' || deck.subject_id === selectedSubject;
            return matchesSearch && matchesSubject;
        });
    }, [decks, searchQuery, selectedSubject]);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-foreground">Flashcard Library</h2>
                <p className="text-muted-foreground mt-1">Browse flashcard decks and assign them to your classes.</p>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search flashcard decks..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                            <SelectTrigger className="w-full sm:w-[200px]">
                                <SelectValue placeholder="Filter by subject" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Subjects</SelectItem>
                                {subjects.map(subject => (
                                    <SelectItem key={subject.id} value={subject.id}>
                                        {subject.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Decks Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-6 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-10 w-full mt-4" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : filteredDecks.length === 0 ? (
                <Card className="text-center p-12 border-dashed">
                    <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold text-foreground mb-2">No Flashcard Decks Found</h3>
                    <p className="text-muted-foreground text-sm">
                        {searchQuery || selectedSubject !== 'all' 
                            ? 'Try adjusting your search or filter criteria.'
                            : 'Flashcard decks will appear here once created by content moderators.'}
                    </p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredDecks.map(deck => (
                        <Card key={deck.id} className="hover:border-primary/50 transition-colors">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="text-lg">{deck.title}</CardTitle>
                                        <CardDescription className="mt-1">
                                            {deck.subjects?.name || 'Unknown Subject'}
                                            {deck.topics?.name && ` • ${deck.topics.name}`}
                                        </CardDescription>
                                    </div>
                                    <Badge variant="secondary">
                                        <Layers className="h-3 w-3 mr-1" />
                                        {deck.card_count} cards
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-2">
                                    <Button variant="outline" className="flex-1" asChild>
                                        <Link href={`/teacher/flashcards/${deck.id}`}>
                                            <Eye className="h-4 w-4 mr-2" />
                                            Preview
                                        </Link>
                                    </Button>
                                    <Button variant="default" className="flex-1" asChild>
                                        <Link href={`/teacher/flashcards/${deck.id}/assign`}>
                                            <Users className="h-4 w-4 mr-2" />
                                            Assign
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TeacherFlashcardsPage;
