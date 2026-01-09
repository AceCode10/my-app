'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Search, X, Loader2, BookOpen, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { searchNotes } from '@/lib/supabase/notes';
import type { NoteSearchResult, NoteSearchParams } from '@/types/notes';
import { useDebounce } from '@/hooks/use-debounce';
import Link from 'next/link';

interface NotesSearchProps {
  subjectId?: string;
  topicId?: string;
  examBoardId?: string;
  placeholder?: string;
  className?: string;
  onResultClick?: (result: NoteSearchResult) => void;
}

export function NotesSearch({
  subjectId,
  topicId,
  examBoardId,
  placeholder = 'Search notes...',
  className,
  onResultClick
}: NotesSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NoteSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  // Perform search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    async function performSearch() {
      setIsLoading(true);
      try {
        const params: NoteSearchParams = {
          query: debouncedQuery,
          subject_id: subjectId,
          topic_id: topicId,
          exam_board_id: examBoardId,
          limit: 20
        };
        const searchResults = await searchNotes(params);
        setResults(searchResults);
        setHasSearched(true);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }

    performSearch();
  }, [debouncedQuery, subjectId, topicId, examBoardId]);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Keyboard shortcut to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClear = useCallback(() => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
    inputRef.current?.focus();
  }, []);

  const handleResultClick = useCallback((result: NoteSearchResult) => {
    if (onResultClick) {
      onResultClick(result);
    }
    setIsOpen(false);
    setQuery('');
  }, [onResultClick]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'relative w-full justify-start text-muted-foreground',
            className
          )}
        >
          <Search className="h-4 w-4 mr-2" />
          <span className="flex-1 text-left">{placeholder}</span>
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="sr-only">Search Notes</DialogTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {query && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={handleClear}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-4 pt-2">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isLoading && hasSearched && results.length === 0 && (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No notes found for "{query}"</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try different keywords or check your spelling
                </p>
              </div>
            )}

            {!isLoading && results.length > 0 && (
              <div className="space-y-2">
                {results.map((result) => (
                  <SearchResultItem
                    key={result.id}
                    result={result}
                    onClick={() => handleResultClick(result)}
                  />
                ))}
              </div>
            )}

            {!isLoading && !hasSearched && (
              <div className="text-center py-8">
                <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">Start typing to search notes</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Search by title, content, or topic
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer with tips */}
        <div className="border-t p-3 bg-muted/30">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded border bg-background">↵</kbd>
                to select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded border bg-background">esc</kbd>
                to close
              </span>
            </div>
            <span>{results.length} results</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SearchResultItemProps {
  result: NoteSearchResult;
  onClick: () => void;
}

function SearchResultItem({ result, onClick }: SearchResultItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-lg border bg-card',
        'hover:bg-muted/50 hover:border-primary/50',
        'transition-colors cursor-pointer',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
      )}
    >
      <div className="flex items-start gap-3">
        <BookOpen className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground truncate">{result.title}</h4>
          {result.subtitle && (
            <p className="text-sm text-muted-foreground truncate mt-0.5">
              {result.subtitle}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            {result.subject_name && (
              <Badge variant="secondary" className="text-xs">
                {result.subject_name}
              </Badge>
            )}
            {result.topic_name && (
              <Badge variant="outline" className="text-xs">
                {result.topic_name}
              </Badge>
            )}
          </div>
          {result.headline && (
            <p 
              className="text-sm text-muted-foreground mt-2 line-clamp-2"
              dangerouslySetInnerHTML={{ __html: result.headline }}
            />
          )}
        </div>
      </div>
    </button>
  );
}

// Inline search bar variant
interface InlineNotesSearchProps {
  subjectId?: string;
  topicId?: string;
  placeholder?: string;
  className?: string;
}

export function InlineNotesSearch({
  subjectId,
  topicId,
  placeholder = 'Search notes...',
  className
}: InlineNotesSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NoteSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }

    async function performSearch() {
      setIsLoading(true);
      try {
        const searchResults = await searchNotes({
          query: debouncedQuery,
          subject_id: subjectId,
          topic_id: topicId,
          limit: 5
        });
        setResults(searchResults);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    }

    performSearch();
  }, [debouncedQuery, subjectId, topicId]);

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          className="pl-10"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Dropdown Results */}
      {isFocused && query && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 overflow-hidden">
          {results.map((result) => (
            <Link
              key={result.id}
              href={`/notes/${result.slug}`}
              className="flex items-center gap-3 p-3 hover:bg-muted transition-colors"
            >
              <BookOpen className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{result.title}</p>
                {result.topic_name && (
                  <p className="text-xs text-muted-foreground truncate">
                    {result.topic_name}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default NotesSearch;
