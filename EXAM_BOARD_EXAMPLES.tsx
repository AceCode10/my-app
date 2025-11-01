// ============================================
// EXAM BOARD SYSTEM - CODE EXAMPLES
// Copy-paste ready examples for common scenarios
// ============================================

/* 
 * This file contains practical examples for integrating
 * the exam board system into your pages and components.
 * Simply copy the relevant example and adapt to your needs.
 */

// ============================================
// EXAMPLE 1: SUBJECTS PAGE WITH FILTERING
// ============================================

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ExamBoardFilter, ExamBoardBadge } from '@/components/exam-board';
import { useExamBoardFilter } from '@/contexts/ExamBoardContext';

export function SubjectsPageExample() {
  const supabase = createClient();
  const { exam_board_id } = useExamBoardFilter();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSubjects() {
      setLoading(true);
      
      let query = supabase
        .from('subjects')
        .select(`
          *,
          exam_board:exam_boards(*)
        `)
        .eq('status', 'published')
        .order('display_order');

      // Apply exam board filter if set
      if (exam_board_id) {
        query = query.eq('exam_board_id', exam_board_id);
      }

      const { data, error } = await query;
      
      if (!error && data) {
        setSubjects(data);
      }
      
      setLoading(false);
    }

    fetchSubjects();
  }, [exam_board_id]); // Re-fetch when filter changes

  return (
    <div>
      <h1>Subjects</h1>
      
      {/* Exam Board Filter */}
      <ExamBoardFilter variant="tabs" />

      {/* Subjects Grid */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        {subjects.map(subject => (
          <div key={subject.id} className="border rounded-lg p-4">
            <div className="flex items-start justify-between">
              <h3>{subject.name}</h3>
              {subject.exam_board && (
                <ExamBoardBadge examBoard={subject.exam_board} size="sm" />
              )}
            </div>
            <p>{subject.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// EXAMPLE 2: ADMIN SUBJECT CREATION FORM
// ============================================

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ExamBoardContentSelector } from '@/components/admin/ExamBoardContentSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { assignContentToExamBoards } from '@/lib/exam-board-utils';

export function CreateSubjectFormExample() {
  const supabase = createClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedBoards, setSelectedBoards] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedBoards.length === 0) {
      alert('Please select at least one exam board');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create subject with primary exam board
      const { data: subject, error } = await supabase
        .from('subjects')
        .insert({
          name,
          description,
          exam_board_id: selectedBoards[0], // Primary board
          slug: name.toLowerCase().replace(/\s+/g, '-'),
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;

      // If multiple boards selected, add to junction table
      if (selectedBoards.length > 1) {
        await assignContentToExamBoards('subject', subject.id, selectedBoards);
      }

      alert('Subject created successfully!');
      // Reset form or redirect
    } catch (error) {
      console.error('Error creating subject:', error);
      alert('Failed to create subject');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label>Subject Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div>
        <label>Description</label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* Exam Board Selector */}
      <ExamBoardContentSelector
        selectedBoardIds={selectedBoards}
        onChange={setSelectedBoards}
        required={true}
        allowMultiple={true}
      />

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Subject'}
      </Button>
    </form>
  );
}

// ============================================
// EXAMPLE 3: QUESTIONS PAGE WITH FILTERING
// ============================================

import { useExamBoardFilter } from '@/contexts/ExamBoardContext';
import { getQuestionsWithExamBoard } from '@/lib/exam-board-utils';
import { ExamBoardFilter, ExamBoardBadge } from '@/components/exam-board';

export function QuestionsPageExample() {
  const { exam_board_id } = useExamBoardFilter();
  const [questions, setQuestions] = useState([]);
  const [filters, setFilters] = useState({
    subjectId: null,
    topicId: null,
    difficulty: null
  });

  useEffect(() => {
    async function fetchQuestions() {
      const data = await getQuestionsWithExamBoard({
        ...filters,
        examBoardId: exam_board_id,
        limit: 50
      });
      setQuestions(data);
    }

    fetchQuestions();
  }, [exam_board_id, filters]);

  return (
    <div>
      <h1>Practice Questions</h1>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <ExamBoardFilter variant="buttons" />
        {/* Add other filters (subject, topic, difficulty) */}
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {questions.map(question => (
          <div key={question.id} className="border rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex gap-2">
                {question.exam_board && (
                  <ExamBoardBadge examBoard={question.exam_board} size="sm" />
                )}
                <span className="text-sm text-gray-600">
                  {question.subject?.name} • {question.topic?.name}
                </span>
              </div>
              <span className="text-sm font-medium">{question.marks} marks</span>
            </div>
            <div dangerouslySetInnerHTML={{ __html: question.stem_markdown }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// EXAMPLE 4: DASHBOARD WITH PERSONALIZED CONTENT
// ============================================

import { useExamBoard } from '@/contexts/ExamBoardContext';
import { ExamBoardQuickToggle } from '@/components/exam-board';

export function DashboardExample() {
  const { activeExamBoard, showAllBoards } = useExamBoard();
  const [stats, setStats] = useState({
    subjects: 0,
    questions: 0,
    papers: 0
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1>Dashboard</h1>
        
        {/* Quick toggle to show all boards */}
        <ExamBoardQuickToggle />
      </div>

      {/* Personalized message */}
      {activeExamBoard && !showAllBoards && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            📚 You're viewing content for <strong>{activeExamBoard.name}</strong>.
            You can change this in Settings.
          </p>
        </div>
      )}

      {/* Dashboard content filtered by exam board */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border rounded-lg p-4">
          <h3>Subjects</h3>
          <p className="text-3xl font-bold">{stats.subjects}</p>
        </div>
        <div className="border rounded-lg p-4">
          <h3>Questions</h3>
          <p className="text-3xl font-bold">{stats.questions}</p>
        </div>
        <div className="border rounded-lg p-4">
          <h3>Past Papers</h3>
          <p className="text-3xl font-bold">{stats.papers}</p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// EXAMPLE 5: SERVER-SIDE FILTERING (Next.js)
// ============================================

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function SubjectsServerExample() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  let examBoardId = null;

  // Get user's preferred exam board
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('preferred_exam_board_id, show_all_exam_boards')
      .eq('id', user.id)
      .single();

    if (profile && !profile.show_all_exam_boards) {
      examBoardId = profile.preferred_exam_board_id;
    }
  }

  // Fetch subjects with filter
  let query = supabase
    .from('subjects')
    .select(`
      *,
      exam_board:exam_boards(*)
    `)
    .eq('status', 'published');

  if (examBoardId) {
    query = query.eq('exam_board_id', examBoardId);
  }

  const { data: subjects } = await query;

  return (
    <div>
      {subjects?.map(subject => (
        <div key={subject.id}>
          <h3>{subject.name}</h3>
          {subject.exam_board && (
            <span>{subject.exam_board.name}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================
// EXAMPLE 6: MULTI-BOARD CONTENT DISPLAY
// ============================================

import { useState, useEffect } from 'react';
import { getContentExamBoards } from '@/lib/exam-board-utils';
import { MultiExamBoardBadge } from '@/components/exam-board';

export function MultiBoardContentExample({ contentId, contentType }) {
  const [examBoards, setExamBoards] = useState([]);

  useEffect(() => {
    async function fetchBoards() {
      const boards = await getContentExamBoards(contentType, contentId);
      setExamBoards(boards);
    }
    fetchBoards();
  }, [contentId, contentType]);

  return (
    <div>
      {examBoards.length > 1 ? (
        <div>
          <p className="text-sm text-gray-600 mb-2">Available for:</p>
          <MultiExamBoardBadge examBoards={examBoards} maxDisplay={3} />
        </div>
      ) : examBoards.length === 1 ? (
        <ExamBoardBadge examBoard={examBoards[0]} />
      ) : null}
    </div>
  );
}

// ============================================
// EXAMPLE 7: CUSTOM HOOK FOR FILTERED DATA
// ============================================

import { useState, useEffect } from 'react';
import { useExamBoardFilter } from '@/contexts/ExamBoardContext';
import { createClient } from '@/lib/supabase/client';

export function useFilteredSubjects() {
  const { exam_board_id } = useExamBoardFilter();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchSubjects() {
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();
        
        let query = supabase
          .from('subjects')
          .select('*, exam_board:exam_boards(*)')
          .eq('status', 'published');

        if (exam_board_id) {
          query = query.eq('exam_board_id', exam_board_id);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;
        setSubjects(data || []);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    fetchSubjects();
  }, [exam_board_id]);

  return { subjects, loading, error };
}

// Usage:
export function SubjectsWithCustomHook() {
  const { subjects, loading, error } = useFilteredSubjects();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {subjects.map(subject => (
        <div key={subject.id}>{subject.name}</div>
      ))}
    </div>
  );
}

// ============================================
// EXAMPLE 8: ADMIN BULK ASSIGNMENT
// ============================================

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ExamBoardSelector } from '@/components/exam-board';

export function BulkAssignmentExample() {
  const supabase = createClient();
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBulkAssign = async () => {
    if (!selectedBoardId || selectedSubjects.length === 0) return;

    setIsProcessing(true);

    try {
      const { error } = await supabase
        .from('subjects')
        .update({ exam_board_id: selectedBoardId })
        .in('id', selectedSubjects);

      if (error) throw error;

      alert(`Successfully assigned ${selectedSubjects.length} subjects to exam board`);
      setSelectedSubjects([]);
    } catch (error) {
      console.error('Bulk assignment error:', error);
      alert('Failed to assign exam boards');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <h2>Bulk Assign Exam Board</h2>
      
      <ExamBoardSelector
        value={selectedBoardId}
        onChange={setSelectedBoardId}
        showAllOption={false}
      />

      {/* Subject selection UI */}
      {/* ... */}

      <button
        onClick={handleBulkAssign}
        disabled={isProcessing || !selectedBoardId || selectedSubjects.length === 0}
      >
        {isProcessing ? 'Assigning...' : `Assign to ${selectedSubjects.length} subjects`}
      </button>
    </div>
  );
}

// ============================================
// EXAMPLE 9: SEARCH WITH EXAM BOARD FILTER
// ============================================

import { useState } from 'react';
import { useExamBoardFilter } from '@/contexts/ExamBoardContext';
import { createClient } from '@/lib/supabase/client';

export function SearchWithExamBoardExample() {
  const { exam_board_id } = useExamBoardFilter();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleSearch = async () => {
    const supabase = createClient();

    let query = supabase
      .from('questions')
      .select('*, exam_board:exam_boards(*)')
      .textSearch('search_vector', searchQuery)
      .eq('status', 'published');

    if (exam_board_id) {
      query = query.eq('exam_board_id', exam_board_id);
    }

    const { data } = await query.limit(20);
    setResults(data || []);
  };

  return (
    <div>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search questions..."
      />
      <button onClick={handleSearch}>Search</button>

      <div className="mt-4">
        {results.map(result => (
          <div key={result.id} className="border p-4 mb-2">
            <div className="flex items-center gap-2 mb-2">
              {result.exam_board && (
                <ExamBoardBadge examBoard={result.exam_board} size="sm" />
              )}
            </div>
            <div dangerouslySetInnerHTML={{ __html: result.stem_markdown }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// EXAMPLE 10: ANALYTICS DASHBOARD
// ============================================

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ExamBoardBadge } from '@/components/exam-board';

export function AnalyticsDashboardExample() {
  const supabase = createClient();
  const [stats, setStats] = useState([]);

  useEffect(() => {
    async function fetchStats() {
      const { data } = await supabase.rpc('get_exam_board_stats');
      setStats(data || []);
    }
    fetchStats();
  }, []);

  return (
    <div>
      <h2>Content by Exam Board</h2>
      <div className="grid grid-cols-2 gap-4">
        {stats.map(stat => (
          <div key={stat.exam_board_id} className="border rounded-lg p-4">
            <ExamBoardBadge examBoard={stat.exam_board} size="md" />
            <div className="mt-4 space-y-2">
              <div>Subjects: {stat.subject_count}</div>
              <div>Topics: {stat.topic_count}</div>
              <div>Questions: {stat.question_count}</div>
              <div>Papers: {stat.paper_count}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// END OF EXAMPLES
// ============================================

/*
 * These examples cover the most common use cases.
 * For more advanced scenarios, refer to:
 * - EXAM_BOARD_IMPLEMENTATION_GUIDE.md
 * - src/lib/exam-board-utils.ts
 * - src/contexts/ExamBoardContext.tsx
 */
