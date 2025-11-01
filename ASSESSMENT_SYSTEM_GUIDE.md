# 🎓 Assessment & Test Builder System - Implementation Guide

## 📋 Overview

Complete assessment and test builder system for the IGCSE Simplified platform with multiple assessment types, timer functionality, auto-grading, and robust content management.

---

## ✅ What Has Been Implemented

### **1. Database Schema** ✅
- **File:** `ASSESSMENT_SYSTEM_MIGRATION.sql`
- Complete database structure with:
  - 13 core tables for assessments, questions, attempts, answers
  - Assessment types: Full Paper, Topical, Quiz, Flashcard, Custom Test
  - Spaced repetition system for flashcards
  - Class management and assignments
  - Topic mastery tracking
  - Comprehensive RLS policies
  - Auto-grading triggers
  - Helper functions for calculations

### **2. TypeScript Types** ✅
- **File:** `src/types/assessment.ts`
- Complete type definitions for:
  - All database entities
  - Request/Response types
  - Component prop types
  - Filter and query types
  - Utility types for stats and analytics

### **3. Core Hooks** ✅
- **File:** `src/hooks/useAssessmentTimer.ts`
- Essential hooks:
  - `useAssessmentTimer` - Countdown timer with server sync
  - `useAutoSave` - Auto-save answers every 30 seconds
  - `useVisibilityChange` - Detect tab switching
  - `usePreventCopyPaste` - Disable copy/paste
  - `useFullscreen` - Manage fullscreen mode
  - `useAssessmentState` - Manage attempt state

### **4. Utility Functions** ✅
- **File:** `src/lib/assessment-utils.ts`
- Helper functions for:
  - Question selection and filtering
  - Auto-grading system (MCQ, short answer, calculations)
  - Spaced repetition calculations
  - Assessment statistics
  - String similarity matching
  - Topic mastery tracking

---

## 🚀 Quick Start

### **Step 1: Apply Database Migration**

```bash
# Open Supabase Dashboard → SQL Editor
# Copy contents of ASSESSMENT_SYSTEM_MIGRATION.sql
# Paste and execute
```

### **Step 2: Verify Installation**

```sql
-- Check assessment types created
SELECT * FROM assessment_types;

-- Check enhanced questions table
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'questions' 
AND column_name IN ('difficulty', 'question_type', 'marks');

-- Check RLS policies
SELECT tablename, policyname FROM pg_policies 
WHERE tablename LIKE 'assessment%';
```

---

## 📖 Assessment Types Explained

### **1. Full Paper Exams** (Past Papers)
**Use Case:** Complete examination papers with official mark schemes

**Features:**
- Timer starts immediately, cannot be paused
- Full-screen mode recommended
- Questions displayed sequentially or all-at-once
- Flag questions for review
- Auto-submit when time expires
- Show score breakdown, mark scheme, examiner comments

**Database:**
```sql
-- Create full paper assessment
INSERT INTO assessments (
  assessment_type_id,
  title,
  subject_id,
  exam_board_id,
  duration_minutes,
  total_marks,
  exam_year,
  exam_series,
  paper_variant,
  paper_file_url,
  mark_scheme_url
) VALUES (
  (SELECT id FROM assessment_types WHERE code = 'full_paper'),
  'IGCSE Mathematics Paper 2',
  'subject-uuid',
  'exam-board-uuid',
  90,
  100,
  2024,
  'May/June',
  'Paper 2',
  'url-to-pdf',
  'url-to-mark-scheme'
);
```

### **2. Topical Questions**
**Use Case:** Targeted practice on specific topics

**Features:**
- Practice Mode: Untimed, see answers immediately
- Test Mode: Timed, marked at end
- Filter by difficulty (Easy, Medium, Hard)
- Questions randomized from pool
- Track performance per topic

**Implementation:**
```typescript
// Select random topical questions
const questions = await selectRandomQuestions({
  topicId: 'topic-uuid',
  difficulty: 'medium',
  count: 20
});
```

### **3. Quizzes** (Quick Knowledge Checks)
**Use Case:** Short, focused assessments (5-10 questions, 10-15 minutes)

**Features:**
- Auto-generated from topic question pool
- Multiple quiz types: Topic, Mixed, Revision (adaptive)
- Gamified with immediate feedback
- Can retake unlimited times
- Leaderboard and badges

**Types:**
- **Topic Quiz:** Random questions from single topic
- **Mixed Quiz:** Questions across multiple topics
- **Revision Quiz:** Adaptive based on weak areas

### **4. Flashcards**
**Use Case:** Spaced repetition learning

**Features:**
- Question (front) → Answer + explanation (back)
- Self-assessment: "Got it" | "Need practice" | "Don't know"
- Spaced repetition algorithm
- Modes: Study, Random, Test
- Progress tracking and streaks

**Spaced Repetition:**
```typescript
// Calculate next review date
const nextReview = calculateNextReview(
  'need_practice', // confidence level
  3 // review count
);
// Returns: { next_review_at: '2024-11-10', days_until_review: 7 }
```

### **5. Custom Tests** (Teacher Test Builder)
**Use Case:** Teachers create custom tests from question bank

**Features:**
- Drag-and-drop question selection
- Customize question order and sections
- Randomize questions/answers
- Download as PDF
- Assign to classes
- Save as template

---

## 🎯 User Flows

### **Student: Taking a Full Paper Exam**

```typescript
// 1. Browse past papers
const papers = await supabase
  .from('assessments')
  .select('*')
  .eq('assessment_type_id', fullPaperTypeId)
  .eq('subject_id', subjectId)
  .eq('exam_board_id', examBoardId);

// 2. Start exam
const { data: attempt } = await supabase
  .from('assessment_attempts')
  .insert({
    assessment_id: paperId,
    user_id: userId,
    started_at: new Date().toISOString(),
    status: 'in_progress'
  })
  .select()
  .single();

// 3. Use timer hook
const { timeRemaining, isExpired, formattedTime } = useAssessmentTimer({
  durationMinutes: 90,
  startedAt: attempt.started_at,
  onExpire: () => submitAssessment(),
  onWarning: (minutes) => showWarning(minutes)
});

// 4. Submit answer
const { error } = await supabase
  .from('assessment_answers')
  .insert({
    attempt_id: attempt.id,
    question_id: questionId,
    answer_text: studentAnswer,
    time_spent_seconds: timeSpent
  });

// 5. Auto-grade
const gradingResult = autoGradeAnswer({
  question,
  answer: studentAnswer,
  selected_choice_id: choiceId
});

// 6. Submit assessment
await supabase
  .from('assessment_attempts')
  .update({
    status: 'submitted',
    submitted_at: new Date().toISOString(),
    time_spent_seconds: totalTime
  })
  .eq('id', attempt.id);
```

### **Teacher: Creating Custom Test**

```typescript
// 1. Create assessment
const { data: assessment } = await supabase
  .from('assessments')
  .insert({
    assessment_type_id: customTestTypeId,
    title: 'Algebra Test 1',
    subject_id: subjectId,
    exam_board_id: examBoardId,
    duration_minutes: 60,
    total_marks: 50,
    created_by: teacherId,
    randomize_questions: true
  })
  .select()
  .single();

// 2. Add questions
const questions = await getQuestions({
  subject_id: subjectId,
  topic_id: topicId,
  difficulty: 'medium'
});

for (let i = 0; i < questions.length; i++) {
  await supabase
    .from('assessment_questions')
    .insert({
      assessment_id: assessment.id,
      question_id: questions[i].id,
      question_order: i + 1,
      section_name: 'Section A'
    });
}

// 3. Assign to class
await supabase
  .from('assessment_assignments')
  .insert({
    assessment_id: assessment.id,
    class_id: classId,
    assigned_by: teacherId,
    due_date: dueDate,
    show_results: 'after_deadline'
  });
```

### **Admin: Adding Questions to Bank**

```typescript
// 1. Create MCQ question
const { data: question } = await supabase
  .from('questions')
  .insert({
    subject_id: subjectId,
    topic_id: topicId,
    exam_board_id: examBoardId,
    stem_markdown: 'What is 2 + 2?',
    question_type: 'mcq',
    difficulty: 'easy',
    marks: 1,
    estimated_time_minutes: 1.5,
    explanation: 'Basic addition',
    status: 'published'
  })
  .select()
  .single();

// 2. Add choices
const choices = [
  { text: '3', is_correct: false },
  { text: '4', is_correct: true },
  { text: '5', is_correct: false },
  { text: '6', is_correct: false }
];

for (let i = 0; i < choices.length; i++) {
  await supabase
    .from('question_choices')
    .insert({
      question_id: question.id,
      choice_text: choices[i].text,
      is_correct: choices[i].is_correct,
      choice_order: i + 1
    });
}
```

---

## 🔧 Key Features Implementation

### **Timer System**

```typescript
// Client-side timer with server sync
const { timeRemaining, isExpired, formattedTime } = useAssessmentTimer({
  durationMinutes: 90,
  startedAt: attempt.started_at,
  onExpire: handleExpire,
  onWarning: handleWarning,
  warningThresholds: [10, 5, 1] // minutes
});

// Display timer
<div className="fixed top-4 right-4 bg-white p-4 rounded shadow">
  <div className="text-2xl font-bold">{formattedTime}</div>
  {timeRemaining < 300 && (
    <div className="text-red-600 text-sm">Less than 5 minutes!</div>
  )}
</div>
```

### **Auto-Save**

```typescript
const { lastSaved, isSaving, forceSave } = useAutoSave({
  onSave: async () => {
    await saveAllAnswers();
  },
  interval: 30000, // 30 seconds
  enabled: true
});

// Show save status
{isSaving && <span>Saving...</span>}
{lastSaved && <span>Last saved: {formatTime(lastSaved)}</span>}
```

### **Auto-Grading**

```typescript
// Grade answer automatically
const result = autoGradeAnswer({
  question,
  answer: studentAnswer,
  selected_choice_id: choiceId
});

if (result.auto_graded) {
  // Update answer with grade
  await supabase
    .from('assessment_answers')
    .update({
      is_correct: result.is_correct,
      marks_awarded: result.marks_awarded
    })
    .eq('id', answerId);
} else if (result.needs_manual_grading) {
  // Flag for teacher review
  await supabase
    .from('assessment_answers')
    .update({
      flagged_for_review: true
    })
    .eq('id', answerId);
}
```

### **Spaced Repetition**

```typescript
// Update flashcard progress
const nextReview = calculateNextReview(
  confidenceLevel,
  reviewCount
);

await supabase
  .from('flashcard_progress')
  .upsert({
    user_id: userId,
    question_id: questionId,
    confidence_level: confidenceLevel,
    review_count: reviewCount + 1,
    last_reviewed_at: new Date().toISOString(),
    next_review_at: nextReview.next_review_at
  });

// Get cards due for review
const dueCards = await getFlashcardsDueForReview(userId, topicId);
```

---

## 📊 Analytics & Tracking

### **Topic Mastery**

```sql
-- Automatically updated by trigger after each attempt
SELECT 
  t.name as topic,
  tm.questions_attempted,
  tm.questions_correct,
  tm.mastery_percentage,
  tm.last_practiced_at
FROM topic_mastery tm
JOIN topics t ON t.id = tm.topic_id
WHERE tm.user_id = 'user-uuid'
ORDER BY tm.mastery_percentage DESC;
```

### **Assessment Statistics**

```typescript
const stats = await getAssessmentStats(assessmentId);
// Returns:
// {
//   total_attempts: 45,
//   completed_attempts: 42,
//   average_score: 72.5,
//   average_percentage: 72.5,
//   pass_rate: 85.7
// }
```

### **Class Performance**

```sql
-- Get class performance for an assignment
SELECT 
  u.display_name,
  at.score,
  at.percentage,
  at.submitted_at,
  at.status
FROM assessment_attempts at
JOIN users u ON u.id = at.user_id
JOIN assessment_assignments aa ON aa.assessment_id = at.assessment_id
WHERE aa.class_id = 'class-uuid'
AND aa.assessment_id = 'assessment-uuid'
ORDER BY at.percentage DESC;
```

---

## 🎨 UI Components to Build

### **Priority 1: Core Assessment Components**

1. **AssessmentCard** - Display assessment info
2. **TestInterface** - Full-screen test-taking UI
3. **Timer** - Countdown timer display
4. **QuestionDisplay** - Render question with choices
5. **AnswerInput** - Different inputs for question types
6. **QuestionNavigator** - Jump between questions
7. **ResultsView** - Show scores and solutions

### **Priority 2: Teacher Components**

8. **TestBuilder** - Drag-drop question builder
9. **QuestionBankBrowser** - Search and filter questions
10. **ClassManager** - Create and manage classes
11. **AssignmentManager** - Assign tests to classes
12. **GradingInterface** - Manual grading for essays

### **Priority 3: Admin Components**

13. **QuestionEditor** - Rich text editor for questions
14. **BulkUpload** - CSV/JSON import
15. **PastPaperProcessor** - PDF upload + metadata
16. **AnalyticsDashboard** - Platform-wide stats

---

## 🔒 Security & RLS

### **Key RLS Policies**

```sql
-- Students can only view their own attempts
CREATE POLICY "Users can view their own attempts"
  ON assessment_attempts FOR SELECT
  USING (user_id = auth.uid());

-- Teachers can view attempts for their classes
CREATE POLICY "Teachers can view class attempts"
  ON assessment_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assessment_assignments aa
      JOIN classes c ON c.id = aa.class_id
      WHERE aa.assessment_id = assessment_attempts.assessment_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Only published assessments are visible
CREATE POLICY "Anyone can view published assessments"
  ON assessments FOR SELECT
  USING (is_published = true AND archived_at IS NULL);
```

### **Anti-Cheating Measures**

1. **Server-side timer validation**
2. **Disable copy/paste** during test
3. **Track tab switching** (visibility API)
4. **Randomize questions** per student
5. **Randomize answer choices** for MCQ
6. **IP address logging**
7. **Browser fingerprinting**

---

## 📝 Next Steps

### **Immediate (Week 1-2)**
1. ✅ Database schema applied
2. ✅ TypeScript types created
3. ✅ Core hooks implemented
4. ✅ Utility functions ready
5. ⏳ Build UI components
6. ⏳ Create admin CMS pages

### **Short-term (Week 3-4)**
7. ⏳ Implement full paper exam flow
8. ⏳ Build topical questions interface
9. ⏳ Create quiz system
10. ⏳ Add flashcard viewer

### **Medium-term (Week 5-6)**
11. ⏳ Teacher test builder
12. ⏳ Class management
13. ⏳ Assignment system
14. ⏳ Manual grading interface

### **Long-term (Week 7-8)**
15. ⏳ PDF generation
16. ⏳ Advanced analytics
17. ⏳ Leaderboards
18. ⏳ Mobile optimization

---

## 🐛 Troubleshooting

### **Issue: Timer not syncing**
```typescript
// Check server time calculation
const serverTime = calculateTimeRemaining();
console.log('Server time:', serverTime);
console.log('Client time:', timeRemaining);
```

### **Issue: Auto-grading not working**
```sql
-- Check if trigger is enabled
SELECT * FROM pg_trigger WHERE tgname = 'trigger_update_topic_mastery';

-- Manually trigger update
SELECT update_topic_mastery();
```

### **Issue: RLS blocking queries**
```sql
-- Check current user
SELECT auth.uid();

-- Test policy
SELECT * FROM assessment_attempts WHERE user_id = auth.uid();
```

---

## 📚 Additional Resources

- **Database Schema:** `ASSESSMENT_SYSTEM_MIGRATION.sql`
- **TypeScript Types:** `src/types/assessment.ts`
- **Hooks:** `src/hooks/useAssessmentTimer.ts`
- **Utils:** `src/lib/assessment-utils.ts`
- **Instructions:** `instructions.md` (main SRS)

---

**Status:** ✅ **Foundation Complete - Ready for UI Development**

**Next:** Build UI components starting with AssessmentCard and TestInterface

**Estimated Time to MVP:** 4-6 weeks with focused development
