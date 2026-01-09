'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { flashcardService, FlashcardDeck } from '@/lib/flashcards/flashcard-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  BookOpen,
  Plus,
  Search,
  Clock,
  Trophy,
  Flame,
  Brain,
  Play,
  MoreHorizontal,
  Pencil,
  Trash2,
  Share2,
  Layers
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

export default function FlashcardsPage() {
  const router = useRouter();
  const { user } = useUser();
  const { toast } = useToast();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [dueCount, setDueCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);

  // New deck form state
  const [newDeck, setNewDeck] = useState({
    title: '',
    description: '',
    subject_id: '',
    topic_id: '',
    is_public: false
  });

  useEffect(() => {
    if (user) {
      fetchData();
      fetchSubjects();
    }
  }, [user]);

  async function fetchData() {
    setLoading(true);
    try {
      const [decksData, statsData, dueCountData] = await Promise.all([
        flashcardService.getUserDecks(),
        flashcardService.getStudyStats(),
        flashcardService.getDueCount()
      ]);

      setDecks(decksData);
      setStats(statsData);
      setDueCount(dueCountData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSubjects() {
    const { data } = await supabase
      .from('subjects')
      .select('id, name')
      .order('name');
    setSubjects(data || []);
  }

  async function fetchTopics(subjectId: string) {
    const { data } = await supabase
      .from('topics')
      .select('id, name')
      .eq('subject_id', subjectId)
      .order('order_index');
    setTopics(data || []);
  }

  async function handleCreateDeck() {
    if (!newDeck.title.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a title' });
      return;
    }

    const deck = await flashcardService.createDeck({
      title: newDeck.title,
      description: newDeck.description || undefined,
      subject_id: newDeck.subject_id || undefined,
      topic_id: newDeck.topic_id || undefined,
      is_public: newDeck.is_public
    });

    if (deck) {
      toast({ title: 'Deck created', description: 'Your new flashcard deck is ready' });
      setCreateDialogOpen(false);
      setNewDeck({ title: '', description: '', subject_id: '', topic_id: '', is_public: false });
      await fetchData();
      router.push(`/student/flashcards/${deck.id}`);
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create deck' });
    }
  }

  async function handleDeleteDeck(deckId: string) {
    const success = await flashcardService.deleteDeck(deckId);
    if (success) {
      toast({ title: 'Deck deleted' });
      await fetchData();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete deck' });
    }
  }

  const filteredDecks = decks.filter(deck => {
    if (!searchQuery) return true;
    return deck.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           deck.description?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const myDecks = filteredDecks.filter(d => d.user_id === user?.id);
  const publicDecks = filteredDecks.filter(d => d.is_public && d.user_id !== user?.id);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Brain className="h-8 w-8 text-primary" />
            Flashcards
          </h1>
          <p className="text-muted-foreground mt-1">
            Learn with spaced repetition for better retention
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Deck
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Deck</DialogTitle>
              <DialogDescription>
                Create a new flashcard deck for studying
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newDeck.title}
                  onChange={(e) => setNewDeck(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Biology Chapter 1"
                />
              </div>
              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={newDeck.description}
                  onChange={(e) => setNewDeck(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What's this deck about?"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Subject (optional)</Label>
                  <Select
                    value={newDeck.subject_id}
                    onValueChange={(v) => {
                      setNewDeck(prev => ({ ...prev, subject_id: v, topic_id: '' }));
                      fetchTopics(v);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Topic (optional)</Label>
                  <Select
                    value={newDeck.topic_id}
                    onValueChange={(v) => setNewDeck(prev => ({ ...prev, topic_id: v }))}
                    disabled={!newDeck.subject_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select topic" />
                    </SelectTrigger>
                    <SelectContent>
                      {topics.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateDeck}>Create Deck</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Current Streak</p>
                <p className="text-3xl font-bold">{stats?.current_streak || 0} days</p>
              </div>
              <Flame className="h-10 w-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cards Due</p>
                <p className="text-3xl font-bold text-primary">{dueCount}</p>
              </div>
              <Clock className="h-10 w-10 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cards Learned</p>
                <p className="text-3xl font-bold">{stats?.total_cards_studied || 0}</p>
              </div>
              <BookOpen className="h-10 w-10 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Retention Rate</p>
                <p className="text-3xl font-bold">{Math.round(stats?.retention_rate || 0)}%</p>
              </div>
              <Trophy className="h-10 w-10 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Study Button */}
      {dueCount > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Ready to study?</h3>
                <p className="text-muted-foreground">
                  You have {dueCount} cards due for review
                </p>
              </div>
              <Button size="lg" onClick={() => router.push('/student/flashcards/study')}>
                <Play className="h-5 w-5 mr-2" />
                Start Review
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search decks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* My Decks */}
      <div>
        <h2 className="text-xl font-semibold mb-4">My Decks</h2>
        {myDecks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Layers className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No decks yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first flashcard deck to start learning
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Deck
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myDecks.map(deck => (
              <DeckCard
                key={deck.id}
                deck={deck}
                onStudy={() => router.push(`/student/flashcards/${deck.id}/study`)}
                onEdit={() => router.push(`/student/flashcards/${deck.id}`)}
                onDelete={() => handleDeleteDeck(deck.id)}
                isOwner={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* Public Decks */}
      {publicDecks.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Public Decks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {publicDecks.map(deck => (
              <DeckCard
                key={deck.id}
                deck={deck}
                onStudy={() => router.push(`/student/flashcards/${deck.id}/study`)}
                isOwner={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DeckCard({
  deck,
  onStudy,
  onEdit,
  onDelete,
  isOwner
}: {
  deck: FlashcardDeck;
  onStudy: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isOwner: boolean;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{deck.title}</CardTitle>
            {deck.description && (
              <CardDescription className="line-clamp-2">
                {deck.description}
              </CardDescription>
            )}
          </div>
          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="secondary">
            {deck.card_count} cards
          </Badge>
          {deck.subject && (
            <Badge variant="outline">{deck.subject.name}</Badge>
          )}
          {deck.is_public && (
            <Badge variant="outline" className="text-green-600">
              <Share2 className="h-3 w-3 mr-1" />
              Public
            </Badge>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={onStudy} disabled={deck.card_count === 0}>
          <Play className="h-4 w-4 mr-2" />
          Study
        </Button>
      </CardFooter>
    </Card>
  );
}
