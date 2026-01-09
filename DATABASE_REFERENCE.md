# Database Schema Reference

This document contains all **ACTIVE** tables and their columns used in the application.  
Only tables that are referenced in the codebase are included here.

## 📋 Table of Contents

- [Core Tables](#core-tables)
- [Assessment System](#assessment-system)
- [Class Management](#class-management)
- [Content Management](#content-management)
- [User Management](#user-management)
- [Messaging System](#messaging-system)
- [Gamification System](#gamification-system)
- [System Tables](#system-tables)

---

## 🔧 Core Tables

### `users` (public schema)
**Purpose:** Application user data and profiles
```sql
- id: UUID (Primary Key)
- email: TEXT
- display_name: TEXT
- avatar_url: TEXT
- role: TEXT
- subscription_tier: TEXT
- leaderboard_opt_out: BOOLEAN
- xp: INTEGER
- streak_days: INTEGER
- last_activity_at: TIMESTAMPTZ
- subjects_of_interest: JSON
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
- preferred_exam_board_id: UUID
- onboarding_completed: BOOLEAN
- show_all_exam_boards: BOOLEAN
- exam_boards: JSON
- levels: JSON
- is_admin: BOOLEAN
- level: TEXT
- country: TEXT
```

### `subjects`
**Purpose:** Academic subjects
```sql
- id: UUID (Primary Key)
- name: TEXT
- code: TEXT
- slug: TEXT
- level: TEXT
- description: TEXT
- icon_url: TEXT
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
- exam_board_id: UUID
- display_order: INTEGER
- status: TEXT
- exam_board: JSON
- color: TEXT
- display_name: TEXT
```

### `topics`
**Purpose:** Topics within subjects
```sql
- id: UUID (Primary Key)
- subject_id: UUID
- parent_topic_id: UUID
- name: TEXT
- slug: TEXT
- ordering: INTEGER
- description: TEXT
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
- exam_board_id: UUID
- pdf_url: TEXT
- answers_pdf_url: TEXT
- estimated_time: INTEGER
- level: TEXT
- status: TEXT
- code: TEXT
- display_order: INTEGER
```

### `exam_boards`
**Purpose:** Examination boards
```sql
- id: UUID (Primary Key)
- code: TEXT
- name: TEXT
- full_name: TEXT
- description: TEXT
- logo_url: TEXT
- is_active: BOOLEAN
- display_order: INTEGER
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
- color: TEXT
- short_name: TEXT
```

---

## 📝 Assessment System

### `assessments`
**Purpose:** Main assessment definitions
```sql
- id: UUID (Primary Key)
- assessment_type_id: UUID
- title: TEXT
- description: TEXT
- instructions: TEXT
- subject_id: UUID
- exam_board_id: UUID
- topic_id: UUID
- duration_minutes: INTEGER
- total_marks: INTEGER
- passing_marks: INTEGER
- exam_year: INTEGER
- exam_series: TEXT
- paper_variant: TEXT
- paper_file_url: TEXT
- mark_scheme_url: TEXT
- examiner_report_url: TEXT
- created_by: UUID
- is_template: BOOLEAN
- randomize_questions: BOOLEAN
- randomize_answers: BOOLEAN
- calculator_allowed: BOOLEAN
- max_attempts: INTEGER
- show_results: BOOLEAN
- is_published: BOOLEAN
- published_at: TIMESTAMPTZ
- archived_at: TIMESTAMPTZ
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
- level: TEXT
```

### `assessment_questions`
**Purpose:** Links assessments to questions
```sql
- id: UUID (Primary Key)
- assessment_id: UUID
- question_id: UUID
- question_order: INTEGER
- section_name: TEXT
- section_instructions: TEXT
- custom_question_text: TEXT
- custom_marks: INTEGER
- custom_mark_scheme: TEXT
- created_at: TIMESTAMPTZ
```

### `assessment_attempts`
**Purpose:** Direct assessment attempts (not via assignments)
```sql
- id: UUID (Primary Key)
- assessment_id: UUID
- user_id: UUID
- started_at: TIMESTAMPTZ
- submitted_at: TIMESTAMPTZ
- time_spent_seconds: INTEGER
- score: INTEGER
- percentage: NUMERIC
- max_score: INTEGER
- status: TEXT
- attempt_number: INTEGER
- ip_address: TEXT
- user_agent: TEXT
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
- paper_id: UUID
- practice_mode: BOOLEAN
- self_score: INTEGER
- notes: TEXT
- class_id: UUID
- review_status: TEXT
- reviewed_by: UUID
- reviewed_at: TIMESTAMPTZ
- reviewer_feedback: TEXT
- awarded_marks: INTEGER
```

### `assessment_answers`
**Purpose:** Answers for assessment attempts
```sql
- id: UUID (Primary Key)
- attempt_id: UUID
- question_id: UUID
- answer_text: TEXT
- selected_choice_id: UUID
- answer_file_url: TEXT
- is_correct: BOOLEAN
- marks_awarded: INTEGER
- max_marks: INTEGER
- teacher_feedback: TEXT
- graded_by: UUID
- graded_at: TIMESTAMPTZ
- flagged_for_review: BOOLEAN
- time_spent_seconds: INTEGER
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### `assessment_types`
**Purpose:** Types of assessments
```sql
- id: UUID (Primary Key)
- code: TEXT
- name: TEXT
- description: TEXT
- created_at: TIMESTAMPTZ
```

### `tests`
**Purpose:** Test definitions (used by assignments)
```sql
- id: UUID (Primary Key)
- created_by: UUID
- title: TEXT
- description: TEXT
- sections: JSON
- total_marks: INTEGER
- visibility: TEXT
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
- subject_id: UUID
- exam_board_id: UUID
- allow_calculator: BOOLEAN
- randomize_questions: BOOLEAN
- randomize_choices: BOOLEAN
- duration_minutes: INTEGER
- total_questions: INTEGER
```

### `assignments`
**Purpose:** Assignments linking tests/papers to classes
```sql
- id: UUID (Primary Key)
- test_id: UUID
- paper_id: UUID
- assigned_by: UUID
- target_class_id: UUID
- target_user_ids: JSON
- title: TEXT
- instructions: TEXT
- start_at: TIMESTAMPTZ
- due_at: TIMESTAMPTZ
- time_limit_minutes: INTEGER
- allow_retakes: BOOLEAN
- max_attempts: INTEGER
- release_answers_at: TIMESTAMPTZ
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
- assessment_id: UUID
```

### `test_attempts`
**Purpose:** Attempts for assignments/tests
```sql
- id: UUID (Primary Key)
- assignment_id: UUID
- test_id: UUID
- user_id: UUID
- started_at: TIMESTAMPTZ
- submitted_at: TIMESTAMPTZ
- expires_at: TIMESTAMPTZ
- time_spent_seconds: INTEGER
- answers: JSON
- score: INTEGER
- max_score: INTEGER
- percentage: NUMERIC
- auto_graded: BOOLEAN
- teacher_graded: BOOLEAN
- grading_details: JSON
- requires_manual_grading: BOOLEAN
- status: TEXT
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### `test_attempt_answers`
**Purpose:** Individual answers for test attempts
```sql
- id: UUID (Primary Key)
- attempt_id: UUID
- question_id: UUID
- answer_text: TEXT
- selected_choice: TEXT
- answer_data: JSON
- is_correct: BOOLEAN
- marks_awarded: INTEGER
- max_marks: INTEGER
- auto_feedback: TEXT
- teacher_feedback: TEXT
- time_spent_seconds: INTEGER
- flagged: BOOLEAN
- answered_at: TIMESTAMPTZ
- created_at: TIMESTAMPTZ
```

---

## 🏫 Class Management

### `classes`
**Purpose:** Class definitions
```sql
- id: UUID (Primary Key)
- name: TEXT
- subject_id: UUID
- teacher_id: UUID
- description: TEXT
- join_code: TEXT
- capacity: INTEGER
- auto_approve: BOOLEAN
- thumbnail_url: TEXT
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
- exam_board_id: UUID
- class_code: TEXT
- academic_year: TEXT
- is_active: BOOLEAN
```

### `enrollments`
**Purpose:** Student enrollments in classes
```sql
- id: UUID (Primary Key)
- class_id: UUID
- user_id: UUID
- status: TEXT
- enrolled_at: TIMESTAMPTZ
```

### `class_students`
**Purpose:** Alternative student tracking (less used)
```sql
- id: UUID (Primary Key)
- class_id: UUID
- student_id: UUID
- joined_at: TIMESTAMPTZ
- left_at: TIMESTAMPTZ
- is_active: BOOLEAN
```

### `class_invitations`
**Purpose:** Class invitations
```sql
- id: UUID (Primary Key)
- class_id: UUID
- invited_email: TEXT
- invited_by: UUID
- status: TEXT
- created_at: TIMESTAMPTZ
- responded_at: TIMESTAMPTZ
- expires_at: TIMESTAMPTZ
```

### `class_announcements`
**Purpose:** Class announcements
```sql
- id: UUID (Primary Key)
- class_id: UUID
- teacher_id: UUID
- title: TEXT
- message: TEXT
- attachments: JSON
- is_pinned: BOOLEAN
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### `class_messages`
**Purpose:** Direct messages within classes
```sql
- id: UUID (Primary Key)
- class_id: UUID
- sender_id: UUID
- recipient_id: UUID
- message: TEXT
- is_read: BOOLEAN
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

---

## 📚 Content Management

### `questions`
**Purpose:** Main question bank
```sql
- id: UUID (Primary Key)
- subject_id: UUID
- topic_id: UUID
- paper_id: UUID
- paper_position: INTEGER
- question_type: TEXT
- stem_md: TEXT
- options: JSON
- correct_answer: TEXT
- marks: INTEGER
- examiner_comment: TEXT
- difficulty: TEXT
- tags: JSON
- media_refs: JSON
- version: INTEGER
- visibility: TEXT
- created_by: UUID
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
- exam_board_id: UUID
- estimated_time_minutes: INTEGER
- keywords: JSON
- explanation: TEXT
- mark_scheme: TEXT
- examiner_comments: TEXT
- question_number: TEXT
- level: TEXT
- stem_markdown: TEXT
- status: TEXT
- section_name: TEXT
- part_label: TEXT
- image_url: TEXT
- parent_question_id: UUID
- display_order: INTEGER
```

### `question_choices`
**Purpose:** Multiple choice options
```sql
- id: UUID (Primary Key)
- question_id: UUID
- choice_text: TEXT
- is_correct: BOOLEAN
- choice_order: INTEGER
- explanation: TEXT
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### `notes`
**Purpose:** Study notes
```sql
- id: UUID (Primary Key)
- topic_id: UUID
- subject_id: UUID
- title: TEXT
- subtitle: TEXT
- slug: TEXT
- content_md: TEXT
- rendered_html: TEXT
- version: INTEGER
- author_id: UUID
- visibility: TEXT
- tags: JSON
- is_downloadable: BOOLEAN
- view_count: INTEGER
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
- published_at: TIMESTAMPTZ
- exam_board_id: UUID
- display_order: INTEGER
- estimated_read_time: INTEGER
- has_latex: BOOLEAN
- search_vector: TSVECTOR
```

### `note_sections`
**Purpose:** Note sections
```sql
- id: UUID (Primary Key)
- note_id: UUID
- parent_section_id: UUID
- title: TEXT
- slug: TEXT
- content_md: TEXT
- rendered_html: TEXT
- display_order: INTEGER
- has_latex: BOOLEAN
- estimated_read_time: INTEGER
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### `note_progress`
**Purpose:** User progress on notes
```sql
- id: UUID (Primary Key)
- user_id: UUID
- note_id: UUID
- section_id: UUID
- completed: BOOLEAN
- completed_at: TIMESTAMPTZ
- time_spent_seconds: INTEGER
- last_accessed_at: TIMESTAMPTZ
- created_at: TIMESTAMPTZ
```

### `note_bookmarks`
**Purpose:** User bookmarks
```sql
- id: UUID (Primary Key)
- user_id: UUID
- note_id: UUID
- section_id: UUID
- created_at: TIMESTAMPTZ
```

### `past_papers`
**Purpose:** Past exam papers
```sql
- id: UUID (Primary Key)
- title: TEXT
- subject_id: UUID
- year: INTEGER
- paper_number: INTEGER
- variant: TEXT
- duration_minutes: INTEGER
- total_marks: INTEGER
- paper_url: TEXT
- mark_scheme_url: TEXT
- examiner_report_url: TEXT
- status: TEXT
- created_by: UUID
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
- published_at: TIMESTAMPTZ
- exam_board_id: UUID
- session: TEXT
- resource_type: TEXT
- component_code: TEXT
- insert_url: TEXT
- grade_thresholds_url: TEXT
- specimen_url: TEXT
- source_files_url: TEXT
- exam_board: JSON
- level: TEXT
- question_paper_url: TEXT
```

### `paper_questions`
**Purpose:** Questions for full papers
```sql
- id: UUID (Primary Key)
- paper_id: UUID
- question_number: TEXT
- section_name: TEXT
- part_label: TEXT
- question_text: TEXT
- question_type: TEXT
- marks: INTEGER
- correct_answer: TEXT
- mark_scheme: TEXT
- examiner_tips: TEXT
- options: JSON
- difficulty: TEXT
- image_url: TEXT
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### `paper_attempt_answers`
**Purpose:** Answers for paper attempts
```sql
- id: UUID (Primary Key)
- attempt_id: UUID
- paper_question_id: UUID
- answer_text: TEXT
- selected_option: TEXT
- is_flagged: BOOLEAN
- time_spent_seconds: INTEGER
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
- marks_awarded: INTEGER
- feedback: TEXT
```

---

## 👥 User Management

### `user_subjects`
**Purpose:** User subject associations
```sql
- id: UUID (Primary Key)
- user_id: UUID
- subject_id: UUID
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### `user_gamification`
**Purpose:** User gamification data
```sql
- id: UUID (Primary Key)
- user_id: UUID
- total_xp: INTEGER
- xp_this_week: INTEGER
- xp_level: INTEGER
- xp_progress_to_next_level: INTEGER
- xp_needed_for_next_level: INTEGER
- current_streak: INTEGER
- longest_streak: INTEGER
- last_activity_date: DATE
- streak_freeze_count: INTEGER
- total_quizzes_completed: INTEGER
- total_notes_viewed: INTEGER
- total_time_spent_minutes: INTEGER
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### `xp_transactions`
**Purpose:** XP transaction history
```sql
- id: UUID (Primary Key)
- user_id: UUID
- xp_amount: INTEGER
- source_type: TEXT
- source_id: UUID
- description: TEXT
- created_at: TIMESTAMPTZ
```

### `leaderboard_cache`
**Purpose:** Cached leaderboard data
```sql
- id: UUID (Primary Key)
- user_id: UUID
- rank: INTEGER
- total_xp: INTEGER
- level: INTEGER
- display_name: TEXT
- avatar_url: TEXT
- updated_at: TIMESTAMPTZ
```

### `notification_preferences`
**Purpose:** User notification settings
```sql
- id: UUID (Primary Key)
- user_id: UUID
- email_notifications: BOOLEAN
- push_notifications: BOOLEAN
- quiz_completed: BOOLEAN
- streak_milestone: BOOLEAN
- badge_earned: BOOLEAN
- assignment_due: BOOLEAN
- class_announcement: BOOLEAN
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

---

## 💬 Messaging System

### `conversations`
**Purpose:** Conversation threads
```sql
- id: UUID (Primary Key)
- type: TEXT
- title: TEXT
- class_id: UUID
- created_by: UUID
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
- last_message_at: TIMESTAMPTZ
- is_archived: BOOLEAN
```

### `conversation_participants`
**Purpose:** Conversation participants
```sql
- id: UUID (Primary Key)
- conversation_id: UUID
- user_id: UUID
- joined_at: TIMESTAMPTZ
- left_at: TIMESTAMPTZ
- is_admin: BOOLEAN
- is_muted: BOOLEAN
- last_read_at: TIMESTAMPTZ
- unread_count: INTEGER
```

### `messages` (public schema)
**Purpose:** Application messages
```sql
- id: UUID (Primary Key)
- conversation_id: UUID
- sender_id: UUID
- content: TEXT
- message_type: TEXT
- metadata: JSON
- parent_id: UUID
- is_edited: BOOLEAN
- edited_at: TIMESTAMPTZ
- is_deleted: BOOLEAN
- deleted_at: TIMESTAMPTZ
- created_at: TIMESTAMPTZ
```

### `message_attachments`
**Purpose:** Message attachments
```sql
- id: UUID (Primary Key)
- message_id: UUID
- file_name: TEXT
- file_type: TEXT
- file_size: INTEGER
- file_url: TEXT
- created_at: TIMESTAMPTZ
```

### `message_reactions`
**Purpose:** Message reactions
```sql
- id: UUID (Primary Key)
- message_id: UUID
- user_id: UUID
- emoji: TEXT
- created_at: TIMESTAMPTZ
```

---

## 🏆 Gamification System

### `badges`
**Purpose:** Badge definitions
```sql
- id: UUID (Primary Key)
- name: TEXT
- description: TEXT
- icon_url: TEXT
- criteria: JSON
- created_at: TIMESTAMPTZ
- icon: TEXT
- category: TEXT
- requirement_type: TEXT
- requirement_value: INTEGER
- points: INTEGER
- is_active: BOOLEAN
```

### `user_badges`
**Purpose:** User earned badges
```sql
- id: UUID (Primary Key)
- user_id: UUID
- badge_id: UUID
- earned_at: TIMESTAMPTZ
```

### `flashcard_decks`
**Purpose:** Flashcard decks
```sql
- id: UUID (Primary Key)
- title: TEXT
- subject_id: UUID
- topic_id: UUID
- description: TEXT
- visibility: TEXT
- created_by: UUID
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### `flashcards`
**Purpose:** Individual flashcards
```sql
- id: UUID (Primary Key)
- deck_id: UUID
- front: TEXT
- back: TEXT
- ordering: INTEGER
- created_at: TIMESTAMPTZ
```

### `flashcard_progress`
**Purpose:** Flashcard learning progress
```sql
- id: UUID (Primary Key)
- user_id: UUID
- question_id: UUID
- confidence_level: TEXT
- review_count: INTEGER
- last_reviewed_at: TIMESTAMPTZ
- next_review_at: TIMESTAMPTZ
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### `topic_mastery`
**Purpose:** Topic mastery tracking
```sql
- id: UUID (Primary Key)
- user_id: UUID
- topic_id: UUID
- questions_attempted: INTEGER
- questions_correct: INTEGER
- mastery_percentage: NUMERIC
- weak_areas: JSON
- last_practiced_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

---

## 🔧 System Tables

### `notifications`
**Purpose:** System notifications
```sql
- id: UUID (Primary Key)
- user_id: UUID
- type: TEXT
- title: TEXT
- body: TEXT
- link_url: TEXT
- read_at: TIMESTAMPTZ
- created_at: TIMESTAMPTZ
- is_read: BOOLEAN
```

### `media`
**Purpose:** Media file storage
```sql
- id: UUID (Primary Key)
- storage_path: TEXT
- bucket: TEXT
- mime_type: TEXT
- size_bytes: INTEGER
- uploaded_by: UUID
- uploaded_at: TIMESTAMPTZ
```

### `audit_logs`
**Purpose:** System audit logs
```sql
- id: UUID (Primary Key)
- actor_id: UUID
- action: TEXT
- target_table: TEXT
- target_id: UUID
- details: JSON
- ip_address: TEXT
- user_agent: TEXT
- created_at: TIMESTAMPTZ
- user_id: UUID
- resource_type: TEXT
- resource_id: UUID
- description: TEXT
- metadata: JSON
```

### `analytics_events`
**Purpose:** Analytics tracking
```sql
- id: UUID (Primary Key)
- user_id: UUID
- event_type: TEXT
- resource_id: UUID
- resource_type: TEXT
- metadata: JSON
- created_at: TIMESTAMPTZ
```

### `education_levels`
**Purpose:** Education level definitions
```sql
- id: UUID (Primary Key)
- name: TEXT
- description: TEXT
- exam_boards: JSON
- display_order: INTEGER
- created_at: TIMESTAMPTZ
```

### `content_exam_boards`
**Purpose:** Links content to exam boards
```sql
- id: UUID (Primary Key)
- content_type: TEXT
- content_id: UUID
- exam_board_id: UUID
- created_at: TIMESTAMPTZ
```

### `subtopics`
**Purpose:** Subtopics within topics
```sql
- id: UUID (Primary Key)
- topic_id: UUID
- name: TEXT
- slug: TEXT
- description: TEXT
- display_order: INTEGER
- status: TEXT
- created_by: UUID
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
- published_at: TIMESTAMPTZ
```

### `content_approvals`
**Purpose:** Content approval workflow
```sql
- id: UUID (Primary Key)
- entity_type: TEXT
- entity_id: UUID
- submitted_by: UUID
- submitted_at: TIMESTAMPTZ
- reviewed_by: UUID
- reviewed_at: TIMESTAMPTZ
- status: TEXT
- review_notes: TEXT
- content_snapshot: JSON
```

### `content_analytics`
**Purpose:** Content usage analytics
```sql
- id: UUID (Primary Key)
- entity_type: TEXT
- entity_id: UUID
- view_count: INTEGER
- unique_viewers: INTEGER
- completion_count: INTEGER
- average_score: NUMERIC
- date: DATE
- updated_at: TIMESTAMPTZ
```

### `bulk_imports`
**Purpose:** Bulk import tracking
```sql
- id: UUID (Primary Key)
- import_type: TEXT
- file_url: TEXT
- file_name: TEXT
- status: TEXT
- total_rows: INTEGER
- successful_rows: INTEGER
- failed_rows: INTEGER
- error_log: TEXT
- created_by: UUID
- created_at: TIMESTAMPTZ
- started_at: TIMESTAMPTZ
- completed_at: TIMESTAMPTZ
```

### `email_queue`
**Purpose:** Email sending queue
```sql
- id: UUID (Primary Key)
- to_email: TEXT
- to_name: TEXT
- from_email: TEXT
- from_name: TEXT
- subject: TEXT
- html_content: TEXT
- text_content: TEXT
- template_id: UUID
- template_data: JSON
- priority: TEXT
- status: TEXT
- attempts: INTEGER
- max_attempts: INTEGER
- last_attempt_at: TIMESTAMPTZ
- sent_at: TIMESTAMPTZ
- error_message: TEXT
- metadata: JSON
- scheduled_for: TIMESTAMPTZ
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### `email_templates`
**Purpose:** Email templates
```sql
- id: UUID (Primary Key)
- name: TEXT
- subject: TEXT
- html_content: TEXT
- text_content: TEXT
- variables: JSON
- is_active: BOOLEAN
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

---

## 📝 Usage Guidelines

### When to Use Which Table:

| Feature | Primary Table | Supporting Tables |
|---------|---------------|-------------------|
| **Student Assignments** | `assignments` → `test_attempts` | `tests`, `questions`, `assessment_questions` |
| **Direct Assessments** | `assessments` → `assessment_attempts` | `assessment_questions`, `questions` |
| **Past Paper Practice** | `past_papers` → `paper_questions` | `paper_attempt_answers` |
| **Class Management** | `classes` | `enrollments`, `class_announcements`, `class_messages` |
| **User Profiles** | `users` | `user_gamification`, `notification_preferences` |
| **Content Creation** | `questions` | `question_choices`, `notes`, `note_sections` |
| **Messaging** | `conversations` → `messages` | `conversation_participants`, `message_attachments` |

### Key Relationships:

- `assignments.assessment_id` → `assessments.id`
- `test_attempts.assignment_id` → `assignments.id`
- `assessment_attempts.assessment_id` → `assessments.id`
- `assessment_questions.assessment_id` → `assessments.id`
- `assessment_questions.question_id` → `questions.id`
- `class_announcements.class_id` → `classes.id`
- `enrollments.class_id` → `classes.id`
- `enrollments.user_id` → `users.id`

---

**Last Updated:** December 30, 2024  
**Version:** 1.0  
**Note:** This document only includes tables actively used in the codebase. Unused tables have been removed.
