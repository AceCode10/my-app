Below is the complete, production-ready System Requirements Specification (SRS) for IGCSE Simplified.
It uses the modern product-SRS style you selected (readable, developer-friendly), and is focused on the final scope you confirmed:

Secondary / exam-board-agnostic content (IGCSE now; A-Level later; no primary).

All assessment content (questions, past papers, mark schemes, explanations) are uploaded and maintained only by Admin / Content Moderator.

Teachers are independent instructors who assign existing content (papers, topical questions) and use the Test Builder to assemble tests for class use.

Students are public (guest), registered, or subscribed (Basic/Essential/Pro); freemium usage limits apply.

AI is NOT used for question generation, summarization, or chat tutoring. AI use is restricted per your confirmation—minimal or none; automatic grading is rule-based (no AI suggestions). (Genkit / AI hooks may remain as optional placeholders if you choose later.)

Payments are placeholders (integrations stubbable for later activation).

Two admin roles: Super Admin and Content Moderator.

Table of Contents (jump links)

Executive summary & scope

Intended audience & assumptions

Product overview — users & high-level flows

Functional requirements (FRs) — numbered and actionable

Non-functional requirements (NFRs)

Data model (SQL / Supabase + TypeScript interfaces)

API contract — core endpoints, request/response samples

Server-side logic & background jobs (workers & triggers)

Admin CMS & Content Moderator workflows (detailed)

Test Builder (teacher tool) — UI & business logic (detailed)

Assessment lifecycle — exam types, grading rules & flows

Student features & gamification (XP, streaks, badges, leaderboard)

Communication & notifications (messages, announcements)

UI/UX pages & component catalogue (wireframe-level)

Security, privacy & access control (RLS / auth / RBAC)

Migration, deployment, CI/CD & environments

Acceptance criteria, QA & test cases

Observability & monitoring

Risks, assumptions & open questions

Implementation roadmap & milestones

Appendices: sample SQL DDL, TypeScript interfaces, sample API flows, export/import notes

1. Executive summary & scope

IGCSE Simplified is a web-based learning and assessment platform for secondary-level exam preparation. The initial release provides:

A content bank of admin-curated notes, question items and full past papers mapped to subjects/topics/exam boards.

Student-facing features: topic navigation, note viewing, quizzes, mock exams (timed/untimed), flashcards, progress tracking and gamification (XP, streaks, badges), public leaderboard.

Teacher-facing features: class creation, Test Builder (assemble tests from admin bank), assign papers/quizzes to classes or students, monitor student completion and analytics.

Admin-facing CMS: upload/manage canonical question bank, upload past papers and per-question expected answers and examiner comments, moderate content, and manage users.

Minimal AI use: no AI question generation; grading is automatic only for objective question types using stored correct answers/mark scheme. No AI marking suggestions, no AI moderation, no AI tutoring.

Payment placeholders for subscription tiers: Basic (free), Essential, Pro. Freemium usage limits apply to guests and Basic users.

Primary development stack (assumed):

Frontend: Next.js (App Router) + React + TypeScript + Tailwind + ShadCN UI.

Backend & storage: Supabase (Postgres, Auth, Storage, Edge Functions) — produces production-grade SQL schema and RLS.

Job queue / background: Upstash + BullMQ or Supabase Edge Functions for light jobs.

PDF rendering: Playwright / headless Chromium worker.

Monitoring: Sentry, Prometheus-like metrics or vendor.

2. Intended audience and assumptions

Audience: development teams, product owners, designers, QA, deployment engineers, and AI code-generation assistants.

Key assumptions (explicit):

Admin is the single source of truth for questions, answers, rubrics, exam papers and examiner comments.

Teachers do not create or upload base content (notes or questions) — they assemble/assign from the admin bank only.

Automatic grading applies to objective question types (MCQ, True/False, numeric with tolerance, fill-in with explicit expected values). Structured/essay responses require manual teacher grading.

Leaderboard is public and global.

Payment gateway development is deferred (placeholders only).

No discussion forums in MVP.

Minimal/no AI involvement in content generation or moderation.

3. Product overview — user types & high-level flows
3.1 User types (three categories)

Students

Public Students (guest)

Registered Students (free Basic)

Subscribed Students (Essential, Pro)

Teachers

Independent teachers who create/manage classes, use Test Builder, assign tests, and grade when necessary.

Admins

Super Admin — full platform access, user & system config.

Content Moderator — content upload, edit, moderation, approval; manage question bank and past papers.

3.2 High-level flows

Admin uploads subject hierarchy, topics, question bank and full past papers (with expected answers and examiner comments).

Students browse Subjects → Topics → Notes; take quizzes or scheduled papers; progress tracked and displayed in dashboards.

Teachers create classes, invite students via join codes, use Test Builder to assemble tests and assign them to classes. Students see assigned tests on their dashboard and take them (timed or untimed).

System auto-grades objective responses; teacher grades open responses. Scores recorded and shown to students (and available in teacher dashboards).

Gamification updates (XP, streaks) and leaderboard updated in near-real-time.

4. Functional requirements (FR) — numbered

Each FR includes a short description, actors, inputs/outputs, validation, UI expectations and acceptance criteria.

Note: FRs are grouped logically. Acceptance Criteria (AC) are explicit, testable.

4.1 Authentication & User Management

FR-1.1 — Sign Up / Log In

Actors: Guest → Registered Student, Teacher, Admin

Behavior: Email/password signup + email verification. Social OAuth optional (deferred). On first login create users row (role default=STUDENT unless admin provisioning for teacher or admin).

UI: Signup, login, password reset pages, verification flow.

Validation: email format, password min 8 chars.

AC: User account created, verification email sent; verified users can log in.

FR-1.2 — Role Management

Actors: Super Admin

Behavior: Super Admin can create teacher accounts or promote user to Teacher/Content Moderator/Super Admin.

AC: Role changes persist and permissions enforced.

FR-1.3 — Profile

Actors: All authenticated users

Fields stored: displayName, email, avatarUrl, role, subjectsOfInterest, locale, subscriptionTier, createdAt, lastSeen.

AC: Profile updates reflect in UI and persist.

4.2 Subjects, Topics & Content browsing

FR-2.1 — Subjects & Topics

Actors: All users

Behavior: Subjects list (public), topic tree per subject, syllabus mapping to exam boards (IGCSE, Edexcel, IB).

AC: Guest and registered users can view subject and topic lists; registered/subscribed users have different access levels for content.

FR-2.2 — Notes viewing & download

Actors: All users

Behavior: Notes are HTML/Markdown content (rendered securely). Download PDF available for notes that Admin has made downloadable. Usage-limits enforce for guests/basic (5 notes/week).

AC: Note renders, anchors/TOC work, downloads accessible per user tier.

FR-2.3 — Flashcards

Actors: All users

Behavior: Decks curated by Admin. Guest limits: 10 flashcards/week; Basic similar; Essential/Pro unlimited.

AC: Decks accessible and study session tracks progress.

4.3 Question Bank & Papers (Admin-managed)

FR-3.1 — Question Bank CRUD (Admin)

Actors: Content Moderator, Super Admin

Fields: questionId, subjectId, topicId, examBoard, paperId (optional), questionType, stemMarkdown, options (for MCQ), correctAnswer(s), marks, examinerComment (explanation), mediaRefs, difficulty, visibility, version, createdBy, createdAt.

AC: Admin can create/edit/delete question records with validation; versioning stored.

FR-3.2 — Full Paper Uploads

Actors: Content Moderator

Behavior: Upload full past papers and mapping of their question ids to the paper structure (paper metadata: examBoard, year, paperNumber, duration).

AC: Paper available in Paper Library, can be assigned as a whole.

FR-3.3 — Examiner Comment Field

Actors: Content Moderator

Behavior: Each question must include an “expected correct answer” and a short “examiner comment” explaining expectations—these are used for student feedback and teacher reference.

AC: Field required for publish.

4.4 Test Builder (Teacher)

FR-4.1 — Access

Actors: Teacher (logged in)

Behavior: Teacher opens Test Builder → selects examBoard & subject → filters question bank by topic and difficulty → adds questions to composition panel.

AC: Test Builder available only to Teacher role.

FR-4.2 — Test composition & editing

Features: drag & drop reorder, set per-question marks, mark “teacher-only” flag, insert section headers, preview.

AC: Teacher can assemble, edit and save tests in their personal test library.

FR-4.3 — PDF export

Behavior: Teacher can export test as print-ready PDF and optionally an answers/mark scheme PDF (teacher-only).

AC: PDF respects page formatting, page breaks, embedded images, and marks.

FR-4.4 — Assigning tests

Behavior: Teacher may assign a saved test (or full paper) to classes or to individual students. Assignment options: timed (duration), available window, attempt limit, visibility of answers post-submission (immediately / teacher-release).

AC: Students in class see assigned test in dashboard; assignment metadata visible to teacher.

4.5 Class management (Teacher)

FR-5.1 — Create a class

Inputs: name, subjectId, description, capacity, autoApprove boolean

Outputs: classId, join code

AC: Teacher creates class and obtains join code.

FR-5.2 — Student join flow

Behavior: Students join via code; enrollment pending or auto-approved based on class settings.

AC: Enrolled students appear in teacher roster.

4.6 Assessment lifecycle & grading

FR-6.1 — Start attempt (student)

Inputs: quiz/testId, userId

Outputs: attemptId, assignedQuestionSet, startAt, expiresAt (if timed)

AC: Attempt created and locked to user.

FR-6.2 — Autosave & resume

Behavior: Client auto-saves answers every X seconds; partial state persisted to DB to recover in case of disconnect.

AC: Autosave frequency configurable, auto-resume works.

FR-6.3 — Automatic grading

Scope: MCQ, True/False, exact numeric with tolerance, fill-in with exact match or regex allowed.

Mechanism: Compare submitted answer to stored correctAnswer. For partial-marking, store per-question markScheme with micro-points for sub-items.

Outputs: per-question score, attempt total.

AC: Objective questions graded instantly on submit; results stored.

FR-6.4 — Manual grading

Scope: Structured/essay questions.

Behavior: Teacher receives notification of submissions needing grading, opens attempt, assigns marks and optional comments. Teacher finalizes results.

AC: Teacher-graded marks stored; students notified.

FR-6.5 — Release policy

Behavior: Teacher can set if results are released immediately after auto-grade or after teacher review.

AC: Visibility rules enforced.

FR-6.6 — Analytics & progress

Behavior: Student progress recorded per topic, student sees topic mastery and improvement suggestions (system-driven, not AI-based).

AC: Student dashboard shows percent mastery, quiz history, average score per topic.

4.7 Notifications & messaging

FR-7.1 — Announcements (Teacher → Class)

Behavior: Teacher posts announcement to class; students receive in-app notification and email (if enabled).

AC: Announcement visible in class activity feed.

FR-7.2 — Direct messaging (Teacher ↔ Student)

Behavior: One-to-one messages; attachments allowed (images, PDFs). Messaging privacy enforced.

AC: Messaging stored and accessible in user inbox.

4.8 Gamification

FR-8.1 — XP awarding

Mechanics: XP awarded for completed quizzes, streak days, completing topic notes, assignments completed.

AC: XP metric updated on completion and shown on profile and leaderboard.

FR-8.2 — Streaks & badges

Mechanics: Streak increments on daily learning activity; badges awarded on milestone triggers (e.g., 1000 XP, 7-day streak).

AC: Streak resets after inactivity per rules; badges persist and displayed.

FR-8.3 — Public Leaderboard

Behavior: Ranks students by XP in the system; privacy option: user may hide from leaderboard.

AC: Leaderboard shows paginated list and position.

4.9 Subscriptions & freemium limits

FR-9.1 — Subscription tiers

Tiers: Basic (free), Essential, Pro (teacher implicitly Pro for permissions).

Behavior: Access control per tier:

Guest: limited (notes 5/week, quizzes 5/week, flashcards 10/week).

Basic: same or slightly elevated limits (as per your spec).

Essential: unlimited interactive practice, limited daily AI explanation credits (if AI later enabled).

Pro: all features (includes advanced mock exams).

AC: Tier enforcement on resource access.

FR-9.2 — Payment placeholders

Behavior: Payment UI and subscription management screens exist but payment processing disabled until integration activated.

AC: Subscriptions can be toggled in admin; placeholder UI displays expected behavior.

4.10 Admin features

FR-10.1 — Content upload & QA

Behavior: Content Moderator uploads questions/papers, marks them published, edits metadata and examiner comments; content passes validation (required fields).

AC: New content requires examiner comment and correctAnswer; once published visible to Teachers/Students per visibility.

FR-10.2 — User management & auditing

Behavior: Super Admin manages users, roles, suspensions; view audit logs; revert actions if necessary.

AC: Role changes logged.

FR-10.3 — Analytics & platform monitoring

Behavior: Admin sees system-level metrics: active users, assignment counts, platform usage, peak loads.

AC: Dashboard shows near-real time metrics.

5. Non-functional requirements (NFRs)
5.1 Performance

SSR/top-level pages (subject/topic/note) p95 ≤ 1.5s (cached via CDN/ISR).

API metadata endpoints p50 ≤ 150ms.

Autograde result on submit p99 ≤ 1s for standard loads.

5.2 Scalability

Architect for 100k monthly active users initially; scale via horizontal stateless web workers and autoscaled job workers.

5.3 Availability

SLA target 99.9% uptime for application and critical APIs.

5.4 Resilience & offline

Student app supports offline note reading for saved notes via service worker (PWA).

Autosave + resume ensures attempt robustness for intermittent connectivity.

5.5 Security

Auth: Supabase Auth (JWT), token expiry 1 hour, refresh flow.

RLS: Row-Level Security for Postgres to enforce user-specific access.

File uploads scanned, stored with signed URLs, CDN caching policies.

OWASP top-10 protections: input validation, prepared SQL statements, CSP, XSS sanitization for rendered Markdown (DOMPurify / rehype-sanitize), rate-limiting.

5.6 Privacy & data retention

PII minimal; retention: audit logs 365 days, analytics 2 years; content stored indefinitely.

Support data deletion per user request (GDPR-ready).

5.7 Accessibility & Internationalisation

WCAG 2.1 AA compliance target.

i18n support: en-GB default; locale-agnostic date/time storage (UTC).

6. Data model — canonical (Supabase / Postgres flavor)

Below are the core tables and TypeScript interfaces used as canonical data models.

6.1 SQL DDL (selected core tables)
-- users
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  display_name text,
  avatar_url text,
  role text NOT NULL DEFAULT 'student', -- 'student'|'teacher'|'content_moderator'|'super_admin'
  subscription_tier text DEFAULT 'basic',
  leaderboard_opt_out boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- subjects
CREATE TABLE subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  exam_board text, -- 'IGCSE'|'Edexcel'|'IB' etc
  created_at timestamptz DEFAULT now()
);

-- topics
CREATE TABLE topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid REFERENCES subjects(id),
  name text NOT NULL,
  slug text NOT NULL,
  parent_topic_id uuid,
  ordering int DEFAULT 0
);

-- questions (canonical bank)
CREATE TABLE questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid REFERENCES subjects(id),
  topic_id uuid REFERENCES topics(id),
  exam_board text,
  paper_id uuid NULL, -- optional link to full paper
  paper_position int NULL, -- question number in paper
  question_type text NOT NULL, -- 'mcq','tf','numeric','short_answer','long_answer','fill_blank'
  stem_md text NOT NULL, -- markdown
  options jsonb NULL,  -- for MCQ: [{id:'a', text:'...'}]
  correct_answer jsonb NULL, -- canonical answer: exact values or structure
  marks numeric NOT NULL DEFAULT 1,
  examiner_comment text NULL, -- explanation of expected response
  difficulty text DEFAULT 'medium',
  tags text[],
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  visibility text DEFAULT 'published'
);

-- papers (full past paper)
CREATE TABLE papers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid REFERENCES subjects(id),
  exam_board text,
  year int,
  paper_label text, -- e.g. 'Paper 1'
  duration_minutes int,
  mime_url text, -- pdf location
  created_at timestamptz DEFAULT now()
);

-- classes
CREATE TABLE classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject_id uuid REFERENCES subjects(id),
  teacher_id uuid REFERENCES users(id),
  join_code text UNIQUE,
  capacity int DEFAULT 999,
  created_at timestamptz DEFAULT now()
);

-- enrollments
CREATE TABLE enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES classes(id),
  user_id uuid REFERENCES users(id),
  status text DEFAULT 'active', -- 'pending','active','removed'
  created_at timestamptz DEFAULT now()
);

-- tests (teacher assembled tests)
CREATE TABLE tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES users(id), -- teacher
  title text NOT NULL,
  sections jsonb, -- structure with questionIds and per-question marks/order
  created_at timestamptz DEFAULT now(),
  visibility text DEFAULT 'private' -- 'private','assigned'
);

-- assignments (teacher -> class or students)
CREATE TABLE assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid REFERENCES tests(id),
  assigned_by uuid REFERENCES users(id),
  target_class_id uuid NULL,
  target_user_ids uuid[] NULL,
  start_at timestamptz NULL,
  due_at timestamptz NULL,
  time_limit_minutes int NULL,
  allow_retakes boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- attempts
CREATE TABLE attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid REFERENCES assignments(id),
  test_id uuid REFERENCES tests(id),
  user_id uuid REFERENCES users(id),
  started_at timestamptz DEFAULT now(),
  submitted_at timestamptz NULL,
  answers jsonb NULL, -- { questionId: {answer:..., timeTaken:...} }
  score numeric NULL,
  graded boolean DEFAULT false,
  grading_details jsonb NULL,
  status text DEFAULT 'in_progress'
);

-- audit_logs
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text,
  target_table text,
  target_id uuid,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- notifications, messages, leaderboards, etc.


Indexes: add GIN on questions.tags, to_tsvector for full-text search on question.stem_md and papers etc.

6.2 TypeScript interfaces (copy/paste-ready)
export type Role = 'student' | 'teacher' | 'content_moderator' | 'super_admin';
export type SubscriptionTier = 'basic' | 'essential' | 'pro';

export interface User {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  role: Role;
  subscriptionTier: SubscriptionTier;
  createdAt: string;
  leaderboardOptOut?: boolean;
}

export interface Subject { id: string; name: string; slug: string; examBoard?: string; }
export interface Topic { id: string; subjectId: string; name: string; slug: string; parentTopicId?: string; order?: number; }

export type QuestionType = 'mcq'|'tf'|'numeric'|'short_answer'|'long_answer'|'fill_blank';

export interface Question {
  id: string;
  subjectId: string;
  topicId: string;
  examBoard?: string;
  paperId?: string | null;
  questionType: QuestionType;
  stemMd: string;
  options?: Array<{ id: string; text: string }>;
  correctAnswer?: any; // json; format depends on type
  marks: number;
  examinerComment?: string;
  difficulty?: 'easy'|'medium'|'hard';
  tags?: string[];
  createdBy?: string;
  createdAt?: string;
}

7. API contract — core endpoints (examples)

Base path: /api/v1/

Authentication uses Supabase client or standard JWT Bearer.

7.1 Auth & user endpoints

POST /api/v1/auth/signup — body: {email, password, displayName} → creates user, sends verification.

POST /api/v1/auth/login — returns accessToken, refreshToken.

GET /api/v1/users/me — returns user profile.

7.2 Subjects & content

GET /api/v1/subjects — list of subjects.

GET /api/v1/subjects/:slug/topics — topics tree.

GET /api/v1/notes/:topicId — notes list for topic.

GET /api/v1/questions/:topicId?filters — filtered questions (Admin only returns full data; Teacher gets metadata).

GET /api/v1/papers — pageable list.

7.3 Test Builder & tests

GET /api/v1/questions/search?q=&subject=&topic=&difficulty= — returns question summary (id, stem snippet).

POST /api/v1/tests — (Teacher) create test JSON {title, sections} -> returns testId.

GET /api/v1/tests/:id — returns test for preview.

7.4 Assignments & attempts

POST /api/v1/assignments — assign test to class/users.

GET /api/v1/assignments/my — list of assigned tests for logged-in student.

POST /api/v1/attempts/start — body {assignmentId, testId} -> returns attemptId, questionsAssigned.

PATCH /api/v1/attempts/:id/autosave — partial answers.

POST /api/v1/attempts/:id/submit — finalizes attempt; triggers autograding and teacher notifications.

GET /api/v1/attempts/:id/result — returns scored attempt.

7.5 Teacher actions

GET /api/v1/classes/my — list classes teacher manages.

POST /api/v1/classes — create class.

POST /api/v1/classes/:id/invite — generate join code or bulk import.

7.6 Admin (Content Moderator) endpoints

POST /api/v1/admin/questions — create question record (includes examinerComment and correctAnswer).

POST /api/v1/admin/papers — upload paper and map questions.

GET /api/v1/admin/moderation/queue — pending items.

8. Server-side logic, background jobs & triggers
8.1 Job types & responsibilities

autogradeJob(attemptId)

Grade objective questions by comparing submitted answers with correctAnswer. Compute score, write attempts.score, grading_details, set graded = true for auto-graded parts. Notify teacher if manual grading required.

pdfRenderJob(testId | paperId)

Render test/paper HTML to PDF (Playwright). Store in storage bucket; return signed URL.

autosaveWorker

Handles high-frequency partial updates to attempts to minimize DB writes (throttle per user/per attempt).

notificationJob

Send in-app notifications and optionally e-mail: new assignment, grading completed, class join request.

leaderboardUpdateJob

Periodic job (e.g., 5 minutes) to compute top users by XP and cache leaderboard.

backupJob

Nightly DB snapshots and storage backups.

8.2 Triggers

On question/paper publish → update search index (Postgres tsvector / external search service) and purge any stale content caches.

On assignment publish → create assignment rows for targeted students (if class assignment) and send notifications.

9. Admin CMS & Content Moderator workflows — detailed

Overview: Content Moderators manage the canonical question bank and past papers. The CMS must enforce strict validation (every question needs required fields: questionType, stem, marks, correctAnswer, examinerComment, tags, topic mapping).

9.1 Create Question flow (Admin UI)

Open “Add Question”.

Select subject, topic, examBoard, questionType.

Paste/write stemMd (Markdown editor), upload diagrams if any (storage).

Fill options for MCQ; provide correctAnswer.

Provide marks, examinerComment (required), difficulty, tags.

Save as draft → optional submit for QA → publish.

On publish, system validates required fields and writes audit_log.

Acceptance: Published questions appear in bank and are searchable by teachers for Test Builder.

9.2 Upload paper workflow (Admin)

Upload PDF of paper.

Create paper record (year, label, duration).

Map paper questions: optionally create new question records or map to existing questionIds (paperPosition).

Publish paper; teachers can assign whole paper.

9.3 Moderation & versioning

Moderator sees pending edits or flagged items.

Version history kept per question; ability to revert to previous version.

If a question is edited, any tests referencing it (teacher tests) continue to reference questionId; UI indicates if referenced question has been updated since test creation.

10. Test Builder (Teacher tool) — UI & business logic

Purpose: enable teachers to assemble exam-aligned tests using the Admin-managed question bank; create printable or assignable tests quickly.

10.1 UI Layout (desktop)

Left panel: filters (subject, topic, difficulty, examBoard, tags, paper source).

Center panel: result list of questions (pagination), each question shows snippet, tags, marks, add button.

Right panel: Test composition (questions added, reorder via drag/drop). Per-question settings (marks override, teacher-only flag).

Top bar: Save test, Export PDF, Assign (to class or student).

10.2 Business rules

Teachers can only include questions with visibility=published.

Teacher-only edits: they can add local annotations to the test copy (not altering canonical question).

Tests saved in tests table belong to teacher and can be reused.

10.3 Export PDF

PDF generator uses HTML template with proper page-break CSS and inclusion of question numbers, images.

Option to generate teacher key PDF with examiner comments and marks (teacher-only).

10.4 Assign to class

When assigned, assignments row created with metadata (start/due/time limit).

If assigned as timed exam and forceOnline true, students must take via the platform (online attempt) with time lock; if forceOnline false, teacher can allow offline paper but still track completion manually.

11. Assessment lifecycle & grading rules (detailed)
11.1 Test types

Topical Quiz: subset of questions by topic; often short.

Full Paper: Admin paper uploaded (timed).

Teacher-assembled test: created via Test Builder.

11.2 Attempt rules

Attempt state machine: created → in_progress → submitted → grading → graded → released.

Timed tests: server-side enforcement of expiresAt.

Autosave ensures minimal answers loss.

11.3 Grading mechanics

Objective questions: deterministic grading against correctAnswer.

For MCQ: simple match.

For numeric: allow tolerance (configurable).

For fill_blank: exact match or regex array (configurable).

Partial marks: question correctAnswer may be structured { parts: [ {value, marks} ] }.

Essay / longAnswer: set requiresManualGrading = true; teacher assigns marks.

Final score computed as sum(marksAwarded) / sum(maxMarks) * 100 (normalized display).

11.4 Result release & post-assessment

Teachers can configure release policy.

Detailed per-question feedback includes examinerComment from admin and teacher comments if any.

12. Student features & gamification
12.1 Dashboard

Shows: assigned tests, recommended topics, recently viewed notes, streak indicator, XP progress bar, badges, leaderboard rank.

12.2 Progress tracking

Track per-topic accuracy, number of attempts, time spent reading notes, active streak days.

Data visible only to the student and (aggregated) to their teacher (class analytics) but no raw personal PII export.

12.3 XP, streaks, badges

XP awarded by rules (e.g., complete quiz = marks-based XP; view note = small XP).

Streaks count consecutive days of eligible activity; reset rules: no activity in 48 hours resets; options for make-up via review sessions can be added later.

Badges assigned for milestones, stored as userBadges table.

12.4 Leaderboard

Global public leaderboard ranking by XP, paged.

Privacy toggle for users to opt out.

13. Communication & Notifications
13.1 Direct messaging

One-to-one messages with attachments. Messages stored and retrievable.

Rate-limited; file uploads scanned.

13.2 Announcements

Teacher posts to class; students get in-app notification and optional email.

Admins broadcast system announcements.

13.3 Notification types

Assignment posted, attempt graded, class join requests, system alerts.

14. UI/UX pages & component catalogue (wireframe-level)

Core pages:

Public Landing

Auth (login/signup/forgot)

Subject listing (public view)

Subject > Topic > Note detail

Flashcards (deck and study UI)

Quiz / Test player (attempt UI with timer and navigation)

Student Dashboard (assigned tests, progress)

Teacher Dashboard (classes, Test Builder)

Admin Dashboard (content moderation, question bank)

Messages, Notifications

Profile & Settings

Subscription & Billing (placeholder)

Key components:

SidebarTopicTree, NoteViewer (sanitized HTML), MarkdownEditor (Admin only), DataTable (Admin lists), TestComposer (teacher), AttemptPlayer (student), Autosave hook, NotificationBell.

15. Security, privacy & access control
15.1 Authentication & RBAC

Supabase Auth or equivalent JWT provider.

Roles enforced in both API and RLS policies:

super_admin — full CRUD across all tables/APIs.

content_moderator — can CRUD questions/papers; cannot manage platform-level settings.

teacher — manage classes, tests, assignments; cannot edit canonical questions.

student — take tests, view assigned resources, message teacher.

15.2 Row-Level Security example (pseudo)

SELECT on questions allowed to all for visibility='published'.

UPDATE on questions allowed only if auth.role IN ('super_admin','content_moderator').

INSERT into tests allowed if auth.role == 'teacher' (teacher creates their own tests).

15.3 Input sanitization & XSS prevention

Store Markdown only; render sanitized HTML with rehype + DOMPurify during server-side rendering.

15.4 File uploads

Use pre-signed uploads; scanning and thumbnail generation in worker pipeline.

16. Migration, deployment & CI/CD
16.1 Environment separation

dev, staging, prod.

Separate Supabase projects and storage buckets per environment.

16.2 CI/CD

GitHub Actions pipeline:

Lint & typecheck

Unit tests

Build Next.js app

Deploy to staging (auto), run smoke E2E tests (Playwright)

Manual approval to deploy to production

16.3 Secrets & config

Use environment secret store for DB keys, JWT secrets, Sentry DSN, Playwright service credentials.

16.4 Rollback & backup

Daily DB dumps; restore tested monthly.

Rolling deployments with health checks.

17. Acceptance criteria & QA test cases (representative)
17.1 Acceptance checklists

Auth flows work; role enforcement validated.

Admin can create question with examinerComment; question visible to teacher in Test Builder.

Teacher can create class & join students.

Teacher can build test, export PDF, assign to class.

Student can start timed test, autosave works, submit; MCQ auto-grades; result stored and notified.

Leaderboard updates after XP change.

17.2 Essential E2E test cases

Signup → join class → teacher assigns test → take test → submit → auto-grade validated → student sees result.

Admin uploads paper → teacher views paper in Test Builder → teacher assigns → multiple students take → aggregated class analytics available.

18. Observability & monitoring

Error Reporting: Sentry for frontend & server.

Metrics: requests per endpoint, average latency, worker queue depth, job failure rates.

Logging: structured logs with requestId, userId.

Alerts: job failures, error spikes, downtime.

19. Risks, assumptions & open questions
19.1 Major risks

Relying on a single admin for content creation may create bottleneck; consider a workflow for multiple moderators.

PDF rendering at scale requires a robust worker pool (cost/time).

Autosave flood may increase DB writes; throttle/per-user batching necessary.

19.2 Open questions (recommend defaults)

Payment activation timeline: Default to placeholder only; integrate Stripe later.

Leaderboards & privacy: Default to public but allow opt-out (as specified).
20. 21. Appendices
A — Sample API request/response flows (copy-paste)

1) Auth signup
Request:

POST /api/v1/auth/signup
Content-Type: application/json
{ "email":"student1@example.com", "password":"P@ssw0rd!", "displayName":"Student One" }


Response:

{ "user": { "id":"uuid", "email":"student1@example.com", "displayName":"Student One" }, "message":"Verification email sent" }


2) Create class (Teacher)
Request:

POST /api/v1/classes
Authorization: Bearer <teacher_token>
{ "name":"Physics A - 2026", "subjectId":"subj-uuid" }


Response:

{ "id":"class-uuid", "joinCode":"XJ7K9", "name":"Physics A - 2026" }


3) Teacher creates test
Request:

POST /api/v1/tests
Authorization: Bearer <teacher_token>
{
  "title":"Kinematics Test",
  "sections":[
    { "title":"MCQs", "questions": [ {"id":"q-uuid-1","marks":1}, {"id":"q-uuid-2","marks":1} ] },
    { "title":"Short Answer", "questions": [{"id":"q-uuid-3","marks":5}]}
  ]
}


Response:

{ "id":"test-uuid", "createdBy":"teacher-uuid", "title":"Kinematics Test" }


4) Start an attempt (Student)
Request:

POST /api/v1/attempts/start
Authorization: Bearer <student_token>
{ "assignmentId":"assign-uuid", "testId":"test-uuid" }


Response:

{
  "attemptId":"attempt-uuid",
  "questions":[ { "id":"q-uuid-1","questionType":"mcq","stem":"...","options":[...] }, ... ],
  "startedAt":"2025-10-22T09:00:00Z",
  "expiresAt":"2025-10-22T09:30:00Z" // if timed
}


5) Submit attempt
Request:

POST /api/v1/attempts/attempt-uuid/submit
Authorization: Bearer <student_token>
{ "answers": { "q-uuid-1": {"selected":"a"}, "q-uuid-3": {"text":"My answer..."} } }


Response:

{ "status":"received", "grading":"queued", "attemptId":"attempt-uuid" }

B — Sample SQL query (search questions)
SELECT id, question_type, stem_md, difficulty
FROM questions
WHERE subject_id = $1
  AND to_tsvector('english', stem_md) @@ plainto_tsquery($2)
ORDER BY created_at DESC
LIMIT 50;

C — RLS policy sample (Postgres pseudo)

/* Example: restrict update on questions to content moderators */

CREATE POLICY question_update_policy
  ON questions
  FOR UPDATE
  USING ( current_setting('app.current_user_role') = 'content_moderator' OR current_setting('app.current_user_role') = 'super_admin' );
